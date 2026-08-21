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
  CONSULTATION_VAD_MIN_SILENCE_HIGH_MS,
  CONSULTATION_VAD_MIN_SILENCE_LOW_MS,
  VAD_ACTIVATION_THRESHOLD,
  VAD_MIN_SILENCE_FLOOR_MS,
  VAD_MIN_SILENCE_MS,
  VAD_MIN_SPEECH_MS,
  loadConsultationTurnTaking,
  loadConsultationVoiceSettings,
} from './config.js';
import { createGreetingGate } from './greeting.js';
import { loadKnowledge } from './knowledge.js';
import { OPENING_REPLY_EXISTING, OPENING_REPLY_NEW, OPENING_REPLY_UNCLEAR } from './opening.js';
import {
  CONSULTATION_GREETING,
  CONSULTATION_GREETING_SENTENCES,
  CONSULTATION_GREETING_SPOKEN,
  buildConsultationPrompt,
} from './prompts.js';
import { SILENCE_REMINDER_TEXT } from './silence.js';
import { canSpeak, type SessionStateView } from './session_lifecycle.js';

const EXPECTED_GREETING =
  'Hello, welcome to SCS Softwares. I’m Buddy, your AI project consultant. ' +
  'I’m here to understand your requirements and help you plan the right solution. ' +
  'Are you looking to build a new project, or do you already have an existing project ' +
  'that needs improvement or fixing?';

/** Everything Buddy can utter in a consultation before the LLM takes over. */
const SCRIPTED_LINES = [
  CONSULTATION_GREETING,
  OPENING_REPLY_NEW,
  OPENING_REPLY_EXISTING,
  OPENING_REPLY_UNCLEAR,
  SILENCE_REMINDER_TEXT,
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
  it('is exactly the approved opening text', () => {
    expect(CONSULTATION_GREETING).toBe(EXPECTED_GREETING);
  });

  it('introduces Buddy as an AI consultant, not a human employee', () => {
    expect(CONSULTATION_GREETING).toContain('AI project consultant');
  });

  it('asks new project versus existing project as its one question', () => {
    expect(CONSULTATION_GREETING).toMatch(/build a new project/i);
    expect(CONSULTATION_GREETING).toMatch(/existing project that needs improvement or fixing/i);
    // Exactly one question mark: one question, then silence.
    expect(CONSULTATION_GREETING.match(/\?/g)).toHaveLength(1);
  });

  it('never asks the client to choose a language', () => {
    expect(CONSULTATION_GREETING.toLowerCase()).not.toMatch(
      /language|english|hindi|hinglish|marathi|urdu|arabic|prefer.*speak/,
    );
  });

  it('is spoken in English', () => {
    // Latin letters, digits and ordinary punctuation only — no other script.
    expect(CONSULTATION_GREETING).toMatch(/^[\x20-\x7E‘’“”—]+$/);
  });

  it('paces itself with a paragraph break after every sentence, same words', () => {
    expect(CONSULTATION_GREETING_SENTENCES).toHaveLength(4);
    expect(CONSULTATION_GREETING_SPOKEN.split('\n\n')).toEqual([...CONSULTATION_GREETING_SENTENCES]);
    expect(CONSULTATION_GREETING_SPOKEN.replace(/\n\n/g, ' ')).toBe(CONSULTATION_GREETING);
    for (const sentence of CONSULTATION_GREETING_SENTENCES) {
      expect(sentence).toMatch(/[.?]$/);
    }
  });

  it('is spoken once and only once, and awaits the full playout before anything else', async () => {
    const spoken: string[] = [];
    let finished = false;
    const gate = createGreetingGate({
      text: () => CONSULTATION_GREETING_SPOKEN,
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
    expect(spoken).toEqual([CONSULTATION_GREETING_SPOKEN]);
  });

  it('is never repeated after a reconnect, a retried join or an agent re-entry', async () => {
    const say = vi.fn(async () => undefined);
    const gate = createGreetingGate({
      text: () => CONSULTATION_GREETING_SPOKEN,
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
        text: () => CONSULTATION_GREETING_SPOKEN,
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

  it('tells the model the greeting and the new-vs-existing answer are already handled', () => {
    const text = prompt();
    expect(text).toMatch(/greeting has ALREADY been spoken/);
    expect(text).toMatch(/Do NOT greet again/);
    expect(text).toMatch(/do NOT ask again whether the project is new or existing/);
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
    expect(text).toMatch(/You never do pricing arithmetic/);
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
