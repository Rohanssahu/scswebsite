// =============================================================================
// Buddy agent — AI Consultation Meeting mode.
//
// Runs when a room is dispatched with participant metadata
// `{ mode: 'consultation', meetingId }` (minted server-side by the
// consultation-meeting Edge Function — never by the browser). Reuses the same
// voice pipeline (Silero VAD → OpenAI STT → provider LLM → ElevenLabs TTS),
// the same deterministic estimate engine, and the same strict-tool posture as
// the general Buddy flow; persistence goes through the consultation-agent
// Edge Function with the shared VOICE_AGENT_SECRET.
//
// The pure helpers at the top (snapshot seeding, proposal wire building,
// finalize payload) are unit-tested in meeting.test.ts.
// =============================================================================

import { type JobContext, llm, voice } from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import type * as silero from '@livekit/agents-plugin-silero';
import { ParticipantKind, RoomEvent } from '@livekit/rtc-node';
import { z } from 'zod';
import {
  ConsultationClient,
  loadConsultationBackendConfig,
  type ContactDetails,
  type MeetingContext,
} from './backend.js';
import {
  CONSULTATION_LANGUAGE,
  VAD_ACTIVATION_THRESHOLD,
  VAD_MIN_SILENCE_MS,
  VAD_MIN_SPEECH_MS,
  loadConsultationTurnTaking,
  loadConsultationVoiceSettings,
  loadLlmConnOptions,
  loadSessionLimits,
} from './config.js';
import {
  EstimateError,
  buildPreliminaryEstimate,
  describeEstimate,
  estimateInputSchema,
  estimateNarrative,
  type EstimateInput,
  type PreliminaryEstimate,
} from './estimate.js';
import {
  isValidEmail,
  normalizePhone,
  screenUserInput,
  spellEmailForReadback,
  spellPhoneForReadback,
} from './guards.js';
import { loadKnowledge } from './knowledge.js';
import {
  LLM_RECOVERY_TEXT,
  LLM_UNAVAILABLE_TEXT,
  STT_UNAVAILABLE_TEXT,
  buildConsultationPrompt,
  consultationGreetingSpoken,
} from './prompts.js';
import { createGreetingGate } from './greeting.js';
import { createOpeningRouter, type OpeningRouter } from './opening.js';
import { createSilenceReminder } from './silence.js';
import { CONSENT_REQUIRED_REPLY, submissionToolParameters } from './tool_params.js';
import { buildConsultationTurnHandling, isConfirmedClientTurn } from './turn_taking.js';
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
import {
  applyUpdate,
  buildSummary,
  computeProgress,
  emptyState,
  requirementFieldsSchema,
  stateUpdateSchema,
  type ProjectState,
  type RequirementFields,
} from './state.js';

const STATE_TOPIC = 'buddy.state';
/** Consecutive non-recoverable LLM failures before the meeting is closed
 * politely. Below this, Buddy asks the client to repeat the turn; at it, no
 * further turn can succeed either (an exhausted quota or a dead key fails
 * every request), so asking again would only waste the client's time. */
const MAX_CONSECUTIVE_LLM_FAILURES = 3;
/** The agent framework's own chat topic (see @livekit/agents `TOPIC_CHAT`).
 * Inbound it carries the client's typed messages; outbound Buddy uses it for
 * detail that belongs in writing rather than in speech. */
const CHAT_TOPIC = 'lk.chat';

// =============================================================================
// Pure helpers (unit-tested)
// =============================================================================

/** Analysis snapshot as stored by the consultation-meeting Edge Function. */
export interface StoredAnalysisSnapshot {
  mode?: unknown;
  source?: unknown;
  projectType?: unknown;
  platforms?: unknown;
  features?: unknown;
  currentCondition?: unknown;
  technologyPreferences?: unknown;
  existingProblems?: unknown;
  missingFeatures?: unknown;
  priorities?: unknown;
  reported?: unknown;
  /** The budget the client selected on the website, in whole USD, or null. */
  selectedBudgetUsd?: unknown;
}

const asStr = (v: unknown, max = 500): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

const asList = (v: unknown, maxItems = 25, maxLen = 200): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .slice(0, maxItems)
        .map((i) => i.trim().slice(0, maxLen))
    : [];

/**
 * Seed the requirement state from the (server-sanitized) analysis snapshot.
 * Only fills fields that are still empty, so previously saved answers — e.g.
 * after a reconnect — always win. Returns the seeded state and the list of
 * field names now known (used to tell the LLM what NOT to re-ask).
 */
export function seedStateFromSnapshot(
  state: ProjectState,
  snapshot: StoredAnalysisSnapshot,
): { state: ProjectState; knownFields: string[] } {
  const mode = snapshot.mode === 'new' || snapshot.mode === 'existing' ? snapshot.mode : null;
  if (!mode) return { state, knownFields: [] };

  const next: ProjectState = { ...state, fields: { ...state.fields } };
  if (!next.intent) next.intent = mode === 'existing' ? 'improve_existing' : 'new_project';

  const setIfEmpty = (key: keyof RequirementFields, value: string | string[] | null) => {
    if (value === null || (Array.isArray(value) && value.length === 0)) return;
    const current = next.fields[key];
    const empty = current === undefined || (Array.isArray(current) && current.length === 0);
    if (empty) (next.fields as Record<string, string | string[]>)[key] = value;
  };

  setIfEmpty('platforms', asList(snapshot.platforms, 10, 120));
  setIfEmpty('core_features', asList(snapshot.features));
  const tech = asStr(snapshot.technologyPreferences);
  if (mode === 'existing') {
    setIfEmpty('current_technology', tech);
    setIfEmpty('current_status', asStr(snapshot.currentCondition, 500));
    const problems = asList(snapshot.existingProblems, 15, 300);
    setIfEmpty('main_problems', problems.length ? problems.join('; ').slice(0, 500) : null);
  } else {
    setIfEmpty('preferred_technology', tech);
  }

  const missing = asList(snapshot.missingFeatures, 15, 200);
  if (missing.length) {
    next.suggestedFeatures = [...new Set([...next.suggestedFeatures, ...missing])].slice(0, 25);
  }
  const priorities = asList(snapshot.priorities, 10, 200);
  if (priorities.length) {
    next.assumptions = [
      ...new Set([...next.assumptions, ...priorities.map((p) => `Client priority: ${p}`)]),
    ].slice(0, 25);
  }

  // The budget the client already chose on the website. Seeding it means Buddy
  // starts from their figure instead of asking for it again — and the estimate
  // engine re-parses it from here, so the meeting quotes the same budget the
  // report did.
  const snapshotBudget = typeof snapshot.selectedBudgetUsd === 'number' && Number.isFinite(snapshot.selectedBudgetUsd)
    ? Math.max(0, Math.floor(snapshot.selectedBudgetUsd))
    : null;
  if (snapshotBudget && snapshotBudget > 0) {
    setIfEmpty('budget_range', `$${snapshotBudget.toLocaleString('en-US')}`);
  }

  const knownFields = Object.keys(next.fields).filter((k) => {
    const v = next.fields[k as keyof RequirementFields];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  return { state: next, knownFields };
}

/** Restore state from the requirements previously saved for this meeting
 * (reconnect / rejoin) — confirmed answers are never lost. */
export function seedStateFromSaved(state: ProjectState, saved: Record<string, unknown>): ProjectState {
  const next: ProjectState = { ...state, fields: { ...state.fields } };
  const intent = saved.intent;
  if (
    !next.intent &&
    (intent === 'new_project' || intent === 'improve_existing' || intent === 'repair_broken' || intent === 'consultation')
  ) {
    next.intent = intent;
  }
  const fieldsOnly: Record<string, unknown> = { ...saved };
  delete fieldsOnly.intent;
  delete fieldsOnly.assumptions;
  delete fieldsOnly.contradictions;
  delete fieldsOnly.risks;
  delete fieldsOnly.suggested_features;
  delete fieldsOnly.deferred_decisions;
  const parsed = requirementFieldsSchema.safeParse(fieldsOnly);
  if (parsed.success) next.fields = { ...parsed.data, ...next.fields };
  next.assumptions = [...new Set([...asList(saved.assumptions), ...next.assumptions])].slice(0, 25);
  next.risks = [...new Set([...asList(saved.risks), ...next.risks])].slice(0, 25);
  next.suggestedFeatures = [...new Set([...asList(saved.suggested_features), ...next.suggestedFeatures])].slice(0, 25);
  next.deferredDecisions = [...new Set([...asList(saved.deferred_decisions), ...next.deferredDecisions])].slice(0, 25);
  return next;
}

/** Plain-text rendering of the snapshot for the system prompt. */
export function renderSnapshotSummary(snapshot: StoredAnalysisSnapshot): string {
  const mode = snapshot.mode === 'new' || snapshot.mode === 'existing' ? snapshot.mode : null;
  if (!mode) return '';
  const lines: string[] = [`- Project mode: ${mode === 'new' ? 'new project' : 'existing project'}`];
  const push = (label: string, value: string | null) => {
    if (value) lines.push(`- ${label}: ${value}`);
  };
  push('Project type', asStr(snapshot.projectType, 200));
  const platforms = asList(snapshot.platforms, 10, 120);
  if (platforms.length) lines.push(`- Platforms: ${platforms.join(', ')}`);
  const features = asList(snapshot.features);
  if (features.length) lines.push(`- Features: ${features.join(', ')}`);
  push('Current condition', asStr(snapshot.currentCondition, 500));
  push('Technology preferences', asStr(snapshot.technologyPreferences, 300));
  const problems = asList(snapshot.existingProblems, 15, 300);
  if (problems.length) lines.push(`- Known problems: ${problems.join('; ')}`);
  const missing = asList(snapshot.missingFeatures, 15, 200);
  if (missing.length) lines.push(`- Missing features: ${missing.join(', ')}`);
  const priorities = asList(snapshot.priorities, 10, 200);
  if (priorities.length) lines.push(`- Client priorities: ${priorities.join(', ')}`);
  const snapshotBudget = typeof snapshot.selectedBudgetUsd === 'number' && snapshot.selectedBudgetUsd > 0
    ? Math.floor(snapshot.selectedBudgetUsd)
    : null;
  if (snapshotBudget) {
    lines.push(
      `- Selected budget: $${snapshotBudget.toLocaleString('en-US')} (already recorded — do NOT ask for it again; ` +
        'confirm it once if anything suggests it changed, and report it to update_proposal as client_budget_usd).',
    );
  }
  if (snapshot.source === 'basic' || snapshot.source === 'demo') {
    lines.push(
      '- That analysis was produced by the basic (non-AI) estimator, not by an AI analysis. Do not describe it as an AI analysis.',
    );
  }
  const reported = snapshot.reported;
  if (typeof reported === 'object' && reported !== null) {
    lines.push(
      '- The client already saw a preliminary estimate on the website. Treat its figures as UNVERIFIED here — your proposal numbers come only from the update_proposal tool.',
    );
  }
  return lines.join('\n').slice(0, 4000);
}

/** Narrative content of the proposal — classified by the LLM; contains no
 * numbers that reach storage (all arithmetic comes from the engine). */
export const proposalContentSchema = z
  .object({
    summary: z.string().trim().min(10).max(2000),
    recommended_solution: z.array(z.string().trim().min(1).max(200)).min(1).max(15),
    technology_stack: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
    in_scope: z.array(z.string().trim().min(1).max(200)).min(1).max(25),
    out_of_scope: z.array(z.string().trim().min(1).max(200)).max(25).default([]),
    ai_roles: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
    human_roles: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
    milestones: z
      .array(z.object({ title: z.string().trim().min(1).max(200), weeks: z.string().trim().min(1).max(40) }).strict())
      .max(12)
      .default([]),
    dependencies: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
  })
  .strict();

export type ProposalContent = z.infer<typeof proposalContentSchema>;

/** Combined tool input: engine classification + narrative content. */
export const updateProposalSchema = estimateInputSchema.extend(proposalContentSchema.shape).strict();
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

/** Split the combined tool input back into engine vs narrative halves. */
export function splitProposalInput(input: UpdateProposalInput): { estimate: EstimateInput; content: ProposalContent } {
  const {
    summary,
    recommended_solution,
    technology_stack,
    in_scope,
    out_of_scope,
    ai_roles,
    human_roles,
    milestones,
    dependencies,
    ...estimate
  } = input;
  return {
    estimate: estimate as EstimateInput,
    content: {
      summary,
      recommended_solution,
      technology_stack,
      in_scope,
      out_of_scope,
      ai_roles,
      human_roles,
      milestones,
      dependencies,
    },
  };
}

/** Build the exact wire payload the consultation-agent Edge Function
 * re-validates (sanitizeProposal). Every number comes from the engine. */
export function buildProposalWire(estimate: PreliminaryEstimate, content: ProposalContent): Record<string, unknown> {
  return {
    config_version: estimate.config_version,
    currency: estimate.currency,
    hourly_rate_min: estimate.hourly_rate_min,
    hourly_rate_max: estimate.hourly_rate_max,
    weekly_capacity_hours: estimate.weekly_capacity_hours,
    role_hours: estimate.role_hours,
    total_hours_min: estimate.total_hours_min,
    total_hours_max: estimate.total_hours_max,
    total_cost_min: estimate.total_cost_min,
    total_cost_max: estimate.total_cost_max,
    duration_weeks_min: estimate.duration_weeks_min,
    duration_weeks_max: estimate.duration_weeks_max,
    confidence: estimate.confidence,
    modules: estimate.modules,
    // The budget-fit snapshot: what the client's budget covers, what is
    // deferred, and the two optional tiers. consultation-agent re-validates it.
    budget_plan: estimate.budget_plan,
    summary: content.summary,
    recommended_solution: content.recommended_solution,
    architecture: estimate.architecture,
    technology_stack: content.technology_stack,
    in_scope: content.in_scope,
    out_of_scope: [...content.out_of_scope, ...estimate.exclusions].slice(0, 25),
    ai_roles: content.ai_roles,
    human_roles: content.human_roles.length ? content.human_roles : estimate.team_roles,
    milestones: content.milestones,
    assumptions: estimate.assumptions,
    dependencies: content.dependencies,
    risks: estimate.risks,
  };
}

/** Browser-facing proposal view published on the buddy.state data topic. */
export function buildProposalView(
  estimate: PreliminaryEstimate,
  content: ProposalContent,
  version: number,
): Record<string, unknown> {
  return {
    version,
    status: 'preliminary',
    requiresHumanReview: true,
    summary: content.summary,
    recommendedSolution: content.recommended_solution,
    architecture: estimate.architecture,
    technologyStack: content.technology_stack,
    inScope: content.in_scope,
    outOfScope: [...content.out_of_scope, ...estimate.exclusions].slice(0, 25),
    aiRoles: content.ai_roles,
    humanRoles: content.human_roles.length ? content.human_roles : estimate.team_roles,
    milestones: content.milestones,
    assumptions: estimate.assumptions,
    dependencies: content.dependencies,
    risks: estimate.risks,
    totalHoursMin: estimate.total_hours_min,
    totalHoursMax: estimate.total_hours_max,
    totalCostMin: estimate.total_cost_min,
    totalCostMax: estimate.total_cost_max,
    durationWeeksMin: estimate.duration_weeks_min,
    durationWeeksMax: estimate.duration_weeks_max,
    weeklyCapacityHours: estimate.weekly_capacity_hours,
    hourlyRateUsd: estimate.hourly_rate_max,
    currency: estimate.currency,
    confidence: estimate.confidence,
    // Rendered by the client's Live Proposal panel. Buddy is told to speak
    // these same sentences, so the spoken and on-screen figures cannot differ.
    budgetPlan: estimate.budget_plan,
    budgetNarrative: estimateNarrative(estimate),
    estimateVersion: estimate.budget_plan.estimate_version,
  };
}

export interface FinalizeConsultationArgs {
  meetingId: string;
  state: ProjectState;
  proposalWire: Record<string, unknown>;
  contact: ContactDetails;
  consentAt: string;
  humanReview: boolean;
  reviewMessage?: string;
}

/** Build the exact finalize wire payload consultation-agent validates. Pure. */
export function buildFinalizePayload(args: FinalizeConsultationArgs): Record<string, unknown> {
  const { state } = args;
  if (!state.intent) throw new Error('intent missing');
  if (!state.confirmedAt) throw new Error('client has not confirmed');
  return {
    action: 'finalize',
    meeting_id: args.meetingId,
    user_confirmed: true,
    confirmed_at: state.confirmedAt,
    consent: true,
    consent_at: args.consentAt,
    intent: state.intent,
    contact: {
      name: args.contact.name,
      email: args.contact.email,
      phone: args.contact.phone,
      company: args.contact.company ?? '',
      preferred_contact_method: args.contact.preferredContactMethod,
    },
    fields: {
      ...state.fields,
      ...(state.assumptions.length ? { assumptions: state.assumptions } : {}),
      ...(state.contradictions.length ? { contradictions: state.contradictions } : {}),
      ...(state.risks.length ? { risks: state.risks } : {}),
      ...(state.suggestedFeatures.length ? { suggested_features: state.suggestedFeatures } : {}),
      ...(state.deferredDecisions.length ? { deferred_decisions: state.deferredDecisions } : {}),
    },
    requirement_summary: buildSummary(state),
    selected_language: state.language,
    proposal: args.proposalWire,
    human_review: args.humanReview,
    ...(args.humanReview && args.reviewMessage ? { review_message: args.reviewMessage } : {}),
  };
}

// =============================================================================
// Runtime
// =============================================================================

export interface ConsultationMeta {
  meetingId: string;
  preferredLanguage: string | null;
  /** Identity of the human participant the job waited for. Used to detect a
   * client that leaves before/while the greeting plays. */
  clientIdentity?: string | null;
}

export async function runConsultationMeeting(ctx: JobContext, meta: ConsultationMeta): Promise<void> {
  const limits = loadSessionLimits();
  const knowledge = loadKnowledge();
  const backendConfig = loadConsultationBackendConfig();
  const client = backendConfig ? new ConsultationClient(backendConfig) : null;
  const meetingId = meta.meetingId;

  // ---- meeting context (server-to-server; the browser provides nothing) -----
  let context: MeetingContext | null = null;
  if (client) {
    context = await client.loadContext(meetingId);
    if (!context) {
      // one retry — a cold function boot should not kill the meeting
      context = await client.loadContext(meetingId);
    }
  }

  const logEvent = (eventType: string, data: Record<string, string | number | boolean> = {}) => {
    if (client) void client.meetingEvent(meetingId, eventType, data).catch(() => undefined);
  };

  // ---- per-meeting state (server-side only; never model-writable) -----------
  let state: ProjectState = emptyState();
  if (context) {
    state = seedStateFromSaved(state, context.requirements);
  }
  const snapshot = (context?.analysisSnapshot ?? {}) as StoredAnalysisSnapshot;
  const seeded = seedStateFromSnapshot(state, snapshot);
  state = seeded.state;
  const hasAnalysis = seeded.knownFields.length > 0 || Boolean(snapshot.mode);
  // ENGLISH ONLY. A `preferredLanguage` may still be stored on the meeting row
  // (the scheduler collects it, and the UI displays it), but the consultation
  // conversation itself is English: Buddy neither asks for a language nor
  // switches to one. Pinning the state here also makes the meeting UI show
  // "English" as soon as the agent joins, without touching the UI.
  state.language = CONSULTATION_LANGUAGE;
  state.transcriptConsent = context?.transcriptConsent ?? false;
  const consentAt = context?.consentAt ?? new Date().toISOString();

  let estimate: PreliminaryEstimate | null = null;
  let proposalContent: ProposalContent | null = null;
  let proposalVersion = 0;
  /** Bumped on every (re)estimate so a budget or scope change publishes a new
   * estimate version rather than silently mutating the old one. */
  let estimateRevision = 0;
  let proposalWire: Record<string, unknown> | null = null;
  let contact: ContactDetails | null = null;
  let submittedReference: string | null = null;
  let alreadyFinalized = context?.finalized ?? false;
  let turnCount = 0;

  const publishState = (extra: Record<string, unknown> = {}) => {
    const progress = computeProgress(state);
    const payload = {
      type: 'buddy.state',
      mode: 'consultation',
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
            hourlyRateUsd: estimate.hourly_rate_max,
            budgetPlan: estimate.budget_plan,
            budgetNarrative: estimateNarrative(estimate),
            estimateVersion: estimate.budget_plan.estimate_version,
            status: 'preliminary',
          }
        : null,
      proposal:
        estimate && proposalContent ? buildProposalView(estimate, proposalContent, proposalVersion) : null,
      confirmed: Boolean(state.confirmedAt),
      referenceCode: submittedReference,
      finalized: alreadyFinalized,
      ...extra,
    };
    const data = new TextEncoder().encode(JSON.stringify(payload));
    void ctx.room.localParticipant
      ?.publishData(data, { reliable: true, topic: STATE_TOPIC })
      .catch(() => undefined);
  };

  const fieldsForSave = (): Record<string, unknown> => ({
    ...state.fields,
    ...(state.intent ? { intent: state.intent } : {}),
    ...(state.assumptions.length ? { assumptions: state.assumptions } : {}),
    ...(state.contradictions.length ? { contradictions: state.contradictions } : {}),
    ...(state.risks.length ? { risks: state.risks } : {}),
    ...(state.suggestedFeatures.length ? { suggested_features: state.suggestedFeatures } : {}),
    ...(state.deferredDecisions.length ? { deferred_decisions: state.deferredDecisions } : {}),
  });

  const persistState = (transcriptConsent?: boolean) => {
    if (!client) return;
    void client
      .saveState(meetingId, fieldsForSave(), buildSummary(state).slice(0, 9500), state.language, transcriptConsent)
      .catch(() => undefined);
  };

  /**
   * Publishes a text-only note on the framework's `lk.chat` topic so long lists
   * land in the meeting chat instead of being read aloud. Buddy's SPOKEN words
   * already reach the chat via the `lk.transcription` stream, so this topic
   * never duplicates speech.
   */
  const sendChatNote = async (text: string): Promise<void> => {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed) return;
    await ctx.room.localParticipant?.sendText(trimmed, { topic: CHAT_TOPIC }).catch(() => undefined);
  };

  const persistMessage = (sender: 'client' | 'buddy', content: string) => {
    // Consent gate is re-checked server-side; this is just to avoid the call.
    if (!client || !state.transcriptConsent || !content.trim()) return;
    void client.saveMessage(meetingId, sender, content.trim().slice(0, 4000)).catch(() => undefined);
  };

  // ---- tools (STRICT schemas; server-side authorization inside each) ---------
  const tools = {
    // NOTE: there is deliberately NO set_language tool in a consultation
    // meeting. Buddy is English-only here, so the model has no capability to
    // switch languages and no reason to ask about one.

    send_chat_note: llm.tool({
      description:
        'Send a detailed list or block of text to the meeting CHAT instead of reading it aloud. Use for anything longer than about three items (feature lists, scope, milestones, technology options). Say one short sentence out loud about it; the detail goes here.',
      parameters: z
        .object({
          title: z.string().trim().min(2).max(120),
          lines: z.array(z.string().trim().min(1).max(300)).min(1).max(25),
        })
        .strict(),
      execute: async ({ title, lines }) => {
        const note = [`${title}:`, ...lines.map((line) => `- ${line}`)].join('\n').slice(0, 2000);
        await sendChatNote(note);
        persistMessage('buddy', note);
        logEvent('chat_note_sent', { lines: lines.length });
        return 'Sent to the meeting chat. Say ONE short sentence about it out loud — do not read the list.';
      },
    }),

    update_requirements: llm.tool({
      description:
        'Record newly learned requirement details after each client answer (spoken OR typed in chat). Only include fields the client actually addressed this turn. Returns which required fields are still missing — ask about those next, one at a time.',
      parameters: stateUpdateSchema,
      execute: async (update) => {
        state = applyUpdate(state, update);
        const progress = computeProgress(state);
        logEvent('state_updated', {
          collected: progress.collected.length,
          missing: progress.missingRequired.length,
          percent: progress.percent,
        });
        persistState();
        publishState();
        if (!state.intent) {
          return 'Recorded. Intent is still unknown — find out whether this is a new project, an improvement, a repair, or a general consultation.';
        }
        if (progress.missingRequired.length > 0) {
          return `Recorded. Still missing (required): ${progress.missingRequired.join(', ')}. Ask about ONE of these next.`;
        }
        return 'Recorded. All required fields are collected — call update_proposal now (or refresh it if answers changed), then keep clarifying optional details as natural.';
      },
    }),

    update_proposal: llm.tool({
      description:
        "Generate or refresh the preliminary proposal once the required requirement fields are collected. You provide only classifications (requirement tier + effort class), the budget the client stated, and narrative (solution, scope, roles, milestones); the server computes every hour, price, duration and budget-fit figure. Returns the EXACT sentences to say. Call it again whenever the client changes their budget or scope.",
      parameters: updateProposalSchema,
      execute: async (input) => {
        const { estimate: estimateInput, content } = splitProposalInput(input);
        estimateRevision += 1;
        try {
          estimate = buildPreliminaryEstimate(state, estimateInput, estimateRevision);
        } catch (e) {
          const code = e instanceof EstimateError ? e.code : 'invalid_input';
          logEvent('proposal_rejected', { code });
          if (code === 'not_ready') {
            const progress = computeProgress(state);
            return `Cannot build the proposal yet — missing required fields: ${progress.missingRequired.join(', ')}. Collect those first.`;
          }
          if (code === 'out_of_bounds') {
            return (
              'The budget the client stated does not fund any deliverable scope yet. Tell them that plainly and kindly, ' +
              'do NOT invent a lower figure, and ask which single business outcome a smaller Phase 1 should deliver. ' +
              'Then record their answer and try again.'
            );
          }
          return 'The proposal input was invalid. Re-check the scope classification, then try once more.';
        }
        proposalContent = content;
        proposalWire = buildProposalWire(estimate, content);
        proposalVersion += 1;
        if (client) {
          const saved = await client.saveProposal(meetingId, proposalWire).catch(() => null);
          if (saved?.ok && typeof saved.body?.version === 'number') {
            proposalVersion = saved.body.version as number;
          }
        }
        logEvent('proposal_generated', {
          version: proposalVersion,
          revision: estimateRevision,
          hours_max: estimate.total_hours_max,
          cost_max: estimate.total_cost_max,
          budget_fit_percent: estimate.budget_plan.budget_fit_percent,
          coverage_band: estimate.budget_plan.coverage_band,
          confidence: estimate.confidence,
        });
        publishState();
        return (
          `PRELIMINARY proposal v${proposalVersion}. Say the following figures EXACTLY as written — do not change, round or add to any number: ` +
          `"${describeEstimate(estimate)}" ` +
          `The same figures are visible in the client's Live Proposal panel, so any difference will be noticed. ` +
          `Then ask the client to confirm the requirement summary. ` +
          `Requirement summary to read back: ${buildSummary(state).slice(0, 1200)}`
        );
      },
    }),

    mark_confirmed: llm.tool({
      description:
        'Record that the client clearly confirmed the requirement summary and preliminary proposal. Call this ONLY after an explicit yes, and quote their confirming words.',
      parameters: z.object({ visitor_words: z.string().trim().min(2).max(300) }).strict(),
      execute: async ({ visitor_words }) => {
        if (!estimate || !proposalContent) {
          return 'No proposal has been presented yet — generate and present it before asking for confirmation.';
        }
        state.confirmedAt = new Date().toISOString();
        logEvent('confirmation_requested', { confirmed: true });
        publishState();
        return `Confirmation recorded ("${visitor_words.slice(0, 120)}"). Now verify the contact details on file — full name, email, mobile number, optional company and preferred contact method — reading email and phone back for verification (verify_contact).`;
      },
    }),

    verify_contact: llm.tool({
      description:
        'Validate the collected contact details. Returns exact read-back strings for the email (letter by letter) and phone (digit by digit) — read them to the client and get a yes before finalizing.',
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
          return 'That email address is not valid — ask the client to repeat it slowly.';
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
          `Details are valid. Read back to the client for confirmation — email: "${spellEmailForReadback(email)}", ` +
          `phone: "${spellPhoneForReadback(phone)}". After they confirm both, confirm transcript consent if not yet set, then call finalize_consultation when they say to submit.`
        );
      },
    }),

    set_transcript_consent: llm.tool({
      description:
        'Record whether the client consents to storing the meeting chat/transcript with their request. Default is false (structured summary only).',
      parameters: z.object({ consent: z.boolean() }).strict(),
      execute: async ({ consent }) => {
        state.transcriptConsent = consent;
        persistState(consent);
        return consent
          ? 'Transcript consent recorded — the meeting chat will be stored with their request.'
          : 'No transcript will be stored — only the structured requirement summary.';
      },
    }),

    finalize_consultation: llm.tool({
      description:
        'Store the confirmed requirements, proposal and contact details as a submission to SCS. Call only after: proposal confirmed, contact details verified and read back, and the client explicitly said to submit. Set human_review=true when they asked for a human project-manager review.',
      parameters: submissionToolParameters,
      execute: async ({ contact_consent, human_review, review_message }) => {
        // Server-side authorization chain — none of this trusts the model:
        if (!contact_consent) {
          return CONSENT_REQUIRED_REPLY;
        }
        if (!client) {
          return 'Submissions are not available right now. Apologize and point the client to the contact form at /contact.';
        }
        if (!estimate || !proposalWire || !state.confirmedAt) {
          return 'Cannot finalize: the client has not confirmed a presented proposal yet.';
        }
        if (!contact) {
          return 'Cannot finalize: contact details have not been verified with verify_contact.';
        }
        if (submittedReference) {
          return `Already submitted — the reference code is ${submittedReference}. Do not submit again.`;
        }
        if (alreadyFinalized) {
          return 'This meeting was already finalized earlier. Tell the client their request is already recorded with SCS.';
        }
        const payload = buildFinalizePayload({
          meetingId,
          state,
          proposalWire,
          contact,
          consentAt,
          humanReview: human_review,
          reviewMessage: review_message,
        });
        const result = await client.finalize(payload);
        if (result.ok && result.referenceCode) {
          submittedReference = result.referenceCode;
          alreadyFinalized = true;
          logEvent(human_review ? 'review_requested' : 'session_ended', { finalized: true });
          publishState();
          const spaced = result.referenceCode.split('').join(' ');
          return `Stored successfully. Tell the client their reference code slowly: ${spaced} (written ${result.referenceCode}). Remind them an SCS consultant reviews everything before any final quotation, and offer to continue discussing or end the meeting.`;
        }
        if (result.error === 'duplicate_submission') {
          alreadyFinalized = true;
          logEvent('duplicate_finalize_blocked');
          return 'This meeting was already finalized earlier. Tell the client their request is already recorded.';
        }
        logEvent('error', { where: 'finalize', code: result.error ?? 'unknown', status: result.status });
        return 'Saving failed. Apologize briefly and offer the contact form at /contact instead. Do not retry more than once.';
      },
    }),

    request_human_review: llm.tool({
      description:
        'Record that the client wants a human project-manager follow-up WITHOUT submitting the full requirement yet (before finalization). This is a request — never promise a confirmed meeting time.',
      parameters: z.object({ message: z.string().trim().max(2000).optional() }).strict(),
      execute: async ({ message }) => {
        logEvent('review_requested', { pre_finalize: true, has_message: Boolean(message) });
        return 'Noted — a human follow-up request will be attached when the consultation is submitted. Encourage the client to also confirm and submit the requirement so the SCS team has the full context. Never promise a specific meeting time.';
      },
    }),
  };

  // ---- voice pipeline ---------------------------------------------------------
  //
  // Deliberately slow and English-only. Every number below is a named constant
  // in config.ts with a validated env override — nothing is tuned inline and no
  // provider secret is read here.
  const voiceSettings = loadConsultationVoiceSettings();
  const turnTaking = loadConsultationTurnTaking();

  // The prewarmed VAD is shared with the general voice flow AND with any later
  // job that reuses this process, so retune it for this meeting instead of
  // loading a second ONNX model, and restore the general defaults on teardown.
  // `updateOptions` is the plugin's own API for exactly this; all values are
  // MILLISECONDS except the 0..1 activation threshold.
  const vad = ctx.proc.userData.vad as silero.VAD;
  vad.updateOptions({
    minSilenceDuration: turnTaking.vadMinSilenceMs,
    minSpeechDuration: turnTaking.vadMinSpeechMs,
    activationThreshold: turnTaking.vadActivationThreshold,
  });
  const restoreVad = () => {
    try {
      vad.updateOptions({
        minSilenceDuration: VAD_MIN_SILENCE_MS,
        minSpeechDuration: VAD_MIN_SPEECH_MS,
        activationThreshold: VAD_ACTIVATION_THRESHOLD,
      });
    } catch {
      // A disposed VAD on shutdown is not worth failing teardown over.
    }
  };

  const session = new voice.AgentSession({
    vad,
    // English only: the language is pinned so accented English is never
    // transcribed as another language (see src/providers/stt.ts).
    stt: createStt({ language: CONSULTATION_LANGUAGE }),
    llm: createLlm(),
    tts: new elevenlabs.TTS({
      model: process.env.ELEVENLABS_MODEL ?? 'eleven_turbo_v2_5',
      voiceId: process.env.ELEVENLABS_VOICE_ID,
      // Enforce English for both the model and text normalization.
      language: CONSULTATION_LANGUAGE,
      // The only voice fields the installed plugin sends (VoiceSettings):
      // slow speed, calm stability, high similarity, minimal style.
      voiceSettings,
      // Let ElevenLabs normalize numbers/dates so figures are spoken cleanly.
      applyTextNormalization: 'auto',
    }),
    // Endpointing floor/ceiling in MILLISECONDS, barge-in kept on with a
    // higher noise floor, and preemptive (interim-driven) generation OFF.
    // See src/turn_taking.ts.
    turnHandling: buildConsultationTurnHandling(turnTaking),
    // Seconds (framework default 15).
    userAwayTimeout: limits.idleTimeoutSeconds,
    maxToolSteps: 5,
    // A timed-out LLM attempt yields NO reply and NO exception, so the default
    // 10 s window would silently drop slow turns (see config.ts).
    connOptions: { llmConnOptions: loadLlmConnOptions() },
  });

  // ---- greeting: exactly once, only on a running session --------------------
  const clientPresent = () =>
    hasClientParticipant(ctx.room.remoteParticipants.values(), ParticipantKind.AGENT, meta.clientIdentity);

  // ---- the "no rush" reminder ------------------------------------------------
  const silence = createSilenceReminder({
    delayMs: turnTaking.silenceReminderMs,
    canSpeak: () => canSpeak(session),
    say: (text) => {
      void session.say(text, { allowInterruptions: true });
    },
    onEvent: (event, data = {}) => {
      logLifecycle(event, { mode: 'consultation', ...data });
      logEvent('silence_reminder', { after_ms: turnTaking.silenceReminderMs });
    },
  });

  const greeting = createGreetingGate({
    // ONE English greeting: the client's name, who Buddy is, and "how are you"
    // — nothing else. The project question follows only after they answer (see
    // the opening router below). The spoken form only adds paragraph breaks so
    // ElevenLabs pauses after each sentence.
    text: () => consultationGreetingSpoken(context?.clientName),
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
        // Awaited to completion: Buddy asks nothing else until the whole
        // greeting has played and then simply waits for the client.
        await handle;
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    },
    onEvent: (event, data = {}) => {
      logLifecycle(event, { mode: 'consultation', ...data });
      if (event === 'greeting_finished' && data.outcome === 'spoken') {
        logEvent('greeting_spoken', { has_analysis: hasAnalysis });
        // Buddy now holds the floor no longer: start the silence window.
        silence.waitForClient();
      }
    },
  });

  // ---- the scripted opening: "how are you", then new vs existing project ----
  //
  // Both opening questions have a fixed set of outcomes and scripted replies,
  // so they are answered HERE, deterministically, rather than by the LLM. The
  // router runs from `onUserTurnCompleted`, i.e. only on a CONFIRMED completed
  // turn — interim transcripts never reach it.
  const opening: OpeningRouter = createOpeningRouter({
    canSpeak: () => canSpeak(session),
    say: async (spoken) => {
      // `addToChatCtx: false`: the scripted line is written into the chat
      // context by onUserTurnCompleted below, together with the client's turn,
      // in one update. Letting say() append it too would either duplicate it or
      // be overwritten by that update.
      await session.say(spoken, { allowInterruptions: true, addToChatCtx: false });
      // ConversationItemAdded only fires for chat-context items, so the
      // scripted lines are persisted here instead — as one line, without the
      // playout paragraph breaks.
      persistMessage('buddy', spoken.replace(/\n\n/g, ' '));
    },
    setIntent: (intent) => {
      if (!state.intent) state.intent = intent;
      logEvent('opening_intent', { intent });
      persistState();
      publishState();
    },
    onEvent: (event, data = {}) => logLifecycle(event, { mode: 'consultation', ...data }),
  });

  /**
   * The greeting rides `onEnter` rather than a post-`start()` call: onEnter is
   * invoked by the AgentActivity itself, right after it resumes scheduling, so
   * the session is provably running and no sleep/poll is needed. It also runs
   * once per activity, and the gate makes it once per job.
   */
  class ConsultationAgent extends voice.Agent {
    override async onEnter(): Promise<void> {
      logLifecycle('agent_activity_entered', { mode: 'consultation' });
      await greeting.speak();
    }

    /**
     * Called by the framework ONCE per confirmed client turn, before any LLM
     * inference. Throwing `StopResponse` suppresses the LLM reply, which is how
     * the scripted opening answer stays scripted; the client's message is added
     * to the chat context by hand first, since the framework only does that on
     * the normal generation path.
     */
    override async onUserTurnCompleted(chatCtx: llm.ChatContext, newMessage: llm.ChatMessage): Promise<void> {
      if (!opening.active) return;
      const text = newMessage.textContent ?? '';
      const outcome = await opening.handleClientTurn(text);
      if (!outcome.handled) return;
      // The framework only records the client's message on the normal
      // generation path, which StopResponse skips — so write both halves of
      // this turn ourselves, or every later LLM turn would be missing the
      // client's answer and Buddy's scripted reply.
      chatCtx.insert(newMessage);
      chatCtx.addMessage({ role: 'assistant', content: outcome.reply });
      await this.updateChatCtx(chatCtx).catch(() => undefined);
      throw new voice.StopResponse();
    }
  }

  const agent = new ConsultationAgent({
    instructions: buildConsultationPrompt(knowledge, {
      clientName: context?.clientName ?? '',
      analysisSummary: hasAnalysis ? renderSnapshotSummary(snapshot) : '',
      knownFields: seeded.knownFields,
      transcriptConsent: state.transcriptConsent,
    }),
    tools,
  });

  // ---- limits, auditing, transcript persistence ---------------------------------
  //
  // A provider failure must never turn into silence: when the LLM gives up on a
  // turn, @livekit/agents closes the stream with no chunks and no exception, so
  // Buddy would simply never answer. One short recovery line per client turn
  // hands the turn back instead — and if the provider stays down (an exhausted
  // quota fails every single turn), the meeting is closed politely rather than
  // asking the client to repeat themselves forever. See the Error handler below.
  let recoverySpoken = false;
  let consecutiveLlmFailures = 0;
  let sttNoticeSpoken = false;

  session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
    // INTERIM transcripts are ignored outright: they never advance the turn
    // count, never reach the router and never trigger a reply. Only a confirmed,
    // non-empty final transcript counts as the client having spoken.
    if (!isConfirmedClientTurn(ev)) return;
    recoverySpoken = false;
    silence.clientSpoke();
    turnCount += 1;
    persistMessage('client', ev.transcript);
    const guard = screenUserInput(ev.transcript);
    if (guard.flagged) {
      logEvent('guard_triggered', { pattern: guard.reason ?? 'unknown', turn: turnCount });
    }
    if (turnCount >= limits.maxLlmTurns) {
      logEvent('turn_limit_reached', { turns: turnCount });
      if (canSpeak(session)) {
        void session.say(
          'We have covered a lot — let me stop here. Your progress is saved; you can rejoin this meeting or use the contact form to continue. Thank you!',
        );
      }
      void endSession('turn_limit');
    }
  });

  session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
    if (ev.item.type === 'message' && ev.item.role === 'assistant') {
      // The provider answered: the failure streak is over.
      consecutiveLlmFailures = 0;
      persistMessage('buddy', ev.item.textContent ?? '');
    }
  });

  // The reminder may only run while Buddy is genuinely waiting: it is held
  // whenever he is thinking or speaking, and re-armed when he goes back to
  // listening. 'idle' is the pre-first-turn state and is left to the greeting.
  session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev) => {
    if (ev.newState === 'thinking' || ev.newState === 'speaking') {
      silence.hold();
      return;
    }
    if (ev.newState === 'listening') silence.waitForClient();
  });

  // While the client is actually speaking, no reminder — however long the
  // sentence runs.
  session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev) => {
    if (ev.newState === 'speaking') {
      silence.hold();
      return;
    }
    if (ev.newState === 'away') {
      logEvent('idle_timeout', { turns: turnCount });
      void endSession('idle_timeout');
    }
  });

  session.on(voice.AgentSessionEventTypes.Error, (ev) => {
    const error = ev.error;
    logEvent('provider_error', { label: String(error?.type ?? 'unknown').slice(0, 100) });
    // Recoverable errors are the framework's own retries — it is still trying.
    if (!error || error.recoverable) return;
    // Speech-to-text down is the quietest failure of all: the client talks, no
    // transcript ever arrives, so no turn completes and Buddy has nothing to
    // answer. Say so once and point at the meeting chat, which reaches the same
    // conversation WITHOUT going through speech recognition.
    if (error.type === 'stt_error') {
      if (sttNoticeSpoken || !canSpeak(session)) return;
      sttNoticeSpoken = true;
      logEvent('stt_unavailable');
      void session.say(STT_UNAVAILABLE_TEXT, { allowInterruptions: true });
      return;
    }
    if (error.type !== 'llm_error') return;
    consecutiveLlmFailures += 1;
    if (opening.active || !canSpeak(session)) return;
    if (consecutiveLlmFailures >= MAX_CONSECUTIVE_LLM_FAILURES) {
      logEvent('llm_unavailable', { failures: consecutiveLlmFailures });
      // Await the playout rather than guessing a delay: the room must not go
      // away mid-apology, and the line is long.
      const closing = session.say(LLM_UNAVAILABLE_TEXT, { allowInterruptions: false });
      void Promise.resolve(closing)
        .catch(() => undefined)
        .then(() => endSession('llm_unavailable'));
      return;
    }
    // Once per client turn: a retry storm must not stack recovery lines.
    if (recoverySpoken) return;
    recoverySpoken = true;
    logEvent('llm_recovery_spoken', { failures: consecutiveLlmFailures });
    void session.say(LLM_RECOVERY_TEXT, { allowInterruptions: true });
  });

  session.on(voice.AgentSessionEventTypes.SessionUsageUpdated, (ev) => {
    const total = ev.usage.modelUsage.reduce((s, u) => {
      const withTokens = u as { inputTokens?: number; outputTokens?: number };
      return s + (withTokens.inputTokens ?? 0) + (withTokens.outputTokens ?? 0);
    }, 0);
    if (total > 0) logEvent('usage', { tokens: total, turns: turnCount });
  });

  // ---- teardown -------------------------------------------------------------
  // `meetingOver` is what keeps the job (and therefore the entry function)
  // alive for the whole meeting: it settles on session close, on room
  // disconnect, or on our own endSession — never merely because setup is done.
  const runGate = createRunGate((reason) => {
    clearTimeout(maxDurationTimer);
    // Nothing may schedule speech after this point: the greeting is aborted,
    // the reminder timer is dropped and the scripted opening stops routing.
    greeting.cancel();
    silence.dispose();
    opening.deactivate();
    restoreVad();
    detachShutdownSignal();
    logLifecycle('cleanup', { mode: 'consultation', reason, turns: turnCount });
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
    persistState();
    if (client) {
      // A finalized meeting is 'completed'; otherwise it stays 'in_progress'
      // so the client can rejoin within the join window (state is preserved).
      if (submittedReference || alreadyFinalized) {
        await client.meetingStatus(meetingId, 'completed', true).catch(() => undefined);
      }
      logEvent('session_ended', { reason, turns: turnCount });
    }
    await session.close().catch(() => undefined);
  };

  const maxDurationTimer = setTimeout(() => {
    logEvent('duration_limit_reached', { seconds: limits.maxSessionSeconds });
    if (canSpeak(session)) {
      void session.say(
        'Our meeting time is up — thank you for the conversation! Your progress is saved and you can rejoin from the same link.',
      );
    }
    setTimeout(() => void endSession('duration_limit'), 8000);
  }, limits.maxSessionSeconds * 1000);

  // The framework closes the session on client disconnect / unrecoverable
  // provider errors; mirror that into our own teardown exactly once.
  session.on(voice.AgentSessionEventTypes.Close, (ev) => {
    logLifecycle('session_closed', { mode: 'consultation', reason: String(ev.reason) });
    cleanup(`session_close:${String(ev.reason)}`);
  });

  ctx.room.on(RoomEvent.Disconnected, () => {
    logLifecycle('room_disconnected', { mode: 'consultation' });
    cleanup('room_disconnected');
  });

  ctx.room.on(RoomEvent.ParticipantDisconnected, () => {
    if (clientPresent()) return;
    logLifecycle('client_left', { mode: 'consultation', turns: turnCount });
    // Aborts a greeting that is still queued/playing and drops any pending
    // reminder; the framework's RoomIO closes the session right after, which
    // runs the full teardown above.
    greeting.cancel();
    silence.dispose();
    opening.deactivate();
  });

  ctx.addShutdownCallback(async () => {
    await endSession('shutdown');
  });

  logLifecycle('session_starting', { mode: 'consultation', has_analysis: hasAnalysis });
  await session.start({
    agent,
    room: ctx.room,
    // Text input (lk.chat) stays enabled — the meeting chat tab and the mic-
    // denied fallback ride on the framework defaults, and typed messages flow
    // through the SAME tools/state as speech.
    // No recording of any kind: raw audio is never stored (privacy default).
    record: false,
  });
  // start() resolves even when the AgentActivity failed to start (the
  // framework swallows it with Promise.allSettled). Surface that here instead
  // of letting the first say() report a bogus "session is closing".
  assertSessionRunning(session, 'runConsultationMeeting');
  logLifecycle('session_running', { mode: 'consultation' });

  logEvent('agent_joined', { rejoin: Boolean(context && Object.keys(context.requirements).length > 0) });
  publishState();

  // The greeting already ran (or was deliberately skipped) inside
  // ConsultationAgent.onEnter — nothing to schedule here.

  // Hold the job open for the meeting itself, then finish our own teardown
  // before the entry function returns.
  await runGate.finished;
  await endSession('meeting_over');
  logLifecycle('meeting_finished', {
    mode: 'consultation',
    turns: turnCount,
    greeting: greeting.outcome ?? 'none',
  });
}
