// =============================================================================
// useNetworkStatus — React view of the shared NetworkStatusMonitor.
//
// The monitor is a module singleton (one set of listeners and one probe for the
// whole page, no matter how many components ask), so this hook only subscribes
// to it. `useSyncExternalStore` keeps the render consistent with the store and
// gives the prerender a fixed "online" snapshot without touching the browser.
// =============================================================================

import { useCallback, useSyncExternalStore } from 'react';
import {
  getNetworkStatus,
  INITIAL_NETWORK_SNAPSHOT,
  type NetworkStatusSnapshot,
} from '@/services/networkStatus';

export interface NetworkStatusApi extends NetworkStatusSnapshot {
  /** Re-confirms the connection now (the visitor's "check again"). */
  check: () => void;
  /** Acknowledges the "back online" notice. */
  dismiss: () => void;
}

const subscribe = (onChange: () => void): (() => void) => {
  const status = getNetworkStatus();
  if (!status) return () => {};
  return status.subscribe(onChange);
};

const readSnapshot = (): NetworkStatusSnapshot =>
  getNetworkStatus()?.getSnapshot() ?? INITIAL_NETWORK_SNAPSHOT;

const readServerSnapshot = (): NetworkStatusSnapshot => INITIAL_NETWORK_SNAPSHOT;

export function useNetworkStatus(): NetworkStatusApi {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, readServerSnapshot);

  const check = useCallback(() => {
    void getNetworkStatus()?.check();
  }, []);

  const dismiss = useCallback(() => {
    getNetworkStatus()?.dismissRecovery();
  }, []);

  return { ...snapshot, check, dismiss };
}
