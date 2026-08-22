// =============================================================================
// Buddy voice session — pure core logic (no LiveKit / browser dependencies).
//
// Everything security- or state-relevant that the UI relies on lives here so
// it can be unit-tested: validating the token response, whitelisting the
// agent's data-channel messages, and the session state machine. The LiveKit
// wiring in voiceSession.ts stays a thin transport layer.
// =============================================================================

/** UI-facing session states. */
export type VoiceSessionState =
  | 'idle'
  | 'consent' // consent + Turnstile screen shown
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'paused' // mic muted by the visitor
  | 'completed'
  | 'error';

export type VoiceErrorCode =
  | 'mic_denied'
  | 'voice_disabled'
  | 'turnstile_failed'
  | 'rate_limited'
  | 'connect_failed'
  | 'disconnected'
  | 'expired'
  | 'unknown';

/** Map a livekit-token function error payload to a UI error code. */
export function mapTokenError(errorCode: string | undefined, status?: number): VoiceErrorCode {
  switch (errorCode) {
    case 'voice_disabled':
      return 'voice_disabled';
    case 'turnstile_failed':
      return 'turnstile_failed';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return status && status >= 500 ? 'connect_failed' : 'unknown';
  }
}

export interface VoiceTokenResponse {
  url: string;
  token: string;
  roomName: string;
  sessionId: string;
  expiresInSeconds: number;
}

/** Strictly validate the livekit-token response before connecting anywhere.
 * The URL must be a LiveKit websocket URL — never an arbitrary target. */
export function parseTokenResponse(data: unknown): VoiceTokenResponse | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.ok !== true) return null;
  const url = typeof d.url === 'string' ? d.url : '';
  const token = typeof d.token === 'string' ? d.token : '';
  const roomName = typeof d.roomName === 'string' ? d.roomName : '';
  const sessionId = typeof d.sessionId === 'string' ? d.sessionId : '';
  if (!/^wss:\/\/[a-z0-9.-]+/i.test(url)) return null;
  if (token.length < 20 || token.length > 4096) return null;
  if (!roomName || !sessionId) return null;
  const expires = typeof d.expiresInSeconds === 'number' ? d.expiresInSeconds : 600;
  return { url, token, roomName, sessionId, expiresInSeconds: expires };
}

import { STANDARD_HOURLY_RATE_USD } from '@/policy/estimationPolicy';

// --- agent → browser state messages (topic buddy.state) --------------------------
//
// The agent is trusted infrastructure, but the LiveKit room is still an external
// channel, so every figure it publishes is re-validated against the SAME shared
// commercial policy the report uses before the UI renders it.

export interface BuddyEstimateView {
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMin: number;
  totalCostMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
  weeklyCapacityHours: number;
  hourlyRateUsd: number;
  currency: 'USD';
  confidence: 'low' | 'medium' | 'high';
  modules: Array<{ name: string; hours_min: number; hours_max: number }>;
  teamRoles: string[];
  assumptions: string[];
  exclusions: string[];
  risks: string[];
  /** Budget fit, included/deferred scope and the optional tiers. */
  budgetPlan: BudgetPlanView | null;
  /** The exact client-facing sentences Buddy is told to speak. */
  budgetNarrative: string[];
  estimateVersion: string;
  status: 'preliminary';
}

export interface BuddyProgressView {
  intent: string | null;
  collected: string[];
  missingRequired: string[];
  percent: number;
  confidence: string;
}

export interface BudgetScopeItemView {
  label: string;
  tier: string;
  hours: number;
}

export interface BudgetTierView {
  hours: number;
  costUsd: number;
  weeks: number;
  percentAboveBudget: number;
  includedScope: BudgetScopeItemView[];
  deferredScope: BudgetScopeItemView[];
  addedVsBase: BudgetScopeItemView[];
}

/** The budget-fit plan the agent computed — the source of every figure shown. */
export interface BudgetPlanView {
  estimateVersion: string;
  selectedBudgetUsd: number;
  budgetProvided: boolean;
  hourlyRateUsd: number;
  availableHours: number;
  budgetFitPercent: number;
  coverageBand: string;
  coversEssentialScope: boolean;
  base: BudgetTierView;
  recommended: BudgetTierView | null;
  growth: BudgetTierView | null;
  unclearScope: BudgetScopeItemView[];
  humanReviewRequired: true;
}

/** Consultation-meeting proposal published by the agent (whitelist-parsed). */
export interface BuddyProposalView {
  version: number;
  status: 'preliminary';
  requiresHumanReview: true;
  summary: string;
  recommendedSolution: string[];
  architecture: string[];
  technologyStack: string[];
  inScope: string[];
  outOfScope: string[];
  aiRoles: string[];
  humanRoles: string[];
  milestones: Array<{ title: string; weeks: string }>;
  assumptions: string[];
  dependencies: string[];
  risks: string[];
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMin: number;
  totalCostMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
  weeklyCapacityHours: number;
  hourlyRateUsd: number;
  currency: 'USD';
  confidence: 'low' | 'medium' | 'high';
  /** Budget fit, included/deferred scope and the optional tiers. */
  budgetPlan: BudgetPlanView | null;
  /** The exact client-facing sentences Buddy is told to speak. */
  budgetNarrative: string[];
  estimateVersion: string;
}

export interface BuddyStateView {
  progress: BuddyProgressView | null;
  language: string | null;
  estimate: BuddyEstimateView | null;
  confirmed: boolean;
  referenceCode: string | null;
  /** 'consultation' in meeting mode; null in the general voice flow. */
  mode: string | null;
  proposal: BuddyProposalView | null;
  finalized: boolean;
}

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;

/**
 * Whitelist-parse the budget-fit snapshot the agent publishes. The commercial
 * guarantees are re-checked here so the meeting UI can never render a rate
 * above the standard rate, a base option above the client's own budget, or an
 * optional tier outside its +20% / +30% band. Anything that fails is dropped.
 */
export function parseBudgetPlanView(raw: unknown): BudgetPlanView | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (p.currency !== 'USD') return null;
  if (p.hourly_rate_usd !== STANDARD_HOURLY_RATE_USD) return null;
  const budget = num(p.selected_budget_usd, 0, 10_000_000);
  const availableHours = num(p.available_hours, 0, 100_000);
  const fitPercent = num(p.budget_fit_percent, 0, 100);
  if (budget === null || availableHours === null || fitPercent === null) return null;

  const scope = (v: unknown): BudgetScopeItemView[] =>
    Array.isArray(v)
      ? v
          .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
          .slice(0, 60)
          .map((i) => ({
            label: typeof i.label === 'string' ? i.label.slice(0, 200) : '',
            tier: typeof i.tier === 'string' ? i.tier.slice(0, 20) : 'unclear',
            hours: num(i.hours, 0, 100_000) ?? 0,
          }))
          .filter((i) => i.label)
      : [];

  const tier = (v: unknown, maxPercent: number): BudgetTierView | null => {
    if (typeof v !== 'object' || v === null) return null;
    const t = v as Record<string, unknown>;
    const hours = num(t.hours, 0, 100_000);
    const cost = num(t.cost_usd, 0, 10_000_000);
    const weeks = num(t.weeks, 0, 520);
    const percent = num(t.percent_above_budget, 0, maxPercent);
    if (hours === null || cost === null || weeks === null || percent === null) return null;
    // The published guarantee, re-checked: a tier can never cost more than its
    // own ceiling above the client's stated budget.
    if (cost > Math.floor((budget * (100 + percent)) / 100)) return null;
    if (cost !== hours * STANDARD_HOURLY_RATE_USD) return null;
    return {
      hours,
      costUsd: cost,
      weeks,
      percentAboveBudget: percent,
      includedScope: scope(t.included_scope),
      deferredScope: scope(t.deferred_scope),
      addedVsBase: scope(t.added_vs_base),
    };
  };

  const base = tier(p.base_estimate, 0);
  if (!base) return null;
  return {
    estimateVersion: typeof p.estimate_version === 'string' ? p.estimate_version.slice(0, 40) : '',
    selectedBudgetUsd: budget,
    budgetProvided: p.budget_provided === true,
    hourlyRateUsd: STANDARD_HOURLY_RATE_USD,
    availableHours,
    budgetFitPercent: fitPercent,
    coverageBand: typeof p.coverage_band === 'string' ? p.coverage_band.slice(0, 20) : 'unknown',
    coversEssentialScope: p.covers_essential_scope === true,
    base,
    recommended: tier(p.optional_20_percent_estimate, 20),
    growth: tier(p.optional_30_percent_estimate, 30),
    unclearScope: scope(p.unclear_scope),
    humanReviewRequired: true,
  };
}

const strList = (v: unknown, maxItems = 30, maxLen = 300): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === 'string')
        .slice(0, maxItems)
        .map((i) => i.slice(0, maxLen))
    : [];

/**
 * Whitelist-parse one buddy.state data message. Anything malformed returns
 * null and is ignored — the agent is trusted infrastructure, but the room is
 * still an external channel, so the UI never renders unvalidated content.
 */
export function parseBuddyState(raw: string): BuddyStateView | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const d = parsed as Record<string, unknown>;
  if (d.type !== 'buddy.state') return null;

  let progress: BuddyProgressView | null = null;
  if (typeof d.progress === 'object' && d.progress !== null) {
    const p = d.progress as Record<string, unknown>;
    progress = {
      intent: typeof p.intent === 'string' ? p.intent.slice(0, 40) : null,
      collected: strList(p.collected, 40, 64),
      missingRequired: strList(p.missingRequired, 40, 64),
      percent: num(p.percent, 0, 100) ?? 0,
      confidence: typeof p.confidence === 'string' ? p.confidence.slice(0, 10) : 'low',
    };
  }

  let estimate: BuddyEstimateView | null = null;
  if (typeof d.estimate === 'object' && d.estimate !== null) {
    const e = d.estimate as Record<string, unknown>;
    const hoursMin = num(e.totalHoursMin, 0, 100000);
    const hoursMax = num(e.totalHoursMax, 0, 100000);
    const costMin = num(e.totalCostMin, 0, 10000000);
    const costMax = num(e.totalCostMax, 0, 10000000);
    const weeksMin = num(e.durationWeeksMin, 0, 520);
    const weeksMax = num(e.durationWeeksMax, 0, 520);
    const capacity = num(e.weeklyCapacityHours, 1, 168);
    const confidence = e.confidence === 'low' || e.confidence === 'medium' || e.confidence === 'high' ? e.confidence : null;
    if (
      hoursMin !== null &&
      hoursMax !== null &&
      costMin !== null &&
      costMax !== null &&
      weeksMin !== null &&
      weeksMax !== null &&
      capacity !== null &&
      confidence !== null
    ) {
      const modules = Array.isArray(e.modules)
        ? e.modules
            .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
            .slice(0, 20)
            .map((m) => ({
              name: typeof m.name === 'string' ? m.name.slice(0, 100) : '',
              hours_min: num(m.hours_min, 0, 100000) ?? 0,
              hours_max: num(m.hours_max, 0, 100000) ?? 0,
            }))
            .filter((m) => m.name)
        : [];
      estimate = {
        totalHoursMin: hoursMin,
        totalHoursMax: hoursMax,
        totalCostMin: costMin,
        totalCostMax: costMax,
        durationWeeksMin: weeksMin,
        durationWeeksMax: weeksMax,
        weeklyCapacityHours: capacity,
        currency: 'USD',
        confidence,
        modules,
        teamRoles: strList(e.teamRoles, 12, 100),
        assumptions: strList(e.assumptions),
        exclusions: strList(e.exclusions),
        risks: strList(e.risks),
        hourlyRateUsd: num(e.hourlyRateUsd, 0, STANDARD_HOURLY_RATE_USD) ?? STANDARD_HOURLY_RATE_USD,
        budgetPlan: parseBudgetPlanView(e.budgetPlan),
        budgetNarrative: strList(e.narrative, 12, 800),
        estimateVersion: typeof e.estimateVersion === 'string' ? e.estimateVersion.slice(0, 40) : '',
        status: 'preliminary',
      };
    }
  }

  const reference = typeof d.referenceCode === 'string' && /^SCS-[A-Z0-9]{8}$/.test(d.referenceCode) ? d.referenceCode : null;

  let proposal: BuddyProposalView | null = null;
  if (typeof d.proposal === 'object' && d.proposal !== null) {
    const p = d.proposal as Record<string, unknown>;
    const hoursMin = num(p.totalHoursMin, 0, 100000);
    const hoursMax = num(p.totalHoursMax, 0, 100000);
    const costMin = num(p.totalCostMin, 0, 10000000);
    const costMax = num(p.totalCostMax, 0, 10000000);
    const weeksMin = num(p.durationWeeksMin, 0, 520);
    const weeksMax = num(p.durationWeeksMax, 0, 520);
    const capacity = num(p.weeklyCapacityHours, 1, 168);
    const confidence = p.confidence === 'low' || p.confidence === 'medium' || p.confidence === 'high' ? p.confidence : null;
    const summary = typeof p.summary === 'string' ? p.summary.slice(0, 2000) : '';
    if (
      summary &&
      hoursMin !== null &&
      hoursMax !== null &&
      costMin !== null &&
      costMax !== null &&
      weeksMin !== null &&
      weeksMax !== null &&
      capacity !== null &&
      confidence !== null
    ) {
      const milestones = Array.isArray(p.milestones)
        ? p.milestones
            .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
            .slice(0, 12)
            .map((m) => ({
              title: typeof m.title === 'string' ? m.title.slice(0, 200) : '',
              weeks: typeof m.weeks === 'string' ? m.weeks.slice(0, 40) : '',
            }))
            .filter((m) => m.title)
        : [];
      proposal = {
        version: num(p.version, 0, 100) ?? 1,
        status: 'preliminary',
        requiresHumanReview: true,
        summary,
        recommendedSolution: strList(p.recommendedSolution),
        architecture: strList(p.architecture),
        technologyStack: strList(p.technologyStack),
        inScope: strList(p.inScope),
        outOfScope: strList(p.outOfScope),
        aiRoles: strList(p.aiRoles, 12, 200),
        humanRoles: strList(p.humanRoles, 12, 200),
        milestones,
        assumptions: strList(p.assumptions),
        dependencies: strList(p.dependencies),
        risks: strList(p.risks),
        totalHoursMin: hoursMin,
        totalHoursMax: hoursMax,
        totalCostMin: costMin,
        totalCostMax: costMax,
        durationWeeksMin: weeksMin,
        durationWeeksMax: weeksMax,
        weeklyCapacityHours: capacity,
        hourlyRateUsd: num(p.hourlyRateUsd, 0, STANDARD_HOURLY_RATE_USD) ?? STANDARD_HOURLY_RATE_USD,
        currency: 'USD',
        confidence,
        budgetPlan: parseBudgetPlanView(p.budgetPlan),
        budgetNarrative: strList(p.budgetNarrative, 12, 800),
        estimateVersion: typeof p.estimateVersion === 'string' ? p.estimateVersion.slice(0, 40) : '',
      };
    }
  }

  return {
    progress,
    language: typeof d.language === 'string' ? d.language.slice(0, 20) : null,
    estimate,
    confirmed: d.confirmed === true,
    referenceCode: reference,
    mode: typeof d.mode === 'string' ? d.mode.slice(0, 20) : null,
    proposal,
    finalized: d.finalized === true,
  };
}

// --- transcript entries ----------------------------------------------------------------

export interface TranscriptItem {
  id: string;
  speaker: 'user' | 'buddy';
  text: string;
  final: boolean;
}

/** Merge a transcription segment into the list (segments update in place). */
export function upsertTranscript(items: TranscriptItem[], incoming: TranscriptItem, max = 200): TranscriptItem[] {
  const idx = items.findIndex((i) => i.id === incoming.id);
  const next = idx === -1 ? [...items, incoming] : items.map((i, n) => (n === idx ? incoming : i));
  return next.length > max ? next.slice(next.length - max) : next;
}
