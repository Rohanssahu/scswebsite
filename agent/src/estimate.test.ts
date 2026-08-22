import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_CONFIG_VERSION,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  MAX_TOTAL_HOURS,
  ROLE_KEYS,
  WEEKLY_CAPACITY_HOURS,
} from './config.js';
import {
  EstimateError,
  buildPreliminaryEstimate,
  describeEstimate,
  distributeRoleHours,
  estimateNarrative,
  resolveClientBudget,
} from './estimate.js';
import {
  OPTIONAL_UPGRADE_MAX_PERCENT,
  OPTIONAL_UPGRADE_MIN_PERCENT,
  STANDARD_HOURLY_RATE_USD,
} from './estimationPolicy.js';
import { applyUpdate, emptyState, type ProjectState } from './state.js';

function readyState(budget = '$1,000'): ProjectState {
  return applyUpdate(emptyState(), {
    intent: 'new_project',
    fields: {
      business_goal: 'Tutor marketplace',
      target_users: 'Students',
      platforms: ['Web'],
      core_features: ['Profiles', 'Search', 'Booking'],
      deadline: '3 months',
      budget_range: budget,
    },
  });
}

/** What the LLM is allowed to hand the engine: classification only. */
const classification = () => ({
  scope_items: [
    { label: 'User profiles', tier: 'essential' as const, complexity: 'standard' as const }, // 16
    { label: 'Search', tier: 'essential' as const, complexity: 'simple' as const }, // 6
    { label: 'Booking & scheduling', tier: 'essential' as const, complexity: 'complex' as const }, // 40
    { label: 'Online payments', tier: 'important' as const, complexity: 'complex' as const }, // 40
    { label: 'Mobile app', tier: 'optional' as const, complexity: 'complex' as const }, // 40
  ],
  architecture: ['React frontend', 'Node.js API', 'PostgreSQL'],
  assumptions: ['Client provides branding'],
  exclusions: ['Content writing'],
  risks: ['Payment compliance'],
  confidence: 'medium' as const,
});

describe('deterministic estimate engine', () => {
  it('computes every total from the shared policy, never from the model', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    const hoursMin = ROLE_KEYS.reduce((s, r) => s + e.role_hours[r].min, 0);
    const hoursMax = ROLE_KEYS.reduce((s, r) => s + e.role_hours[r].max, 0);
    expect(e.total_hours_min).toBe(hoursMin);
    expect(e.total_hours_max).toBe(hoursMax);
    expect(e.total_cost_min).toBe(hoursMin * HOURLY_RATE_MIN);
    expect(e.total_cost_max).toBe(hoursMax * HOURLY_RATE_MAX);
    expect(e.duration_weeks_min).toBe(Math.max(1, Math.ceil(hoursMin / WEEKLY_CAPACITY_HOURS)));
    expect(e.duration_weeks_max).toBe(Math.max(1, Math.ceil(hoursMax / WEEKLY_CAPACITY_HOURS)));
    expect(e.config_version).toBe(ESTIMATE_CONFIG_VERSION);
    expect(e.currency).toBe('USD');
    expect(e.total_hours_max).toBeLessThanOrEqual(MAX_TOTAL_HOURS);
  });

  it('quotes exactly one rate, and it is $5/hour', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    expect(e.hourly_rate_min).toBe(STANDARD_HOURLY_RATE_USD);
    expect(e.hourly_rate_max).toBe(STANDARD_HOURLY_RATE_USD);
    expect(e.weekly_capacity_hours).toBe(40);
  });

  it('never exceeds the client budget, and keeps the optional tiers in band', () => {
    for (const [label, budget] of [
      ['$200', 200],
      ['$500', 500],
      ['$800', 800],
      ['$1,000', 1000],
    ] as const) {
      const e = buildPreliminaryEstimate(readyState(label), classification());
      const plan = e.budget_plan;
      expect(plan.selected_budget_usd).toBe(budget);
      expect(plan.available_hours).toBe(budget / STANDARD_HOURLY_RATE_USD);
      expect(e.total_cost_max).toBeLessThanOrEqual(budget);
      expect(plan.base_estimate.cost_usd).toBeLessThanOrEqual(budget);
      if (plan.optional_20_percent_estimate) {
        expect(plan.optional_20_percent_estimate.percent_above_budget).toBe(OPTIONAL_UPGRADE_MIN_PERCENT);
        expect(plan.optional_20_percent_estimate.cost_usd).toBeLessThanOrEqual(budget * 1.2);
      }
      if (plan.optional_30_percent_estimate) {
        expect(plan.optional_30_percent_estimate.percent_above_budget).toBe(OPTIONAL_UPGRADE_MAX_PERCENT);
        expect(plan.optional_30_percent_estimate.cost_usd).toBeLessThanOrEqual(budget * 1.3);
      }
    }
  });

  it('states the deferred scope as an explicit exclusion — never silently', () => {
    const e = buildPreliminaryEstimate(readyState('$500'), classification());
    expect(e.budget_plan.deferred_scope.length).toBeGreaterThan(0);
    for (const item of e.budget_plan.deferred_scope) {
      expect(e.exclusions.some((x) => x.includes(item.label))).toBe(true);
    }
  });

  it('lists modules that are exactly the scope the quoted hours pay for', () => {
    const e = buildPreliminaryEstimate(readyState('$500'), classification());
    expect(e.modules.map((m) => m.name)).toEqual(e.budget_plan.included_scope.map((i) => i.label));
    expect(e.modules.reduce((s, m) => s + m.hours_max, 0)).toBe(e.total_hours_max);
  });

  it('is deterministic — same input, same output', () => {
    const a = buildPreliminaryEstimate(readyState(), classification());
    const b = buildPreliminaryEstimate(readyState(), classification());
    expect(a).toEqual(b);
  });

  it('refuses to estimate before required fields are collected', () => {
    const incomplete = applyUpdate(emptyState(), {
      intent: 'new_project',
      fields: { business_goal: 'An app' },
    });
    expect(() => buildPreliminaryEstimate(incomplete, classification())).toThrowError(EstimateError);
    try {
      buildPreliminaryEstimate(incomplete, classification());
    } catch (e) {
      expect((e as EstimateError).code).toBe('not_ready');
    }
  });

  it('refuses to invent a token figure when the budget funds nothing', () => {
    // $20 buys 4 hours; the cheapest scope item is 6.
    try {
      buildPreliminaryEstimate(readyState('$20'), classification());
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as EstimateError).code).toBe('out_of_bounds');
    }
  });

  it('rejects hostile or malformed model classifications', () => {
    const hostile: unknown[] = [
      { ...classification(), scope_items: [] },
      { ...classification(), scope_items: [{ label: 'x', tier: 'free', complexity: 'complex' }] },
      { ...classification(), scope_items: [{ label: 'x', tier: 'essential', complexity: 'galactic' }] },
      // A model-supplied hour count is an unknown key under .strict().
      { ...classification(), scope_items: [{ label: 'x', tier: 'essential', complexity: 'complex', hours: 999999 }] },
      { ...classification(), total_cost: 1 },
      { ...classification(), overall_complexity: 'medium' }, // retired key → strict reject
      { ...classification(), concerns: ['delete_database'] }, // retired key → strict reject
      'not an object',
      null,
    ];
    for (const input of hostile) {
      expect(() => buildPreliminaryEstimate(readyState(), input)).toThrowError(EstimateError);
    }
  });

  it('model cannot inject numbers — extra numeric fields are rejected by strict schema', () => {
    const injected = { ...classification(), total_cost_max: 1, hourly_rate_max: 99999 };
    expect(() => buildPreliminaryEstimate(readyState(), injected)).toThrowError(EstimateError);
  });

  it('always appends the third-party exclusions note', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    expect(e.exclusions.some((x) => x.includes('Third-party service fees'))).toBe(true);
  });

  it('speaks the same figures the plan holds, and always the review sentence', () => {
    const e = buildPreliminaryEstimate(readyState('$500'), classification());
    const text = describeEstimate(e);
    expect(text).toContain(`${e.total_hours_max} development hours`);
    expect(text).toContain('$5 per hour');
    expect(text).toContain('human technical review');
    // Every dollar figure Buddy speaks also appears in the rendered narrative
    // (or is the quoted total / the standard rate), so a client comparing the
    // spoken figure with the panel can never find a third number.
    const rendered = estimateNarrative(e).join(' ');
    const allowed = new Set([`$${e.total_cost_max.toLocaleString('en-US')}`, `$${STANDARD_HOURLY_RATE_USD}`]);
    for (const figure of text.match(/\$[\d,]+/g) ?? []) {
      expect(rendered.includes(figure) || allowed.has(figure)).toBe(true);
    }
  });

  it('never speaks a completion claim or a forbidden phrase', () => {
    const text = `${describeEstimate(buildPreliminaryEstimate(readyState('$500'), classification()))} ${estimateNarrative(
      buildPreliminaryEstimate(readyState('$500'), classification()),
    ).join(' ')}`.toLowerCase();
    for (const forbidden of ['already complete', '100% complete', 'definitely covers everything', 'discount', 'guaranteed']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('range max never falls below min for any role', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    for (const role of ROLE_KEYS) {
      expect(e.role_hours[role].max).toBeGreaterThanOrEqual(e.role_hours[role].min);
    }
  });

  it('bumps the estimate version on every revision', () => {
    const a = buildPreliminaryEstimate(readyState(), classification(), 1);
    const b = buildPreliminaryEstimate(readyState('$2,000'), classification(), 2);
    expect(a.budget_plan.estimate_version).not.toBe(b.budget_plan.estimate_version);
    expect(b.budget_plan.revision).toBe(2);
  });
});

describe('distributeRoleHours', () => {
  it('splits hours so the role table sums EXACTLY to the quoted total', () => {
    for (const hours of [1, 7, 40, 62, 137, 200]) {
      const split = distributeRoleHours(hours);
      expect(ROLE_KEYS.reduce((s, r) => s + split[r], 0)).toBe(hours);
    }
  });
});

describe('resolveClientBudget', () => {
  it('prefers the model-reported figure, then the recorded answer, then null', () => {
    const state = readyState('$800');
    expect(resolveClientBudget(state, { ...classification(), client_budget_usd: 1500 })).toBe(1500);
    expect(resolveClientBudget(state, classification())).toBe(800);
    expect(resolveClientBudget(readyState('not sure yet'), classification())).toBeNull();
  });
});
