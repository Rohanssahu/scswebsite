// =============================================================================
// Buddy agent — deterministic preliminary-estimate engine.
//
// The LLM may only CLASSIFY: what the client asked for, which delivery tier
// each requirement belongs to, how complex each one is, and (when the client
// has said it) the budget they selected. Every number — hours, costs,
// durations, budget fit, the three options — is computed here from the SHARED
// commercial policy (./estimationPolicy.ts), which is mirrored byte-for-byte
// into the frontend and the Supabase Edge Functions.
//
// So the figure Buddy speaks, the figure the client's Live Proposal panel
// renders, the figure the generated report shows and the figure stored with the
// lead are all the same computation over the same constants. Model arithmetic
// never reaches the output, and voice-lead / consultation-agent re-validate the
// result independently.
// =============================================================================

import { z } from 'zod';
import {
  ESTIMATE_CONFIG_VERSION,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  MAX_MODULES,
  MAX_ROLE_HOURS,
  MAX_TOTAL_HOURS,
  ROLE_KEYS,
  ROLE_LABELS,
  WEEKLY_CAPACITY_HOURS,
  type RoleKey,
} from './config.js';
import {
  buildBudgetPlan,
  buildEstimateSnapshot,
  costForHours,
  describeBudgetPlan,
  formatUsd,
  parseSelectedBudgetUsd,
  roleWeight,
  speakBudgetPlan,
  STANDARD_HOURLY_RATE_USD,
  weeksForHours,
  type BudgetPlan,
  type EstimateSnapshot,
} from './estimationPolicy.js';
import type { ProjectState } from './state.js';
import { isReadyForEstimate } from './state.js';

/**
 * What the LLM is allowed to hand the engine. Notice what is NOT here: no
 * hours, no rate, no cost, no duration, no percentage. `client_budget_usd` is
 * the client's OWN figure being reported back, and it is re-parsed and clamped
 * by the policy regardless of what the model puts in it.
 */
export const estimateInputSchema = z
  .object({
    scope_items: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(160),
            tier: z.enum(['essential', 'important', 'optional', 'unclear']),
            complexity: z.enum(['simple', 'standard', 'complex']),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_MODULES),
    /** The budget the CLIENT stated, in whole USD. Omit when they have not. */
    client_budget_usd: z.number().int().min(0).max(10_000_000).optional(),
    architecture: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
    assumptions: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
    exclusions: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
    risks: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
    confidence: z.enum(['low', 'medium', 'high']),
  })
  .strict();

export type EstimateInput = z.infer<typeof estimateInputSchema>;

export interface RoleHoursRange {
  min: number;
  max: number;
}

/** Wire shape sent to voice-lead / consultation-agent (and mirrored to the UI). */
export interface PreliminaryEstimate {
  config_version: string;
  currency: 'USD';
  hourly_rate_min: number;
  hourly_rate_max: number;
  weekly_capacity_hours: number;
  role_hours: Record<RoleKey, RoleHoursRange>;
  modules: Array<{ name: string; hours_min: number; hours_max: number }>;
  architecture: string[];
  team_roles: string[];
  assumptions: string[];
  exclusions: string[];
  risks: string[];
  total_hours_min: number;
  total_hours_max: number;
  total_cost_min: number;
  total_cost_max: number;
  duration_weeks_min: number;
  duration_weeks_max: number;
  confidence: 'low' | 'medium' | 'high';
  /** The budget-fit plan every spoken and rendered figure comes from. */
  budget_plan: EstimateSnapshot;
}

export class EstimateError extends Error {
  constructor(
    public code: 'not_ready' | 'invalid_input' | 'out_of_bounds',
    message: string,
  ) {
    super(message);
    this.name = 'EstimateError';
  }
}

/**
 * Split a plan's hours across the six delivery roles using the shared policy's
 * own role weights, with largest-remainder rounding so the parts sum EXACTLY to
 * the plan total. A role table that did not add up to the quoted price would be
 * the same dishonesty in a different place.
 */
export function distributeRoleHours(totalHours: number): Record<RoleKey, number> {
  const weights = ROLE_KEYS.map((key) => roleWeight(ROLE_LABELS[key]));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const exact = weights.map((w) => (totalHours * w) / weightSum);
  const allocated = exact.map((v) => Math.floor(v));
  let remainder = totalHours - allocated.reduce((s, v) => s + v, 0);
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let cursor = 0;
  while (remainder > 0) {
    allocated[byFraction[cursor % byFraction.length].i] += 1;
    remainder -= 1;
    cursor += 1;
  }
  const out = {} as Record<RoleKey, number>;
  ROLE_KEYS.forEach((key, i) => {
    out[key] = Math.min(MAX_ROLE_HOURS, allocated[i]);
  });
  return out;
}

/**
 * The budget the plan is fitted against: the model-reported figure first, the
 * client's own recorded `budget_range` answer second, and null when neither is
 * usable — never a guess.
 */
export function resolveClientBudget(state: ProjectState, input: EstimateInput): number | null {
  return parseSelectedBudgetUsd(input.client_budget_usd) ?? parseSelectedBudgetUsd(state.fields.budget_range);
}

/**
 * Build the estimate. `rawInput` is untrusted LLM output; `state` must have all
 * required fields collected (checked here, not trusted from the model).
 */
export function buildPreliminaryEstimate(
  state: ProjectState,
  rawInput: unknown,
  revision = 1,
): PreliminaryEstimate {
  if (!isReadyForEstimate(state)) {
    throw new EstimateError('not_ready', 'Required requirement fields are still missing.');
  }
  const parsed = estimateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EstimateError('invalid_input', 'Estimate classification did not match the schema.');
  }
  const input = parsed.data;

  const plan = buildBudgetPlan({
    selectedBudgetUsd: resolveClientBudget(state, input),
    scopeItems: input.scope_items,
    assumptions: input.assumptions,
    revision,
  });

  const totalHours = plan.base.hours;
  if (totalHours <= 0) {
    // Honest failure: the selected budget funds nothing yet. The caller turns
    // this into "let's agree a smaller Phase 1", never into a token figure.
    throw new EstimateError('out_of_bounds', 'The selected budget does not fund any deliverable scope yet.');
  }
  if (totalHours > MAX_TOTAL_HOURS) {
    throw new EstimateError('out_of_bounds', 'Computed hours fall outside the configured limits.');
  }

  const perRole = distributeRoleHours(totalHours);
  const roleHours = {} as Record<RoleKey, RoleHoursRange>;
  for (const key of ROLE_KEYS) roleHours[key] = { min: perRole[key], max: perRole[key] };

  // Modules mirror the plan's INCLUDED scope, so what the client hears listed
  // is exactly what the quoted hours pay for.
  const modules = plan.base.includedScope.map((item) => ({
    name: item.label,
    hours_min: item.hours,
    hours_max: item.hours,
  }));

  const teamRoles = ROLE_KEYS.filter((r) => roleHours[r].max > 0).map((r) => ROLE_LABELS[r]);

  return {
    config_version: ESTIMATE_CONFIG_VERSION,
    currency: 'USD',
    hourly_rate_min: HOURLY_RATE_MIN,
    hourly_rate_max: HOURLY_RATE_MAX,
    weekly_capacity_hours: WEEKLY_CAPACITY_HOURS,
    role_hours: roleHours,
    modules,
    architecture: input.architecture,
    team_roles: teamRoles,
    assumptions: plan.assumptions,
    exclusions: [
      ...input.exclusions,
      // Deferred scope is stated as excluded, always — never left implicit.
      ...plan.base.deferredScope.map((item) => `Deferred from this option: ${item.label}`),
      'Third-party service fees (hosting, payment gateways, app stores)',
    ].slice(0, 25),
    risks: input.risks,
    total_hours_min: totalHours,
    total_hours_max: totalHours,
    total_cost_min: costForHours(totalHours),
    total_cost_max: costForHours(totalHours),
    duration_weeks_min: weeksForHours(totalHours),
    duration_weeks_max: weeksForHours(totalHours),
    confidence: input.confidence,
    budget_plan: buildEstimateSnapshot(plan, { provider: 'gemini', model: null }),
  };
}

/** Rebuild the plan object from a stored snapshot for wording purposes. */
export function planFromEstimate(estimate: PreliminaryEstimate): BudgetPlan {
  return buildBudgetPlan({
    selectedBudgetUsd: estimate.budget_plan.budget_provided ? estimate.budget_plan.selected_budget_usd : null,
    scopeItems: [
      ...estimate.budget_plan.included_scope,
      ...estimate.budget_plan.deferred_scope,
      ...estimate.budget_plan.unclear_scope,
    ],
    revision: estimate.budget_plan.revision,
  });
}

/**
 * What Buddy may say out loud. It is the POLICY's own wording plus the
 * duration, so the spoken figures are the same object the UI renders — the
 * model is only ever asked to repeat this string, never to compute it.
 */
export function describeEstimate(estimate: PreliminaryEstimate): string {
  const plan = planFromEstimate(estimate);
  return [
    speakBudgetPlan(plan),
    `That is about ${estimate.total_hours_max} development hours, ` +
      `${formatUsd(estimate.total_cost_max)} at up to ${formatUsd(STANDARD_HOURLY_RATE_USD)} per hour, ` +
      `and roughly ${estimate.duration_weeks_max} week${estimate.duration_weeks_max === 1 ? '' : 's'} ` +
      `at ${estimate.weekly_capacity_hours} hours per week.`,
  ].join(' ');
}

/** Every client-facing line for the plan, for the chat panel and the proposal. */
export function estimateNarrative(estimate: PreliminaryEstimate): string[] {
  return describeBudgetPlan(planFromEstimate(estimate)).lines;
}
