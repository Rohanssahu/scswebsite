// =============================================================================
// Buddy agent — consultation conversation behaviour.
//
// Covers the contract of the consultation opening and pacing that no single
// module owns on its own: the greeting content and its exactly-once guarantee,
// the English-only posture (no language question anywhere), the slow ElevenLabs
// voice settings, the turn-taking timings, and the rule that a closing session
// never attempts speech.
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSULTATION_ENDPOINTING_MAX_DELAY_HIGH_MS,
  CONSULTATION_ENDPOINTING_MAX_DELAY_LOW_MS,
  CONSULTATION_ENDPOINTING_MIN_DELAY_HIGH_MS,
  CONSULTATION_ENDPOINTING_MIN_DELAY_LOW_MS,
  CONSULTATION_LANGUAGE,
  CONSULTATION_SILENCE_REMINDER_MS,
  LLM_MAX_RETRY,
  CONSULTATION_VAD_MIN_SILENCE_HIGH_MS,
  CONSULTATION_VAD_MIN_SILENCE_LOW_MS,
  VAD_ACTIVATION_THRESHOLD,
  VAD_MIN_SILENCE_FLOOR_MS,
  VAD_MIN_SILENCE_MS,
  VAD_MIN_SPEECH_MS,
  loadConsultationTurnTaking,
  loadConsultationVoiceSettings,
  loadLlmConnOptions,
} from './config.js';
import { createGreetingGate } from './greeting.js';
import { loadKnowledge } from './knowledge.js';
import {
  OPENING_PURPOSE,
  OPENING_REPLY_EXISTING,
  OPENING_REPLY_NEW,
  OPENING_REPLY_UNCLEAR,
  PROJECT_TYPE_QUESTION,
  WELLBEING_ACK_NEGATIVE,
  WELLBEING_ACK_NEUTRAL,
  WELLBEING_ACK_POSITIVE,
  WELLBEING_ACK_RECIPROCAL,
} from './opening.js';
import {
  LLM_RECOVERY_TEXT,
  LLM_UNAVAILABLE_TEXT,
  STT_UNAVAILABLE_TEXT,
  buildConsultationPrompt,
  clientFirstName,
  consultationGreeting,
  consultationGreetingSentences,
  consultationGreetingSpoken,
} from './prompts.js';
import { SILENCE_REMINDER_TEXT } from './silence.js';
import { canSpeak, type SessionStateView } from './session_lifecycle.js';

const EXPECTED_GREETING =
  'Hello Kunal, welcome to SCS Softwares. I’m Buddy, your AI project consultant. ' +
  'How are you today?';

const EXPECTED_GREETING_NO_NAME =
  'Hello, welcome to SCS Softwares. I’m Buddy, your AI project consultant. How are you today?';

/** Everything Buddy can utter in a consultation before the LLM takes over. */
const SCRIPTED_LINES = [
  consultationGreeting('Kunal'),
  consultationGreeting(''),
  WELLBEING_ACK_POSITIVE,
  WELLBEING_ACK_NEGATIVE,
  WELLBEING_ACK_NEUTRAL,
  WELLBEING_ACK_RECIPROCAL,
  OPENING_PURPOSE,
  PROJECT_TYPE_QUESTION,
  OPENING_REPLY_NEW,
  OPENING_REPLY_EXISTING,
  OPENING_REPLY_UNCLEAR,
  SILENCE_REMINDER_TEXT,
  LLM_RECOVERY_TEXT,
  LLM_UNAVAILABLE_TEXT,
  STT_UNAVAILABLE_TEXT,
];

const fakeSession = (over: Partial<{ started: boolean; closing: boolean; paused: boolean }> = {}): SessionStateView => ({
  _started: over.started ?? true,
  _closing: over.closing ?? false,
  _activity: { schedulingPaused: over.paused ?? false },
});

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

describe('consultation greeting', () => {
  it('is exactly the approved opening text, and greets the client by name', () => {
    expect(consultationGreeting('Kunal')).toBe(EXPECTED_GREETING);
    expect(consultationGreeting('Kunal Sharma')).toBe(EXPECTED_GREETING);
  });

  it('falls back to a nameless welcome rather than saying anything odd', () => {
    for (const name of ['', '   ', undefined, null, '!!', 'A', '7', '\u0645\u062d\u0645\u062f']) {
      expect(consultationGreeting(name), JSON.stringify(name)).toBe(EXPECTED_GREETING_NO_NAME);
    }
  });

  it('sanitizes the stored name instead of speaking it verbatim', () => {
    expect(clientFirstName('kunal')).toBe('Kunal');
    expect(clientFirstName('  josé  ')).toBe('Jose');
    expect(clientFirstName("O'Brien family")).toBe("O'Brien");
    expect(clientFirstName('Kunal <script>alert(1)</script>')).toBe('Kunal');
    expect(clientFirstName('Averyveryverylongsinglenamethatkeepsgoing')).toHaveLength(24);
    expect(clientFirstName('123')).toBe('');
  });

  it('introduces Buddy as an AI consultant, not a human employee', () => {
    expect(consultationGreeting('Kunal')).toContain('AI project consultant');
  });

  it('asks how the client is as its ONE question, and nothing else', () => {
    const greeting = consultationGreeting('Kunal');
    expect(greeting).toMatch(/How are you today\?/);
    // Exactly one question mark: one question, then silence.
    expect(greeting.match(/\?/g)).toHaveLength(1);
    // The project question belongs to stage two, after the client has answered.
    expect(greeting).not.toMatch(/new project|existing project/i);
  });

  it('leaves the new-versus-existing question to the opening router', () => {
    expect(PROJECT_TYPE_QUESTION).toMatch(/build a new project/i);
    expect(PROJECT_TYPE_QUESTION).toMatch(/existing project that needs improvement or fixing/i);
    expect(PROJECT_TYPE_QUESTION.match(/\?/g)).toHaveLength(1);
  });

  it('never asks the client to choose a language', () => {
    expect(consultationGreeting('Kunal').toLowerCase()).not.toMatch(
      /language|english|hindi|hinglish|marathi|urdu|arabic|prefer.*speak/,
    );
  });

  it('is spoken in English', () => {
    // Latin letters, digits and ordinary punctuation only — no other script.
    expect(consultationGreeting('Kunal')).toMatch(/^[\x20-\x7E\u2018\u2019\u201c\u201d\u2014]+$/);
  });

  it('paces itself with a paragraph break after every sentence, same words', () => {
    expect(consultationGreetingSentences('Kunal')).toHaveLength(3);
    expect(consultationGreetingSpoken('Kunal').split('\n\n')).toEqual([
      ...consultationGreetingSentences('Kunal'),
    ]);
    expect(consultationGreetingSpoken('Kunal').replace(/\n\n/g, ' ')).toBe(consultationGreeting('Kunal'));
    for (const sentence of consultationGreetingSentences('Kunal')) {
      expect(sentence).toMatch(/[.?]$/);
    }
  });

  it('is spoken once and only once, and awaits the full playout before anything else', async () => {
    const spoken: string[] = [];
    let finished = false;
    const gate = createGreetingGate({
      text: () => consultationGreetingSpoken('Kunal'),
      canSpeak: () => true,
      clientPresent: () => true,
      say: async (text) => {
        spoken.push(text);
        await Promise.resolve();
        finished = true;
      },
    });

    const outcome = await gate.speak();
    expect(outcome).toBe('spoken');
    expect(finished).toBe(true);
    expect(spoken).toEqual([consultationGreetingSpoken('Kunal')]);
  });

  it('is never repeated after a reconnect, a retried join or an agent re-entry', async () => {
    const say = vi.fn(async () => undefined);
    const gate = createGreetingGate({
      text: () => consultationGreetingSpoken('Kunal'),
      canSpeak: () => true,
      clientPresent: () => true,
      say,
    });

    // onEnter fires again after a LiveKit reconnect / re-entered activity.
    const outcomes = [await gate.speak(), await gate.speak(), await gate.speak()];
    expect(say).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual(['spoken', 'already_greeted', 'already_greeted']);
  });

  it('attempts no speech at all on a closing or failed-to-start session', async () => {
    for (const session of [fakeSession({ closing: true }), fakeSession({ paused: true })]) {
      const say = vi.fn(async () => undefined);
      const gate = createGreetingGate({
        text: () => consultationGreetingSpoken('Kunal'),
        canSpeak: () => canSpeak(session),
        clientPresent: () => true,
        say,
      });
      await expect(gate.speak()).resolves.toBe('session_not_running');
      expect(say).not.toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// Scripted lines and the system prompt
// ---------------------------------------------------------------------------

describe('consultation scripted lines', () => {
  it('are all English and free of any language question', () => {
    for (const line of SCRIPTED_LINES) {
      expect(line, line).toMatch(/^[\x20-\x7E‘’“”—]+$/);
      expect(line.toLowerCase(), line).not.toMatch(/which language|prefer.*language|hindi|hinglish|marathi|urdu|arabic/);
    }
  });

  it('include the exact silence reminder, offered rather than demanded', () => {
    expect(SILENCE_REMINDER_TEXT).toBe('No rush. Take your time—I’m listening.');
  });
});

describe('a failed LLM turn is never silence', () => {
  it('has one short spoken recovery line that leaks no internal detail', () => {
    expect(LLM_RECOVERY_TEXT).toBe('Sorry, I lost that for a moment. Could you say it once more?');
    expect(LLM_RECOVERY_TEXT.match(/\?/g)).toHaveLength(1);
    expect(LLM_RECOVERY_TEXT.toLowerCase()).not.toMatch(/error|api|token|gemini|openai|timeout|provider|400|503/);
  });

  it('tells the client to type when speech recognition itself is down', () => {
    // No transcript means no turn completes at all: without this line the
    // client talks into a dead line. Typed chat reaches the same conversation.
    expect(STT_UNAVAILABLE_TEXT).toMatch(/cannot hear you/);
    expect(STT_UNAVAILABLE_TEXT).toMatch(/meeting chat/);
    expect(STT_UNAVAILABLE_TEXT.toLowerCase()).not.toMatch(/error|api|quota|whisper|openai|429/);
  });

  it('stops asking the client to repeat once the provider is clearly down', () => {
    // A dead key or an exhausted quota fails every request; the closing line
    // points somewhere useful and never blames the client or names a provider.
    expect(LLM_UNAVAILABLE_TEXT).toMatch(/rejoin from the same link/);
    expect(LLM_UNAVAILABLE_TEXT).toMatch(/contact form/);
    expect(LLM_UNAVAILABLE_TEXT).toMatch(/progress is saved/);
    expect(LLM_UNAVAILABLE_TEXT.toLowerCase()).not.toMatch(/error|api|quota|token|gemini|openai|429/);
  });

  it('gives an LLM turn more than the framework\u2019s silent 10 s default', () => {
    const conn = loadLlmConnOptions();
    // A timed-out attempt produces no chunks and no exception, so this window
    // is the difference between a slow reply and no reply at all.
    expect(conn.timeoutMs).toBeGreaterThan(10000);
    expect(conn.timeoutMs).toBeLessThanOrEqual(60000);
    // Retries are dead air in a live call: few, and quick.
    expect(conn.maxRetry).toBe(LLM_MAX_RETRY);
    expect(conn.retryIntervalMs).toBeLessThan(1000);
  });

  it('accepts an in-band timeout override and ignores an out-of-band one', () => {
    process.env.BUDDY_PROVIDER_TIMEOUT_MS = '30000';
    expect(loadLlmConnOptions().timeoutMs).toBe(30000);
    process.env.BUDDY_PROVIDER_TIMEOUT_MS = '250';
    expect(loadLlmConnOptions().timeoutMs).toBe(15000);
    delete process.env.BUDDY_PROVIDER_TIMEOUT_MS;
  });
});

describe('buildConsultationPrompt', () => {
  const prompt = (over: Partial<Parameters<typeof buildConsultationPrompt>[1]> = {}) =>
    buildConsultationPrompt(loadKnowledge(), {
      clientName: 'Alex',
      analysisSummary: '',
      knownFields: [],
      transcriptConsent: false,
      ...over,
    });

  it('pins the conversation to English only', () => {
    const text = prompt();
    expect(text).toMatch(/ENGLISH ONLY/);
    expect(text).toMatch(/NEVER ask the client which language they prefer/);
  });

  it('contains no language-selection instruction and no set_language tool', () => {
    const text = prompt();
    expect(text).not.toMatch(/set_language/);
    expect(text).not.toMatch(/Hinglish|Marathi|Urdu|Arabic/);
    expect(text).not.toMatch(/which language would you like/i);
  });

  it('tells the model the greeting, the how-are-you and the new-vs-existing answer are handled', () => {
    const text = prompt();
    expect(text).toMatch(/greeting has ALREADY been spoken/);
    expect(text).toMatch(/Do NOT greet again/);
    expect(text).toMatch(/do NOT ask again how they are/);
    expect(text).toMatch(/Do NOT ask again whether the project is new or existing/);
  });

  it('keeps Buddy short, one question at a time, and confirming what he heard', () => {
    const text = prompt();
    expect(text).toMatch(/1–3 SHORT sentences/);
    expect(text).toMatch(/ONE main question at a time/);
    expect(text).toMatch(/ask the client to confirm that understanding/);
    expect(text).toMatch(/Do NOT say "Great", "Perfect"/);
    expect(text).toMatch(/do not open replies with the client's name/);
  });

  it('routes long lists to the meeting chat instead of reading them aloud', () => {
    expect(prompt()).toMatch(/send_chat_note/);
    expect(prompt()).toMatch(/Do NOT read long lists aloud/);
  });

  it('orders the requirement flow with budget after scope and never invents gaps', () => {
    const text = prompt();
    const objective = text.indexOf('The main objective');
    const users = text.indexOf('Target users');
    const platforms = text.indexOf('Required platforms');
    const features = text.indexOf('The important features');
    const budget = text.indexOf('Budget — ONLY after the scope');
    expect(objective).toBeGreaterThan(-1);
    expect(users).toBeGreaterThan(objective);
    expect(platforms).toBeGreaterThan(users);
    expect(features).toBeGreaterThan(platforms);
    expect(budget).toBeGreaterThan(features);
    expect(text).toMatch(/Never silently invent a requirement/);
  });

  it('keeps the AI-consultant disclosure and the preliminary-proposal guardrails', () => {
    const text = prompt();
    expect(text).toMatch(/You are clearly an AI consultant, not a human employee/);
    expect(text).toMatch(/Every proposal is PRELIMINARY/);
    expect(text).toMatch(/You NEVER do pricing arithmetic and you NEVER invent a figure/);
  });

  it('carries the commercial budget policy Buddy must talk within', () => {
    const text = prompt();
    // Honest framing
    expect(text).toMatch(/start with what CAN be delivered inside it/);
    expect(text).toMatch(/Always say what is DEFERRED as well as what is included/);
    expect(text).toMatch(/Never say or imply that any percentage of the project is already complete/);
    // The published commercial figures, from the shared policy
    expect(text).toContain('up to $5 per hour');
    expect(text).toContain('maximum of 40 development hours per week');
    expect(text).toContain('about 20% and 30% above');
    // No pressure, and a fresh estimate whenever the picture changes
    expect(text).toMatch(/never push them, never preselect one/);
    expect(text).toMatch(/call the estimate tool again before quoting anything/);
    expect(text).toMatch(/smaller Phase 1/);
    expect(text).toMatch(/Never use urgency, scarcity, fake discounts/);
  });

  it('still tells the model not to re-ask what the analysis already answered', () => {
    const text = prompt({ analysisSummary: '- Project mode: existing project', knownFields: ['platforms'] });
    expect(text).toMatch(/already known: platforms/);
    expect(text).toMatch(/NEVER ask again for details already listed above/);
  });
});

// ---------------------------------------------------------------------------
// Voice pacing
// ---------------------------------------------------------------------------

describe('consultation voice settings', () => {
  const VOICE_ENV = [
    'BUDDY_VOICE_SPEED',
    'BUDDY_VOICE_STABILITY',
    'BUDDY_VOICE_SIMILARITY',
    'BUDDY_VOICE_STYLE',
  ];
  afterEach(() => {
    for (const name of VOICE_ENV) delete process.env[name];
  });

  it('applies the slow, calm ElevenLabs targets', () => {
    expect(loadConsultationVoiceSettings()).toEqual({
      speed: 0.88,
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.15,
      use_speaker_boost: true,
    });
  });

  it('uses only fields the installed ElevenLabs plugin supports', () => {
    // VoiceSettings in @livekit/agents-plugin-elevenlabs 1.7.x.
    expect(Object.keys(loadConsultationVoiceSettings()).sort()).toEqual(
      ['similarity_boost', 'speed', 'stability', 'style', 'use_speaker_boost'].sort(),
    );
  });

  it('speaks English', () => {
    expect(CONSULTATION_LANGUAGE).toBe('en');
  });

  it('accepts a valid environment override', () => {
    process.env.BUDDY_VOICE_SPEED = '0.82';
    process.env.BUDDY_VOICE_STABILITY = '0.7';
    const settings = loadConsultationVoiceSettings();
    expect(settings.speed).toBe(0.82);
    expect(settings.stability).toBe(0.7);
  });

  it('ignores out-of-range and non-numeric overrides rather than applying them', () => {
    for (const bad of ['0', '9', '-1', 'fast', '', 'NaN']) {
      process.env.BUDDY_VOICE_SPEED = bad;
      expect(loadConsultationVoiceSettings().speed, bad).toBe(0.88);
    }
    process.env.BUDDY_VOICE_STYLE = '4';
    expect(loadConsultationVoiceSettings().style).toBe(0.15);
  });
});

// ---------------------------------------------------------------------------
// Turn-taking
// ---------------------------------------------------------------------------

describe('consultation turn-taking', () => {
  const TIMING_ENV = [
    'BUDDY_VAD_MIN_SILENCE_MS',
    'BUDDY_ENDPOINTING_MIN_DELAY_MS',
    'BUDDY_ENDPOINTING_MAX_DELAY_MS',
    'BUDDY_SILENCE_REMINDER_MS',
  ];
  afterEach(() => {
    for (const name of TIMING_ENV) delete process.env[name];
  });

  it('waits inside the target bands, so a mid-sentence pause is never an answer cue', () => {
    const t = loadConsultationTurnTaking();
    expect(t.vadMinSilenceMs).toBeGreaterThanOrEqual(CONSULTATION_VAD_MIN_SILENCE_LOW_MS);
    expect(t.vadMinSilenceMs).toBeLessThanOrEqual(CONSULTATION_VAD_MIN_SILENCE_HIGH_MS);
    expect(t.endpointingMinDelayMs).toBeGreaterThanOrEqual(CONSULTATION_ENDPOINTING_MIN_DELAY_LOW_MS);
    expect(t.endpointingMinDelayMs).toBeLessThanOrEqual(CONSULTATION_ENDPOINTING_MIN_DELAY_HIGH_MS);
    expect(t.endpointingMaxDelayMs).toBeGreaterThanOrEqual(CONSULTATION_ENDPOINTING_MAX_DELAY_LOW_MS);
    expect(t.endpointingMaxDelayMs).toBeLessThanOrEqual(CONSULTATION_ENDPOINTING_MAX_DELAY_HIGH_MS);
  });

  it('clears the framework VAD floor that silently breaks the turn detector', () => {
    expect(loadConsultationTurnTaking().vadMinSilenceMs).toBeGreaterThan(VAD_MIN_SILENCE_FLOOR_MS);
  });

  it('keeps the endpointing ceiling above the floor', () => {
    const t = loadConsultationTurnTaking();
    expect(t.endpointingMaxDelayMs).toBeGreaterThan(t.endpointingMinDelayMs);
  });

  it('ignores tiny microphone bursts without disabling real barge-in', () => {
    const t = loadConsultationTurnTaking();
    // Speech shorter than this is a click/cough, not a turn (plugin default 50).
    expect(t.vadMinSpeechMs).toBeGreaterThan(50);
    // Overlapping speech must last longer than the framework default (500 ms)
    // to count as an interruption — but interruption itself stays possible.
    expect(t.interruptionMinDurationMs).toBeGreaterThan(500);
    expect(t.interruptionMinDurationMs).toBeLessThan(t.endpointingMinDelayMs);
    // Noise tolerance without deafening the VAD.
    expect(t.vadActivationThreshold).toBeGreaterThan(0.5);
    expect(t.vadActivationThreshold).toBeLessThan(1);
  });

  it('keeps the general voice flow\'s VAD defaults nameable, so the retune is reversible', () => {
    // meeting.ts retunes the SHARED prewarmed VAD and restores these on
    // teardown; a consultation must not leak its slower window into a later job.
    const t = loadConsultationTurnTaking();
    expect(VAD_MIN_SILENCE_MS).toBe(550);
    expect(VAD_MIN_SPEECH_MS).toBe(50);
    expect(VAD_ACTIVATION_THRESHOLD).toBe(0.6);
    expect(t.vadMinSilenceMs).toBeGreaterThan(VAD_MIN_SILENCE_MS);
    expect(t.vadMinSpeechMs).toBeGreaterThan(VAD_MIN_SPEECH_MS);
  });

  it('reminds only after a silence far longer than any endpointing delay', () => {
    const t = loadConsultationTurnTaking();
    expect(t.silenceReminderMs).toBe(CONSULTATION_SILENCE_REMINDER_MS);
    expect(t.silenceReminderMs).toBeGreaterThan(t.endpointingMaxDelayMs * 2);
  });

  it('accepts in-band overrides and ignores out-of-band ones', () => {
    process.env.BUDDY_VAD_MIN_SILENCE_MS = '780';
    process.env.BUDDY_ENDPOINTING_MIN_DELAY_MS = '1150';
    process.env.BUDDY_ENDPOINTING_MAX_DELAY_MS = '4200';
    let t = loadConsultationTurnTaking();
    expect([t.vadMinSilenceMs, t.endpointingMinDelayMs, t.endpointingMaxDelayMs]).toEqual([780, 1150, 4200]);

    process.env.BUDDY_VAD_MIN_SILENCE_MS = '100';
    process.env.BUDDY_ENDPOINTING_MIN_DELAY_MS = '50';
    process.env.BUDDY_ENDPOINTING_MAX_DELAY_MS = '99999';
    t = loadConsultationTurnTaking();
    expect([t.vadMinSilenceMs, t.endpointingMinDelayMs, t.endpointingMaxDelayMs]).toEqual([700, 1000, 4500]);
  });
});
