// Phase 9 — the commercial guarantees, asserted as arithmetic rather than
// trusted to prose in a prompt.

import { describe, expect, it } from 'vitest';
import {
  AI_UNAVAILABLE_MESSAGE,
  ESTIMATION_POLICY_VERSION,
  MONTHLY_COST_MAX_USD,
  MONTHLY_COST_MIN_USD,
  OPTIONAL_UPGRADE_MAX_PERCENT,
  OPTIONAL_UPGRADE_MIN_PERCENT,
  PRELIMINARY_COVERAGE_MAX_PERCENT,
  PRELIMINARY_COVERAGE_MIN_PERCENT,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS,
  WEEKLY_COST_USD,
  availableHoursFor,
  buildBudgetPlan,
  buildEstimateSnapshot,
  costForHours,
  describeBudgetPlan,
  distributeHoursAcrossRoles,
  hourCeilingFor,
  normalizeScopeItems,
  parseSelectedBudgetUsd,
  speakBudgetPlan,
  totalCostOfRoles,
  totalHoursOfRoles,
  weeksForHours,
  type ScopeItemInput,
} from './estimationPolicy';

const item = (label: string, tier: ScopeItemInput['tier'], complexity: ScopeItemInput['complexity']) => ({
  label,
  tier,
  complexity,
});

describe('commercial constants', () => {
  it('caps the client-facing rate at $5/hour', () => {
    expect(STANDARD_HOURLY_RATE_USD).toBe(5);
  });

  it('keeps the weekly and monthly figures internally consistent', () => {
    expect(WEEKLY_CAPACITY_HOURS).toBe(40);
    expect(WEEKLY_COST_USD).toBe(200);
    expect(WEEKLY_CAPACITY_HOURS * STANDARD_HOURLY_RATE_USD).toBe(WEEKLY_COST_USD);
    expect(MONTHLY_COST_MIN_USD).toBe(800);
    expect(MONTHLY_COST_MAX_USD).toBe(1000);
    // 4 and 5 calendar weeks of full capacity bracket the monthly band.
    expect(WEEKLY_COST_USD * 4).toBe(MONTHLY_COST_MIN_USD);
    expect(WEEKLY_COST_USD * 5).toBe(MONTHLY_COST_MAX_USD);
  });

  it('uses the documented optional-upgrade bands', () => {
    expect(OPTIONAL_UPGRADE_MIN_PERCENT).toBe(20);
    expect(OPTIONAL_UPGRADE_MAX_PERCENT).toBe(30);
    expect(PRELIMINARY_COVERAGE_MIN_PERCENT).toBe(70);
    expect(PRELIMINARY_COVERAGE_MAX_PERCENT).toBe(80);
  });
});

describe('budget → hours mapping', () => {
  it.each([
    [200, 40],
    [500, 100],
    [800, 160],
    [1000, 200],
  ])('$%i maps to %i hours', (budget, hours) => {
    expect(availableHoursFor(budget)).toBe(hours);
  });

  it('never rounds up past the budget', () => {
    expect(availableHoursFor(199)).toBe(39); // 39h = $195 <= $199
    expect(costForHours(availableHoursFor(199))).toBeLessThanOrEqual(199);
  });

  it('rejects nonsense budgets instead of inventing hours', () => {
    expect(availableHoursFor(Number.NaN)).toBe(0);
    expect(availableHoursFor(-500)).toBe(0);
  });

  it('projects duration at a maximum of 40 hours per week', () => {
    expect(weeksForHours(40)).toBe(1);
    expect(weeksForHours(41)).toBe(2);
    expect(weeksForHours(200)).toBe(5);
    expect(weeksForHours(0)).toBe(0);
  });
});

describe('scope normalisation — the model may classify, never price', () => {
  it('assigns hours from the fixed complexity table', () => {
    const { scope } = normalizeScopeItems([
      item('Login', 'essential', 'simple'),
      item('Checkout', 'essential', 'standard'),
      item('Recommendations', 'optional', 'complex'),
    ]);
    expect(scope.map((s) => s.hours)).toEqual([6, 16, 40]);
  });

  it('ignores any hours or cost the model tries to inject', () => {
    const { scope } = normalizeScopeItems([
      { label: 'Login', tier: 'essential', complexity: 'simple', hours: 9999, costUsd: 50_000, hourlyRate: 250 },
    ]);
    expect(scope[0].hours).toBe(6);
    expect(Object.keys(scope[0]).sort()).toEqual(['complexity', 'hours', 'label', 'tier']);
  });

  it('routes an unrecognised tier to unclear rather than pricing it', () => {
    const { scope, unclear } = normalizeScopeItems([{ label: 'Mystery', tier: 'free', complexity: 'simple' }]);
    expect(scope).toHaveLength(0);
    expect(unclear[0].tier).toBe('unclear');
  });

  it('sorts by delivery priority and de-duplicates labels', () => {
    const { scope } = normalizeScopeItems([
      item('Reports', 'optional', 'simple'),
      item('Login', 'essential', 'simple'),
      item('login', 'optional', 'complex'),
      item('Search', 'important', 'simple'),
    ]);
    expect(scope.map((s) => s.label)).toEqual(['Login', 'Search', 'Reports']);
  });
});

describe('budget-fit plan', () => {
  const scopeItems = [
    item('Client accounts', 'essential', 'standard'), // 16
    item('Booking flow', 'essential', 'complex'), // 40
    item('Admin panel', 'important', 'standard'), // 16
    item('Payments', 'important', 'standard'), // 16
    item('Analytics dashboard', 'optional', 'standard'), // 16
    item('Mobile app', 'optional', 'complex'), // 40
  ];

  it('never exceeds the selected budget on the base plan', () => {
    for (const budget of [200, 350, 500, 640, 800, 1000, 5000]) {
      const plan = buildBudgetPlan({ selectedBudgetUsd: budget, scopeItems });
      expect(plan.base.costUsd).toBeLessThanOrEqual(budget);
      expect(plan.base.hours).toBeLessThanOrEqual(plan.availableHours);
    }
  });

  it('keeps the optional tiers inside +20% and +30%', () => {
    for (const budget of [200, 500, 800, 1000]) {
      const plan = buildBudgetPlan({ selectedBudgetUsd: budget, scopeItems });
      if (plan.recommended) {
        expect(plan.recommended.percentAboveBudget).toBe(20);
        expect(plan.recommended.costUsd).toBeLessThanOrEqual(budget * 1.2);
      }
      if (plan.growth) {
        expect(plan.growth.percentAboveBudget).toBe(30);
        expect(plan.growth.costUsd).toBeLessThanOrEqual(budget * 1.3);
      }
    }
  });

  it('marks the optional tiers as optional and never preselects one', () => {
    // $400 buys 80h of a 144h scope, so both optional tiers genuinely add work.
    const plan = buildBudgetPlan({ selectedBudgetUsd: 400, scopeItems });
    expect(plan.base.optional).toBe(false);
    expect(plan.recommended?.optional).toBe(true);
    expect(plan.growth?.optional).toBe(true);
    const snapshot = buildEstimateSnapshot(plan);
    expect(snapshot.client_selected_option).toBeNull();
  });

  it('hides an optional tier that adds nothing', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 5000, scopeItems });
    expect(plan.coverageBand).toBe('full');
    expect(plan.recommended).toBeNull();
    expect(plan.growth).toBeNull();
  });

  it('never promises full scope when only part of it fits', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems });
    expect(plan.base.coversFullRequestedScope).toBe(false);
    expect(plan.base.deferredScope.length).toBeGreaterThan(0);
    const narrative = describeBudgetPlan(plan);
    expect(narrative.deferredLine).not.toBe('');
    expect(narrative.lines.join(' ')).not.toMatch(/100% complete|fully complete|covers everything/i);
  });

  it('always exposes the included/deferred split — deferred scope is never hidden', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems });
    const accounted = plan.base.includedScope.length + plan.base.deferredScope.length;
    expect(accounted).toBe(plan.scope.length);
  });

  it('says so plainly when the budget cannot cover the core MVP', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 100, scopeItems });
    expect(plan.coverageBand).toBe('below-mvp');
    expect(plan.coversEssentialScope).toBe(false);
    expect(describeBudgetPlan(plan).headline).toMatch(/smaller Phase 1/);
  });

  it('confirms a fit without inflating the budget when everything fits', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 1000, scopeItems: [item('Landing page', 'essential', 'simple')] });
    expect(plan.coverageBand).toBe('full');
    expect(plan.base.costUsd).toBe(30);
    expect(plan.recommended).toBeNull();
  });

  it('lists unclear requirements without costing them', () => {
    const plan = buildBudgetPlan({
      selectedBudgetUsd: 1000,
      scopeItems: [item('Login', 'essential', 'simple'), item('"AI magic"', 'unclear', 'complex')],
    });
    expect(plan.totalRequestedHours).toBe(6);
    expect(plan.unclearScope).toHaveLength(1);
    expect(describeBudgetPlan(plan).unclearLine).toMatch(/need more detail/);
  });

  it('produces a new estimate version for every revision', () => {
    const a = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems, revision: 1 });
    const b = buildBudgetPlan({ selectedBudgetUsd: 700, scopeItems, revision: 2 });
    expect(a.estimateVersion).toBe(`${ESTIMATION_POLICY_VERSION}#r1`);
    expect(b.estimateVersion).toBe(`${ESTIMATION_POLICY_VERSION}#r2`);
    expect(a.estimateVersion).not.toBe(b.estimateVersion);
  });

  it('always requires human review', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems });
    expect(plan.humanReviewRequired).toBe(true);
    expect(describeBudgetPlan(plan).reviewLine).toMatch(/human technical review/);
    expect(buildEstimateSnapshot(plan).human_review_required).toBe(true);
  });
});

describe('the 70–80% statement', () => {
  /** Scope totalling `total` hours: one essential block plus optional filler. */
  const scopeOfHours = (essential: number, optional: number) => [
    ...Array.from({ length: essential / 16 }, (_, i) => item(`Core ${i}`, 'essential', 'standard')),
    ...Array.from({ length: optional / 16 }, (_, i) => item(`Extra ${i}`, 'optional', 'standard')),
  ];

  it('appears only when the calculation lands in 70–80%', () => {
    // 8 blocks of 16h = 128h requested. $500 buys 100h -> 6 blocks = 96h = 75%.
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems: scopeOfHours(64, 64) });
    expect(plan.budgetFitPercent).toBe(75);
    expect(plan.mayUseSeventyToEightyWording).toBe(true);
    expect(describeBudgetPlan(plan).headline).toContain('70–80%');
  });

  it('is withheld and replaced by the real figure outside that band', () => {
    // 320h requested, $500 buys 100h -> 96h = 30%.
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems: scopeOfHours(32, 288) });
    expect(plan.budgetFitPercent).toBeLessThan(70);
    expect(plan.mayUseSeventyToEightyWording).toBe(false);
    const headline = describeBudgetPlan(plan).headline;
    expect(headline).not.toContain('70–80%');
    expect(headline).toContain('30%');
  });

  it('is withheld when the whole scope fits', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 1000, scopeItems: scopeOfHours(32, 0) });
    expect(plan.mayUseSeventyToEightyWording).toBe(false);
    expect(describeBudgetPlan(plan).headline).not.toContain('70–80%');
  });

  it('is labelled as an estimate, never as completed work', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: 500, scopeItems: scopeOfHours(64, 64) });
    const text = describeBudgetPlan(plan).lines.join(' ');
    expect(text).toMatch(/we estimate that it can cover/);
    expect(text).not.toMatch(/(already |is )?complete[d]?\b/i);
  });
});

describe('client-facing wording', () => {
  const plan = buildBudgetPlan({
    selectedBudgetUsd: 1000,
    scopeItems: [
      item('Client accounts', 'essential', 'standard'),
      item('Booking flow', 'essential', 'complex'),
      item('Mobile app', 'optional', 'complex'),
      item('Analytics', 'optional', 'complex'),
    ],
  });

  it('acknowledges the budget first and quotes the standard rate', () => {
    const text = describeBudgetPlan(plan).lines.join(' ');
    expect(describeBudgetPlan(plan).headline).toContain('$1,000');
    expect(text).toMatch(/\$5 per hour|up to \$5/);
  });

  it('uses none of the forbidden phrasings', () => {
    const text = describeBudgetPlan(plan).lines.join(' ').toLowerCase();
    for (const forbidden of [
      'definitely covers everything',
      'pay later for missing work',
      'the real cost will be decided after starting',
      'discount',
      'guaranteed',
      'limited time',
      'act now',
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('keeps the spoken summary consistent with the rendered narrative', () => {
    const narrative = describeBudgetPlan(plan);
    const spoken = speakBudgetPlan(plan);
    expect(spoken).toContain(narrative.headline);
    expect(spoken).toContain(narrative.reviewLine);
    // Every figure spoken also appears in the rendered lines.
    for (const figure of spoken.match(/\$[\d,]+/g) ?? []) {
      expect(narrative.lines.join(' ')).toContain(figure);
    }
  });

  it('has a clear provider-failure message that never claims AI output', () => {
    expect(AI_UNAVAILABLE_MESSAGE).toMatch(/temporarily unavailable/i);
  });
});

describe('budget parsing', () => {
  it.each([
    ['Under $1,000', 1000],
    ['$1,000 – $5,000', 1000],
    ['$5,000 – $15,000', 5000],
    ['$15,000+', 15000],
    ['about 800 usd', 800],
    ['500', 500],
    ['5k', 5000],
    [1000, 1000],
  ])('reads %s as %i', (raw, expected) => {
    expect(parseSelectedBudgetUsd(raw)).toBe(expected);
  });

  it('returns null rather than guessing', () => {
    expect(parseSelectedBudgetUsd('Not sure yet')).toBeNull();
    expect(parseSelectedBudgetUsd('(skipped)')).toBeNull();
    expect(parseSelectedBudgetUsd('')).toBeNull();
    expect(parseSelectedBudgetUsd(undefined)).toBeNull();
    expect(parseSelectedBudgetUsd('as cheap as possible')).toBeNull();
  });
});

describe('example outputs for the documented budgets', () => {
  const scopeItems = [
    item('Client accounts', 'essential', 'standard'), // 16
    item('Core booking flow', 'essential', 'complex'), // 40
    item('Admin panel', 'important', 'standard'), // 16
    item('Online payments', 'important', 'standard'), // 16
    item('Analytics dashboard', 'optional', 'standard'), // 16
    item('Mobile app', 'optional', 'complex'), // 40
  ];

  it.each([200, 500, 800, 1000])('$%i produces a coherent, in-budget plan', (budget) => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: budget, scopeItems });
    expect(plan.availableHours).toBe(budget / 5);
    expect(plan.base.costUsd).toBe(plan.base.hours * 5);
    expect(plan.base.costUsd).toBeLessThanOrEqual(budget);
    expect(plan.base.weeks).toBe(weeksForHours(plan.base.hours));
    expect(hourCeilingFor(budget, 20) * 5).toBeLessThanOrEqual(budget * 1.2);
    expect(hourCeilingFor(budget, 30) * 5).toBeLessThanOrEqual(budget * 1.3);
  });
});

describe('role breakdown', () => {
  it('distributes plan hours exactly, so the table matches the total', () => {
    const roles = ['Requirement Analyst', 'UI/UX Designer', 'Frontend Developer', 'Backend Developer', 'QA Tester'];
    for (const hours of [7, 40, 88, 100, 137, 200]) {
      const table = distributeHoursAcrossRoles(roles, hours);
      expect(totalHoursOfRoles(table)).toBe(hours);
      expect(totalCostOfRoles(table)).toBe(costForHours(hours));
    }
  });

  it('never shows a rate above the standard rate', () => {
    const table = distributeHoursAcrossRoles(['Frontend Developer', 'Backend Developer'], 100);
    for (const row of table) expect(row.hourlyRate).toBe(STANDARD_HOURLY_RATE_USD);
  });

  it('drops roles that would receive zero hours instead of showing free work', () => {
    const table = distributeHoursAcrossRoles(['Frontend Developer', 'DevOps Engineer'], 2);
    expect(table.every((r) => r.hours > 0)).toBe(true);
    expect(totalHoursOfRoles(table)).toBe(2);
  });

  it('returns nothing to allocate when there are no hours', () => {
    expect(distributeHoursAcrossRoles(['Frontend Developer'], 0)).toEqual([]);
  });
});

describe('no budget stated', () => {
  it('prices the full classified scope instead of inventing a budget', () => {
    const plan = buildBudgetPlan({
      selectedBudgetUsd: null,
      scopeItems: [item('Login', 'essential', 'simple'), item('Payments', 'important', 'standard')],
    });
    expect(plan.budgetProvided).toBe(false);
    expect(plan.base.hours).toBe(22);
    expect(plan.base.costUsd).toBe(110);
    expect(plan.coverageBand).toBe('full');
    expect(describeBudgetPlan(plan).headline).toMatch(/No budget has been set yet/);
    expect(describeBudgetPlan(plan).headline).not.toMatch(/your selected budget/i);
  });

  it('explains the rate honestly when nothing at all is known yet', () => {
    const plan = buildBudgetPlan({ selectedBudgetUsd: null, scopeItems: [] });
    expect(plan.coverageBand).toBe('unknown');
    const headline = describeBudgetPlan(plan).headline;
    expect(headline).toContain('$5');
    expect(headline).toContain('$200');
    expect(headline).toContain('$800–$1,000');
  });
});

describe('optional tiers below the MVP threshold', () => {
  const scopeItems = [
    item('Client accounts', 'essential', 'standard'), // 16
    item('Core booking flow', 'essential', 'complex'), // 40
    item('Deployment & go-live', 'essential', 'standard'), // 16
    item('Admin panel', 'important', 'standard'), // 16
    item('Payments', 'important', 'complex'), // 40
  ];

  it('offers no upgrade that still leaves the launch unusable', () => {
    // $200 buys 40 h; the essential scope needs 72 h. Neither +20% (48 h) nor
    // +30% (52 h) reaches it, so neither is a "materially safer launch".
    const plan = buildBudgetPlan({ selectedBudgetUsd: 200, scopeItems });
    expect(plan.coverageBand).toBe('below-mvp');
    expect(plan.recommended).toBeNull();
    expect(plan.growth).toBeNull();
    expect(describeBudgetPlan(plan).recommendedLine).toBe('');
  });

  it('does offer the upgrade that DOES reach the core launch scope', () => {
    // $320 buys 64 h (still short of 72 h); +20% is $384 = 76 h, which covers
    // every essential item — a genuinely safer launch, so it is offered.
    const plan = buildBudgetPlan({ selectedBudgetUsd: 320, scopeItems });
    expect(plan.coversEssentialScope).toBe(false);
    expect(plan.recommended).not.toBeNull();
    expect(plan.recommended?.costUsd).toBeLessThanOrEqual(320 * 1.2);
  });

  it('uses grammatical wording for a single deferred item', () => {
    // $200 buys 40 h: the 40 h core app fits, the 40 h mobile app does not.
    const plan = buildBudgetPlan({
      selectedBudgetUsd: 200,
      scopeItems: [item('Core app', 'essential', 'complex'), item('Mobile app', 'optional', 'complex')],
    });
    expect(plan.base.deferredScope).toHaveLength(1);
    expect(describeBudgetPlan(plan).deferredLine).toContain('This can be scheduled after launch.');
  });
});
