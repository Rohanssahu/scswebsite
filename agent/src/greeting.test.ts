import { describe, expect, it, vi } from 'vitest';
import { createGreetingGate, type GreetingGateDeps } from './greeting.js';
import { canSpeak, createRunGate, type SessionStateView } from './session_lifecycle.js';

const fakeSession = (over: Partial<{ started: boolean; closing: boolean; paused: boolean }>): SessionStateView => ({
  _started: over.started ?? true,
  _closing: over.closing ?? false,
  _activity: { schedulingPaused: over.paused ?? false },
});

const gateWith = (deps: Partial<GreetingGateDeps> = {}) => {
  const say = deps.say ?? vi.fn(async () => undefined);
  const gate = createGreetingGate({
    text: () => 'Hello from Buddy.',
    canSpeak: () => true,
    clientPresent: () => true,
    ...deps,
    say,
  });
  return { gate, say: say as ReturnType<typeof vi.fn> };
};

describe('greeting gate', () => {
  it('greets once the session is running', async () => {
    const session = fakeSession({ started: true, paused: false });
    const { gate, say } = gateWith({ canSpeak: () => canSpeak(session) });
    await expect(gate.speak()).resolves.toBe('spoken');
    expect(say).toHaveBeenCalledTimes(1);
    expect(say.mock.calls[0][0]).toBe('Hello from Buddy.');
  });

  it('greets from the onEnter phase, before start() has resolved', async () => {
    // Agent.onEnter() runs while the session is still "starting".
    const session = fakeSession({ started: false, paused: false });
    const { gate, say } = gateWith({ canSpeak: () => canSpeak(session) });
    await expect(gate.speak()).resolves.toBe('spoken');
    expect(say).toHaveBeenCalledTimes(1);
  });

  it('never speaks while the session is closing', async () => {
    const session = fakeSession({ started: true, closing: true, paused: false });
    const { gate, say } = gateWith({ canSpeak: () => canSpeak(session) });
    await expect(gate.speak()).resolves.toBe('session_not_running');
    expect(say).not.toHaveBeenCalled();
  });

  it('never speaks on a session whose activity failed to start', async () => {
    // The exact state that produced "AgentSession is closing, cannot use say()".
    const session = fakeSession({ started: true, closing: false, paused: true });
    const { gate, say } = gateWith({ canSpeak: () => canSpeak(session) });
    await expect(gate.speak()).resolves.toBe('session_not_running');
    expect(say).not.toHaveBeenCalled();
  });

  it('exits cleanly, without throwing, when the client left before the greeting', async () => {
    const { gate, say } = gateWith({ clientPresent: () => false });
    await expect(gate.speak()).resolves.toBe('client_absent');
    expect(say).not.toHaveBeenCalled();
    expect(gate.outcome).toBe('client_absent');
  });

  it('plays exactly once across reconnects / retried entries', async () => {
    const { gate, say } = gateWith();
    const outcomes = await Promise.all([gate.speak(), gate.speak()]);
    const again = await gate.speak();
    expect(say).toHaveBeenCalledTimes(1);
    expect(outcomes).toContain('spoken');
    expect(outcomes).toContain('already_greeted');
    expect(again).toBe('already_greeted');
  });

  it('cancel() before the greeting blocks it entirely', async () => {
    const { gate, say } = gateWith();
    gate.cancel();
    await expect(gate.speak()).resolves.toBe('already_greeted');
    expect(say).not.toHaveBeenCalled();
    expect(gate.outcome).toBe('cancelled');
  });

  it('cancel() during the greeting aborts the pending speech without throwing', async () => {
    let seenSignal: AbortSignal | undefined;
    let release: () => void = () => undefined;
    const say = vi.fn(async (_text: string, signal: AbortSignal) => {
      seenSignal = signal;
      await new Promise<void>((resolve) => {
        release = resolve;
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
    });
    const { gate } = gateWith({ say });
    const pending = gate.speak();
    await Promise.resolve();
    gate.cancel();
    await expect(pending).resolves.toBe('cancelled');
    expect(seenSignal?.aborted).toBe(true);
    release();
  });

  it('reports a failed speech instead of throwing', async () => {
    const say = vi.fn(async () => {
      throw new Error('tts exploded');
    });
    const { gate } = gateWith({ say });
    await expect(gate.speak()).resolves.toBe('failed');
  });

  it('treats a speech that failed because the session started closing as a skip', async () => {
    let closing = false;
    const say = vi.fn(async () => {
      closing = true;
      throw new Error('AgentSession is closing, cannot use say()');
    });
    const { gate } = gateWith({ say, canSpeak: () => !closing });
    await expect(gate.speak()).resolves.toBe('session_not_running');
  });

  it('is cancelled by the run gate teardown, so no greeting survives a close', async () => {
    // Mirrors the meeting wiring: cleanup() cancels the greeting exactly once.
    const { gate, say } = gateWith();
    const runGate = createRunGate(() => gate.cancel());
    runGate.end('session_close:participant_disconnected');
    runGate.end('shutdown');
    await runGate.finished;
    await expect(gate.speak()).resolves.toBe('already_greeted');
    expect(say).not.toHaveBeenCalled();
    expect(gate.outcome).toBe('cancelled');
  });
});
