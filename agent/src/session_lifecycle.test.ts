import { describe, expect, it, vi } from 'vitest';
import {
  ENDPOINTING_MAX_DELAY_MS,
  ENDPOINTING_MIN_DELAY_MS,
  VAD_MIN_SILENCE_FLOOR_MS,
  VAD_MIN_SILENCE_MS,
} from './config.js';
import {
  SessionStartError,
  assertSessionRunning,
  canSpeak,
  createRunGate,
  hasClientParticipant,
  onJobShutdownSignal,
  readSessionPhase,
  type SessionStateView,
} from './session_lifecycle.js';

const session = (over: Partial<{ started: boolean; closing: boolean; paused: boolean | null }>): SessionStateView => ({
  _started: over.started ?? false,
  _closing: over.closing ?? false,
  _activity: over.paused === null || over.paused === undefined ? undefined : { schedulingPaused: over.paused },
});

describe('readSessionPhase', () => {
  it('reports not_started before start()', () => {
    expect(readSessionPhase(session({}))).toBe('not_started');
  });

  it('reports starting while the activity is scheduling but start() has not resolved', () => {
    // This is the state Agent.onEnter() runs in.
    expect(readSessionPhase(session({ started: false, paused: false }))).toBe('starting');
  });

  it('reports running once start() resolved with a scheduling activity', () => {
    expect(readSessionPhase(session({ started: true, paused: false }))).toBe('running');
  });

  it('reports start_failed when start() resolved but the activity stayed paused', () => {
    // Regression: AgentSession.start() swallows AgentActivity.start() failures
    // with Promise.allSettled, which used to surface as a bogus
    // "AgentSession is closing, cannot use say()".
    expect(readSessionPhase(session({ started: true, paused: true }))).toBe('start_failed');
  });

  it('reports closing while draining and after close', () => {
    expect(readSessionPhase(session({ started: true, closing: true, paused: true }))).toBe('closing');
    // after closeImpl: started=false, activity cleared, closing stays true
    expect(readSessionPhase(session({ started: false, closing: true }))).toBe('closing');
  });
});

describe('canSpeak', () => {
  it('allows speech while starting and running', () => {
    expect(canSpeak(session({ started: false, paused: false }))).toBe(true);
    expect(canSpeak(session({ started: true, paused: false }))).toBe(true);
  });

  it('refuses speech before start, on a failed start, and while closing/closed', () => {
    expect(canSpeak(session({}))).toBe(false);
    expect(canSpeak(session({ started: true, paused: true }))).toBe(false);
    expect(canSpeak(session({ started: true, closing: true, paused: false }))).toBe(false);
    expect(canSpeak(session({ started: false, closing: true }))).toBe(false);
  });
});

describe('assertSessionRunning', () => {
  it('passes for a running session', () => {
    expect(() => assertSessionRunning(session({ started: true, paused: false }), 'test')).not.toThrow();
  });

  it('fails loudly (not at the first say) when the activity never started', () => {
    let thrown: unknown;
    try {
      assertSessionRunning(session({ started: true, paused: true }), 'runConsultationMeeting');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SessionStartError);
    expect((thrown as SessionStartError).phase).toBe('start_failed');
    expect((thrown as Error).message).toContain('runConsultationMeeting');
    expect((thrown as Error).message).not.toContain('cannot use say()');
  });
});

describe('hasClientParticipant', () => {
  const AGENT = 4;
  it('ignores agent participants', () => {
    expect(hasClientParticipant([{ identity: 'buddy', kind: AGENT }], AGENT)).toBe(false);
  });

  it('finds any human when no identity is known', () => {
    expect(hasClientParticipant([{ identity: 'visitor-1', kind: 0 }], AGENT)).toBe(true);
  });

  it('matches the expected client identity exactly', () => {
    const people = [{ identity: 'someone-else', kind: 0 }];
    expect(hasClientParticipant(people, AGENT, 'client-9')).toBe(false);
    expect(hasClientParticipant([...people, { identity: 'client-9', kind: 0 }], AGENT, 'client-9')).toBe(true);
  });

  it('reports absent for an empty room', () => {
    expect(hasClientParticipant([], AGENT, 'client-9')).toBe(false);
  });
});

describe('createRunGate', () => {
  it('keeps the entry function active until a close path fires', async () => {
    const gate = createRunGate(() => undefined);
    let resolved = false;
    void gate.finished.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    // Setup finished, but nothing closed the session — the job must stay alive.
    expect(resolved).toBe(false);
    expect(gate.ended).toBe(false);

    gate.end('session_close:participant_disconnected');
    await gate.finished;
    expect(resolved).toBe(true);
    expect(gate.endReason).toBe('session_close:participant_disconnected');
  });

  it('runs cleanup exactly once across every close path', async () => {
    const onCleanup = vi.fn();
    const gate = createRunGate(onCleanup);
    gate.end('room_disconnected');
    gate.end('shutdown');
    gate.end('duration_limit');
    await gate.finished;
    expect(onCleanup).toHaveBeenCalledTimes(1);
    expect(onCleanup).toHaveBeenCalledWith('room_disconnected');
    expect(gate.cleanupRuns).toBe(1);
  });

  it('never throws out of cleanup and still settles', async () => {
    const gate = createRunGate(() => {
      throw new Error('boom');
    });
    expect(() => gate.end('shutdown')).not.toThrow();
    await expect(gate.finished).resolves.toBeUndefined();
  });
});

describe('onJobShutdownSignal', () => {
  it('ends the run gate on a worker shutdownRequest and detaches cleanly', async () => {
    const gate = createRunGate(() => undefined);
    const detach = onJobShutdownSignal((reason) => gate.end(reason));
    try {
      process.emit('message', { case: 'shutdownRequest' } as never, undefined as never);
      await gate.finished;
      expect(gate.endReason).toBe('worker_shutdown');
    } finally {
      detach();
    }
    const before = process.listenerCount('message');
    detach();
    expect(process.listenerCount('message')).toBe(before);
  });

  it('ignores unrelated IPC traffic', async () => {
    const gate = createRunGate(() => undefined);
    const detach = onJobShutdownSignal((reason) => gate.end(reason));
    try {
      process.emit('message', { case: 'pingRequest' } as never, undefined as never);
      expect(gate.ended).toBe(false);
    } finally {
      detach();
    }
  });
});

describe('voice pipeline tuning (regression guards)', () => {
  it('keeps the VAD silence window above the TurnDetector floor', () => {
    // 0.55 (seconds-as-milliseconds) is what broke AgentActivity.start().
    expect(VAD_MIN_SILENCE_MS).toBeGreaterThanOrEqual(VAD_MIN_SILENCE_FLOOR_MS);
  });

  it('keeps endpointing delays in milliseconds', () => {
    expect(ENDPOINTING_MIN_DELAY_MS).toBeGreaterThanOrEqual(100);
    expect(ENDPOINTING_MAX_DELAY_MS).toBeGreaterThan(ENDPOINTING_MIN_DELAY_MS);
  });
});
