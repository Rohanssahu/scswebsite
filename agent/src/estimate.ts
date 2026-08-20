// =============================================================================
// Buddy agent — deterministic preliminary-estimate engine.
//
// The LLM may only CLASSIFY (overall complexity, module list with per-module
// complexity, applicable concerns) through the strict zod schema below. Every
// number — hours, costs, durations — is computed here from the
// server-controlled config. Model arithmetic never reaches the output, and
// the voice-lead Edge Function re-validates the result independently.
// =============================================================================

import { z } from 'zod';
import {
  COMPLEXITY_BASE_HOURS,
  CONCERN_EXTRAS,
  ESTIMATE_CONFIG_VERSION,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  MAX_MODULES,
  MAX_ROLE_HOURS,
  MAX_TOTAL_HOURS,
  MODULE_HOURS,
  MODULE_ROLE_SPLIT,
  RANGE_SPREAD,
  ROLE_KEYS,
  ROLE_LABELS,
  WEEKLY_CAPACITY_HOURS,
  type RoleKey,
} from './config.js';
import type { ProjectState } from './state.js';
import { isReadyForEstimate } from './state.js';

export const estimateInputSchema = z
  .object({
    overall_complexity: z.enum(['small', 'medium', 'large']),
    modules: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            complexity: z.enum(['simple', 'standard', 'complex']),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_MODULES),
    concerns: z.array(z.enum(['payments', 'admin_panel', 'mobile', 'audit'])).max(10).default([]),
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

/** Wire shape sent to voice-lead (and mirrored to the browser UI). */
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

const clampRole = (n: number): number => Math.min(MAX_ROLE_HOURS, Math.max(0, Math.round(n)));

/**
 * Build the estimate. `rawInput` is untrusted LLM output; `state` must have
 * all required fields collected (checked here, not trusted from the model).
 */
export function buildPreliminaryEstimate(state: ProjectState, rawInput: unknown): PreliminaryEstimate {
  if (!isReadyForEstimate(state)) {
    throw new EstimateError('not_ready', 'Required requirement fields are still missing.');
  }
  const parsed = estimateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new EstimateError('invalid_input', 'Estimate classification did not match the schema.');
  }
  const input = parsed.data;

  // 1) Base hours from the overall complexity class.
  const base = COMPLEXITY_BASE_HOURS[input.overall_complexity];
  const minHours: Record<RoleKey, number> = { ...base };

  // 2) Add per-module hours, split across roles by fixed weights.
  const modules: PreliminaryEstimate['modules'] = [];
  for (const m of input.modules) {
    const weights = MODULE_HOURS[m.complexity];
    modules.push({ name: m.name, hours_min: weights.min, hours_max: weights.max });
    for (const role of ROLE_KEYS) {
      minHours[role] += weights.min * MODULE_ROLE_SPLIT[role];
    }
  }

  // 3) Flat extras for heavy concerns (payments, admin panel, mobile, audit).
  for (const concern of new Set(input.concerns)) {
    const extras = CONCERN_EXTRAS[concern] ?? {};
    for (const role of Object.keys(extras) as RoleKey[]) {
      minHours[role] += extras[role] ?? 0;
    }
  }

  // 4) Round + spread into a min–max range, clamped to configured caps.
  const roleHours = {} as Record<RoleKey, RoleHoursRange>;
  for (const role of ROLE_KEYS) {
    const min = clampRole(minHours[role]);
    const max = clampRole(min * (1 + RANGE_SPREAD));
    roleHours[role] = { min, max: Math.max(min, max) };
  }

  const totalMin = ROLE_KEYS.reduce((s, r) => s + roleHours[r].min, 0);
  const totalMax = ROLE_KEYS.reduce((s, r) => s + roleHours[r].max, 0);
  if (totalMax === 0 || totalMax > MAX_TOTAL_HOURS) {
    throw new EstimateError('out_of_bounds', 'Computed hours fall outside the configured limits.');
  }

  const costMin = totalMin * HOURLY_RATE_MIN;
  const costMax = totalMax * HOURLY_RATE_MAX;
  const weeksMin = Math.max(1, Math.ceil(totalMin / WEEKLY_CAPACITY_HOURS));
  const weeksMax = Math.max(1, Math.ceil(totalMax / WEEKLY_CAPACITY_HOURS));

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
    assumptions: input.assumptions,
    exclusions: [
      ...input.exclusions,
      'Third-party service fees (hosting, payment gateways, app stores)',
    ].slice(0, 25),
    risks: input.risks,
    total_hours_min: totalMin,
    total_hours_max: totalMax,
    total_cost_min: costMin,
    total_cost_max: costMax,
    duration_weeks_min: weeksMin,
    duration_weeks_max: weeksMax,
    confidence: input.confidence,
  };
}

/** Short spoken-friendly rendering (one or two sentences per section). */
export function describeEstimate(e: PreliminaryEstimate): string {
  return [
    `Roughly ${e.total_hours_min} to ${e.total_hours_max} hours of work`,
    `about $${e.total_cost_min.toLocaleString('en-US')} to $${e.total_cost_max.toLocaleString('en-US')} at our hourly rates`,
    `around ${e.duration_weeks_min === e.duration_weeks_max ? e.duration_weeks_min : `${e.duration_weeks_min} to ${e.duration_weeks_max}`} weeks at ${e.weekly_capacity_hours} hours per week`,
  ].join(', ');
}
