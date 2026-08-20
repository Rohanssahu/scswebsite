import { useCallback, useEffect, useRef } from 'react';
import { BUDDY_TIMING } from '@/data/buddyTiming';

// Local-only inactivity tracking for Buddy (plain timers — no analytics or
// invasive tracking). Three stages: small waiting animation → sleepy with a
// single subtle bubble → friendly retreat into the home.

export type BuddyInactivityStage = 0 | 1 | 2 | 3;

interface BuddyInactivityOptions {
  /** Only ticks while true (Buddy outside, panel closed, tab visible). */
  enabled: boolean;
  onStage: (stage: BuddyInactivityStage) => void;
}

export function useBuddyInactivity({ enabled, onStage }: BuddyInactivityOptions) {
  const lastRef = useRef<number>(Date.now());
  const stageRef = useRef<BuddyInactivityStage>(0);
  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;

  const markInteraction = useCallback(() => {
    lastRef.current = Date.now();
    if (stageRef.current !== 0) {
      stageRef.current = 0;
      onStageRef.current(0);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    lastRef.current = Date.now();
    const id = window.setInterval(() => {
      const idleMs = Date.now() - lastRef.current;
      let next: BuddyInactivityStage = 0;
      if (idleMs >= BUDDY_TIMING.inactivityRetreatMs) next = 3;
      else if (idleMs >= BUDDY_TIMING.inactivitySleepyMs) next = 2;
      else if (idleMs >= BUDDY_TIMING.inactivityWaitMs) next = 1;
      if (next > stageRef.current) {
        stageRef.current = next;
        onStageRef.current(next);
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return { markInteraction };
}
