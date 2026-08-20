import { describe, expect, it } from 'vitest';
import {
  ESTIMATE_CONFIG_VERSION,
  HOURLY_RATE_MAX,
  HOURLY_RATE_MIN,
  MAX_TOTAL_HOURS,
  ROLE_KEYS,
  WEEKLY_CAPACITY_HOURS,
} from './config.js';
import { EstimateError, buildPreliminaryEstimate, describeEstimate } from './estimate.js';
import { applyUpdate, emptyState, type ProjectState } from './state.js';

function readyState(): ProjectState {
  return applyUpdate(emptyState(), {
    intent: 'new_project',
    fields: {
      business_goal: 'Tutor marketplace',
      target_users: 'Students',
      platforms: ['Web'],
      core_features: ['Profiles', 'Search', 'Booking'],
      deadline: '3 months',
      budget_range: '$1k-$5k',
    },
  });
}

const classification = () => ({
  overall_complexity: 'medium' as const,
  modules: [
    { name: 'User profiles', complexity: 'standard' as const },
    { name: 'Search', complexity: 'simple' as const },
    { name: 'Booking & scheduling', complexity: 'complex' as const },
  ],
  concerns: ['payments' as const],
  architecture: ['React frontend', 'Node.js API', 'PostgreSQL'],
  assumptions: ['Client provides branding'],
  exclusions: ['Content writing'],
  risks: ['Payment compliance'],
  confidence: 'medium' as const,
});

describe('deterministic estimate engine', () => {
  it('computes totals from config, not from the model', () => {
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

  it('rejects hostile or malformed model classifications', () => {
    const hostile: unknown[] = [
      { ...classification(), overall_complexity: 'galactic' },
      { ...classification(), modules: [] },
      { ...classification(), modules: Array.from({ length: 50 }, (_, i) => ({ name: `m${i}`, complexity: 'complex' })) },
      { ...classification(), modules: [{ name: 'x', complexity: 'complex', hours: 999999 }] },
      { ...classification(), total_cost: 1 }, // unknown key → strict reject
      { ...classification(), concerns: ['delete_database'] },
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

  it('produces a spoken description with ranges', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    const text = describeEstimate(e);
    expect(text).toContain(`${e.total_hours_min} to ${e.total_hours_max} hours`);
    expect(text).toContain('$');
  });

  it('range max never falls below min for any role', () => {
    const e = buildPreliminaryEstimate(readyState(), classification());
    for (const role of ROLE_KEYS) {
      expect(e.role_hours[role].max).toBeGreaterThanOrEqual(e.role_hours[role].min);
    }
  });
});
