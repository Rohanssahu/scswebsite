// =============================================================================
// SCS Softwares — SHARED COMMERCIAL ESTIMATION POLICY (canonical source).
//
// This is the ONE place any client-facing hourly rate, capacity figure,
// budget-fit percentage or optional-upgrade band may come from. Every flow
// (Project Analysis chat + form, generated report, floating Buddy chat, Buddy
// voice, AI consultation meeting, proposal generation, lead persistence and
// the admin dashboard) reads its numbers from here.
//
// THREE RUNTIMES, ONE FILE
// ------------------------
// The frontend (Vite), the Supabase Edge Functions (Deno) and the Buddy agent
// worker (Node) cannot share a package, so this file is MIRRORED BYTE-FOR-BYTE
// into all three trees:
//
//   src/policy/estimationPolicy.ts                  <- canonical
//   supabase/functions/_shared/estimationPolicy.ts  <- mirror (Deno)
//   agent/src/estimationPolicy.ts                   <- mirror (Node)
//
// src/policy/policyMirrors.test.ts fails the suite if they ever diverge, so
// there is no way to change a rate in one runtime only. The file therefore has
// NO IMPORTS of any kind and uses no runtime-specific API.
//
// THE MODEL NEVER DOES ARITHMETIC
// ------------------------------
// Gemini may only CLASSIFY: which requirements exist, which delivery tier each
// belongs to, and how complex each one is. Hours, prices, durations, budget fit
// and every client-facing sentence about money are computed here, in ordinary
// application code, from the constants below.
//
// HONESTY RULES ENCODED HERE (not left to prose in a prompt)
//   - No client-facing calculation may use a rate above STANDARD_HOURLY_RATE_USD.
//   - The budget-fit plan can never cost more than the client's own budget.
//   - The optional tiers can never exceed +20% / +30% of that budget.
//   - Deferred scope is always returned alongside included scope; a partial
//     scope is never described as a completed project.
//   - The "70–80%" sentence is emitted ONLY when the deterministic calculation
//     actually lands in that band (see mayUseSeventyToEightyWording).
//   - Every plan carries humanReviewRequired: true.
// =============================================================================

/** Bump when any constant or formula below changes. Stored with every plan. */
export const ESTIMATION_POLICY_VERSION = 'estimation-policy-v1';

// --- the commercial constants (Phase 3) -------------------------------------

/** Maximum rate that may EVER appear in a client-facing calculation. */
export const STANDARD_HOURLY_RATE_USD = 5;
/** Standard delivery capacity used to project duration. */
export const WEEKLY_CAPACITY_HOURS = 40;
/** Cost of one full standard week at full capacity. */
export const WEEKLY_COST_USD = 200;
/** Approximate full-time monthly cost band (calendar weeks vary). */
export const MONTHLY_COST_MIN_USD = 800;
export const MONTHLY_COST_MAX_USD = 1000;
/** Optional scope-expansion bands, as a percentage ABOVE the client's budget. */
export const OPTIONAL_UPGRADE_MIN_PERCENT = 20;
export const OPTIONAL_UPGRADE_MAX_PERCENT = 30;

/**
 * Preliminary commercial planning assumption used ONLY before requirements
 * have been classified — always labelled "estimated scope coverage", never
 * "completed". Once classification exists, the calculated
 * `budgetFitPercent` replaces it.
 */
export const PRELIMINARY_COVERAGE_MIN_PERCENT = 70;
export const PRELIMINARY_COVERAGE_MAX_PERCENT = 80;

/** Guard rails so a hostile or absurd classification cannot blow up a plan. */
export const MAX_SCOPE_ITEMS = 40;
export const MAX_SCOPE_LABEL_CHARS = 160;
export const MAX_BUDGET_USD = 10_000_000;
export const MAX_PLAN_HOURS = 100_000;

// --- scope classification (the ONLY thing the model decides) ------------------

/**
 * Delivery tier.
 *   essential — must ship for the first release to be production-usable
 *   important — genuinely valuable, safely schedulable just after launch
 *   optional  — enhancement / growth work
 *   unclear   — not understood well enough to price; NEVER costed or promised
 */
export type ScopeTier = 'essential' | 'important' | 'optional' | 'unclear';

/** Effort class. Maps to fixed hours below — the model never states hours. */
export type ScopeComplexity = 'simple' | 'standard' | 'complex';

/** Fixed hours per complexity class. The model cannot influence these. */
export const SCOPE_COMPLEXITY_HOURS: Record<ScopeComplexity, number> = {
  simple: 6,
  standard: 16,
  complex: 40,
};

/** Priority order used when fitting scope into a budget. */
export const TIER_PRIORITY: readonly ScopeTier[] = ['essential', 'important', 'optional'];

export interface ScopeItemInput {
  label: string;
  tier: ScopeTier;
  complexity: ScopeComplexity;
}

export interface ScopeItem {
  label: string;
  tier: ScopeTier;
  complexity: ScopeComplexity;
  /** Deterministically derived from `complexity`. */
  hours: number;
}

// --- plan shapes --------------------------------------------------------------

export type PlanTierId = 'base' | 'recommended' | 'growth';

export interface PlanTier {
  id: PlanTierId;
  /** Client-facing name of this option. */
  label: string;
  /** Hard ceiling this tier was fitted against, in USD. */
  budgetCeilingUsd: number;
  /** Percentage above the client's selected budget (0 for the base plan). */
  percentAboveBudget: number;
  hours: number;
  costUsd: number;
  weeks: number;
  includedScope: ScopeItem[];
  deferredScope: ScopeItem[];
  /** Scope this tier adds compared with the base plan (empty for base). */
  addedVsBase: ScopeItem[];
  /** True only when this tier includes every classified, priceable requirement. */
  coversFullRequestedScope: boolean;
  optional: boolean;
}

/**
 * How much of the requested scope the client's own budget actually buys.
 *   full         — everything classified fits inside the selected budget
 *   high-partial — core scope fits and >= 70% of requested scope fits
 *   low-partial  — core scope fits but < 70% of requested scope fits
 *   below-mvp    — the budget cannot even cover the essential launch scope
 *   unknown      — nothing has been classified yet
 */
export type CoverageBand = 'full' | 'high-partial' | 'low-partial' | 'below-mvp' | 'unknown';

export interface BudgetPlan {
  policyVersion: string;
  /** `${policyVersion}#r${revision}` — changes whenever budget or scope changes. */
  estimateVersion: string;
  revision: number;
  currency: 'USD';
  hourlyRateUsd: number;
  weeklyCapacityHours: number;
  selectedBudgetUsd: number;
  /** False when the client has not stated a budget yet — the plan then covers
   * the full classified scope and the wording never says "your budget". */
  budgetProvided: boolean;
  availableHours: number;
  /** Priceable classified scope, sorted by tier priority. */
  scope: ScopeItem[];
  /** Requirements too unclear to price. Listed, never costed or promised. */
  unclearScope: ScopeItem[];
  totalRequestedHours: number;
  totalRequestedCostUsd: number;
  /** base.hours / totalRequestedHours, 0-100. 0 when nothing is classified. */
  budgetFitPercent: number;
  coverageBand: CoverageBand;
  coversEssentialScope: boolean;
  /** True ONLY when the calculation genuinely lands in the 70-80% band. */
  mayUseSeventyToEightyWording: boolean;
  base: PlanTier;
  recommended: PlanTier | null;
  growth: PlanTier | null;
  assumptions: string[];
  humanReviewRequired: true;
}

// --- deterministic arithmetic -------------------------------------------------

function safeInt(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(max, Math.max(min, n));
}

/** The client's budget, normalised to a whole non-negative USD amount. */
export function normalizeBudgetUsd(value: unknown): number {
  return safeInt(value, 0, MAX_BUDGET_USD);
}

/**
 * availableHours = floor(clientBudgetUsd / STANDARD_HOURLY_RATE_USD)
 * Floor, never round: the plan must never be able to exceed the budget.
 */
export function availableHoursFor(budgetUsd: number): number {
  return Math.floor(normalizeBudgetUsd(budgetUsd) / STANDARD_HOURLY_RATE_USD);
}

/** Cost of a block of hours at the standard rate. The only price formula. */
export function costForHours(hours: number): number {
  return safeInt(hours, 0, MAX_PLAN_HOURS) * STANDARD_HOURLY_RATE_USD;
}

/** Calendar weeks at the standard 40 h/week capacity. */
export function weeksForHours(hours: number): number {
  const h = safeInt(hours, 0, MAX_PLAN_HOURS);
  return h <= 0 ? 0 : Math.max(1, Math.ceil(h / WEEKLY_CAPACITY_HOURS));
}

/** The hour ceiling for a tier priced at `percent` above the budget. */
export function hourCeilingFor(budgetUsd: number, percentAboveBudget: number): number {
  const budget = normalizeBudgetUsd(budgetUsd);
  const ceiling = Math.floor((budget * (100 + percentAboveBudget)) / 100);
  return Math.floor(ceiling / STANDARD_HOURLY_RATE_USD);
}

// --- scope normalisation ------------------------------------------------------

const TIER_VALUES: readonly string[] = ['essential', 'important', 'optional', 'unclear'];
const COMPLEXITY_VALUES: readonly string[] = ['simple', 'standard', 'complex'];

/**
 * Rebuild the model's scope classification field-by-field from an allowlist:
 * unknown keys are dropped, labels are trimmed/capped/deduplicated, an
 * unrecognised tier becomes 'unclear' (never silently priced) and an
 * unrecognised complexity becomes 'standard'. Hours are assigned HERE.
 */
export function normalizeScopeItems(raw: unknown): { scope: ScopeItem[]; unclear: ScopeItem[] } {
  const scope: ScopeItem[] = [];
  const unclear: ScopeItem[] = [];
  if (!Array.isArray(raw)) return { scope, unclear };
  const seen = new Set<string>();
  for (const entry of raw) {
    if (scope.length + unclear.length >= MAX_SCOPE_ITEMS) break;
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const label = typeof e.label === 'string' ? e.label.trim().slice(0, MAX_SCOPE_LABEL_CHARS) : '';
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tier: ScopeTier = TIER_VALUES.includes(e.tier as string) ? (e.tier as ScopeTier) : 'unclear';
    const complexity: ScopeComplexity = COMPLEXITY_VALUES.includes(e.complexity as string)
      ? (e.complexity as ScopeComplexity)
      : 'standard';
    const item: ScopeItem = { label, tier, complexity, hours: SCOPE_COMPLEXITY_HOURS[complexity] };
    if (tier === 'unclear') unclear.push(item);
    else scope.push(item);
  }
  // Stable sort by tier priority; original order is preserved inside a tier.
  scope.sort((a, b) => TIER_PRIORITY.indexOf(a.tier) - TIER_PRIORITY.indexOf(b.tier));
  return { scope, unclear };
}

export function sumHours(items: readonly ScopeItem[]): number {
  let total = 0;
  for (const item of items) total += item.hours;
  return Math.min(MAX_PLAN_HOURS, total);
}

/**
 * Fit as much scope as possible inside `hourCeiling`, walking the
 * tier-prioritised list once. An item that does not fit is deferred and the
 * walk continues, so a small later item is not dropped just because a large
 * earlier one did not fit — this maximises delivered scope for the money
 * without ever exceeding the ceiling.
 */
export function fitScopeWithin(
  scope: readonly ScopeItem[],
  hourCeiling: number,
): { included: ScopeItem[]; deferred: ScopeItem[]; hours: number } {
  const included: ScopeItem[] = [];
  const deferred: ScopeItem[] = [];
  let hours = 0;
  for (const item of scope) {
    if (hours + item.hours <= hourCeiling) {
      included.push(item);
      hours += item.hours;
    } else {
      deferred.push(item);
    }
  }
  return { included, deferred, hours };
}

// --- plan construction --------------------------------------------------------

export interface BuildBudgetPlanInput {
  /** The budget the client actually selected or typed, in USD. Pass null when
   * they have not stated one — the plan then prices the full classified scope
   * instead of inventing a budget. */
  selectedBudgetUsd: unknown;
  /** Model classification: what the client asked for, tiered and sized. */
  scopeItems: unknown;
  /** Extra stated assumptions to carry into the plan. */
  assumptions?: readonly string[];
  /** Incremented by the caller whenever budget or scope changes. */
  revision?: number;
}

const BASE_ASSUMPTIONS: readonly string[] = [
  `Hours are costed at the standard rate of up to $${STANDARD_HOURLY_RATE_USD} per hour.`,
  `Duration assumes a maximum of ${WEEKLY_CAPACITY_HOURS} development hours per week.`,
  'Scope coverage is an estimate from the requirements available so far, not verified completion.',
  'Third-party service fees (hosting, payment gateways, app stores) are not included.',
  'Final scope and price require human technical review before any commitment.',
];

function buildTier(
  id: PlanTierId,
  label: string,
  scope: readonly ScopeItem[],
  budgetUsd: number,
  percentAboveBudget: number,
  baseIncluded: readonly ScopeItem[],
): PlanTier {
  const ceilingHours = hourCeilingFor(budgetUsd, percentAboveBudget);
  const fitted = fitScopeWithin(scope, ceilingHours);
  const baseLabels = new Set(baseIncluded.map((i) => i.label));
  return {
    id,
    label,
    budgetCeilingUsd: Math.floor((normalizeBudgetUsd(budgetUsd) * (100 + percentAboveBudget)) / 100),
    percentAboveBudget,
    hours: fitted.hours,
    costUsd: costForHours(fitted.hours),
    weeks: weeksForHours(fitted.hours),
    includedScope: fitted.included,
    deferredScope: fitted.deferred,
    addedVsBase: id === 'base' ? [] : fitted.included.filter((i) => !baseLabels.has(i.label)),
    coversFullRequestedScope: fitted.deferred.length === 0 && scope.length > 0,
    optional: id !== 'base',
  };
}

/**
 * THE budget-aware scope engine (Phase 4). Given the client's own budget and
 * the model's scope classification, returns three honest options plus the exact
 * included / deferred split and the coverage band that gates every
 * client-facing sentence.
 */
export function buildBudgetPlan(input: BuildBudgetPlanInput): BudgetPlan {
  const { scope, unclear } = normalizeScopeItems(input.scopeItems);
  const revision = Math.max(1, safeInt(input.revision ?? 1, 1, 100_000));

  const totalRequestedHours = sumHours(scope);
  const statedBudget = normalizeBudgetUsd(input.selectedBudgetUsd);
  const budgetProvided = statedBudget > 0;
  // With no stated budget there is nothing to fit against, so the plan prices
  // the full classified scope rather than inventing a figure for the client.
  const selectedBudgetUsd = budgetProvided ? statedBudget : costForHours(totalRequestedHours);
  const essentialHours = sumHours(scope.filter((i) => i.tier === 'essential'));
  const availableHours = availableHoursFor(selectedBudgetUsd);

  const base = buildTier('base', 'Budget-fit MVP', scope, selectedBudgetUsd, 0, []);
  const recommendedCandidate = buildTier(
    'recommended',
    'Recommended launch scope',
    scope,
    selectedBudgetUsd,
    OPTIONAL_UPGRADE_MIN_PERCENT,
    base.includedScope,
  );
  const growthCandidate = buildTier(
    'growth',
    'Growth-ready scope',
    scope,
    selectedBudgetUsd,
    OPTIONAL_UPGRADE_MAX_PERCENT,
    base.includedScope,
  );

  const coversEssentialScope = essentialHours > 0 ? essentialHours <= availableHours : scope.length === 0;

  /**
   * An optional tier is offered only when it does real work for the client:
   * it must add at least one requirement AND either build on a base that
   * already covers the core launch scope, or itself reach that core scope.
   * Otherwise it is just a bigger number attached to a release that still is
   * not usable — which is the opposite of a "materially safer launch".
   */
  const tierIsWorthOffering = (tier: PlanTier): boolean => {
    if (tier.addedVsBase.length === 0) return false;
    if (coversEssentialScope) return true;
    return sumHours(tier.includedScope.filter((i) => i.tier === 'essential')) >= essentialHours;
  };

  const recommended = tierIsWorthOffering(recommendedCandidate) ? recommendedCandidate : null;
  const growthAddsBeyondRecommended =
    growthCandidate.includedScope.length > (recommended?.includedScope.length ?? base.includedScope.length);
  const growth = tierIsWorthOffering(growthCandidate) && growthAddsBeyondRecommended ? growthCandidate : null;
  const budgetFitPercent =
    totalRequestedHours === 0 ? 0 : Math.min(100, Math.max(0, Math.round((base.hours / totalRequestedHours) * 100)));

  let coverageBand: CoverageBand;
  if (scope.length === 0) coverageBand = 'unknown';
  else if (!coversEssentialScope) coverageBand = 'below-mvp';
  else if (base.deferredScope.length === 0) coverageBand = 'full';
  else if (budgetFitPercent >= PRELIMINARY_COVERAGE_MIN_PERCENT) coverageBand = 'high-partial';
  else coverageBand = 'low-partial';

  const mayUseSeventyToEightyWording =
    coverageBand === 'high-partial' &&
    budgetFitPercent >= PRELIMINARY_COVERAGE_MIN_PERCENT &&
    budgetFitPercent <= PRELIMINARY_COVERAGE_MAX_PERCENT;

  const extraAssumptions = Array.isArray(input.assumptions)
    ? input.assumptions
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 300))
        .slice(0, 15)
    : [];

  return {
    policyVersion: ESTIMATION_POLICY_VERSION,
    estimateVersion: `${ESTIMATION_POLICY_VERSION}#r${revision}`,
    revision,
    currency: 'USD',
    hourlyRateUsd: STANDARD_HOURLY_RATE_USD,
    weeklyCapacityHours: WEEKLY_CAPACITY_HOURS,
    selectedBudgetUsd,
    budgetProvided,
    availableHours,
    scope,
    unclearScope: unclear,
    totalRequestedHours,
    totalRequestedCostUsd: costForHours(totalRequestedHours),
    budgetFitPercent,
    coverageBand,
    coversEssentialScope,
    mayUseSeventyToEightyWording,
    base,
    recommended,
    growth,
    assumptions: [...extraAssumptions, ...BASE_ASSUMPTIONS],
    humanReviewRequired: true,
  };
}

// --- role breakdown (report / dashboard) --------------------------------------
//
// A report shows a team table. Its hours MUST add up to the plan the client was
// quoted, otherwise the table and the total tell different stories. The model
// therefore chooses only WHICH ROLES are needed; the hours are distributed here
// from the plan's own hour count, and the distribution is exact by construction.

/** Relative effort weight per role, matched on keywords in the role name. */
export const ROLE_WEIGHTS: ReadonlyArray<{ match: RegExp; weight: number }> = [
  { match: /full[\s-]?stack/i, weight: 2.5 },
  { match: /front[\s-]?end/i, weight: 2.2 },
  { match: /back[\s-]?end/i, weight: 2.0 },
  { match: /mobile|android|ios|flutter|react native/i, weight: 1.8 },
  { match: /ui|ux|design/i, weight: 1.0 },
  { match: /qa|test|quality/i, weight: 0.9 },
  { match: /lead|architect|auditor/i, weight: 0.8 },
  { match: /manager|\bpm\b|coordinator/i, weight: 0.7 },
  { match: /devops|infra|sre|cloud/i, weight: 0.6 },
  { match: /analyst|requirement|business/i, weight: 0.6 },
];

export const DEFAULT_ROLE_WEIGHT = 1.0;

export function roleWeight(role: string): number {
  for (const entry of ROLE_WEIGHTS) {
    if (entry.match.test(role)) return entry.weight;
  }
  return DEFAULT_ROLE_WEIGHT;
}

export interface RoleAllocation {
  role: string;
  hours: number;
  hourlyRate: number;
}

/**
 * Split `totalHours` across `roles` by weight. The returned hours sum EXACTLY
 * to totalHours (largest-remainder distribution), every rate is the standard
 * rate, and roles that would receive zero hours are dropped rather than shown
 * as free work. Returns [] when there is nothing to allocate.
 */
export function distributeHoursAcrossRoles(roles: readonly string[], totalHours: number): RoleAllocation[] {
  const cleaned = roles
    .map((r) => (typeof r === 'string' ? r.trim().slice(0, 80) : ''))
    .filter((r, i, all) => r.length > 0 && all.indexOf(r) === i)
    .slice(0, 10);
  const total = safeInt(totalHours, 0, MAX_PLAN_HOURS);
  if (cleaned.length === 0 || total <= 0) return [];

  const weights = cleaned.map(roleWeight);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const exact = weights.map((w) => (total * w) / weightSum);
  const allocated = exact.map((v) => Math.floor(v));
  let remainder = total - allocated.reduce((s, v) => s + v, 0);
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let cursor = 0;
  while (remainder > 0) {
    allocated[byFraction[cursor % byFraction.length].i] += 1;
    remainder -= 1;
    cursor += 1;
  }

  const out: RoleAllocation[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    if (allocated[i] > 0) out.push({ role: cleaned[i], hours: allocated[i], hourlyRate: STANDARD_HOURLY_RATE_USD });
  }
  return out;
}

/** Total cost of a role table. Must always equal costForHours(sum of hours). */
export function totalCostOfRoles(roles: readonly RoleAllocation[]): number {
  let total = 0;
  for (const r of roles) total += r.hours * Math.min(r.hourlyRate, STANDARD_HOURLY_RATE_USD);
  return total;
}

export function totalHoursOfRoles(roles: readonly RoleAllocation[]): number {
  let total = 0;
  for (const r of roles) total += r.hours;
  return total;
}

// --- client-facing wording (Phase 5) ------------------------------------------
//
// One source for chat text, spoken text and the generated report, so a spoken
// figure can never differ from a rendered one.

export function formatUsd(amount: number): string {
  return `$${Math.round(safeInt(amount, 0, MAX_BUDGET_USD)).toLocaleString('en-US')}`;
}

/** "$800–$1,000" — the approximate full-time monthly cost band. */
export function monthlyCostRangeLabel(): string {
  return `${formatUsd(MONTHLY_COST_MIN_USD)}–${formatUsd(MONTHLY_COST_MAX_USD)}`;
}

function listLabels(items: readonly ScopeItem[], max = 4): string {
  const labels = items.slice(0, max).map((i) => i.label);
  const remaining = items.length - labels.length;
  if (labels.length === 0) return 'no further items';
  const joined = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return remaining > 0 ? `${joined} (plus ${remaining} more)` : joined;
}

export const HUMAN_REVIEW_SENTENCE =
  'This is a preliminary estimate and final pricing follows a human technical review.';

export const AI_UNAVAILABLE_MESSAGE = 'AI analysis is temporarily unavailable.';

export interface PlanNarrative {
  /** The one sentence that acknowledges the budget and states what it buys. */
  headline: string;
  /** What the base plan includes. */
  includedLine: string;
  /** What the base plan defers. Empty string when nothing is deferred. */
  deferredLine: string;
  /** The optional +20% option. Empty string when it adds nothing. */
  recommendedLine: string;
  /** The optional +30% option. Empty string when it adds nothing. */
  growthLine: string;
  /** Requirements too unclear to price. Empty string when there are none. */
  unclearLine: string;
  /** Always present. */
  reviewLine: string;
  /** Every non-empty line above, in order — ready to speak or render. */
  lines: string[];
}

/**
 * Build the client-facing wording for a plan. Calm, positive, accurate: it
 * always starts with what the selected budget CAN deliver, never claims
 * completed scope, and never emits the "70-80%" sentence unless
 * `mayUseSeventyToEightyWording` is true.
 */
export function describeBudgetPlan(plan: BudgetPlan): PlanNarrative {
  const budget = formatUsd(plan.selectedBudgetUsd);
  const base = plan.base;

  let headline: string;
  if (!plan.budgetProvided) {
    headline =
      plan.coverageBand === 'unknown'
        ? `No budget has been set yet. At our standard rate of up to ` +
          `${formatUsd(STANDARD_HOURLY_RATE_USD)} per hour, ${formatUsd(WEEKLY_COST_USD)} covers a full ` +
          `${WEEKLY_CAPACITY_HOURS}-hour delivery week, and a full-time month is approximately ` +
          `${monthlyCostRangeLabel()}. Share a budget and we will build the strongest production-usable scope inside it.`
        : `No budget has been set yet, so this prices the full scope recorded so far: approximately ` +
          `${base.hours} development hours, ${formatUsd(base.costUsd)} at our standard rate of up to ` +
          `${formatUsd(STANDARD_HOURLY_RATE_USD)} per hour, about ${base.weeks} week` +
          `${base.weeks === 1 ? '' : 's'} at ${WEEKLY_CAPACITY_HOURS} hours per week.`;
  } else if (plan.coverageBand === 'unknown') {
    headline =
      `Your selected budget of ${budget} provides approximately ${plan.availableHours} development hours ` +
      `at our standard rate of up to ${formatUsd(STANDARD_HOURLY_RATE_USD)} per hour. Once the requirements are ` +
      `classified we can confirm exactly how much of the scope that covers; as an early planning assumption we ` +
      `expect it to cover roughly ${PRELIMINARY_COVERAGE_MIN_PERCENT}–${PRELIMINARY_COVERAGE_MAX_PERCENT}% ` +
      `of a typical project of this kind (estimated scope coverage, not verified completion).`;
  } else if (plan.coverageBand === 'below-mvp') {
    const essentialHours = sumHours(plan.scope.filter((i) => i.tier === 'essential'));
    headline =
      `Your selected budget of ${budget} provides approximately ${plan.availableHours} development hours, and the ` +
      `core launch scope we have recorded needs about ${essentialHours} hours ` +
      `(${formatUsd(costForHours(essentialHours))}). Rather than quote below what a usable first release needs, ` +
      `we would propose a smaller Phase 1 — which single business outcome matters most to you?`;
  } else if (plan.coverageBand === 'full') {
    headline =
      `Your selected budget of ${budget} covers the full scope recorded so far: approximately ${base.hours} ` +
      `development hours at our standard rate of up to ${formatUsd(STANDARD_HOURLY_RATE_USD)} per hour, ` +
      `${formatUsd(base.costUsd)} in total.`;
  } else if (plan.mayUseSeventyToEightyWording) {
    headline =
      `Your selected budget of ${budget} is a practical starting point. Based on the requirements currently ` +
      `available, we estimate that it can cover approximately ${PRELIMINARY_COVERAGE_MIN_PERCENT}–` +
      `${PRELIMINARY_COVERAGE_MAX_PERCENT}% of the project, including the core production-ready experience. ` +
      `The remaining ${100 - PRELIMINARY_COVERAGE_MAX_PERCENT}–${100 - PRELIMINARY_COVERAGE_MIN_PERCENT}% ` +
      `mainly relates to ${listLabels(base.deferredScope)} and can either be added after launch or included now ` +
      `with a revised budget.`;
  } else if (plan.coverageBand === 'high-partial') {
    headline =
      `Your selected budget of ${budget} is a practical starting point. Based on the requirements currently ` +
      `available, we estimate that it can cover approximately ${plan.budgetFitPercent}% of the project, ` +
      `including the core production-ready experience. The remainder mainly relates to ` +
      `${listLabels(base.deferredScope)} and can either be added after launch or included now with a revised budget.`;
  } else {
    headline =
      `Your selected budget of ${budget} covers a focused core release — approximately ` +
      `${plan.budgetFitPercent}% of the requirements recorded so far, prioritising the essentials. ` +
      `To make the most of it, which business outcome matters most to you?`;
  }

  const includedLine =
    base.includedScope.length > 0
      ? `Included in the ${base.label} (${base.hours} hours, ${formatUsd(base.costUsd)}, about ` +
        `${base.weeks} week${base.weeks === 1 ? '' : 's'} at ${WEEKLY_CAPACITY_HOURS} hours per week): ` +
        `${listLabels(base.includedScope, 12)}.`
      : '';

  const deferredLine =
    base.deferredScope.length > 0
      ? `Deferred for now (not included in the ${formatUsd(base.costUsd)} figure): ` +
        `${listLabels(base.deferredScope, 12)}. ` +
        `${base.deferredScope.length === 1 ? 'This can' : 'These can'} be scheduled after launch.`
      : '';

  const recommendedLine = plan.recommended
    ? `Optional — ${plan.recommended.label} at about ${formatUsd(plan.recommended.costUsd)} ` +
      `(+${plan.recommended.percentAboveBudget}%, ${plan.recommended.hours} hours) additionally includes ` +
      `${listLabels(plan.recommended.addedVsBase, 8)}. This is optional, not required.`
    : '';

  const growthLine = plan.growth
    ? `Optional — ${plan.growth.label} at about ${formatUsd(plan.growth.costUsd)} ` +
      `(+${plan.growth.percentAboveBudget}%, ${plan.growth.hours} hours) additionally includes ` +
      `${listLabels(plan.growth.addedVsBase, 8)}. This is optional, not required.`
    : '';

  const unclearLine =
    plan.unclearScope.length > 0
      ? `Not yet costed because we need more detail: ${listLabels(plan.unclearScope, 8)}.`
      : '';

  const reviewLine = HUMAN_REVIEW_SENTENCE;

  const lines = [headline, includedLine, deferredLine, recommendedLine, growthLine, unclearLine, reviewLine].filter(
    (line) => line.length > 0,
  );

  return { headline, includedLine, deferredLine, recommendedLine, growthLine, unclearLine, reviewLine, lines };
}

/** Very short spoken summary — the figures a voice agent may say out loud. */
export function speakBudgetPlan(plan: BudgetPlan): string {
  const narrative = describeBudgetPlan(plan);
  return [narrative.headline, narrative.deferredLine, narrative.reviewLine].filter(Boolean).join(' ');
}

// --- persistence snapshot (Phase 8) ------------------------------------------

export interface EstimateSnapshotScopeItem {
  label: string;
  tier: ScopeTier;
  complexity: ScopeComplexity;
  hours: number;
}

export interface EstimateSnapshotTier {
  hours: number;
  cost_usd: number;
  weeks: number;
  budget_ceiling_usd: number;
  percent_above_budget: number;
  included_scope: EstimateSnapshotScopeItem[];
  deferred_scope: EstimateSnapshotScopeItem[];
  added_vs_base: EstimateSnapshotScopeItem[];
}

/** The exact structured snapshot stored with a lead and shown to the admin. */
export interface EstimateSnapshot {
  policy_version: string;
  estimate_version: string;
  revision: number;
  currency: 'USD';
  selected_budget_usd: number;
  budget_provided: boolean;
  hourly_rate_usd: number;
  weekly_capacity_hours: number;
  available_hours: number;
  budget_fit_percent: number;
  coverage_band: CoverageBand;
  covers_essential_scope: boolean;
  total_requested_hours: number;
  total_requested_cost_usd: number;
  included_scope: EstimateSnapshotScopeItem[];
  deferred_scope: EstimateSnapshotScopeItem[];
  unclear_scope: EstimateSnapshotScopeItem[];
  base_estimate: EstimateSnapshotTier;
  optional_20_percent_estimate: EstimateSnapshotTier | null;
  optional_30_percent_estimate: EstimateSnapshotTier | null;
  client_selected_option: PlanTierId | null;
  assumptions: string[];
  provider: string | null;
  model: string | null;
  human_review_required: true;
}

function snapshotTier(tier: PlanTier): EstimateSnapshotTier {
  return {
    hours: tier.hours,
    cost_usd: tier.costUsd,
    weeks: tier.weeks,
    budget_ceiling_usd: tier.budgetCeilingUsd,
    percent_above_budget: tier.percentAboveBudget,
    included_scope: tier.includedScope,
    deferred_scope: tier.deferredScope,
    added_vs_base: tier.addedVsBase,
  };
}

export function buildEstimateSnapshot(
  plan: BudgetPlan,
  meta: { provider?: string | null; model?: string | null; clientSelectedOption?: PlanTierId | null } = {},
): EstimateSnapshot {
  return {
    policy_version: plan.policyVersion,
    estimate_version: plan.estimateVersion,
    revision: plan.revision,
    currency: 'USD',
    selected_budget_usd: plan.selectedBudgetUsd,
    budget_provided: plan.budgetProvided,
    hourly_rate_usd: plan.hourlyRateUsd,
    weekly_capacity_hours: plan.weeklyCapacityHours,
    available_hours: plan.availableHours,
    budget_fit_percent: plan.budgetFitPercent,
    coverage_band: plan.coverageBand,
    covers_essential_scope: plan.coversEssentialScope,
    total_requested_hours: plan.totalRequestedHours,
    total_requested_cost_usd: plan.totalRequestedCostUsd,
    included_scope: plan.base.includedScope,
    deferred_scope: plan.base.deferredScope,
    unclear_scope: plan.unclearScope,
    base_estimate: snapshotTier(plan.base),
    optional_20_percent_estimate: plan.recommended ? snapshotTier(plan.recommended) : null,
    optional_30_percent_estimate: plan.growth ? snapshotTier(plan.growth) : null,
    client_selected_option: meta.clientSelectedOption ?? null,
    assumptions: plan.assumptions,
    provider: meta.provider ?? null,
    model: meta.model ?? null,
    human_review_required: true,
  };
}

// --- budget parsing (shared by every intake surface) -------------------------

/**
 * Read a client-selected budget out of the free text / option labels the
 * intake surfaces produce ("Under $1,000", "$1,000 – $5,000", "about 800 usd",
 * "500"). Returns the amount to PLAN AGAINST, or null when nothing usable was
 * said — never a guess.
 *
 *   - a single amount            -> that amount
 *   - a range ("$1,000-$5,000")  -> the LOWER bound (never plan on the top of
 *                                   a range the client only bracketed)
 *   - "Under $1,000"             -> the stated cap
 *   - "Not sure yet" / ""        -> null
 */
export function parseSelectedBudgetUsd(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return normalizeBudgetUsd(raw);
  if (typeof raw !== 'string') return null;
  const text = raw.trim().toLowerCase();
  if (!text || text.includes('not sure') || text.includes('skipped') || text.includes('no budget')) return null;
  const matches = text.match(/\d[\d,.\s]*/g);
  if (!matches) return null;
  const amounts: number[] = [];
  for (const match of matches) {
    const digits = match.replace(/[,\s]/g, '');
    // Trailing ".00"-style decimals only; a dot used as a thousands separator
    // is handled by stripping it when it is not followed by exactly 1-2 digits.
    const cleaned = /\.\d{1,2}$/.test(digits) ? digits : digits.replace(/\./g, '');
    const value = Number.parseFloat(cleaned);
    if (Number.isFinite(value) && value > 0) amounts.push(Math.floor(value));
  }
  if (amounts.length === 0) return null;
  // Multipliers ("5k", "10 k") are honoured when they follow the number.
  const kSuffix = /(\d)\s*k\b/.test(text);
  const scaled = kSuffix ? amounts.map((a) => (a < 1000 ? a * 1000 : a)) : amounts;
  const chosen = Math.min(...scaled);
  return chosen > 0 ? normalizeBudgetUsd(chosen) : null;
}
