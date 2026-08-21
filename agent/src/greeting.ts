// =============================================================================
// Buddy agent — one-shot opening greeting.
//
// The greeting is the first thing a visitor/client hears, so it has to be
// exactly-once and completely non-fatal:
//
//   * exactly once per worker job, even if the agent activity is re-entered
//     (agent handoff, LiveKit reconnect, a retried join from the browser);
//   * never scheduled on a session that is not running (never started,
//     draining or already closed) — that is what threw
//     "AgentSession is closing, cannot use say()";
//   * silent, throw-free exit when the client left before we got to speak;
//   * cancellable, so a room/session close aborts an in-flight greeting
//     instead of leaving a dangling speech task behind.
//
// The gate owns no timers and no LiveKit types, so it is fully unit-tested in
// greeting.test.ts against plain fakes.
// =============================================================================

export type GreetingOutcome =
  /** The greeting was spoken (playout finished or was interrupted normally). */
  | 'spoken'
  /** Another call already claimed the greeting — this one did nothing. */
  | 'already_greeted'
  /** The session was not in a state where speech can be scheduled. */
  | 'session_not_running'
  /** The client participant was gone before the greeting started. */
  | 'client_absent'
  /** cancel() was called before or during the greeting. */
  | 'cancelled'
  /** The speech call itself failed; the error is reported, never thrown. */
  | 'failed';

export interface GreetingGateDeps {
  /** Text to speak. Read lazily so callers can pick it at speak() time. */
  text: () => string;
  /** True when the session can schedule speech right now. */
  canSpeak: () => boolean;
  /** True while the client participant is still in the room. */
  clientPresent: () => boolean;
  /** Schedules the speech and resolves when playout ends. Must honour `signal`. */
  say: (text: string, signal: AbortSignal) => Promise<void>;
  /** Structured lifecycle logging hook (no PII, no secrets). */
  onEvent?: (event: string, data?: Record<string, string | number | boolean>) => void;
}

export interface GreetingGate {
  /** Speaks the greeting at most once. Never throws. */
  speak: () => Promise<GreetingOutcome>;
  /** Aborts a pending/in-flight greeting and blocks any future attempt. */
  cancel: () => void;
  /** Outcome of the single attempt, or null while no attempt has finished. */
  readonly outcome: GreetingOutcome | null;
  /** True once an attempt has been claimed (in flight or finished). */
  readonly claimed: boolean;
}

export function createGreetingGate(deps: GreetingGateDeps): GreetingGate {
  const controller = new AbortController();
  let claimed = false;
  let outcome: GreetingOutcome | null = null;

  const emit = (event: string, data: Record<string, string | number | boolean> = {}) => {
    deps.onEvent?.(event, data);
  };

  const finish = (result: GreetingOutcome): GreetingOutcome => {
    outcome = result;
    emit('greeting_finished', { outcome: result });
    return result;
  };

  const speak = async (): Promise<GreetingOutcome> => {
    if (claimed) return 'already_greeted';
    claimed = true;

    if (controller.signal.aborted) return finish('cancelled');
    if (!deps.clientPresent()) return finish('client_absent');
    if (!deps.canSpeak()) return finish('session_not_running');

    emit('greeting_started');
    try {
      await deps.say(deps.text(), controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return finish('cancelled');
      // A session that started draining between the guard above and the
      // scheduling call is not an error worth surfacing — the meeting is over.
      if (!deps.canSpeak()) return finish('session_not_running');
      emit('greeting_error', { reason: errorLabel(error) });
      return finish('failed');
    }
    if (controller.signal.aborted) return finish('cancelled');
    return finish('spoken');
  };

  const cancel = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    // Claim the greeting so a late onEnter can never start one after close.
    if (!claimed) {
      claimed = true;
      finish('cancelled');
    }
  };

  return {
    speak,
    cancel,
    get outcome() {
      return outcome;
    },
    get claimed() {
      return claimed;
    },
  };
}

/** Short, non-sensitive label for a thrown value (never the full message). */
function errorLabel(error: unknown): string {
  if (error instanceof Error) return (error.name || 'Error').slice(0, 60);
  return typeof error;
}
