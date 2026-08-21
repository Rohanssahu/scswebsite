// =============================================================================
// Buddy — SCS Softwares real-time voice IT Manager.
// LiveKit Agents worker entrypoint.
//
// Pipeline: Silero VAD → OpenAI streaming STT (only remaining OpenAI
// dependency — see src/providers/stt.ts) → Gemini LLM (provider-abstracted,
// see src/providers/llm.ts) → ElevenLabs multilingual TTS.
// Turn detection is VAD-based with barge-in (visitor interruptions) enabled
// by the framework defaults; background-noise tolerance comes from the VAD
// activation threshold below.
//
// All state mutation flows through strict zod tool schemas; every number in
// the estimate comes from the deterministic engine; persistence goes through
// the voice-lead Edge Function (shared secret), so this process holds no
// database credentials.
//
// Local test:   npm run dev       (connects to LIVEKIT_URL as a dev worker)
// Deployment:   see docs/BUDDY_VOICE_AGENT_SETUP.md (LiveKit Cloud)
// =============================================================================

import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  llm,
  voice,
} from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as silero from '@livekit/agents-plugin-silero';
import { ParticipantKind, RoomEvent } from '@livekit/rtc-node';
import 'dotenv/config';
import { z } from 'zod';
import {
  VoiceLeadClient,
  loadBackendConfig,
  type ContactDetails,
  type SubmitLeadArgs,
} from './backend.js';
import {
  ENDPOINTING_MAX_DELAY_MS,
  ENDPOINTING_MIN_DELAY_MS,
  VAD_MIN_SILENCE_MS,
  loadLlmConnOptions,
  loadSessionLimits,
} from './config.js';
import {
  EstimateError,
  buildPreliminaryEstimate,
  describeEstimate,
  estimateInputSchema,
  type PreliminaryEstimate,
} from './estimate.js';
import {
  TranscriptBuffer,
  isValidEmail,
  normalizePhone,
  screenUserInput,
  spellEmailForReadback,
  spellPhoneForReadback,
} from './guards.js';
import { createGreetingGate } from './greeting.js';
import { loadKnowledge } from './knowledge.js';
import { runConsultationMeeting } from './meeting.js';
import { GREETING, buildSystemPrompt } from './prompts.js';
import { createLlm } from './providers/llm.js';
import { createStt } from './providers/stt.js';
import {
  assertSessionRunning,
  canSpeak,
  createRunGate,
  hasClientParticipant,
  logLifecycle,
  onJobShutdownSignal,
} from './session_lifecycle.js';
import { CONSENT_REQUIRED_REPLY, submissionToolParameters } from './tool_params.js';
import {
  VOICE_LANGUAGES,
  applyUpdate,
  buildSummary,
  computeProgress,
  emptyState,
  isReadyForEstimate,
  stateUpdateSchema,
  type ProjectState,
} from './state.js';

const STATE_TOPIC = 'buddy.state';

interface SessionMeta {
  sessionId: string | null;
  preferredLanguage: string | null;
  /** 'consultation' switches to the meeting mode (metadata is minted by the
   * consultation-meeting Edge Function — never by the browser). */
  mode: string | null;
  meetingId: string | null;
}

function parseParticipantMeta(raw: string | undefined): SessionMeta {
  try {
    const parsed = JSON.parse(raw ?? '') as {
      sessionId?: unknown;
      preferredLanguage?: unknown;
      mode?: unknown;
      meetingId?: unknown;
    };
    return {
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : null,
      preferredLanguage: typeof parsed.preferredLanguage === 'string' ? parsed.preferredLanguage : null,
      mode: typeof parsed.mode === 'string' ? parsed.mode : null,
      meetingId: typeof parsed.meetingId === 'string' ? parsed.meetingId : null,
    };
  } catch {
    return { sessionId: null, preferredLanguage: null, mode: null, meetingId: null };
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load({
      // Slightly higher activation threshold = better background-noise tolerance.
      activationThreshold: 0.6,
      // MILLISECONDS (plugin default 550). This used to read `0.55`, i.e. it
      // was written as if the option were seconds. 0.55 ms is below the
      // streaming TurnDetector's 250 ms floor, so `AudioRecognition` threw
      // inside `AgentActivity.start()`; `AgentSession.start()` swallows that
      // rejection (Promise.allSettled) and leaves the activity permanently
      // scheduling-paused, which surfaced later as the bogus
      // "AgentSession is closing, cannot use say()".
      minSilenceDuration: VAD_MIN_SILENCE_MS,
    });
  },

  entry: async (ctx: JobContext) => {
    const limits = loadSessionLimits();
    const knowledge = loadKnowledge();
    const backendConfig = loadBackendConfig();
    const backend = backendConfig ? new VoiceLeadClient(backendConfig) : null;

    await ctx.connect();
    const participant = await ctx.waitForParticipant();
    const meta = parseParticipantMeta(participant.metadata);

    // Consultation-meeting mode: server-minted metadata only; the general
    // voice flow below stays untouched.
    if (meta.mode === 'consultation' && meta.meetingId) {
      await runConsultationMeeting(ctx, {
        meetingId: meta.meetingId,
        preferredLanguage: meta.preferredLanguage,
        clientIdentity: participant.identity,
      });
      return;
    }

    const sessionId = meta.sessionId;
    const consentAt = new Date().toISOString();

    // ---- per-session state (server-side only; never model-writable) ----------
    let state: ProjectState = emptyState();
    if (meta.preferredLanguage && (VOICE_LANGUAGES as readonly string[]).includes(meta.preferredLanguage)) {
      state.language = meta.preferredLanguage as ProjectState['language'];
    }
    let estimate: PreliminaryEstimate | null = null;
    let estimatePresented = false;
    let contact: ContactDetails | null = null;
    let submittedReference: string | null = null;
    let lastSubmitArgs: SubmitLeadArgs | null = null;
    let turnCount = 0;
    const transcript = new TranscriptBuffer(limits.maxTranscriptChars);

    const logEvent = (eventType: string, data: Record<string, string | number | boolean> = {}) => {
      if (backend && sessionId) {
        void backend.sessionEvent(sessionId, eventType, data).catch(() => undefined);
      }
    };

    const publishState = (extra: Record<string, unknown> = {}) => {
      const progress = computeProgress(state);
      const payload = {
        type: 'buddy.state',
        progress,
        language: state.language,
        estimate: estimate
          ? {
              totalHoursMin: estimate.total_hours_min,
              totalHoursMax: estimate.total_hours_max,
              totalCostMin: estimate.total_cost_min,
              totalCostMax: estimate.total_cost_max,
              durationWeeksMin: estimate.duration_weeks_min,
              durationWeeksMax: estimate.duration_weeks_max,
              weeklyCapacityHours: estimate.weekly_capacity_hours,
              currency: estimate.currency,
              confidence: estimate.confidence,
              modules: estimate.modules,
              teamRoles: estimate.team_roles,
              assumptions: estimate.assumptions,
              exclusions: estimate.exclusions,
              risks: estimate.risks,
              status: 'preliminary',
            }
          : null,
        confirmed: Boolean(state.confirmedAt),
        referenceCode: submittedReference,
        ...extra,
      };
      const data = new TextEncoder().encode(JSON.stringify(payload));
      void ctx.room.localParticipant
        ?.publishData(data, { reliable: true, topic: STATE_TOPIC })
        .catch(() => undefined);
    };

    // ---- tools (STRICT schemas; server-side authorization inside each) -------
    const tools = {
      set_language: llm.tool({
        description: 'Set the conversation language the visitor chose (english, hindi or hinglish).',
        parameters: z.object({ language: z.enum(VOICE_LANGUAGES) }).strict(),
        execute: async ({ language }) => {
          state.language = language;
          logEvent('language_selected', { language });
          publishState();
          return `Language set to ${language}. Continue the conversation strictly in this language.`;
        },
      }),

      update_requirements: llm.tool({
        description:
          'Record newly learned requirement details after each visitor answer. Only include fields the visitor actually addressed this turn. Returns which required fields are still missing — ask about those next, one at a time.',
        parameters: stateUpdateSchema,
        execute: async (update) => {
          state = applyUpdate(state, update);
          const progress = computeProgress(state);
          logEvent('state_updated', {
            collected: progress.collected.length,
            missing: progress.missingRequired.length,
            percent: progress.percent,
          });
          publishState();
          if (!state.intent) {
            return 'Recorded. Intent is still unknown — find out whether this is a new project, an improvement, a repair, or a general consultation.';
          }
          if (progress.missingRequired.length > 0) {
            return `Recorded. Still missing (required): ${progress.missingRequired.join(', ')}. Ask about ONE of these next.`;
          }
          return 'Recorded. All required fields are collected — you may now call generate_estimate, or ask about optional details first if natural.';
        },
      }),

      generate_estimate: llm.tool({
        description:
          'Generate the preliminary estimate once all required requirement fields are collected. You provide only classifications; the server computes every number. Returns the figures to present.',
        parameters: estimateInputSchema,
        execute: async (input) => {
          try {
            estimate = buildPreliminaryEstimate(state, input);
          } catch (e) {
            const code = e instanceof EstimateError ? e.code : 'invalid_input';
            logEvent('estimate_rejected', { code });
            if (code === 'not_ready') {
              const progress = computeProgress(state);
              return `Cannot estimate yet — missing required fields: ${progress.missingRequired.join(', ')}. Collect those first.`;
            }
            return 'The estimate input was invalid. Re-check the module list and classifications, then try once more.';
          }
          estimatePresented = true;
          logEvent('estimate_generated', {
            hours_max: estimate.total_hours_max,
            cost_max: estimate.total_cost_max,
            confidence: estimate.confidence,
          });
          publishState();
          return (
            `PRELIMINARY estimate (present briefly, then ask the visitor to confirm the summary): ${describeEstimate(estimate)}. ` +
            `Say clearly this is preliminary and a consultant will confirm the final quote. ` +
            `Requirement summary to read back: ${buildSummary(state).slice(0, 1200)}`
          );
        },
      }),

      mark_confirmed: llm.tool({
        description:
          'Record that the visitor clearly confirmed the requirement summary and preliminary estimate. Call this ONLY after an explicit yes, and quote their confirming words.',
        parameters: z
          .object({ visitor_words: z.string().trim().min(2).max(300) })
          .strict(),
        execute: async ({ visitor_words }) => {
          // Server-side gate: confirmation is meaningless before an estimate
          // was actually generated and presented.
          if (!estimate || !estimatePresented) {
            return 'No estimate has been presented yet — generate and present it before asking for confirmation.';
          }
          state.confirmedAt = new Date().toISOString();
          logEvent('confirmation_requested', { confirmed: true });
          publishState();
          return `Confirmation recorded ("${visitor_words.slice(0, 120)}"). Now collect full name, email, mobile number, optional company and preferred contact method — one at a time, reading email and phone back for verification.`;
        },
      }),

      verify_contact: llm.tool({
        description:
          'Validate the collected contact details. Returns exact read-back strings for the email (letter by letter) and phone (digit by digit) — read them to the visitor and get a yes before submitting.',
        parameters: z
          .object({
            name: z.string().trim().min(2).max(100),
            email: z.string().trim().max(254),
            phone: z.string().trim().max(30),
            company: z.string().trim().max(150).optional(),
            preferred_contact_method: z.enum(['email', 'phone', 'whatsapp']),
          })
          .strict(),
        execute: async (args) => {
          const email = args.email.toLowerCase();
          if (!isValidEmail(email)) {
            return 'That email address is not valid — ask the visitor to repeat it slowly.';
          }
          const phone = normalizePhone(args.phone);
          if (!phone) {
            return 'That phone number is not valid — ask for it again with the country code.';
          }
          contact = {
            name: args.name,
            email,
            phone,
            company: args.company || undefined,
            preferredContactMethod: args.preferred_contact_method,
          };
          return (
            `Details are valid. Read back to the visitor for confirmation — email: "${spellEmailForReadback(email)}", ` +
            `phone: "${spellPhoneForReadback(phone)}". After they confirm both, ask for contact consent and (optionally) transcript consent, then call submit_lead.`
          );
        },
      }),

      set_transcript_consent: llm.tool({
        description:
          'Record whether the visitor consents to storing the conversation transcript excerpt with their request. Default is false (summary only).',
        parameters: z.object({ consent: z.boolean() }).strict(),
        execute: async ({ consent }) => {
          state.transcriptConsent = consent;
          return consent
            ? 'Transcript consent recorded — the excerpt will be stored with their request.'
            : 'No transcript will be stored — only a short summary.';
        },
      }),

      submit_lead: llm.tool({
        description:
          'Store the confirmed requirement, estimate and contact details, and send the confirmation emails. Call only after: estimate confirmed, contact details verified and read back, and the visitor gave contact consent.',
        parameters: submissionToolParameters,
        execute: async ({ contact_consent, human_review, review_message }) => {
          // Server-side authorization chain — none of this trusts the model:
          if (!contact_consent) {
            return CONSENT_REQUIRED_REPLY;
          }
          if (!backend || !sessionId) {
            return 'Submissions are not available right now. Apologize and point the visitor to the contact form at /contact.';
          }
          if (!estimate || !state.confirmedAt) {
            return 'Cannot submit: the visitor has not confirmed a presented estimate yet.';
          }
          if (!contact) {
            return 'Cannot submit: contact details have not been verified with verify_contact.';
          }
          if (submittedReference) {
            return `Already submitted — the reference code is ${submittedReference}. Do not submit again.`;
          }
          const args: SubmitLeadArgs = {
            sessionId,
            state,
            estimate,
            contact,
            consentAt,
            transcriptSummary: buildSummary(state).slice(0, 1900),
            transcriptExcerpt: state.transcriptConsent ? transcript.excerpt() : null,
            humanReview: human_review,
            reviewMessage: review_message,
          };
          lastSubmitArgs = args;
          const result = await backend.submitLead(args);
          if (result.ok && result.referenceCode) {
            submittedReference = result.referenceCode;
            logEvent(human_review ? 'review_requested' : 'lead_submitted', { ok: true });
            publishState();
            const spaced = result.referenceCode.split('').join(' ');
            return `Stored successfully. Tell the visitor their reference code slowly: ${spaced} (written ${result.referenceCode}). Remind them a consultant reviews everything before any final quotation, and they will receive an email summary.`;
          }
          if (result.error === 'duplicate_submission') {
            return 'This session was already submitted earlier. Tell the visitor their request is already recorded.';
          }
          logEvent('error', { where: 'submit_lead', code: result.error ?? 'unknown', status: result.status });
          return 'Saving failed. Apologize briefly and offer the contact form at /contact or a scheduled call at /schedule-call instead. Do not retry more than once.';
        },
      }),
    };

    // ---- voice pipeline -------------------------------------------------------
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad as silero.VAD,
      stt: createStt(),
      llm: createLlm(),
      tts: new elevenlabs.TTS({
        model: process.env.ELEVENLABS_MODEL ?? 'eleven_turbo_v2_5', // multilingual incl. hi
        voiceId: process.env.ELEVENLABS_VOICE_ID,
      }),
      // Natural turn handling with barge-in: interruptions enabled (default),
      // small endpointing delays so Buddy does not talk over slow speakers.
      turnHandling: {
        // MILLISECONDS in @livekit/agents 1.7.x (defaults 500 / 3000).
        endpointing: { minDelay: ENDPOINTING_MIN_DELAY_MS, maxDelay: ENDPOINTING_MAX_DELAY_MS },
      },
      // Idle visitors: mark away, then we close below. Seconds.
      userAwayTimeout: limits.idleTimeoutSeconds,
      maxToolSteps: 4,
      // A timed-out LLM attempt yields NO reply and NO exception, so the
      // framework's 10 s default would silently drop slow turns (config.ts).
      connOptions: { llmConnOptions: loadLlmConnOptions() },
    });

    // ---- greeting: exactly once, only on a running session ------------------
    const clientPresent = () =>
      hasClientParticipant(ctx.room.remoteParticipants.values(), ParticipantKind.AGENT, participant.identity);

    const greeting = createGreetingGate({
      text: () => GREETING,
      canSpeak: () => canSpeak(session),
      clientPresent,
      say: async (text, signal) => {
        const handle = session.say(text, { allowInterruptions: true });
        if (signal.aborted) {
          handle.interrupt();
          return;
        }
        const onAbort = () => handle.interrupt();
        signal.addEventListener('abort', onAbort, { once: true });
        try {
          await handle;
        } finally {
          signal.removeEventListener('abort', onAbort);
        }
      },
      onEvent: (event, data = {}) => logLifecycle(event, { mode: 'voice', ...data }),
    });

    // onEnter runs from inside the AgentActivity once it resumes scheduling —
    // the session is provably running there, so no sleep/poll is needed.
    class BuddyAgent extends voice.Agent {
      override async onEnter(): Promise<void> {
        logLifecycle('agent_activity_entered', { mode: 'voice' });
        await greeting.speak();
      }
    }

    const agent = new BuddyAgent({
      instructions: buildSystemPrompt(knowledge),
      tools,
    });

    // ---- limits, auditing, transcripts ----------------------------------------
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (!ev.isFinal) return;
      turnCount += 1;
      transcript.add('user', ev.transcript, Date.now());
      const guard = screenUserInput(ev.transcript);
      if (guard.flagged) {
        logEvent('guard_triggered', { pattern: guard.reason ?? 'unknown', turn: turnCount });
      }
      if (turnCount >= limits.maxLlmTurns) {
        logEvent('turn_limit_reached', { turns: turnCount });
        if (canSpeak(session)) {
          void session.say(
            'We have covered a lot — let me stop here. Please use the contact form or schedule a call to continue. Thank you!',
          );
        }
        void endSession('turn_limit');
      }
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      if (ev.item.type === 'message' && ev.item.role === 'assistant') {
        transcript.add('buddy', ev.item.textContent ?? '', Date.now());
      }
    });

    session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev) => {
      if (ev.newState === 'away') {
        logEvent('idle_timeout', { turns: turnCount });
        void endSession('idle_timeout');
      }
    });

    session.on(voice.AgentSessionEventTypes.Error, (ev) => {
      // Provider/timeout errors: audit privately, keep the visitor safe.
      logEvent('provider_error', { label: String(ev.error?.type ?? 'unknown').slice(0, 100) });
    });

    session.on(voice.AgentSessionEventTypes.SessionUsageUpdated, (ev) => {
      // Usage counters only — never prompt content.
      const total = ev.usage.modelUsage.reduce((s, u) => {
        const withTokens = u as { inputTokens?: number; outputTokens?: number };
        return s + (withTokens.inputTokens ?? 0) + (withTokens.outputTokens ?? 0);
      }, 0);
      if (total > 0) logEvent('usage', { tokens: total, turns: turnCount });
    });

    // `sessionOver` keeps the job alive for the whole conversation; it settles
    // on session close, room disconnect or our own endSession — never merely
    // because setup finished.
    const runGate = createRunGate((reason) => {
      clearTimeout(maxDurationTimer);
      greeting.cancel();
      detachShutdownSignal();
      logLifecycle('cleanup', { mode: 'voice', reason, turns: turnCount });
    });
    // A worker drain must not wedge the entry function below.
    const detachShutdownSignal = onJobShutdownSignal((reason) => runGate.end(reason));
    const cleanup = runGate.end;

    /** Single in-flight teardown; every close path awaits the same promise. */
    let endPromise: Promise<void> | null = null;
    const endSession = (reason: string): Promise<void> => {
      if (endPromise) {
        cleanup(reason);
        return endPromise;
      }
      endPromise = doEndSession(reason);
      return endPromise;
    };

    const doEndSession = async (reason: string) => {
      cleanup(reason);
      if (backend && sessionId) {
        const status =
          reason === 'completed' || submittedReference ? 'completed' : reason === 'error' ? 'error' : 'abandoned';
        await backend
          .sessionStatus(sessionId, status, {
            disconnectReason: reason,
            turnCount,
            language: state.language,
            ended: true,
          })
          .catch(() => undefined);
        logEvent('session_ended', { reason, turns: turnCount });
      }
      // If emails failed on submit, one retry attempt on the way out.
      if (backend && lastSubmitArgs && submittedReference) {
        await backend.retryNotifications(lastSubmitArgs).catch(() => undefined);
      }
      await session.close().catch(() => undefined);
    };

    const maxDurationTimer = setTimeout(() => {
      logEvent('duration_limit_reached', { seconds: limits.maxSessionSeconds });
      if (canSpeak(session)) {
        void session.say(
          'Our session time is up — thank you for talking with me! You can continue via the contact page.',
        );
      }
      setTimeout(() => void endSession('duration_limit'), 8000);
    }, limits.maxSessionSeconds * 1000);

    session.on(voice.AgentSessionEventTypes.Close, (ev) => {
      logLifecycle('session_closed', { mode: 'voice', reason: String(ev.reason) });
      cleanup(`session_close:${String(ev.reason)}`);
    });

    ctx.room.on(RoomEvent.Disconnected, () => {
      logLifecycle('room_disconnected', { mode: 'voice' });
      cleanup('room_disconnected');
    });

    ctx.room.on(RoomEvent.ParticipantDisconnected, () => {
      if (clientPresent()) return;
      logLifecycle('client_left', { mode: 'voice', turns: turnCount });
      greeting.cancel();
    });

    ctx.addShutdownCallback(async () => {
      await endSession('shutdown');
    });

    logLifecycle('session_starting', { mode: 'voice' });
    await session.start({
      agent,
      room: ctx.room,
      // Text input (lk.chat) stays enabled — the browser's text fallback and
      // transcription forwarding to the UI both ride on the defaults.
      // No recording of any kind: raw audio is never stored (privacy default).
      record: false,
    });
    // start() resolves even when the AgentActivity failed to start (the
    // framework swallows it with Promise.allSettled). Surface that here rather
    // than letting the first say() report a bogus "session is closing".
    assertSessionRunning(session, 'buddy entry');
    logLifecycle('session_running', { mode: 'voice' });

    if (backend && sessionId) {
      await backend.sessionStatus(sessionId, 'active', { started: true }).catch(() => undefined);
      logEvent('session_started', {});
    }
    publishState();

    // The greeting already ran (or was deliberately skipped) in
    // BuddyAgent.onEnter — nothing to schedule here.
    await runGate.finished;
    await endSession('session_over');
    logLifecycle('session_finished', {
      mode: 'voice',
      turns: turnCount,
      greeting: greeting.outcome ?? 'none',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: import.meta.filename,
    // Explicit dispatch name so only Buddy rooms get this worker on LiveKit
    // Cloud; rooms are created by the livekit-token function.
    agentName: process.env.BUDDY_AGENT_NAME ?? 'buddy-it-manager',
  }),
);
