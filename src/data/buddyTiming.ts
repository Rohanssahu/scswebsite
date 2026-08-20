// Central timing constants for Buddy's animation, inactivity and home system.
// All inactivity tracking is local (timers only) — no analytics, no network.

export const BUDDY_TIMING = {
  /** Stage 1 — small waiting animation, no popup, no sound. */
  inactivityWaitMs: 30_000,
  /** Stage 2 — sleepy look + one subtle "I'll wait here" bubble. */
  inactivitySleepyMs: 75_000,
  /** Stage 3 — Buddy waves goodbye and walks into its home. */
  inactivityRetreatMs: 120_000,
  /** Closing the panel this many times also sends Buddy home. */
  dismissRetreatCount: 3,

  // Retreat / return sequence phases (ms).
  goodbyeMs: 1_700,
  turnMs: 450,
  walkMs: 2_300,
  walkMsMobile: 1_400,
  enterMs: 750,
  doorMs: 450,
  knockMs: 700,
  peekMs: 1_100,
  greetMs: 2_600,

  /** How long a conversation reaction pose is held. */
  reactionMs: 3_000,
  /** Don't repeat the same reaction within this window. */
  reactionRepeatGuardMs: 8_000,
  /** How long speech bubbles stay visible. */
  bubbleMs: 7_000,
} as const;

/** Default spring for pose-to-pose transitions — no abrupt pose changes. */
export const BUDDY_SPRING = { type: 'spring', stiffness: 130, damping: 15, mass: 0.8 } as const;

/** Walking distance between guide position and home (px). Kept short so
 * Buddy stays docked near the screen edge and never drifts toward content. */
export const BUDDY_WALK_DISTANCE = { desktop: 76, mobile: 48 } as const;

/** Character sizes (height in px). */
export const BUDDY_SIZE = { desktop: 96, mobile: 72 } as const;

/** Home sizes (width in px). */
export const BUDDY_HOME_SIZE = { desktop: 84, mobile: 64 } as const;
