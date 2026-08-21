// =============================================================================
// Buddy agent — server-controlled configuration.
//
// Everything that influences money, time or usage lives here (or in env
// overrides parsed here) — never in model output and never in the browser.
// =============================================================================

/** Bump when rates/limits change; stored with every estimate. */
export const ESTIMATE_CONFIG_VERSION = 'v1';

/** Hourly-rate band (USD). Matches the published example rates ($10–$20/hr
 * across roles); the blended band is what preliminary estimates use. */
export const HOURLY_RATE_MIN = 10;
export const HOURLY_RATE_MAX = 20;

/** Standard delivery capacity used to project duration. */
export const WEEKLY_CAPACITY_HOURS = 40;

/** Per-role hour caps — hostile/absurd classifications can never exceed these. */
export const MAX_ROLE_HOURS = 2000;
export const MAX_TOTAL_HOURS = 10000;

export type RoleKey = 'frontend' | 'backend' | 'uiux' | 'qa' | 'devops' | 'pm';
export const ROLE_KEYS: RoleKey[] = ['frontend', 'backend', 'uiux', 'qa', 'devops', 'pm'];

export const ROLE_LABELS: Record<RoleKey, string> = {
  frontend: 'Frontend Developer',
  backend: 'Backend Developer',
  uiux: 'UI/UX Designer',
  qa: 'QA Tester',
  devops: 'DevOps Engineer',
  pm: 'Project Manager',
};

/** Base hours per role by overall complexity class (min side of the range). */
export const COMPLEXITY_BASE_HOURS: Record<'small' | 'medium' | 'large', Record<RoleKey, number>> = {
  small: { frontend: 20, backend: 15, uiux: 8, qa: 5, devops: 3, pm: 4 },
  medium: { frontend: 45, backend: 40, uiux: 16, qa: 12, devops: 8, pm: 10 },
  large: { frontend: 90, backend: 85, uiux: 30, qa: 25, devops: 16, pm: 20 },
};

/** Range spread applied on top of the base to get the max side. */
export const RANGE_SPREAD = 0.4;

/** Per-feature-module hour weights by module complexity. */
export const MODULE_HOURS: Record<'simple' | 'standard' | 'complex', { min: number; max: number }> = {
  simple: { min: 4, max: 8 },
  standard: { min: 10, max: 20 },
  complex: { min: 24, max: 48 },
};

/** How module hours are distributed across roles. */
export const MODULE_ROLE_SPLIT: Record<RoleKey, number> = {
  frontend: 0.4,
  backend: 0.35,
  uiux: 0.08,
  qa: 0.1,
  devops: 0.03,
  pm: 0.04,
};

/** Flat extra backend/qa hours for known heavy concerns. */
export const CONCERN_EXTRAS: Record<string, Partial<Record<RoleKey, number>>> = {
  payments: { backend: 10, qa: 4 },
  admin_panel: { frontend: 8, backend: 6 },
  mobile: { frontend: 20, qa: 6 },
  audit: { backend: 8, pm: 2 },
};

export const MAX_MODULES = 20;

// --- voice pipeline tuning -----------------------------------------------------

/**
 * Silero VAD silence window, in MILLISECONDS (plugin default 550).
 *
 * @livekit/agents' streaming TurnDetector refuses to start when the bound VAD
 * reports a `minSilenceDuration` below 300 ms (250 ms floor + 50 ms margin).
 * This was previously written as `0.55` — seconds — which put it 1000x under
 * the floor: `AudioRecognition` threw inside `AgentActivity.start()`,
 * `AgentSession.start()` swallowed the rejection with `Promise.allSettled`,
 * and the permanently scheduling-paused activity made the first `say()` fail
 * with "AgentSession is closing, cannot use say()".
 */
export const VAD_MIN_SILENCE_MS = 550;

/** Framework floor the value above must clear. */
export const VAD_MIN_SILENCE_FLOOR_MS = 300;

/** Silero speech/activation defaults for the GENERAL voice flow. Named here so
 * a consultation meeting (which retunes the shared prewarmed VAD) can restore
 * them on teardown instead of leaking its slower window into a later job. */
export const VAD_MIN_SPEECH_MS = 50;
export const VAD_ACTIVATION_THRESHOLD = 0.6;

/** Endpointing delays, MILLISECONDS (framework defaults 500 / 3000). */
export const ENDPOINTING_MIN_DELAY_MS = 600;
export const ENDPOINTING_MAX_DELAY_MS = 4000;

// --- validated environment overrides ------------------------------------------

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

/** Same contract as {@link intEnv} for the 0..1-style voice ratios: anything
 * non-finite or out of range falls back to the constant. */
function floatEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseFloat(raw) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

// --- consultation conversation pacing ------------------------------------------
//
// Buddy's consultation meetings are deliberately SLOW: a calm senior project
// manager who lets the client think. Every number below is a named constant in
// its own explicit unit (milliseconds for time, 0..1 ratios for the voice), and
// every one can be overridden by a VALIDATED environment variable — an
// out-of-range or non-numeric override is ignored, never silently applied.
//
// No provider secret is ever read here: only pacing.

/** Buddy speaks and understands ENGLISH ONLY. This is the single source of
 * truth for both the ElevenLabs language enforcement and the OpenAI STT
 * language hint in consultation meetings. */
export const CONSULTATION_LANGUAGE = 'en' as const;

/** ElevenLabs `voice_settings` targets (see @livekit/agents-plugin-elevenlabs
 * `VoiceSettings`: stability, similarity_boost, style, speed,
 * use_speaker_boost — the ONLY fields the installed plugin sends). */
export const VOICE_SPEED = 0.88;
export const VOICE_STABILITY = 0.6;
export const VOICE_SIMILARITY_BOOST = 0.75;
export const VOICE_STYLE = 0.15;
export const VOICE_SPEAKER_BOOST = true;

/** Provider-accepted bounds for the four tunable voice ratios. */
export const VOICE_SPEED_MIN = 0.7;
export const VOICE_SPEED_MAX = 1.2;
export const VOICE_RATIO_MIN = 0;
export const VOICE_RATIO_MAX = 1;

/** Exactly the shape `elevenlabs.TTS({ voiceSettings })` accepts. */
export interface ConsultationVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

export function loadConsultationVoiceSettings(): ConsultationVoiceSettings {
  return {
    speed: floatEnv('BUDDY_VOICE_SPEED', VOICE_SPEED, VOICE_SPEED_MIN, VOICE_SPEED_MAX),
    stability: floatEnv('BUDDY_VOICE_STABILITY', VOICE_STABILITY, VOICE_RATIO_MIN, VOICE_RATIO_MAX),
    similarity_boost: floatEnv(
      'BUDDY_VOICE_SIMILARITY',
      VOICE_SIMILARITY_BOOST,
      VOICE_RATIO_MIN,
      VOICE_RATIO_MAX,
    ),
    style: floatEnv('BUDDY_VOICE_STYLE', VOICE_STYLE, VOICE_RATIO_MIN, VOICE_RATIO_MAX),
    use_speaker_boost: VOICE_SPEAKER_BOOST,
  };
}

// --- consultation turn-taking (ALL VALUES IN MILLISECONDS) ---------------------

/**
 * Silero VAD silence window before the client's turn may be considered over.
 * Target band 650–800 ms: long enough that a normal mid-sentence breath is not
 * mistaken for the end of a turn.
 */
export const CONSULTATION_VAD_MIN_SILENCE_MS = 700;
export const CONSULTATION_VAD_MIN_SILENCE_LOW_MS = 650;
export const CONSULTATION_VAD_MIN_SILENCE_HIGH_MS = 800;

/** Speech shorter than this is a click/cough/keyboard tap, not a turn
 * (plugin default 50 ms). */
export const CONSULTATION_VAD_MIN_SPEECH_MS = 120;

/** Activation threshold (0..1, NOT a duration). Higher = more tolerant of
 * steady background noise. Plugin default 0.5. */
export const CONSULTATION_VAD_ACTIVATION_THRESHOLD = 0.6;

/** Endpointing floor: Buddy never answers before this much confirmed silence.
 * Target band 900–1200 ms. */
export const CONSULTATION_ENDPOINTING_MIN_DELAY_MS = 1000;
export const CONSULTATION_ENDPOINTING_MIN_DELAY_LOW_MS = 900;
export const CONSULTATION_ENDPOINTING_MIN_DELAY_HIGH_MS = 1200;

/** Endpointing ceiling: how long a thinking pause may run before Buddy takes
 * the turn anyway. Target band 4000–5000 ms. */
export const CONSULTATION_ENDPOINTING_MAX_DELAY_MS = 4500;
export const CONSULTATION_ENDPOINTING_MAX_DELAY_LOW_MS = 4000;
export const CONSULTATION_ENDPOINTING_MAX_DELAY_HIGH_MS = 5000;

/**
 * Minimum overlapping speech that counts as the client interrupting Buddy
 * (framework default 500 ms). Raised slightly so a cough over Buddy's sentence
 * does not cut him off, while a real barge-in still does.
 */
export const CONSULTATION_INTERRUPTION_MIN_DURATION_MS = 600;

/**
 * Genuine silence after Buddy stopped speaking before the single, gentle
 * "no rush" reminder. Fires at most ONCE per waiting period and is re-armed
 * only by the client actually speaking.
 */
export const CONSULTATION_SILENCE_REMINDER_MS = 10000;

export interface ConsultationTurnTaking {
  vadMinSilenceMs: number;
  vadMinSpeechMs: number;
  vadActivationThreshold: number;
  endpointingMinDelayMs: number;
  endpointingMaxDelayMs: number;
  interruptionMinDurationMs: number;
  silenceReminderMs: number;
}

export function loadConsultationTurnTaking(): ConsultationTurnTaking {
  const vadMinSilenceMs = intEnv(
    'BUDDY_VAD_MIN_SILENCE_MS',
    CONSULTATION_VAD_MIN_SILENCE_MS,
    CONSULTATION_VAD_MIN_SILENCE_LOW_MS,
    CONSULTATION_VAD_MIN_SILENCE_HIGH_MS,
  );
  const endpointingMinDelayMs = intEnv(
    'BUDDY_ENDPOINTING_MIN_DELAY_MS',
    CONSULTATION_ENDPOINTING_MIN_DELAY_MS,
    CONSULTATION_ENDPOINTING_MIN_DELAY_LOW_MS,
    CONSULTATION_ENDPOINTING_MIN_DELAY_HIGH_MS,
  );
  const endpointingMaxDelayMs = intEnv(
    'BUDDY_ENDPOINTING_MAX_DELAY_MS',
    CONSULTATION_ENDPOINTING_MAX_DELAY_MS,
    CONSULTATION_ENDPOINTING_MAX_DELAY_LOW_MS,
    CONSULTATION_ENDPOINTING_MAX_DELAY_HIGH_MS,
  );
  return {
    vadMinSilenceMs,
    vadMinSpeechMs: CONSULTATION_VAD_MIN_SPEECH_MS,
    vadActivationThreshold: CONSULTATION_VAD_ACTIVATION_THRESHOLD,
    endpointingMinDelayMs,
    // A max below the min would make the ceiling meaningless.
    endpointingMaxDelayMs: Math.max(endpointingMaxDelayMs, endpointingMinDelayMs),
    interruptionMinDurationMs: CONSULTATION_INTERRUPTION_MIN_DURATION_MS,
    silenceReminderMs: intEnv(
      'BUDDY_SILENCE_REMINDER_MS',
      CONSULTATION_SILENCE_REMINDER_MS,
      4000,
      60000,
    ),
  };
}

// --- LLM request budget (per voice turn) ---------------------------------------
//
// @livekit/agents defaults every provider call to 10 s with 3 retries 2 s
// apart, and a timed-out LLM attempt is SILENT: the stream closes with no
// chunks instead of throwing, so the voice session produces no reply at all —
// Buddy sits on "thinking" and the client's turn goes unanswered.
//
// A consultation turn is the expensive kind: a ~10 kB system prompt, eight tool
// schemas and a thinking model. Measured gemini-3.6-flash latency for exactly
// that request ranges from ~5 s to ~19 s, with occasional fast 503 "high
// demand" replies — so the window has to cover a slow turn, while the retries
// stay quick because every one of them is dead air in a live call.

/** Per-attempt LLM timeout. Env: BUDDY_PROVIDER_TIMEOUT_MS. */
export const LLM_TIMEOUT_MS = 15000;
/** Attempts after the first. A 503 comes back fast; a timeout does not. */
export const LLM_MAX_RETRY = 2;
/** Gap between attempts — kept short: the client is listening to silence. */
export const LLM_RETRY_INTERVAL_MS = 500;

/** Exactly the shape `new AgentSession({ connOptions: { llmConnOptions } })` takes. */
export interface LlmConnOptions {
  timeoutMs: number;
  maxRetry: number;
  retryIntervalMs: number;
}

export function loadLlmConnOptions(): LlmConnOptions {
  return {
    timeoutMs: intEnv('BUDDY_PROVIDER_TIMEOUT_MS', LLM_TIMEOUT_MS, 5000, 60000),
    maxRetry: LLM_MAX_RETRY,
    retryIntervalMs: LLM_RETRY_INTERVAL_MS,
  };
}

// --- session / cost limits (env-overridable, safe defaults) --------------------------

export interface SessionLimits {
  /** Hard cap on one voice session, seconds. */
  maxSessionSeconds: number;
  /** Disconnect after this much visitor silence, seconds. */
  idleTimeoutSeconds: number;
  /** Maximum LLM turns per session. */
  maxLlmTurns: number;
  /** Maximum transcript characters kept in memory / sent as excerpt. */
  maxTranscriptChars: number;
  /** Provider call timeout, milliseconds. */
  providerTimeoutMs: number;
}

export function loadSessionLimits(): SessionLimits {
  return {
    maxSessionSeconds: intEnv('BUDDY_MAX_SESSION_SECONDS', 900, 60, 3600),
    idleTimeoutSeconds: intEnv('BUDDY_IDLE_TIMEOUT_SECONDS', 90, 15, 600),
    maxLlmTurns: intEnv('BUDDY_MAX_LLM_TURNS', 80, 5, 500),
    maxTranscriptChars: intEnv('BUDDY_MAX_TRANSCRIPT_CHARS', 8000, 1000, 100000),
    providerTimeoutMs: intEnv('BUDDY_PROVIDER_TIMEOUT_MS', 15000, 2000, 60000),
  };
}
