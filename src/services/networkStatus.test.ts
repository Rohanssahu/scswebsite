// NetworkStatusMonitor — the outage state machine driven against a fake
// browser, so every path a real visitor can hit is covered: a dropped link, a
// link that comes back without the internet (captive portal / dead Wi-Fi), a
// failed action that reveals the outage, a false alarm, the backing-off
// re-probe, a hidden tab, recovery, and full teardown.
import { describe, expect, it, vi } from 'vitest';
import {
  NetworkStatusMonitor,
  type NetworkEventType,
  type NetworkStatusDeps,
  type NetworkStatusSnapshot,
} from '@/services/networkStatus';

// -----------------------------------------------------------------------------
// Fake browser
// -----------------------------------------------------------------------------

class FakeEnv {
  linkUp = true;
  visible = true;
  time = 1_700_000_000_000;
  probeCalls = 0;
  /** Answers for the next probes; when empty, `reachable` is used. */
  probeQueue: boolean[] = [];
  reachable = true;

  private handlers = new Map<NetworkEventType, Set<() => void>>();
  private timers = new Map<number, { fn: () => void; delay: number }>();
  private nextTimerId = 1;

  readonly deps: NetworkStatusDeps = {
    isOnline: () => this.linkUp,
    now: () => this.time,
    isVisible: () => this.visible,
    probe: () => {
      this.probeCalls += 1;
      const answer = this.probeQueue.length > 0 ? (this.probeQueue.shift() as boolean) : this.reachable;
      return Promise.resolve(answer);
    },
    on: (type, handler) => {
      const set = this.handlers.get(type) ?? new Set();
      set.add(handler);
      this.handlers.set(type, set);
    },
    off: (type, handler) => {
      this.handlers.get(type)?.delete(handler);
    },
    setTimer: (fn, delay) => {
      const id = this.nextTimerId++;
      this.timers.set(id, { fn, delay });
      return id;
    },
    clearTimer: (id) => {
      this.timers.delete(id);
    },
  };

  listenerCount(type: NetworkEventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  emit(type: NetworkEventType): void {
    [...(this.handlers.get(type) ?? [])].forEach((handler) => handler());
  }

  get pendingTimers(): number {
    return this.timers.size;
  }

  /** Delay of the single scheduled re-probe, or null when nothing is armed. */
  get scheduledDelay(): number | null {
    const first = [...this.timers.values()][0];
    return first ? first.delay : null;
  }

  /** Fires the armed timer (the monitor never arms more than one). */
  fireTimer(): void {
    const entry = [...this.timers.entries()][0];
    if (!entry) throw new Error('no timer armed');
    this.timers.delete(entry[0]);
    entry[1].fn();
  }

  advance(ms: number): void {
    this.time += ms;
  }
}

/** Lets every queued promise callback run (probes resolve immediately). */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

const monitorOn = (env: FakeEnv): NetworkStatusMonitor => {
  const monitor = new NetworkStatusMonitor(env.deps);
  monitor.start();
  return monitor;
};

// -----------------------------------------------------------------------------

describe('NetworkStatusMonitor', () => {
  it('starts from the browser link state and arms nothing while online', () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    expect(monitor.getSnapshot()).toMatchObject({ online: true, offlineSince: null, blocked: [] });
    expect(env.probeCalls).toBe(0);
    expect(env.pendingTimers).toBe(0);
  });

  it('starts offline (and re-probing) when the browser is already offline', () => {
    const env = new FakeEnv();
    env.linkUp = false;
    const monitor = monitorOn(env);
    expect(monitor.getSnapshot().online).toBe(false);
    expect(monitor.getSnapshot().offlineSince).toBe(env.time);
    expect(env.pendingTimers).toBe(1);
  });

  it('goes offline on the browser offline event and notifies subscribers', () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    const seen: NetworkStatusSnapshot[] = [];
    monitor.subscribe((snapshot) => seen.push(snapshot));

    env.linkUp = false;
    env.emit('offline');

    expect(monitor.getSnapshot().online).toBe(false);
    expect(seen.at(-1)?.online).toBe(false);
    expect(seen.at(-1)?.offlineSince).toBe(env.time);
  });

  it('does not trust the online event until a request actually completes', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.emit('offline');

    // The link is back but nothing can be reached (captive portal).
    env.linkUp = true;
    env.reachable = false;
    env.emit('online');
    await flush();

    expect(env.probeCalls).toBe(1);
    expect(monitor.getSnapshot().online).toBe(false);

    // Now the internet really is there.
    env.reachable = true;
    env.emit('online');
    await flush();

    expect(monitor.getSnapshot()).toMatchObject({ online: true, offlineSince: null, recoveredAt: env.time });
  });

  it('marks the connection down when a reported action cannot reach the network', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    // The browser still claims a link — only the failed action reveals the truth.
    env.reachable = false;

    monitor.report('form');
    await flush();

    expect(monitor.getSnapshot().online).toBe(false);
    expect(monitor.getSnapshot().blocked).toEqual([{ kind: 'form', count: 1, at: env.time }]);
  });

  it('drops a reported failure the network turns out to be innocent of', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);

    monitor.report('ai'); // a server-side failure while the connection is fine
    await flush();

    expect(monitor.getSnapshot().online).toBe(true);
    expect(monitor.getSnapshot().blocked).toEqual([]);
  });

  it('counts repeats per kind, keeps the newest first and caps the list', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.emit('offline');
    env.reachable = false;

    monitor.report('form');
    monitor.report('form');
    monitor.report('page');
    monitor.report('ai');
    monitor.report('meeting');
    monitor.report('request');
    await flush();

    const { blocked } = monitor.getSnapshot();
    expect(blocked).toHaveLength(4);
    expect(blocked[0].kind).toBe('request');
    expect(blocked.map((entry) => entry.kind)).not.toContain('form');
    expect(blocked.find((entry) => entry.kind === 'ai')?.count).toBe(1);
  });

  it('keeps the lost actions through recovery until they are dismissed', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.emit('offline');
    env.reachable = false;
    monitor.report('form');
    await flush();

    env.linkUp = true;
    env.reachable = true;
    env.advance(20_000);
    await monitor.check();

    expect(monitor.getSnapshot()).toMatchObject({ online: true, recoveredAt: env.time });
    expect(monitor.getSnapshot().blocked).toHaveLength(1);

    monitor.dismissRecovery();
    expect(monitor.getSnapshot()).toMatchObject({ recoveredAt: null, blocked: [] });
  });

  it('shares one in-flight probe between concurrent checks', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    const first = monitor.check();
    const second = monitor.check();
    expect(first).toBe(second);
    expect(monitor.getSnapshot().checking).toBe(true);
    await first;
    expect(env.probeCalls).toBe(1);
    expect(monitor.getSnapshot()).toMatchObject({ checking: false, lastCheckedAt: env.time });
  });

  it('re-probes on a backing-off schedule while the outage lasts', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.reachable = false;
    env.emit('offline');
    // The link comes back but the internet behind it does not, so the schedule
    // has something worth asking about.
    env.linkUp = true;

    expect(env.scheduledDelay).toBe(4000);
    env.fireTimer();
    await flush();
    expect(env.probeCalls).toBe(1);
    expect(env.scheduledDelay).toBe(8000);
    env.fireTimer();
    await flush();
    expect(env.scheduledDelay).toBe(15_000);

    // Recovery cancels the schedule and resets the backoff for next time.
    env.reachable = true;
    env.fireTimer();
    await flush();
    expect(monitor.getSnapshot().online).toBe(true);
    expect(env.pendingTimers).toBe(0);

    env.linkUp = false;
    env.reachable = false;
    env.emit('offline');
    expect(env.scheduledDelay).toBe(4000);
  });

  it('leaves a hidden tab alone and probes when it comes back', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.reachable = false;
    env.emit('offline');

    env.visible = false;
    env.fireTimer();
    await flush();
    expect(env.probeCalls).toBe(0);
    expect(env.pendingTimers).toBe(1); // still armed for later

    env.visible = true;
    env.linkUp = true;
    env.reachable = true;
    env.emit('visibilitychange');
    await flush();
    expect(env.probeCalls).toBe(1);
    expect(monitor.getSnapshot().online).toBe(true);
  });

  it('ignores visibility changes while the connection is up', async () => {
    const env = new FakeEnv();
    monitorOn(env);
    env.emit('visibilitychange');
    await flush();
    expect(env.probeCalls).toBe(0);
  });

  it('never announces recovery while the browser reports no link at all', async () => {
    // The reported bug: on a dev server (or any local origin) the probe answers
    // from the same machine, so a device with its Wi-Fi switched off was told
    // it was back online seconds into the outage.
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.emit('offline');
    env.reachable = true; // localhost keeps answering

    await monitor.check(); // the visitor's "check again"
    env.fireTimer(); // and the monitor's own re-probe
    await flush();

    expect(env.probeCalls).toBe(0);
    expect(monitor.getSnapshot()).toMatchObject({ online: false, recoveredAt: null });
    expect(monitor.getSnapshot().lastCheckedAt).toBe(env.time);
  });

  it('keeps re-arming the schedule while there is no link to probe', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.reachable = true;
    env.emit('offline');

    env.fireTimer();
    await flush();
    expect(env.scheduledDelay).toBe(8000);
    env.fireTimer();
    await flush();
    expect(env.scheduledDelay).toBe(15_000);
    expect(monitor.getSnapshot().online).toBe(false);
  });

  it('discards a probe that succeeds after the link has dropped', async () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    const settled = monitor.check(); // starts while the link is up
    env.linkUp = false; // ...and drops before the answer arrives
    await settled;

    expect(monitor.getSnapshot()).toMatchObject({ online: false, recoveredAt: null });
  });

  it('detaches every listener and timer on stop, and can start again', () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    env.linkUp = false;
    env.emit('offline');
    expect(env.pendingTimers).toBe(1);

    monitor.stop();
    expect(env.listenerCount('online')).toBe(0);
    expect(env.listenerCount('offline')).toBe(0);
    expect(env.listenerCount('visibilitychange')).toBe(0);
    expect(env.pendingTimers).toBe(0);

    monitor.start();
    expect(env.listenerCount('offline')).toBe(1);
    expect(env.pendingTimers).toBe(1);
  });

  it('only notifies subscribers when something actually changed', () => {
    const env = new FakeEnv();
    const monitor = monitorOn(env);
    const listener = vi.fn();
    monitor.subscribe(listener);

    env.linkUp = false;
    env.emit('offline');
    env.emit('offline'); // already offline: nothing new to say
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
