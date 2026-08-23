// =============================================================================
// networkStatus — the site's single source of truth for "is the internet there".
//
// `navigator.onLine` is only trustworthy in one direction, so it is used in
// exactly that direction and confirmed in the other:
//
//   - it reports NO link  -> conclusively offline. The device has no network at
//     all, and nothing may overrule that. In particular a same-origin probe
//     must not: a dev server (or any local/proxied origin) happily answers from
//     the same machine while the device's Wi-Fi is switched off, which would
//     otherwise announce "back online" seconds into a real outage.
//   - it reports a link   -> unproven, so a real request decides. It stays true
//     on dead hotel Wi-Fi, a captive portal or a dropped tunnel.
//
// The deciding request asks for a tiny same-origin file:
//
//   - any HTTP answer (even a 404) proves the network is reachable  -> online
//   - fetch rejecting, or taking longer than PROBE_TIMEOUT_MS       -> offline
//
// One consequence worth knowing while developing: on `localhost` the probe can
// only ever prove the dev server is up, so there the link check above is the
// whole of the detection. On the deployed domain the probe is a real
// internet round-trip.
//
// While offline it re-probes on a backing-off schedule and whenever the tab
// becomes visible again, so recovery is noticed without the visitor doing
// anything. Feature code that fails because of the network calls
// `reportNetworkFailure(kind)`; that both confirms the outage immediately and
// tells the UI which action the visitor lost, so the notice can name it.
//
// The controller takes its browser access through `NetworkStatusDeps` so the
// whole state machine is testable against fakes, and `getNetworkStatus()`
// returns null under Node (the build-time prerender imports this module
// transitively and must never touch a browser API).
// =============================================================================

/** The kinds of visitor action that need the network. */
export type BlockedActionKind = 'page' | 'form' | 'ai' | 'meeting' | 'request';

export interface BlockedAction {
  kind: BlockedActionKind;
  /** How many times this kind of action was attempted during the outage. */
  count: number;
  /** Timestamp of the most recent attempt. */
  at: number;
}

export interface NetworkStatusSnapshot {
  /** Best current belief, probe-confirmed rather than `navigator.onLine`. */
  online: boolean;
  /** A confirmation probe is in flight. */
  checking: boolean;
  /** When the current outage started; null while online. */
  offlineSince: number | null;
  /** When the last outage ended; null until it does, cleared on dismiss. */
  recoveredAt: number | null;
  /** When a probe last settled — what "last checked" in the UI reports. */
  lastCheckedAt: number | null;
  /** Actions the visitor tried during the outage, newest first. */
  blocked: BlockedAction[];
}

export interface NetworkStatusDeps {
  /** The browser's own link hint. */
  isOnline: () => boolean;
  now: () => number;
  /** True when a tiny same-origin request got any answer. Never rejects. */
  probe: () => Promise<boolean>;
  /** True while the page is visible (a hidden tab is not worth re-probing). */
  isVisible: () => boolean;
  on: (type: NetworkEventType, handler: () => void) => void;
  off: (type: NetworkEventType, handler: () => void) => void;
  setTimer: (fn: () => void, ms: number) => number;
  clearTimer: (id: number) => void;
}

export type NetworkEventType = 'online' | 'offline' | 'visibilitychange';

/** Same-origin, tiny, and present on every deployment. */
const PROBE_PATH = '/robots.txt';
const PROBE_TIMEOUT_MS = 6000;
/** Re-probe delays while offline; the last value repeats. */
const RECHECK_STEPS_MS = [4000, 8000, 15000, 30000];
/** At most this many distinct action kinds are remembered per outage. */
const MAX_BLOCKED = 4;

export const INITIAL_NETWORK_SNAPSHOT: NetworkStatusSnapshot = {
  online: true,
  checking: false,
  offlineSince: null,
  recoveredAt: null,
  lastCheckedAt: null,
  blocked: [],
};

export class NetworkStatusMonitor {
  private snapshot: NetworkStatusSnapshot;
  private listeners = new Set<(snapshot: NetworkStatusSnapshot) => void>();
  private started = false;
  private recheckTimer: number | null = null;
  private recheckStep = 0;
  private probeInFlight: Promise<boolean> | null = null;

  constructor(private readonly deps: NetworkStatusDeps) {
    this.snapshot = { ...INITIAL_NETWORK_SNAPSHOT, online: deps.isOnline() };
    if (!this.snapshot.online) this.snapshot.offlineSince = deps.now();
  }

  // --- browser wiring --------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;
    this.deps.on('online', this.handleOnline);
    this.deps.on('offline', this.handleOffline);
    this.deps.on('visibilitychange', this.handleVisibility);
    if (!this.snapshot.online) this.scheduleRecheck();
  }

  /** Detaches every listener and timer. Restartable. */
  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.deps.off('online', this.handleOnline);
    this.deps.off('offline', this.handleOffline);
    this.deps.off('visibilitychange', this.handleVisibility);
    this.cancelRecheck();
  }

  subscribe(listener: (snapshot: NetworkStatusSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stable object identity between changes — safe for useSyncExternalStore. */
  getSnapshot(): NetworkStatusSnapshot {
    return this.snapshot;
  }

  // --- public actions --------------------------------------------------------

  /**
   * Confirms the current state with a real request. The visitor's "check again"
   * button and every reported failure land here; concurrent calls share one
   * in-flight probe rather than stacking requests on a dying connection.
   */
  check(): Promise<boolean> {
    if (this.probeInFlight) return this.probeInFlight;
    // No link at all: conclusive, and a request would only ask the local
    // machine a question it cannot answer for the internet.
    if (!this.deps.isOnline()) {
      this.patch({ checking: false, lastCheckedAt: this.deps.now() });
      this.goOffline();
      return Promise.resolve(false);
    }
    this.patch({ checking: true });
    const run = this.deps.probe().then(
      (reachable) => this.settleProbe(reachable),
      () => this.settleProbe(false),
    );
    this.probeInFlight = run;
    return run;
  }

  /**
   * Records that an action failed for network reasons, then confirms. Called
   * from the service layer, so a captive portal that keeps `navigator.onLine`
   * true still surfaces as an outage the moment the visitor tries something.
   */
  report(kind: BlockedActionKind): void {
    const at = this.deps.now();
    const existing = this.snapshot.blocked.find((entry) => entry.kind === kind);
    const rest = this.snapshot.blocked.filter((entry) => entry.kind !== kind);
    const blocked = [{ kind, count: (existing?.count ?? 0) + 1, at }, ...rest].slice(0, MAX_BLOCKED);
    this.patch({ blocked });
    void this.check();
  }

  /** The visitor acknowledged the recovery notice: clear the outage history. */
  dismissRecovery(): void {
    this.patch({ recoveredAt: null, blocked: [] });
  }

  // --- state machine --------------------------------------------------------

  private handleOnline = (): void => {
    // The link is back; only a completed request proves the internet is.
    void this.check();
  };

  private handleOffline = (): void => {
    this.goOffline();
  };

  private handleVisibility = (): void => {
    if (!this.snapshot.online && this.deps.isVisible()) void this.check();
  };

  private settleProbe(reachable: boolean): boolean {
    this.probeInFlight = null;
    const wasOffline = !this.snapshot.online;
    this.patch({ checking: false, lastCheckedAt: this.deps.now() });
    // The link can drop while a probe is in flight; its late success says
    // nothing about the connection the visitor has now.
    if (!reachable || !this.deps.isOnline()) {
      this.goOffline();
      return false;
    }
    this.goOnline();
    // We already believed we were online and the network answers fine, so
    // whatever failure was reported was not the connection's fault — it must
    // not sit in the list waiting to be blamed on the next real outage.
    // A genuine recovery (wasOffline) keeps its list: it explains the reload.
    if (!wasOffline) this.patch({ blocked: [] });
    return true;
  }

  private goOffline(): void {
    if (this.snapshot.online) {
      this.patch({ online: false, offlineSince: this.deps.now(), recoveredAt: null });
      this.recheckStep = 0;
    }
    this.scheduleRecheck();
  }

  private goOnline(): void {
    this.cancelRecheck();
    if (this.snapshot.online) return;
    // `blocked` deliberately survives: the notice uses it to explain what the
    // visitor should retry (or reload for) now that the connection is back.
    this.patch({ online: true, offlineSince: null, recoveredAt: this.deps.now() });
  }

  private scheduleRecheck(): void {
    if (!this.started || this.recheckTimer !== null) return;
    const delay = RECHECK_STEPS_MS[Math.min(this.recheckStep, RECHECK_STEPS_MS.length - 1)];
    this.recheckStep += 1;
    this.recheckTimer = this.deps.setTimer(() => {
      this.recheckTimer = null;
      if (this.snapshot.online) return;
      // A hidden tab is left alone; handleVisibility probes when it returns.
      if (!this.deps.isVisible()) {
        this.scheduleRecheck();
        return;
      }
      void this.check();
    }, delay);
  }

  private cancelRecheck(): void {
    if (this.recheckTimer !== null) {
      this.deps.clearTimer(this.recheckTimer);
      this.recheckTimer = null;
    }
    this.recheckStep = 0;
  }

  private patch(change: Partial<NetworkStatusSnapshot>): void {
    const next = { ...this.snapshot, ...change };
    const changed = (Object.keys(change) as Array<keyof NetworkStatusSnapshot>).some(
      (key) => this.snapshot[key] !== next[key],
    );
    if (!changed) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener(next));
  }
}

// --- browser deps ------------------------------------------------------------

export function browserNetworkStatusDeps(): NetworkStatusDeps {
  return {
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    now: () => Date.now(),
    isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    probe: async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        // Cache-busted and no-store: a cached copy would report a dead
        // connection as healthy.
        await fetch(`${PROBE_PATH}?connection-probe=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        return true;
      } catch {
        return false;
      } finally {
        window.clearTimeout(timer);
      }
    },
    on: (type, handler) => {
      if (type === 'visibilitychange') document.addEventListener(type, handler);
      else window.addEventListener(type, handler);
    },
    off: (type, handler) => {
      if (type === 'visibilitychange') document.removeEventListener(type, handler);
      else window.removeEventListener(type, handler);
    },
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id),
  };
}

let monitor: NetworkStatusMonitor | null = null;

/**
 * The shared monitor, created and started on first use. Null under Node, so
 * the prerender and unit tests of importing modules stay browser-free.
 */
export function getNetworkStatus(): NetworkStatusMonitor | null {
  if (typeof window === 'undefined') return null;
  if (!monitor) {
    monitor = new NetworkStatusMonitor(browserNetworkStatusDeps());
    monitor.start();
  }
  return monitor;
}

/**
 * True when a request failed before it ever got an answer — it could not leave
 * the device. Supabase's Edge Function client reports exactly that case as
 * `FunctionsFetchError`; an HTTP status (`FunctionsHttpError`) is a server-side
 * answer, so a 4xx/5xx deliberately does not match.
 *
 * Call sites pair this with `reportNetworkFailure()` so a connection-caused
 * failure is named in the connection drawer, while a server error stays a
 * plain form-level message.
 */
export function isConnectionError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'FunctionsFetchError';
}

/**
 * Reports a network-caused failure from anywhere in the app. Safe to call in
 * any environment: outside the browser it does nothing.
 */
export function reportNetworkFailure(kind: BlockedActionKind): void {
  getNetworkStatus()?.report(kind);
}
