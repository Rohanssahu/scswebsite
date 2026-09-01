import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/types/projectAnalysis';
import { buildBudgetPlan, buildEstimateSnapshot, STANDARD_HOURLY_RATE_USD } from '@/policy/estimationPolicy';

// Mock the Supabase client module so submitLead never makes network calls.
const invokeMock = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  isLeadCaptureReady: true,
  TURNSTILE_SITE_KEY: 'test-site-key',
  getSupabaseClient: () => ({ functions: { invoke: invokeMock } }),
}));

import {
  buildAnswersPayload,
  buildConsultationRequest,
  buildContactRequest,
  buildPreliminaryEstimatePayload,
  buildHumanReviewRequest,
  buildRequirementRequest,
  LeadSubmissionError,
  submitLead,
} from '@/services/leadService';

const samplePlan = buildBudgetPlan({
  selectedBudgetUsd: 1100,
  scopeItems: [
    { label: 'Storefront', tier: 'essential', complexity: 'complex' },
    { label: 'Online payments', tier: 'essential', complexity: 'complex' },
    { label: 'Analytics', tier: 'optional', complexity: 'complex' },
  ],
});

const sampleResult: AnalysisResult = {
  mode: 'new',
  healthScore: 82,
  riskLevel: 'Medium',
  requirementSummary: ['Web storefront', 'Online payments'],
  currentlyWorking: [],
  problemsDetected: [],
  missingFeatures: [],
  recommendedSolution: [],
  team: [
    { role: 'Frontend Developer', hours: 120, hourlyRate: STANDARD_HOURLY_RATE_USD },
    { role: 'Backend Developer', hours: 100, hourlyRate: STANDARD_HOURLY_RATE_USD },
  ],
  weeklyCapacityHours: 40,
  hourlyRateUsd: STANDARD_HOURLY_RATE_USD,
  assumptions: [],
  milestones: [],
  benefits: [],
  nextSteps: [],
  budgetPlan: samplePlan,
  planNarrative: ['Preliminary estimate.'],
  estimateSnapshot: buildEstimateSnapshot(samplePlan, { provider: 'gemini', model: 'gemini-3.6-flash' }),
  generatedAt: '2026-08-20T00:00:00.000Z',
  source: 'ai',
};

const context = { route: '/contact', language: 'en' };

describe('buildContactRequest', () => {
  it('maps fields, trims strings and includes honeypot + consent', () => {
    const req = buildContactRequest(
      { name: ' Jane ', email: ' jane@example.com ', company: '  ', service: 'web-development', message: ' A shop website with delivery tracking. ' },
      'tok-123',
      context,
      '',
    );
    expect(req.action).toBe('contact');
    expect(req.turnstileToken).toBe('tok-123');
    expect(req.consent).toBe(true);
    expect(req.scs_hp_check).toBe('');
    expect(req.lead.name).toBe('Jane');
    expect(req.lead.company).toBeUndefined(); // whitespace-only → dropped
    expect(req.lead.project_summary).toBe('A shop website with delivery tracking.');
    expect(req.context).toEqual(context);
  });
});

describe('honeypot mapping regression', () => {
  it('never maps company/website/contact values into the honeypot key', () => {
    const req = buildContactRequest(
      {
        name: 'Jane',
        email: 'jane@example.com',
        company: 'https://janes-website.example', // website-looking company value
        service: 'web-development',
        message: 'Please build https://janes-website.example for me.',
      },
      'tok',
      context,
      // honeypot argument untouched by any other field:
      '',
    );
    expect(req.scs_hp_check).toBe('');
    // and the deprecated semantic key must not exist on the wire at all
    expect('website' in req).toBe(false);
  });

  it('passes a deliberately filled honeypot through unchanged (bots stay caught)', () => {
    const req = buildContactRequest(
      { name: 'Bot', email: 'bot@example.com', message: 'Twenty characters of spam text.' },
      'tok',
      context,
      'http://spam.example',
    );
    expect(req.scs_hp_check).toBe('http://spam.example');
  });
});

describe('buildConsultationRequest', () => {
  it('normalizes the phone number and maps all consultation fields', () => {
    const req = buildConsultationRequest(
      {
        name: 'Jane',
        email: 'jane@example.com',
        phone: '+1 555-555-0123',
        company: 'Acme',
        projectMode: 'existing',
        service: 'cloud-solutions',
        requirement: 'Migrate our legacy app to the cloud.',
        budgetRange: '$5,000 – $15,000',
        timeline: 'ASAP',
        contactMethod: 'whatsapp',
      },
      'tok',
      { route: '/consultation-form', language: 'ar' },
    );
    expect(req.action).toBe('consultation');
    expect(req.lead.phone).toBe('+15555550123');
    expect(req.lead.project_mode).toBe('existing');
    expect(req.lead.preferred_contact_method).toBe('whatsapp');
    expect(req.lead.preferred_language).toBe('ar');
  });
});

describe('buildPreliminaryEstimatePayload', () => {
  it('recomputes totals from the role table at the standard rate', () => {
    const estimate = buildPreliminaryEstimatePayload(sampleResult);
    expect(estimate.status).toBe('preliminary');
    expect(estimate.currency).toBe('USD');
    expect(estimate.hourly_rate_usd).toBe(STANDARD_HOURLY_RATE_USD);
    expect(estimate.total_hours).toBe(220);
    expect(estimate.total_cost).toBe(220 * STANDARD_HOURLY_RATE_USD);
    expect(estimate.team).toHaveLength(2);
    expect(estimate.team[0]).toEqual({ role: 'Frontend Developer', hours: 120, hourly_rate: 5 });
    expect(estimate.human_review_required).toBe(true);
  });

  it('carries the full budget-fit snapshot for the admin team', () => {
    const estimate = buildPreliminaryEstimatePayload(sampleResult);
    expect(estimate.budget_plan.selected_budget_usd).toBe(1100);
    expect(estimate.budget_plan.hourly_rate_usd).toBe(5);
    expect(estimate.budget_plan.available_hours).toBe(220);
    expect(estimate.budget_plan.included_scope.length).toBeGreaterThan(0);
    expect(estimate.budget_plan.provider).toBe('gemini');
    expect(estimate.budget_plan.human_review_required).toBe(true);
    expect(estimate.client_selected_option).toBeNull();
  });

  it('caps a stale stored rate at the standard rate instead of resubmitting it', () => {
    const stale: AnalysisResult = {
      ...sampleResult,
      healthScore: 9999,
      weeklyCapacityHours: 168,
      team: [{ role: 'X'.repeat(500), hours: 10_000_000, hourlyRate: 99999 }],
    };
    const estimate = buildPreliminaryEstimatePayload(stale);
    expect(estimate.health_score).toBe(100);
    expect(estimate.weekly_capacity_hours).toBe(40);
    expect(estimate.team[0].role).toHaveLength(100);
    expect(estimate.team[0].hours).toBe(100000);
    expect(estimate.team[0].hourly_rate).toBe(STANDARD_HOURLY_RATE_USD);
  });

  it('drops non-finite numbers to the safe minimum', () => {
    const broken: AnalysisResult = {
      ...sampleResult,
      team: [{ role: 'Dev', hours: NaN as number, hourlyRate: Infinity as number }],
    };
    const estimate = buildPreliminaryEstimatePayload(broken);
    expect(estimate.team[0].hours).toBe(0);
    expect(estimate.team[0].hourly_rate).toBe(0);
  });

  it('stores the policy estimate version with the requirement', () => {
    const req = buildRequirementRequest(
      { contact: { name: 'Jane', email: 'jane@example.com' }, mode: 'new', answers: {}, result: sampleResult },
      'tok',
      context,
    );
    expect(req.requirement?.estimate_version).toBe(samplePlan.estimateVersion);
  });
});

describe('buildAnswersPayload', () => {
  it('keeps strings and string arrays, trimming and clamping', () => {
    const out = buildAnswersPayload({
      goal: '  build a marketplace  ',
      features: ['auth', ' payments ', ''],
      empty: '',
    });
    expect(out).toEqual({ goal: 'build a marketplace', features: ['auth', 'payments'] });
  });
  it('caps oversized values', () => {
    const out = buildAnswersPayload({ big: 'x'.repeat(3000) });
    expect((out.big as string).length).toBe(2000);
  });
});

describe('buildRequirementRequest / buildHumanReviewRequest', () => {
  const input = {
    contact: { name: 'Jane', email: 'jane@example.com', phone: '+15555550123' },
    mode: 'new' as const,
    answers: { goal: 'marketplace' },
    result: sampleResult,
    reviewMessage: 'Please double-check the timeline.',
  };
  const ctx = { route: '/project-analysis/result', language: 'en' };

  it('builds a project_requirement payload with requirement block', () => {
    const req = buildRequirementRequest(input, 'tok', ctx);
    expect(req.action).toBe('project_requirement');
    expect(req.review).toBeUndefined();
    expect(req.requirement?.mode).toBe('new');
    expect(req.requirement?.requirement_summary).toBe('Web storefront\nOnline payments');
    expect(req.requirement?.estimate_version).toBe(samplePlan.estimateVersion);
    expect(req.requirement?.current_route).toBe(ctx.route);
  });

  it('builds a human_review payload carrying only visitor-safe review fields', () => {
    const req = buildHumanReviewRequest(input, 'tok', ctx);
    expect(req.action).toBe('human_review');
    expect(req.review).toEqual({
      reason: 'visitor_requested_review',
      visitor_message: 'Please double-check the timeline.',
    });
    // No staff-only fields can even be expressed by the type/mapping:
    expect(Object.keys(req.review as object).sort()).toEqual(['reason', 'visitor_message']);
  });

  it('falls back to the summary when draft answers are empty', () => {
    const req = buildRequirementRequest({ ...input, answers: {} }, 'tok', ctx);
    expect(req.requirement?.answers).toEqual({ summary: 'Web storefront\nOnline payments' });
  });
});

describe('submitLead', () => {
  beforeEach(() => invokeMock.mockReset());

  it('returns the success payload on ok responses', async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, action: 'contact', referenceCode: 'SCS-ABC12345' },
      error: null,
    });
    const result = await submitLead(
      buildContactRequest(
        { name: 'Jane', email: 'jane@example.com', message: 'A valid twenty-char message.' },
        'tok',
        context,
      ),
    );
    expect(result.referenceCode).toBe('SCS-ABC12345');
    expect(invokeMock).toHaveBeenCalledWith('submit-lead', expect.objectContaining({ body: expect.any(Object) }));
  });

  it('maps server error payloads to LeadSubmissionError codes', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ ok: false, error: 'rate_limited', message: 'Too many submissions.' })),
      },
    });
    await expect(
      submitLead(
        buildContactRequest(
          { name: 'Jane', email: 'jane@example.com', message: 'A valid twenty-char message.' },
          'tok',
          context,
        ),
      ),
    ).rejects.toMatchObject({ name: 'LeadSubmissionError', code: 'rate_limited' });
  });

  it('rejects unexpected response shapes', async () => {
    invokeMock.mockResolvedValue({ data: { unexpected: true }, error: null });
    await expect(
      submitLead(
        buildContactRequest(
          { name: 'Jane', email: 'jane@example.com', message: 'A valid twenty-char message.' },
          'tok',
          context,
        ),
      ),
    ).rejects.toBeInstanceOf(LeadSubmissionError);
  });
});
