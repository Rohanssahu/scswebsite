// =============================================================================
// Buddy agent — the consultation opening flow.
//
// After the greeting, exactly one question is on the table: is this a NEW
// project, or an EXISTING one that needs improvement or fixing? The answer to
// that one question is routed HERE rather than by the LLM, because:
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

// --- router ------------------------------------------------------------------

/**
 * How many clarifications Buddy asks before handing an ambiguous opening to
 * the LLM. Two is enough to cover a mis-transcription and a genuinely confused
 * answer; asking a third time would sound like a loop.
 */
export const MAX_OPENING_CLARIFICATIONS = 2;

export interface OpeningRouterDeps {
  /** Speaks the scripted line. Resolves when playout finished. */
  say: (text: string) => Promise<void>;
  /** Records the resolved intent in the server-side requirement state. */
  setIntent: (intent: OpeningIntent) => void;
  /** True when the session can schedule speech right now. */
  canSpeak: () => boolean;
  onEvent?: (event: string, data?: Record<string, string | number | boolean>) => void;
  maxClarifications?: number;
}

export type OpeningOutcome =
  /** The router handled the turn; the LLM must NOT also reply. */
  | { handled: true; choice: OpeningChoice; reply: string }
  /** The router is done (or was never active); the LLM owns this turn. */
  | { handled: false };

export interface OpeningRouter {
  /** True while the opening question is still unanswered. */
  readonly active: boolean;
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
  let active = true;
  let choice: Exclude<OpeningChoice, 'unclear'> | null = null;
  let clarifications = 0;

  const emit = (event: string, data: Record<string, string | number | boolean> = {}) =>
    deps.onEvent?.(event, data);

  const handleClientTurn = async (text: string): Promise<OpeningOutcome> => {
    if (!active) return { handled: false };

    const classified = classifyOpeningChoice(text);

    if (classified === 'unclear') {
      if (clarifications >= maxClarifications) {
        // Two tries were enough — hand the opening to the LLM rather than
        // asking the same question a third time.
        active = false;
        emit('opening_handoff', { reason: 'clarification_limit' });
        return { handled: false };
      }
      clarifications += 1;
      const reply = OPENING_REPLY_UNCLEAR;
      if (!(await speak(reply))) return { handled: false };
      emit('opening_clarified', { attempt: clarifications });
      return { handled: true, choice: 'unclear', reply };
    }

    const reply = openingReply(classified);
    if (!(await speak(reply))) return { handled: false };
    choice = classified;
    active = false;
    deps.setIntent(intentForChoice(classified));
    emit('opening_resolved', { choice: classified, clarifications });
    return { handled: true, choice: classified, reply };
  };

  /** Speaks the scripted line; false means "we could not, let the LLM run". */
  const speak = async (text: string): Promise<boolean> => {
    if (!deps.canSpeak()) {
      // Session draining/closed: never schedule speech, and never claim the
      // turn — there is nothing left to answer.
      active = false;
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
      active = false;
      return false;
    }
  };

  return {
    get active() {
      return active;
    },
    get choice() {
      return choice;
    },
    get clarifications() {
      return clarifications;
    },
    handleClientTurn,
    deactivate: () => {
      active = false;
    },
  };
}
