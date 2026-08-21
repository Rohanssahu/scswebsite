// =============================================================================
// Buddy agent — AgentSession lifecycle helpers.
//
// Why this module exists
// ----------------------
// `AgentSession.start()` (@livekit/agents 1.7.x) builds the AgentActivity as
// one of several tasks awaited with `Promise.allSettled`. If the activity
// fails to start — e.g. the VAD/turn-detector combination is rejected — the
// rejection is SWALLOWED: `start()` resolves, `session._started` becomes
// true, but the activity is left with `schedulingPaused === true` forever.
// The next `session.say()` then throws the extremely misleading
// "AgentSession is closing, cannot use say()" even though nothing ever asked
// the session to close.
//
// `readSessionPhase()` turns that ambiguous internal state into an explicit
// phase, `assertSessionRunning()` fails loudly with the real diagnosis right
// after `start()`, and `canSpeak()` is the single guard every `say()` /
// `generateReply()` call site uses so speech is never scheduled on a session
// that is closing, closed or was never really running.
//
// The `_started` / `_closing` / `_activity` getters are the framework's own
// typed accessors for exactly this kind of tightly-coupled state inspection.
// =============================================================================

import { log } from '@livekit/agents';

/** Structural view of the AgentSession state this module reads. */
export interface SessionStateView {
  readonly _started: boolean;
  readonly _closing: boolean;
  readonly _activity?: { readonly schedulingPaused: boolean };
}

export type SessionPhase =
  /** `start()` has not been called yet. */
  | 'not_started'
  /** `start()` is in flight; the activity exists and is already scheduling. */
  | 'starting'
  /** `start()` resolved but the activity never resumed scheduling. */
  | 'start_failed'
  /** Running and able to schedule speech. */
  | 'running'
  /** Draining or closed — speech must not be scheduled. */
  | 'closing';

export function readSessionPhase(session: SessionStateView): SessionPhase {
  if (session._closing) return 'closing';
  const activity = session._activity;
  if (!activity) return session._started ? 'closing' : 'not_started';
  if (!activity.schedulingPaused) return session._started ? 'running' : 'starting';
  // Activity present but paused: either start() silently failed, or the
  // session is draining (its `closing` flag is cleared again once closed).
  return session._started ? 'start_failed' : 'not_started';
}

/**
 * True when speech may be scheduled right now.
 *
 * `starting` counts: `Agent.onEnter()` runs from inside `AgentActivity.start()`,
 * before `AgentSession.start()` has flipped `_started`, and scheduling is
 * already open at that point — that is exactly where the greeting belongs.
 */
export function canSpeak(session: SessionStateView): boolean {
  const phase = readSessionPhase(session);
  return phase === 'running' || phase === 'starting';
}

/** Thrown when `AgentSession.start()` resolved without a running activity. */
export class SessionStartError extends Error {
  readonly phase: SessionPhase;
  constructor(where: string, phase: SessionPhase) {
    super(
      `${where}: AgentSession.start() resolved but the session is "${phase}" — the ` +
        'AgentActivity never resumed scheduling. @livekit/agents swallows activity ' +
        'start failures via Promise.allSettled, so the real cause is logged by the ' +
        'framework at debug level (commonly an invalid VAD / turn-detector / plugin ' +
        'configuration). Speech was NOT attempted.',
    );
    this.name = 'SessionStartError';
    this.phase = phase;
  }
}

/** Fail loudly right after `start()` instead of at the first `say()`. */
export function assertSessionRunning(session: SessionStateView, where: string): void {
  const phase = readSessionPhase(session);
  if (phase === 'running') return;
  throw new SessionStartError(where, phase);
}

/** Structured, PII-free lifecycle log line. Values must never carry secrets,
 * transcripts, contact details or raw model output. */
export function logLifecycle(event: string, data: Record<string, string | number | boolean> = {}): void {
  const payload = { buddyEvent: event, ...data };
  try {
    log().info(payload, `buddy.lifecycle.${event}`);
  } catch {
    // Logger not initialized (unit tests, scripts) — stay silent rather than
    // interleaving raw output with the worker's structured log stream.
  }
}

// ---- room presence ----------------------------------------------------------

/** Minimal view of a LiveKit remote participant. */
export interface ParticipantView {
  readonly identity: string;
  readonly kind: number;
}

/**
 * True while the human client is still in the room.
 *
 * `clientIdentity` (the participant the job waited for) is matched exactly when
 * known; otherwise any non-agent remote participant counts. Pure so it can be
 * unit-tested without a live room.
 */
export function hasClientParticipant(
  participants: Iterable<ParticipantView>,
  agentKind: number,
  clientIdentity?: string | null,
): boolean {
  for (const participant of participants) {
    if (participant.kind === agentKind) continue;
    if (clientIdentity && participant.identity !== clientIdentity) continue;
    return true;
  }
  return false;
}

// ---- run gate ---------------------------------------------------------------

/**
 * Keeps the job's entry function alive for the whole conversation and runs the
 * teardown exactly once.
 *
 * The entry function must NOT return as soon as setup finished — it awaits
 * `finished`, which settles only when a real close path fires (session close,
 * room disconnect, duration/turn limit, job shutdown). `end()` is idempotent
 * and never throws, so every close path can call it unconditionally.
 */
export interface RunGate {
  /** Settles once the run is over. */
  readonly finished: Promise<void>;
  /** Runs the teardown at most once, then settles `finished`. Never throws. */
  end: (reason: string) => void;
  readonly ended: boolean;
  readonly endReason: string | null;
  /** How many times the teardown callback actually ran (0 or 1). */
  readonly cleanupRuns: number;
}

export function createRunGate(onCleanup: (reason: string) => void): RunGate {
  let resolveFinished: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });
  let ended = false;
  let endReason: string | null = null;
  let cleanupRuns = 0;

  const end = (reason: string) => {
    if (ended) return;
    ended = true;
    endReason = reason;
    try {
      cleanupRuns += 1;
      onCleanup(reason);
    } catch (error) {
      logLifecycle('cleanup_error', { reason, error: error instanceof Error ? error.name : typeof error });
    } finally {
      resolveFinished();
    }
  };

  return {
    finished,
    end,
    get ended() {
      return ended;
    },
    get endReason() {
      return endReason;
    },
    get cleanupRuns() {
      return cleanupRuns;
    },
  };
}

// ---- job shutdown signal ------------------------------------------------------

/**
 * Fires when the worker asks this job process to stop.
 *
 * The entry function holds the job open for the whole meeting (see
 * {@link createRunGate}), so it must also learn about a worker drain — the
 * framework only runs `ctx.addShutdownCallback` AFTER the entry function has
 * returned, and would otherwise wait out its close timeout and hard-kill us.
 *
 * `shutdownRequest` is the IPC message `@livekit/agents` sends to a job
 * process; SIGTERM/SIGINT cover non-forked runs. Purely additive: if neither
 * ever arrives, behaviour is exactly as before.
 */
export function onJobShutdownSignal(handler: (reason: string) => void): () => void {
  const onMessage = (message: unknown) => {
    if (typeof message === 'object' && message !== null && (message as { case?: unknown }).case === 'shutdownRequest') {
      handler('worker_shutdown');
    }
  };
  const onSigterm = () => handler('sigterm');
  const onSigint = () => handler('sigint');

  process.on('message', onMessage);
  process.on('SIGTERM', onSigterm);
  process.on('SIGINT', onSigint);

  return () => {
    process.off('message', onMessage);
    process.off('SIGTERM', onSigterm);
    process.off('SIGINT', onSigint);
  };
}
