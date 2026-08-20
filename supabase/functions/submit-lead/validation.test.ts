// Unit tests for the exact validation module the Edge Function runs.
// (Run by vitest from the repo root: npm test)

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALLOWED_ORIGINS,
  isOriginAllowed,
  resolveAllowedOrigins,
  sanitizeAnswers,
  sanitizeDemoEstimate,
  validateSubmission,
} from './validation';

const validEstimate = {
  total_hours: 220,
  total_cost: 7100,
  weekly_capacity_hours: 40,
  estimated_weeks: 6,
  health_score: 82,
  risk_level: 'Medium',
  team: [{ role: 'Frontend Developer', hours: 120, hourly_rate: 30 }],
};

const validRequirement = {
  mode: 'new',
  answers: { goal: 'marketplace', features: ['auth', 'payments'] },
  requirement_summary: 'Web storefront\nOnline payments',
  demo_estimate: validEstimate,
  estimate_version: 'demo-v1',
  selected_language: 'en',
  current_route: '/project-analysis/result',
};

function base(overrides: Record<string, unknown> = {}) {
  return {
    action: 'contact',
    turnstileToken: 'tok-1234567890',
    website: '',
    consent: true,
    lead: {
      name: 'Jane Doe',
      email: 'Jane@Example.com',
      project_summary: 'I need a website for my bakery business.',
    },
    context: { route: '/contact', language: 'en' },
    ...overrides,
  };
}

describe('origin allowlist', () => {
  it('allows production and localhost origins by default', () => {
    expect(isOriginAllowed('https://scssoftwares.com', DEFAULT_ALLOWED_ORIGINS)).toBe(true);
    expect(isOriginAllowed('https://www.scssoftwares.com', DEFAULT_ALLOWED_ORIGINS)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', DEFAULT_ALLOWED_ORIGINS)).toBe(true);
  });
  it('rejects unknown, missing and lookalike origins', () => {
    expect(isOriginAllowed('https://evil.example.com', DEFAULT_ALLOWED_ORIGINS)).toBe(false);
    expect(isOriginAllowed('https://scssoftwares.com.evil.com', DEFAULT_ALLOWED_ORIGINS)).toBe(false);
    expect(isOriginAllowed(null, DEFAULT_ALLOWED_ORIGINS)).toBe(false);
    expect(isOriginAllowed('', DEFAULT_ALLOWED_ORIGINS)).toBe(false);
  });
  it('merges extra origins from the env value and ignores junk', () => {
    const merged = resolveAllowedOrigins('https://rohanssahu.github.io, not-a-url,  https://staging.scssoftwares.com/ ');
    expect(merged).toContain('https://rohanssahu.github.io');
    expect(merged).toContain('https://staging.scssoftwares.com');
    expect(merged).not.toContain('not-a-url');
  });
});

describe('validateSubmission — structure', () => {
  it('accepts a valid contact submission and normalizes the email', () => {
    const result = validateSubmission(base());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lead.email).toBe('jane@example.com');
      expect(result.data.lead.lead_type).toBe('contact');
      expect(result.data.lead.source).toBe('/contact');
      expect(result.data.lead.metadata).toEqual({ consent: true, submitted_language: 'en' });
    }
  });

  it('rejects non-object bodies and unknown top-level properties', () => {
    expect(validateSubmission('nope').ok).toBe(false);
    expect(validateSubmission(null).ok).toBe(false);
    const result = validateSubmission(base({ admin: true }));
    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
  });

  it('rejects an unknown action', () => {
    const result = validateSubmission(base({ action: 'delete_everything' }));
    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
    if (!result.ok) expect(result.message).toMatch(/action/i);
  });

  it('rejects honeypot submissions', () => {
    const result = validateSubmission(base({ website: 'https://spam.example' }));
    expect(result).toMatchObject({ ok: false, error: 'honeypot' });
  });

  it('rejects a missing or too-short turnstile token', () => {
    expect(validateSubmission(base({ turnstileToken: '' })).ok).toBe(false);
    expect(validateSubmission(base({ turnstileToken: 'short' })).ok).toBe(false);
    const missing = { ...base() } as Record<string, unknown>;
    delete missing.turnstileToken;
    expect(validateSubmission(missing).ok).toBe(false);
  });

  it('requires consent', () => {
    expect(validateSubmission(base({ consent: false })).ok).toBe(false);
    expect(validateSubmission(base({ consent: 'yes' })).ok).toBe(false);
  });
});

describe('validateSubmission — lead fields', () => {
  it('rejects invalid emails', () => {
    for (const bad of ['plain', 'a@b', 'a b@c.com', `${'x'.repeat(250)}@example.com`]) {
      const result = validateSubmission(base({ lead: { ...base().lead as object, email: bad } }));
      expect(result.ok).toBe(false);
    }
  });

  it('enforces name length', () => {
    expect(validateSubmission(base({ lead: { ...(base().lead as object), name: 'A' } })).ok).toBe(false);
    expect(
      validateSubmission(base({ lead: { ...(base().lead as object), name: 'x'.repeat(101) } })).ok,
    ).toBe(false);
  });

  it('normalizes phone numbers and rejects garbage phones', () => {
    const ok = validateSubmission(base({ lead: { ...(base().lead as object), phone: '+91 78286-90192' } }));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.lead.phone).toBe('+917828690192');
    expect(
      validateSubmission(base({ lead: { ...(base().lead as object), phone: 'call me maybe' } })).ok,
    ).toBe(false);
  });

  it('enforces the 20–5000 summary window when required', () => {
    expect(
      validateSubmission(base({ lead: { ...(base().lead as object), project_summary: 'hi' } })).ok,
    ).toBe(false);
    expect(
      validateSubmission(
        base({ lead: { ...(base().lead as object), project_summary: 'x'.repeat(5001) } }),
      ).ok,
    ).toBe(false);
  });

  it('requires consultation-specific fields', () => {
    const lead = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+917828690192',
      service: 'web-development',
      project_mode: 'new',
      project_summary: 'A storefront with online payments.',
      budget_range: '$1,000 – $5,000',
      timeline: 'ASAP',
      preferred_contact_method: 'whatsapp',
    };
    expect(validateSubmission(base({ action: 'consultation', lead })).ok).toBe(true);
    for (const missing of ['phone', 'service', 'project_mode', 'budget_range', 'timeline']) {
      const partial = { ...lead } as Record<string, unknown>;
      delete partial[missing];
      expect(validateSubmission(base({ action: 'consultation', lead: partial })).ok).toBe(false);
    }
  });

  it('rejects invalid enum values', () => {
    expect(
      validateSubmission(
        base({ lead: { ...(base().lead as object), preferred_contact_method: 'carrier-pigeon' } }),
      ).ok,
    ).toBe(false);
    expect(
      validateSubmission(base({ lead: { ...(base().lead as object), project_mode: 'imaginary' } })).ok,
    ).toBe(false);
  });
});

describe('validateSubmission — requirement & review', () => {
  const reqBase = () =>
    base({
      action: 'project_requirement',
      lead: { name: 'Jane Doe', email: 'jane@example.com' },
      requirement: validRequirement,
    });

  it('accepts a valid project_requirement', () => {
    const result = validateSubmission(reqBase());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.requirement?.mode).toBe('new');
      expect(result.data.requirement?.demo_estimate.status).toBe('demo');
      expect(result.data.lead.project_mode).toBe('new');
    }
  });

  it('requires the requirement block for requirement/review actions', () => {
    const noReq = reqBase() as Record<string, unknown>;
    delete noReq.requirement;
    expect(validateSubmission(noReq).ok).toBe(false);
  });

  it('rejects oversized requirement answers', () => {
    const bigAnswers: Record<string, string> = {};
    for (let i = 0; i < 15; i++) bigAnswers[`q${i}`] = 'x'.repeat(1900);
    const result = validateSubmission(
      base({
        action: 'project_requirement',
        lead: { name: 'Jane Doe', email: 'jane@example.com' },
        requirement: { ...validRequirement, answers: bigAnswers },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/too large|too long/i);
  });

  it('rejects too many answer keys and non-string answer types', () => {
    const manyKeys: Record<string, string> = {};
    for (let i = 0; i < 61; i++) manyKeys[`q${i}`] = 'a';
    expect(sanitizeAnswers(manyKeys).error).toBeTruthy();
    expect(sanitizeAnswers({ nested: { evil: true } }).error).toBeTruthy();
    expect(sanitizeAnswers({}).error).toBeTruthy();
  });

  it('rejects out-of-range or unexpected demo-estimate values', () => {
    expect(sanitizeDemoEstimate({ ...validEstimate, total_cost: 99_000_000 }).error).toBeTruthy();
    expect(sanitizeDemoEstimate({ ...validEstimate, total_hours: -1 }).error).toBeTruthy();
    expect(sanitizeDemoEstimate({ ...validEstimate, risk_level: 'Catastrophic' }).error).toBeTruthy();
    expect(sanitizeDemoEstimate({ ...validEstimate, team: [] }).error).toBeTruthy();
    expect(sanitizeDemoEstimate('not an object').error).toBeTruthy();
  });

  it('whitelists demo-estimate fields (drops anything unexpected)', () => {
    const { estimate } = sanitizeDemoEstimate({
      ...validEstimate,
      final_price: 1, // attacker-supplied → must not survive
      approved: true,
    });
    expect(estimate).toBeTruthy();
    expect(estimate && 'final_price' in estimate).toBe(false);
    expect(estimate && 'approved' in estimate).toBe(false);
    expect(estimate?.status).toBe('demo');
  });

  it('human_review: keeps only visitor-safe review fields and flags the lead', () => {
    const result = validateSubmission(
      base({
        action: 'human_review',
        lead: { name: 'Jane Doe', email: 'jane@example.com', phone: '+917828690192' },
        requirement: validRequirement,
        review: {
          visitor_message: 'Please check the timeline.',
          // Staff-only fields a hostile client might try to set:
          status: 'completed',
          assigned_to: 'me',
          reviewed_at: '2026-01-01',
          final_price: 1,
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lead.human_review_requested).toBe(true);
      expect(result.data.review).toEqual({
        reason: 'visitor_requested_review',
        visitor_message: 'Please check the timeline.',
      });
    }
  });

  it('human_review requires a phone number', () => {
    const result = validateSubmission(
      base({
        action: 'human_review',
        lead: { name: 'Jane Doe', email: 'jane@example.com' },
        requirement: validRequirement,
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a review block on non-review actions', () => {
    const result = validateSubmission(base({ review: { visitor_message: 'hi' } }));
    expect(result.ok).toBe(false);
  });

  it('rejects an over-long review message', () => {
    const result = validateSubmission(
      base({
        action: 'human_review',
        lead: { name: 'Jane Doe', email: 'jane@example.com', phone: '+917828690192' },
        requirement: validRequirement,
        review: { visitor_message: 'x'.repeat(2001) },
      }),
    );
    expect(result.ok).toBe(false);
  });
});
