// =============================================================================
// Buddy agent — the consultation opening flow.
//
// The opening is TWO scripted stages, one question each, in this order:
//
//   1. wellbeing   — the greeting asked "How are you today?"; whatever the
//                    client answers is acknowledged, and only THEN is the
//                    project question asked. No answer is ever ignored, so the
//                    client is never left waiting after their first words.
//   2. project_type — is this a NEW project, or an EXISTING one that needs
//                    improvement or fixing?
//
// Both stages are routed HERE rather than by the LLM, because:
//
//   * the three replies are scripted word-for-word, so they must not drift;
//   * the reply must never bundle a second question onto the first answer;
//   * an unclear answer must produce a clarification, never a guess;
//   * it must be unit-testable without a live model, room or provider.
//
// The router is pure apart from the injected `say`/`setIntent` callbacks: no
// timers, no LiveKit types, no network. It runs off the CONFIRMED end of a
// client turn only — interim transcripts never reach it (see meeting.ts,
// `onUserTurnCompleted`).
//
// Every scripted reply comes back in two forms: `reply` is the canonical single
// line (chat context, transcript, logs) and `spoken` is the same words with a
// paragraph break between sentences so ElevenLabs pauses between them.
// =============================================================================

/** What the client's first answer turned out to mean. */
export type OpeningChoice = 'new_project' | 'existing_project' | 'unclear';

/** Scripted reply for a NEW project. */
export const OPENING_REPLY_NEW =
  'Certainly. Please tell me what you would like to build and what problem it should solve. Take your time—I’m listening.';

/** Scripted reply for an EXISTING project. */
export const OPENING_REPLY_EXISTING =
  'Understood. Please tell me what the project currently does, what technology it uses if you know, and what problems or improvements you would like help with.';

/** Scripted clarification when the answer fits neither path. */
export const OPENING_REPLY_UNCLEAR =
  'No problem. To clarify, would you like to build something new, or do you need help with a project you already have?';

export function openingReply(choice: OpeningChoice): string {
  if (choice === 'new_project') return OPENING_REPLY_NEW;
  if (choice === 'existing_project') return OPENING_REPLY_EXISTING;
  return OPENING_REPLY_UNCLEAR;
}

// --- classification ----------------------------------------------------------

/**
 * Phrases that mean "I already have something". Checked FIRST: "I want to fix
 * my new website" is an existing project even though it contains "new".
 */
const EXISTING_PATTERNS: RegExp[] = [
  /\bexist(?:ing|s)?\b/,
  /\balready\s+(?:have|has|had|built|got|running|live)\b/,
  /\b(?:i|we)\s+have\s+(?:an?|my|our|the)?\s*(?:app|site|website|platform|system|software|project|product|portal|store|shop)\b/,
  /\b(?:fix|fixing|repair|repairing|debug|debugging|broken|broke|bug|bugs|crash(?:ing|es)?|error(?:s)?|not\s+working)\b/,
  /\b(?:improve|improving|improvement|upgrade|upgrading|enhance|enhancing|redesign|revamp|refactor|migrate|migrating|migration|modernize|rewrite|maintain|maintenance|optimi[sz]e|optimi[sz]ing)\b/,
  /\b(?:current|currently|old|legacy|live)\s+(?:app|site|website|platform|system|software|project|product|version|codebase)\b/,
  /\b(?:my|our)\s+(?:current|old|existing|legacy)\b/,
  /\badd(?:ing)?\s+(?:a\s+)?(?:new\s+)?feature(?:s)?\s+to\b/,
];

/** Phrases that mean "nothing exists yet". */
const NEW_PATTERNS: RegExp[] = [
  /\bnew\s+(?:project|app|application|website|site|platform|system|software|product|idea|build)\b/,
  /\b(?:a|the)\s+new\s+one\b/,
  /\b(?:build|building|create|creating|make|making|develop|developing|start|starting|launch|launching)\s+(?:a|an|my|our|some|something|from)\b/,
  /\bfrom\s+scratch\b/,
  /\bstart(?:ing)?\s+(?:from\s+)?(?:zero|scratch|fresh)\b/,
  /\bgreenfield\b/,
  /\bnothing\s+(?:yet|exists|built)\b/,
  /\bdo\s*n[o']?t\s+have\s+(?:anything|one|a\s+project|any\s+project)\b/,
  /\bhaven[’']?t\s+(?:built|started)\b/,
  /\b(?:first|1st)\s+(?:project|app|product)\b/,
];

/**
 * Explicit denials that anything exists yet.
 *
 * Checked before the existing-project patterns and STRIPPED from the text
 * before they run, because "nothing exists yet" and "from scratch" contain
 * words those patterns key on. Stripping rather than short-circuiting keeps
 * "rebuild my old site from scratch" an EXISTING project.
 */
const NO_PROJECT_YET_PATTERNS: RegExp[] = [
  /\b(?:nothing|none)\b[^.]{0,24}\bexists?\b/,
  /\bdo(?:es)?\s*n[o\u2019']?t\s+exist\w*\b/,
  /\bno\s+(?:existing|current)\b/,
  /\bnothing\s+(?:yet|built|there|so\s+far)\b/,
  /\bfrom\s+scratch\b/,
];

/** Bare answers that only make sense as a pick between the two offered paths. */
const BARE_NEW = /^(?:the\s+)?(?:first|new|new\s+one|option\s*(?:1|one)|number\s*(?:1|one))\.?$/;
const BARE_EXISTING =
  /^(?:the\s+)?(?:second|existing|existing\s+one|old\s+one|option\s*(?:2|two)|number\s*(?:2|two))\.?$/;

/** Normalize for matching: lowercase, collapse whitespace, strip odd punctuation. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9’'\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classify the client's answer to the greeting's question.
 *
 * Never throws and never guesses: anything that does not clearly match one
 * path — including empty, noise-only or ambiguous answers, and answers that
 * match BOTH paths — comes back `'unclear'`, which produces a clarification
 * question rather than a wrong assumption.
 */
export function classifyOpeningChoice(text: string): OpeningChoice {
  const normalized = normalize(text ?? '');
  if (normalized.length < 2) return 'unclear';

  if (BARE_NEW.test(normalized)) return 'new_project';
  if (BARE_EXISTING.test(normalized)) return 'existing_project';

  const denied = NO_PROJECT_YET_PATTERNS.some((r) => r.test(normalized));
  // Existing-project detection runs on the text with those denials removed.
  const withoutDenials = NO_PROJECT_YET_PATTERNS.reduce(
    (text, r) => text.replace(new RegExp(r.source, 'g'), ' '),
    normalized,
  );
  const existing = EXISTING_PATTERNS.some((r) => r.test(withoutDenials));
  const isNew = denied || NEW_PATTERNS.some((r) => r.test(normalized));

  // Both signals present: the client described an existing thing they want
  // changed ("rebuild my old site as a new app") — that is an existing project.
  if (existing) return 'existing_project';
  if (isNew) return 'new_project';
  return 'unclear';
}

/** State intent value each resolved path maps to (mirrors ProjectState.intent). */
export type OpeningIntent = 'new_project' | 'improve_existing';

export function intentForChoice(choice: Exclude<OpeningChoice, 'unclear'>): OpeningIntent {
  return choice === 'new_project' ? 'new_project' : 'improve_existing';
}

// --- stage 1: the wellbeing answer -------------------------------------------

/** How the client answered "How are you today?". */
export type WellbeingSentiment = 'positive' | 'negative' | 'neutral';

/** Acknowledgement for a client who is doing well. */
export const WELLBEING_ACK_POSITIVE = 'Glad to hear that.';

/** Acknowledgement for a client who is NOT doing well. */
export const WELLBEING_ACK_NEGATIVE =
  'I\u2019m sorry to hear that. I\u2019ll keep this simple and go at your pace.';

/** Acknowledgement when the answer carries no sentiment we can read. */
export const WELLBEING_ACK_NEUTRAL = 'Thank you.';

/** Added only when the client asked Buddy back ("and you?"). */
export const WELLBEING_ACK_RECIPROCAL = 'I\u2019m doing well, thank you.';

/** Said once, on the way into the project question. */
export const OPENING_PURPOSE =
  'I\u2019m here to understand your requirements and help you plan the right solution.';

/** Stage 2's question — asked only after the wellbeing answer, never with it. */
export const PROJECT_TYPE_QUESTION =
  'Are you looking to build a new project, or do you already have an existing project that needs improvement or fixing?';

/** Negatives are checked FIRST: "not good" must never read as "good". */
const WELLBEING_NEGATIVE_PATTERNS: RegExp[] = [
  /\b(?:not|isn[\u2019']?t|ain[\u2019']?t)\s+(?:so\s+|too\s+|that\s+|very\s+|really\s+)?(?:good|great|well|fine|ok|okay|nice|happy)\b/,
  /\bnot\s+(?:doing|feeling)\s+(?:so\s+|too\s+|that\s+|very\s+)?(?:good|great|well|fine)\b/,
  /\bcould\s+be\s+better\b/,
  /\b(?:bad|terrible|awful|horrible|rough|lousy|miserable|unwell|sick|ill|exhausted|tired|stressed|frustrated|worried|upset|angry|sad|depressed)\b/,
  /\bnot\s+(?:great|good)\b/,
  /\bhaving\s+a\s+(?:bad|rough|hard|tough)\s+(?:day|week|time)\b/,
];

/** Plain positives. Only reached when no negative matched. */
const WELLBEING_POSITIVE_PATTERNS: RegExp[] = [
  /\b(?:good|great|fine|well|ok|okay|okey|alright|all\s+right|excellent|fantastic|awesome|amazing|wonderful|perfect|nice|super|fabulous|brilliant|happy|blessed|relaxed|energetic)\b/,
  /\ball\s+good\b/,
  /\bno\s+complaints\b/,
  /\bcan[\u2019']?t\s+complain\b/,
  /\bpretty\s+(?:good|well)\b/,
  /\bdoing\s+(?:good|great|well|fine)\b/,
  /\bvery\s+well\b/,
  /\bi\s*(?:\u2019|')?\s*m\s+(?:good|great|fine|well|ok|okay)\b/,
];

/** The client asked Buddy back. */
const WELLBEING_RECIPROCAL_PATTERNS: RegExp[] = [
  /\band\s+(?:you|yourself|yours)\b/,
  /\bhow\s+(?:are|about)\s+you\b/,
  /\bwhat\s+about\s+you\b/,
  /\byou\s*\?/,
  /\bhow\s+are\s+things\s+(?:with|on)\s+your\b/,
];

/**
 * Read the sentiment of the client's wellbeing answer.
 *
 * Unlike the project question this NEVER returns "unclear": small talk must be
 * acknowledged and moved on from, not clarified. An answer we cannot read
 * simply gets the neutral acknowledgement.
 */
export function classifyWellbeing(text: string): WellbeingSentiment {
  const normalized = normalize(text ?? '');
  if (normalized.length < 2) return 'neutral';
  if (WELLBEING_NEGATIVE_PATTERNS.some((r) => r.test(normalized))) return 'negative';
  if (WELLBEING_POSITIVE_PATTERNS.some((r) => r.test(normalized))) return 'positive';
  return 'neutral';
}

/** True when the client turned the question back on Buddy. */
export function asksBuddyBack(text: string): boolean {
  const normalized = normalize(text ?? '');
  return WELLBEING_RECIPROCAL_PATTERNS.some((r) => r.test(normalized));
}

export function wellbeingAck(sentiment: WellbeingSentiment): string {
  if (sentiment === 'positive') return WELLBEING_ACK_POSITIVE;
  if (sentiment === 'negative') return WELLBEING_ACK_NEGATIVE;
  return WELLBEING_ACK_NEUTRAL;
}

// --- scripted lines ----------------------------------------------------------

/** A scripted reply in both of its forms (see the module header). */
export interface ScriptedReply {
  /** One line, single spaces — chat context, transcript, logs, assertions. */
  reply: string;
  /** The same words with a paragraph break between sentences, for playout. */
  spoken: string;
}

/** Joins sentences into a {@link ScriptedReply}; empty parts are dropped. */
export function scriptedReply(...parts: string[]): ScriptedReply {
  const sentences = parts.filter((part) => part.trim().length > 0);
  return { reply: sentences.join(' '), spoken: sentences.join('\n\n') };
}

/**
 * The reply to the wellbeing answer.
 *
 * When that same answer ALREADY says whether the project is new or existing
 * (a client who says "I'm good, I want to build an app"), the project question
 * is skipped and its scripted answer is given instead — the router never asks
 * something the client just answered.
 */
export function wellbeingReply(text: string): { scripted: ScriptedReply; choice: OpeningChoice } {
  const ack = wellbeingAck(classifyWellbeing(text));
  const back = asksBuddyBack(text) ? WELLBEING_ACK_RECIPROCAL : '';
  const choice = classifyOpeningChoice(text);
  if (choice === 'unclear') {
    return { scripted: scriptedReply(ack, back, OPENING_PURPOSE, PROJECT_TYPE_QUESTION), choice };
  }
  return { scripted: scriptedReply(ack, back, openingReply(choice)), choice };
}

// --- router ------------------------------------------------------------------

/**
 * How many clarifications Buddy asks before handing an ambiguous opening to
 * the LLM. Two is enough to cover a mis-transcription and a genuinely confused
 * answer; asking a third time would sound like a loop.
 */
export const MAX_OPENING_CLARIFICATIONS = 2;

/** Which scripted question is currently on the table. */
export type OpeningPhase = 'wellbeing' | 'project_type' | 'done';

export interface OpeningRouterDeps {
  /** Speaks the scripted line (the `spoken` form). Resolves when playout finished. */
  say: (text: string) => Promise<void>;
  /** Records the resolved intent in the server-side requirement state. */
  setIntent: (intent: OpeningIntent) => void;
  /** True when the session can schedule speech right now. */
  canSpeak: () => boolean;
  onEvent?: (event: string, data?: Record<string, string | number | boolean>) => void;
  maxClarifications?: number;
  /**
   * Which stage the first client turn answers. Defaults to `'wellbeing'`,
   * because the greeting ends with "How are you today?"; pass
   * `'project_type'` when that question was never put to the client.
   */
  startAt?: Exclude<OpeningPhase, 'done'>;
}

export type OpeningOutcome =
  /** The router handled the turn; the LLM must NOT also reply. */
  | {
      handled: true;
      /** The stage this turn answered. */
      phase: Exclude<OpeningPhase, 'done'>;
      /** Only meaningful once the project question has been answered. */
      choice: OpeningChoice;
      /** Canonical single-line reply (what goes into the chat context). */
      reply: string;
      /** What was actually spoken (paragraph breaks between sentences). */
      spoken: string;
    }
  /** The router is done (or was never active); the LLM owns this turn. */
  | { handled: false };

export interface OpeningRouter {
  /** True while a scripted opening question is still unanswered. */
  readonly active: boolean;
  /** Which scripted question is on the table right now. */
  readonly phase: OpeningPhase;
  /** The resolved choice, or null while still unresolved. */
  readonly choice: Exclude<OpeningChoice, 'unclear'> | null;
  /** How many clarifications have been asked so far. */
  readonly clarifications: number;
  /** Route ONE confirmed client turn. Never throws. */
  handleClientTurn: (text: string) => Promise<OpeningOutcome>;
  /** Stop routing (teardown, or the LLM has taken over). */
  deactivate: () => void;
}

export function createOpeningRouter(deps: OpeningRouterDeps): OpeningRouter {
  const maxClarifications = deps.maxClarifications ?? MAX_OPENING_CLARIFICATIONS;
  let phase: OpeningPhase = deps.startAt ?? 'wellbeing';
  let choice: Exclude<OpeningChoice, 'unclear'> | null = null;
  let clarifications = 0;

  const emit = (event: string, data: Record<string, string | number | boolean> = {}) =>
    deps.onEvent?.(event, data);

  /** Resolves the project question: records the intent and closes the opening. */
  const resolve = (resolved: Exclude<OpeningChoice, 'unclear'>) => {
    choice = resolved;
    phase = 'done';
    deps.setIntent(intentForChoice(resolved));
    emit('opening_resolved', { choice: resolved, clarifications });
  };

  /** Stage 1: acknowledge the wellbeing answer, then ask the project question. */
  const handleWellbeingTurn = async (text: string): Promise<OpeningOutcome> => {
    const { scripted, choice: answered } = wellbeingReply(text);
    if (!(await speak(scripted.spoken))) return { handled: false };
    emit('opening_wellbeing_acknowledged', {
      sentiment: classifyWellbeing(text),
      asked_back: asksBuddyBack(text),
      // The client can answer both questions in one breath.
      project_answered: answered !== 'unclear',
    });
    if (answered === 'unclear') {
      phase = 'project_type';
    } else {
      resolve(answered);
    }
    return { handled: true, phase: 'wellbeing', choice: answered, ...scripted };
  };

  /** Stage 2: the new-versus-existing answer. */
  const handleProjectTypeTurn = async (text: string): Promise<OpeningOutcome> => {
    const classified = classifyOpeningChoice(text);

    if (classified === 'unclear') {
      if (clarifications >= maxClarifications) {
        // Two tries were enough — hand the opening to the LLM rather than
        // asking the same question a third time.
        phase = 'done';
        emit('opening_handoff', { reason: 'clarification_limit' });
        return { handled: false };
      }
      clarifications += 1;
      const scripted = scriptedReply(OPENING_REPLY_UNCLEAR);
      if (!(await speak(scripted.spoken))) return { handled: false };
      emit('opening_clarified', { attempt: clarifications });
      return { handled: true, phase: 'project_type', choice: 'unclear', ...scripted };
    }

    const scripted = scriptedReply(openingReply(classified));
    if (!(await speak(scripted.spoken))) return { handled: false };
    resolve(classified);
    return { handled: true, phase: 'project_type', choice: classified, ...scripted };
  };

  const handleClientTurn = async (text: string): Promise<OpeningOutcome> => {
    if (phase === 'wellbeing') return handleWellbeingTurn(text);
    if (phase === 'project_type') return handleProjectTypeTurn(text);
    return { handled: false };
  };

  /** Speaks the scripted line; false means "we could not, let the LLM run". */
  const speak = async (text: string): Promise<boolean> => {
    if (!deps.canSpeak()) {
      // Session draining/closed: never schedule speech, and never claim the
      // turn — there is nothing left to answer.
      phase = 'done';
      emit('opening_skipped', { reason: 'session_not_running' });
      return false;
    }
    try {
      await deps.say(text);
      return true;
    } catch (error) {
      emit('opening_error', { reason: error instanceof Error ? error.name || 'Error' : typeof error });
      // Speech failed: stop routing and let the normal LLM path take over so
      // the client is never left with silence.
      phase = 'done';
      return false;
    }
  };

  return {
    get active() {
      return phase !== 'done';
    },
    get phase() {
      return phase;
    },
    get choice() {
      return choice;
    },
    get clarifications() {
      return clarifications;
    },
    handleClientTurn,
    deactivate: () => {
      phase = 'done';
    },
  };
}
