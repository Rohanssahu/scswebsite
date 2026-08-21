// =============================================================================
// Buddy agent — the "no rush" silence reminder.
//
// Buddy must stay QUIET during a client's thinking pause. Only after a long
// stretch of genuine silence — measured from the moment Buddy stopped speaking
// or the client last spoke — does he offer one short, gentle nudge, and then
// only once. The nudge is re-armed exclusively by the client speaking again, so
// a client who simply stays quiet is never nagged in a loop.
//
// The timer is INJECTED, so the whole thing is unit-tested against fake timers
// with no session, room or provider. This is a deliberate reminder timer, not a
// sleep used to fake turn-taking: turn boundaries come from VAD/endpointing
// (see config.ts) and never from here.
// =============================================================================

/** The single line Buddy says after a long genuine silence. */
export const SILENCE_REMINDER_TEXT = 'No rush. Take your time—I’m listening.';

export type TimerHandle = ReturnType<typeof setTimeout>;

export interface SilenceReminderDeps {
  /** Genuine-silence window before the reminder, MILLISECONDS. */
  delayMs: number;
  /** Text to speak. Defaults to {@link SILENCE_REMINDER_TEXT}. */
  text?: string;
  /** True when the session can schedule speech right now. */
  canSpeak: () => boolean;
  /** Speaks the reminder. Errors are swallowed — a nudge is never fatal. */
  say: (text: string) => void;
  /** Timer seam (defaults to global setTimeout/clearTimeout). */
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
  onEvent?: (event: string, data?: Record<string, string | number | boolean>) => void;
}

export interface SilenceReminder {
  /**
   * Buddy has the floor (speaking or thinking) — no reminder may fire.
   * Also called on every client-speech start.
   */
  hold: () => void;
  /**
   * Buddy finished and is now waiting for the client: start (or restart) the
   * silence window. A no-op once the reminder has already been used for this
   * waiting period.
   */
  waitForClient: () => void;
  /** A CONFIRMED client turn arrived: cancel and re-arm the single reminder. */
  clientSpoke: () => void;
  /** Teardown — cancels any pending reminder and blocks all future ones. */
  dispose: () => void;
  /** How many reminders were actually spoken. */
  readonly spokenCount: number;
  /** True while a reminder is scheduled. */
  readonly pending: boolean;
}

export function createSilenceReminder(deps: SilenceReminderDeps): SilenceReminder {
  const setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((handle) => clearTimeout(handle));
  const text = deps.text ?? SILENCE_REMINDER_TEXT;

  let handle: TimerHandle | null = null;
  let usedThisWait = false;
  let disposed = false;
  let spokenCount = 0;

  const cancel = () => {
    if (handle === null) return;
    clearTimer(handle);
    handle = null;
  };

  const fire = () => {
    handle = null;
    if (disposed || usedThisWait) return;
    // A session that started draining while the timer ran must never be spoken
    // on — that is the "closing session, cannot use say()" path.
    if (!deps.canSpeak()) return;
    usedThisWait = true;
    spokenCount += 1;
    deps.onEvent?.('silence_reminder_spoken', { count: spokenCount, after_ms: deps.delayMs });
    try {
      deps.say(text);
    } catch {
      // A failed nudge is never worth surfacing to the client.
    }
  };

  return {
    hold: () => {
      cancel();
    },
    waitForClient: () => {
      if (disposed || usedThisWait) return;
      cancel();
      handle = setTimer(fire, deps.delayMs);
    },
    clientSpoke: () => {
      cancel();
      usedThisWait = false;
    },
    dispose: () => {
      disposed = true;
      cancel();
    },
    get spokenCount() {
      return spokenCount;
    },
    get pending() {
      return handle !== null;
    },
  };
}
