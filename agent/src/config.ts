// =============================================================================
// Buddy agent — server-controlled configuration.
//
// Everything that influences money, time or usage lives here (or in env
// overrides parsed here) — never in model output and never in the browser.
// =============================================================================

/** Bump when rates/limits change; stored with every estimate. */
export const ESTIMATE_CONFIG_VERSION = 'v1';

/** Hourly-rate band (USD). Matches the published example rates ($10–$20/hr
 * across roles); the blended band is what preliminary estimates use. */
export const HOURLY_RATE_MIN = 10;
export const HOURLY_RATE_MAX = 20;

/** Standard delivery capacity used to project duration. */
export const WEEKLY_CAPACITY_HOURS = 40;

/** Per-role hour caps — hostile/absurd classifications can never exceed these. */
export const MAX_ROLE_HOURS = 2000;
export const MAX_TOTAL_HOURS = 10000;

export type RoleKey = 'frontend' | 'backend' | 'uiux' | 'qa' | 'devops' | 'pm';
export const ROLE_KEYS: RoleKey[] = ['frontend', 'backend', 'uiux', 'qa', 'devops', 'pm'];

export const ROLE_LABELS: Record<RoleKey, string> = {
  frontend: 'Frontend Developer',
  backend: 'Backend Developer',
  uiux: 'UI/UX Designer',
  qa: 'QA Tester',
  devops: 'DevOps Engineer',
  pm: 'Project Manager',
};

/** Base hours per role by overall complexity class (min side of the range). */
export const COMPLEXITY_BASE_HOURS: Record<'small' | 'medium' | 'large', Record<RoleKey, number>> = {
  small: { frontend: 20, backend: 15, uiux: 8, qa: 5, devops: 3, pm: 4 },
  medium: { frontend: 45, backend: 40, uiux: 16, qa: 12, devops: 8, pm: 10 },
  large: { frontend: 90, backend: 85, uiux: 30, qa: 25, devops: 16, pm: 20 },
};

/** Range spread applied on top of the base to get the max side. */
export const RANGE_SPREAD = 0.4;

/** Per-feature-module hour weights by module complexity. */
export const MODULE_HOURS: Record<'simple' | 'standard' | 'complex', { min: number; max: number }> = {
  simple: { min: 4, max: 8 },
  standard: { min: 10, max: 20 },
  complex: { min: 24, max: 48 },
};

/** How module hours are distributed across roles. */
export const MODULE_ROLE_SPLIT: Record<RoleKey, number> = {
  frontend: 0.4,
  backend: 0.35,
  uiux: 0.08,
  qa: 0.1,
  devops: 0.03,
  pm: 0.04,
};

/** Flat extra backend/qa hours for known heavy concerns. */
export const CONCERN_EXTRAS: Record<string, Partial<Record<RoleKey, number>>> = {
  payments: { backend: 10, qa: 4 },
  admin_panel: { frontend: 8, backend: 6 },
  mobile: { frontend: 20, qa: 6 },
  audit: { backend: 8, pm: 2 },
};

export const MAX_MODULES = 20;

// --- session / cost limits (env-overridable, safe defaults) --------------------------

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export interface SessionLimits {
  /** Hard cap on one voice session, seconds. */
  maxSessionSeconds: number;
  /** Disconnect after this much visitor silence, seconds. */
  idleTimeoutSeconds: number;
  /** Maximum LLM turns per session. */
  maxLlmTurns: number;
  /** Maximum transcript characters kept in memory / sent as excerpt. */
  maxTranscriptChars: number;
  /** Provider call timeout, milliseconds. */
  providerTimeoutMs: number;
}

export function loadSessionLimits(): SessionLimits {
  return {
    maxSessionSeconds: intEnv('BUDDY_MAX_SESSION_SECONDS', 900, 60, 3600),
    idleTimeoutSeconds: intEnv('BUDDY_IDLE_TIMEOUT_SECONDS', 90, 15, 600),
    maxLlmTurns: intEnv('BUDDY_MAX_LLM_TURNS', 80, 5, 500),
    maxTranscriptChars: intEnv('BUDDY_MAX_TRANSCRIPT_CHARS', 8000, 1000, 100000),
    providerTimeoutMs: intEnv('BUDDY_PROVIDER_TIMEOUT_MS', 15000, 2000, 60000),
  };
}
