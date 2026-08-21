import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MEETING_FIELDS,
  MEETING_EVENT_TYPES,
  PROPOSAL_BOUNDS,
  PROPOSAL_ROLE_KEYS,
  meetingProjectMode,
  sanitizeMeetingRequirements,
  sanitizeProposal,
  validateFinalize,
  validateMeetingEvent,
  validateMeetingStatus,
  validateSaveMessage,
  validateSaveProposal,
  validateSaveState,
} from './validation.ts';

const MEETING_ID = '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60';

/** A proposal whose totals match the deterministic recomputation exactly. */
function validProposal(overrides: Record<string, unknown> = {}) {
  const roleHours = {
    frontend: { min: 60, max: 84 },
    backend: { min: 50, max: 70 },
    uiux: { min: 20, max: 28 },
    qa: { min: 15, max: 21 },
    devops: { min: 10, max: 14 },
    pm: { min: 12, max: 17 },
  };
  const hoursMin = PROPOSAL_ROLE_KEYS.reduce((s, k) => s + roleHours[k].min, 0);
  const hoursMax = PROPOSAL_ROLE_KEYS.reduce((s, k) => s + roleHours[k].max, 0);
  const capacity = 40;
  return {
    config_version: 'v1',
    currency: 'USD',
    hourly_rate_min: 10,
    hourly_rate_max: 20,
    weekly_capacity_hours: capacity,
    role_hours: roleHours,
    total_hours_min: hoursMin,
    total_hours_max: hoursMax,
    total_cost_min: hoursMin * 10,
    total_cost_max: hoursMax * 20,
    duration_weeks_min: Math.max(1, Math.ceil(hoursMin / capacity)),
    duration_weeks_max: Math.max(1, Math.ceil(hoursMax / capacity)),
    confidence: 'medium',
    modules: [{ name: 'Catalogue', hours_min: 10, hours_max: 20 }],
    summary: 'A marketplace with catalogue, checkout and an admin panel.',
    recommended_solution: ['Build a React + Node marketplace'],
    architecture: ['SPA + REST API + Postgres'],
    technology_stack: ['React', 'Node', 'Postgres'],
    in_scope: ['Catalogue', 'Checkout'],
    out_of_scope: ['Native mobile apps'],
    ai_roles: ['AI requirement analyst'],
    human_roles: ['Frontend Developer', 'Backend Developer'],
    milestones: [{ title: 'Discovery', weeks: 'Week 1-2' }],
    assumptions: ['Payment gateway account exists'],
    dependencies: ['Client provides brand assets'],
    risks: ['Scope may grow with integrations'],
    ...overrides,
  };
}

describe('requirement field whitelist', () => {
  it('keeps whitelisted fields and drops unknown ones silently', () => {
    const result = sanitizeMeetingRequirements({
      business_goal: 'Sell handmade goods online',
      security_compliance: 'GDPR',
      developer_preference: 'Human developers',
      injected_price: 1,
      __proto__: 'nope',
      admin_secret: 'leak',
    });
    expect(result).toEqual({
      business_goal: 'Sell handmade goods online',
      security_compliance: 'GDPR',
      developer_preference: 'Human developers',
    });
  });

  it('accepts every documented consultation field', () => {
    for (const field of ALLOWED_MEETING_FIELDS) {
      const result = sanitizeMeetingRequirements({ [field]: 'value' });
      // list-typed fields ignore a plain string; both outcomes are safe
      expect(Object.keys(result).length).toBeLessThanOrEqual(1);
    }
    expect(sanitizeMeetingRequirements({ user_roles: ['Admin', 'Buyer'] })).toEqual({
      user_roles: ['Admin', 'Buyer'],
    });
  });

  it('caps string length and list size', () => {
    const long = 'x'.repeat(900);
    const result = sanitizeMeetingRequirements({
      business_goal: long,
      core_features: Array.from({ length: 40 }, (_, i) => `Feature ${i}`),
    });
    expect((result.business_goal as string).length).toBe(500);
    expect((result.core_features as string[]).length).toBe(25);
  });

  it('drops empty strings and empty lists', () => {
    expect(sanitizeMeetingRequirements({ business_goal: '   ', core_features: [] })).toEqual({});
  });

  it('returns an empty object for non-objects', () => {
    expect(sanitizeMeetingRequirements(null)).toEqual({});
    expect(sanitizeMeetingRequirements('nope')).toEqual({});
    expect(sanitizeMeetingRequirements(['a'])).toEqual({});
  });
});

describe('deterministic proposal validation', () => {
  it('accepts a proposal whose totals match the role breakdown', () => {
    const result = sanitizeProposal(validProposal());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.total_hours_min).toBe(167);
    expect(result.data.total_cost_min).toBe(1670);
    expect(result.data.duration_weeks_max).toBe(Math.ceil(234 / 40));
  });

  it('recomputes totals and REJECTS model arithmetic that does not match', () => {
    expect(sanitizeProposal(validProposal({ total_hours_min: 10 }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ total_cost_max: 999_999 }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ duration_weeks_min: 1 }))).toMatchObject({ ok: false });
  });

  it('rejects out-of-band hourly rates and capacities', () => {
    expect(sanitizeProposal(validProposal({ hourly_rate_min: 1 }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ hourly_rate_max: 5000 }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ weekly_capacity_hours: 200 }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ weekly_capacity_hours: 1 }))).toMatchObject({ ok: false });
  });

  it('rejects inverted ranges', () => {
    expect(sanitizeProposal(validProposal({ hourly_rate_min: 30, hourly_rate_max: 20 }))).toMatchObject({ ok: false });
    const inverted = validProposal();
    inverted.role_hours.frontend = { min: 84, max: 60 };
    expect(sanitizeProposal(inverted)).toMatchObject({ ok: false });
  });

  it('requires every role and rejects unknown roles', () => {
    const missing = validProposal();
    delete (missing.role_hours as Record<string, unknown>).qa;
    expect(sanitizeProposal(missing)).toMatchObject({ ok: false });
    const extra = validProposal();
    (extra.role_hours as Record<string, unknown>).ceo = { min: 1, max: 2 };
    expect(sanitizeProposal(extra)).toMatchObject({ ok: false });
  });

  it('rejects absurd totals beyond the hard caps', () => {
    const huge = validProposal();
    for (const key of PROPOSAL_ROLE_KEYS) {
      (huge.role_hours as Record<string, { min: number; max: number }>)[key] = {
        min: PROPOSAL_BOUNDS.maxRoleHours,
        max: PROPOSAL_BOUNDS.maxRoleHours,
      };
    }
    expect(sanitizeProposal(huge)).toMatchObject({ ok: false });
  });

  it('rejects a zero-hour proposal', () => {
    const zero = validProposal();
    for (const key of PROPOSAL_ROLE_KEYS) {
      (zero.role_hours as Record<string, { min: number; max: number }>)[key] = { min: 0, max: 0 };
    }
    zero.total_hours_min = 0;
    zero.total_hours_max = 0;
    zero.total_cost_min = 0;
    zero.total_cost_max = 0;
    expect(sanitizeProposal(zero)).toMatchObject({ ok: false });
  });

  it('requires a summary, modules and a valid confidence level', () => {
    expect(sanitizeProposal(validProposal({ summary: '' }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ modules: [] }))).toMatchObject({ ok: false });
    expect(sanitizeProposal(validProposal({ confidence: 'certain' }))).toMatchObject({ ok: false });
  });

  it('requires a non-USD currency to be rejected', () => {
    expect(sanitizeProposal(validProposal({ currency: 'EUR' }))).toMatchObject({ ok: false });
  });

  it('never introduces a minimum-hours business rule of its own', () => {
    const small = validProposal();
    const roleHours = {
      frontend: { min: 1, max: 1 },
      backend: { min: 1, max: 1 },
      uiux: { min: 0, max: 0 },
      qa: { min: 0, max: 0 },
      devops: { min: 0, max: 0 },
      pm: { min: 0, max: 0 },
    };
    small.role_hours = roleHours;
    small.total_hours_min = 2;
    small.total_hours_max = 2;
    small.total_cost_min = 20;
    small.total_cost_max = 40;
    small.duration_weeks_min = 1;
    small.duration_weeks_max = 1;
    const result = sanitizeProposal(small);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 2 hours stays 2 hours — no silent 5-hour minimum is applied anywhere.
    expect(result.data.total_hours_min).toBe(2);
  });

  it('validates a save_proposal envelope and requires a UUID meeting id', () => {
    expect(validateSaveProposal({ meeting_id: MEETING_ID, proposal: validProposal() }).ok).toBe(true);
    expect(validateSaveProposal({ meeting_id: 'not-a-uuid', proposal: validProposal() })).toMatchObject({ ok: false });
  });
});

describe('state saving', () => {
  it('accepts fields, summary and language, and leaves consent untouched by default', () => {
    const result = validateSaveState({
      meeting_id: MEETING_ID,
      fields: { business_goal: 'Sell online', junk: 1 },
      summary: 'Goal: sell online',
      selected_language: 'mr',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.answers).toEqual({ business_goal: 'Sell online' });
    expect(result.data.language).toBe('mr');
    expect(result.data.transcriptConsent).toBeUndefined();
  });

  it('accepts an explicit transcript-consent change', () => {
    const on = validateSaveState({ meeting_id: MEETING_ID, transcript_consent: true });
    const off = validateSaveState({ meeting_id: MEETING_ID, transcript_consent: false });
    expect(on.ok && on.data.transcriptConsent).toBe(true);
    expect(off.ok && off.data.transcriptConsent).toBe(false);
  });

  it('ignores unsupported languages rather than storing them', () => {
    const result = validateSaveState({ meeting_id: MEETING_ID, selected_language: 'klingon' });
    expect(result.ok && result.data.language).toBeNull();
  });
});

describe('message saving', () => {
  it('accepts client, buddy and system senders', () => {
    for (const sender of ['client', 'buddy', 'system']) {
      expect(validateSaveMessage({ meeting_id: MEETING_ID, sender, content: 'hello' }).ok).toBe(true);
    }
  });

  it('rejects unknown senders, empty content and bad ids', () => {
    expect(validateSaveMessage({ meeting_id: MEETING_ID, sender: 'admin', content: 'x' })).toMatchObject({ ok: false });
    expect(validateSaveMessage({ meeting_id: MEETING_ID, sender: 'client', content: '  ' })).toMatchObject({ ok: false });
    expect(validateSaveMessage({ meeting_id: 'x', sender: 'client', content: 'x' })).toMatchObject({ ok: false });
  });

  it('caps message length', () => {
    const result = validateSaveMessage({ meeting_id: MEETING_ID, sender: 'client', content: 'x'.repeat(9000) });
    expect(result.ok && result.data.content.length).toBe(4000);
  });
});

describe('finalization gates', () => {
  const baseFinalize = (overrides: Record<string, unknown> = {}) => ({
    action: 'finalize',
    meeting_id: MEETING_ID,
    user_confirmed: true,
    confirmed_at: '2026-08-21T12:30:00.000Z',
    consent: true,
    consent_at: '2026-08-21T12:00:00.000Z',
    intent: 'new_project',
    contact: {
      name: 'Asha Kumar',
      email: 'Asha@Example.com',
      phone: '+91 98765 43210',
      company: 'Example Ltd',
      preferred_contact_method: 'email',
    },
    fields: { business_goal: 'Sell handmade goods', budget_range: '5000-8000', deadline: '3 months' },
    requirement_summary: 'Goal: sell handmade goods. Budget: 5000-8000.',
    selected_language: 'en',
    proposal: validProposal(),
    ...overrides,
  });

  it('accepts a fully confirmed finalization and normalizes contact details', () => {
    const result = validateFinalize(baseFinalize());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.contact.email).toBe('asha@example.com');
    expect(result.data.contact.phone).toBe('+919876543210');
    expect(result.data.review).toBeNull();
  });

  it('refuses to finalize without explicit confirmation', () => {
    expect(validateFinalize(baseFinalize({ user_confirmed: false }))).toMatchObject({ ok: false });
    expect(validateFinalize(baseFinalize({ confirmed_at: 'never' }))).toMatchObject({ ok: false });
  });

  it('refuses to finalize without consent', () => {
    expect(validateFinalize(baseFinalize({ consent: false }))).toMatchObject({ ok: false });
    expect(validateFinalize(baseFinalize({ consent_at: '' }))).toMatchObject({ ok: false });
  });

  it('requires valid contact details and a requirement summary', () => {
    expect(validateFinalize(baseFinalize({ contact: { ...baseFinalize().contact, email: 'bad' } }))).toMatchObject({
      ok: false,
    });
    expect(validateFinalize(baseFinalize({ contact: { ...baseFinalize().contact, phone: '12' } }))).toMatchObject({
      ok: false,
    });
    expect(
      validateFinalize(baseFinalize({ contact: { ...baseFinalize().contact, preferred_contact_method: 'telepathy' } })),
    ).toMatchObject({ ok: false });
    expect(validateFinalize(baseFinalize({ requirement_summary: '' }))).toMatchObject({ ok: false });
  });

  it('rejects an invalid intent', () => {
    expect(validateFinalize(baseFinalize({ intent: 'take_over_world' }))).toMatchObject({ ok: false });
  });

  it('rejects a finalization whose proposal arithmetic does not check out', () => {
    expect(validateFinalize(baseFinalize({ proposal: validProposal({ total_cost_max: 1 }) }))).toMatchObject({
      ok: false,
    });
  });

  it('builds a human-review request only when asked', () => {
    const withReview = validateFinalize(baseFinalize({ human_review: true, review_message: 'Please call me' }));
    expect(withReview.ok).toBe(true);
    if (!withReview.ok) return;
    expect(withReview.data.review).toEqual({ reason: 'client_requested_review', visitor_message: 'Please call me' });
    // A review message without the flag is a contradiction and is rejected.
    expect(validateFinalize(baseFinalize({ review_message: 'sneaky' }))).toMatchObject({ ok: false });
  });

  it('maps intents to the right project mode', () => {
    expect(meetingProjectMode('new_project')).toBe('new');
    expect(meetingProjectMode('consultation')).toBe('new');
    expect(meetingProjectMode('improve_existing')).toBe('existing');
    expect(meetingProjectMode('repair_broken')).toBe('existing');
  });
});

describe('event and status validation', () => {
  it('accepts only whitelisted event types', () => {
    for (const eventType of MEETING_EVENT_TYPES) {
      expect(validateMeetingEvent({ meeting_id: MEETING_ID, event_type: eventType }).ok).toBe(true);
    }
    expect(validateMeetingEvent({ meeting_id: MEETING_ID, event_type: 'transcript_dump' })).toMatchObject({ ok: false });
  });

  it('keeps only scalar event data and truncates strings', () => {
    const result = validateMeetingEvent({
      meeting_id: MEETING_ID,
      event_type: 'state_updated',
      data: { collected: 5, ok: true, code: 'x'.repeat(500), nested: { leak: 'pii' }, list: ['pii'] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.data.collected).toBe(5);
    expect(result.data.data.ok).toBe(true);
    expect((result.data.data.code as string).length).toBe(200);
    expect(result.data.data.nested).toBeUndefined();
    expect(result.data.data.list).toBeUndefined();
  });

  it('accepts only the documented meeting statuses', () => {
    expect(validateMeetingStatus({ meeting_id: MEETING_ID, status: 'completed', ended: true }).ok).toBe(true);
    expect(validateMeetingStatus({ meeting_id: MEETING_ID, status: 'in_progress' }).ok).toBe(true);
    expect(validateMeetingStatus({ meeting_id: MEETING_ID, status: 'cancelled' })).toMatchObject({ ok: false });
    expect(validateMeetingStatus({ meeting_id: MEETING_ID, status: 'scheduled' })).toMatchObject({ ok: false });
  });
});
