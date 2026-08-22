// The labelled non-AI fallback must obey the SAME commercial policy as the
// Gemini path — that is the whole point of it being a fallback rather than a
// second pricing model.

import { describe, expect, it } from 'vitest';
import {
  AI_UNAVAILABLE_NOTICE,
  BASIC_ESTIMATE_DISCLAIMER,
  buildBasicEstimate,
  classifyAnswers,
  estimatedWeeks,
  sampleAnalysis,
  totalCost,
  totalHours,
} from './basicEstimate';
import { STANDARD_HOURLY_RATE_USD, WEEKLY_CAPACITY_HOURS } from '@/policy/estimationPolicy';

const NEW_PROJECT = {
  idea: 'A tutor marketplace where students book local tutors',
  audience: 'Students and tutors',
  features: ['User profiles', 'Search & filters', 'Booking / scheduling', 'Analytics dashboard'],
  platform: 'Web + Mobile',
  modules: ['User login / accounts', 'Online payments'],
  timeline: '1–3 months',
  budget: 'Under $1,000',
};

describe('buildBasicEstimate', () => {
  it('labels itself as basic — it can never be mistaken for an AI analysis', () => {
    expect(buildBasicEstimate('new', NEW_PROJECT).source).toBe('basic');
    expect(AI_UNAVAILABLE_NOTICE).toMatch(/temporarily unavailable/);
    expect(AI_UNAVAILABLE_NOTICE).toMatch(/not an AI-generated analysis/);
    expect(BASIC_ESTIMATE_DISCLAIMER).toMatch(/subject to human technical review/);
  });

  it('quotes only the standard rate and the standard capacity', () => {
    const result = buildBasicEstimate('new', NEW_PROJECT);
    expect(result.hourlyRateUsd).toBe(STANDARD_HOURLY_RATE_USD);
    expect(result.weeklyCapacityHours).toBe(WEEKLY_CAPACITY_HOURS);
    for (const role of result.team) expect(role.hourlyRate).toBe(STANDARD_HOURLY_RATE_USD);
  });

  it('never exceeds the client budget', () => {
    for (const [label, budget] of [
      ['Under $1,000', 1000],
      ['$1,000 – $5,000', 1000],
      ['$5,000 – $15,000', 5000],
    ] as const) {
      const result = buildBasicEstimate('new', { ...NEW_PROJECT, budget: label });
      expect(result.budgetPlan.selectedBudgetUsd).toBe(budget);
      expect(result.budgetPlan.base.costUsd).toBeLessThanOrEqual(budget);
      expect(totalCost(result.team)).toBeLessThanOrEqual(budget);
    }
  });

  it('makes the role table add up to exactly the quoted plan', () => {
    const result = buildBasicEstimate('new', NEW_PROJECT);
    expect(totalHours(result.team)).toBe(result.budgetPlan.base.hours);
    expect(totalCost(result.team)).toBe(result.budgetPlan.base.costUsd);
    expect(estimatedWeeks(result.team, result.weeklyCapacityHours)).toBe(result.budgetPlan.base.weeks);
  });

  it('carries the deferred scope into the visible narrative and the issues list', () => {
    const result = buildBasicEstimate('new', { ...NEW_PROJECT, budget: 'Under $1,000' });
    if (result.budgetPlan.base.deferredScope.length > 0) {
      expect(result.planNarrative.join(' ')).toMatch(/Deferred for now/);
      expect(result.problemsDetected.some((p) => /deferred/i.test(p.title))).toBe(true);
    }
  });

  it('does not invent a budget when the client said "Not sure yet"', () => {
    const result = buildBasicEstimate('new', { ...NEW_PROJECT, budget: 'Not sure yet' });
    expect(result.budgetPlan.budgetProvided).toBe(false);
    expect(result.planNarrative.join(' ')).toMatch(/No budget has been set yet/);
  });

  it('always requires human review and never claims completion', () => {
    const text = buildBasicEstimate('new', NEW_PROJECT).planNarrative.join(' ').toLowerCase();
    expect(text).toContain('human technical review');
    expect(text).not.toContain('already complete');
    expect(text).not.toContain('100% complete');
  });

  it('produces a storable snapshot attributed to the basic engine, not to Gemini', () => {
    const snapshot = buildBasicEstimate('new', NEW_PROJECT).estimateSnapshot;
    expect(snapshot.provider).toBe('basic-engine');
    expect(snapshot.model).toBeNull();
    expect(snapshot.hourly_rate_usd).toBe(STANDARD_HOURLY_RATE_USD);
    expect(snapshot.human_review_required).toBe(true);
  });

  it('handles an existing project without losing the audit work', () => {
    const result = buildBasicEstimate('existing', {
      projectType: 'Web application',
      technologies: ['React', 'Node.js'],
      working: 'Login and catalogue work',
      broken: 'Checkout fails at payment',
      newFeatures: ['Payments', 'Security & bug fixes', 'Mobile app version'],
      urgency: 'High — within 2–4 weeks',
      budget: '$1,000 – $5,000',
    });
    const labels = result.budgetPlan.scope.map((i) => i.label);
    expect(labels).toContain('Code audit & stabilisation');
    expect(labels).toContain('Fix reported broken functionality');
    expect(result.budgetPlan.coversEssentialScope).toBe(true);
  });

  it('keeps the shipped sample honest too', () => {
    const sample = sampleAnalysis();
    expect(sample.source).toBe('basic');
    expect(sample.budgetPlan.base.costUsd).toBeLessThanOrEqual(sample.budgetPlan.selectedBudgetUsd);
  });
});

describe('classifyAnswers', () => {
  it('marks requested modules and go-live as essential, enhancements as optional', () => {
    const items = classifyAnswers('new', NEW_PROJECT);
    const tierOf = (label: string) => items.find((i) => i.label === label)?.tier;
    expect(tierOf('Core application build')).toBe('essential');
    expect(tierOf('User login / accounts')).toBe('essential');
    expect(tierOf('Online payments')).toBe('essential');
    expect(tierOf('Production deployment & go-live')).toBe('essential');
    expect(tierOf('Analytics dashboard')).toBe('optional');
  });

  it('drops the "none of these" style non-answers instead of pricing them', () => {
    const items = classifyAnswers('new', { modules: ['None of these'], features: [] });
    expect(items.map((i) => i.label)).not.toContain('None of these');
  });

  it('never emits an hours or cost field of its own', () => {
    for (const item of classifyAnswers('new', NEW_PROJECT)) {
      expect(Object.keys(item).sort()).toEqual(['complexity', 'label', 'tier']);
    }
  });
});
