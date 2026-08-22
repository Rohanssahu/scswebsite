import { afterEach, describe, expect, it } from 'vitest';
import { buildSubmitLeadPayload, loadBackendConfig, type SubmitLeadArgs } from './backend.js';
import { buildPreliminaryEstimate } from './estimate.js';
import { applyUpdate, emptyState, type ProjectState } from './state.js';

function confirmedState(transcriptConsent = false): ProjectState {
  const state = applyUpdate(emptyState(), {
    intent: 'new_project',
    fields: {
      business_goal: 'Tutor marketplace',
      target_users: 'Students',
      platforms: ['Web'],
      core_features: ['Profiles', 'Booking'],
      deadline: '3 months',
      budget_range: '$1,000',
    },
    assumptions: ['Client provides content'],
  });
  state.language = 'en';
  state.confirmedAt = '2026-08-21T10:00:00.000Z';
  state.transcriptConsent = transcriptConsent;
  return state;
}

function args(overrides: Partial<SubmitLeadArgs> = {}): SubmitLeadArgs {
  const state = confirmedState();
  return {
    sessionId: '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60',
    state,
    estimate: buildPreliminaryEstimate(state, {
      scope_items: [{ label: 'Core application', tier: 'essential', complexity: 'standard' }],
      architecture: [],
      assumptions: [],
      exclusions: [],
      risks: [],
      confidence: 'medium',
    }),
    contact: {
      name: 'Asha Verma',
      email: 'asha@example.com',
      phone: '+919876543210',
      preferredContactMethod: 'whatsapp',
    },
    consentAt: '2026-08-21T10:01:00.000Z',
    transcriptSummary: 'Wants a tutor marketplace, web-first.',
    transcriptExcerpt: 'Visitor: hello\nBuddy: hi',
    humanReview: false,
    ...overrides,
  };
}

describe('backend config env vars', () => {
  afterEach(() => {
    delete process.env.BUDDY_VOICE_LEAD_URL;
    delete process.env.SUPABASE_VOICE_LEAD_URL;
    delete process.env.VOICE_AGENT_SECRET;
  });

  it('reads the function URL from BUDDY_VOICE_LEAD_URL', () => {
    process.env.BUDDY_VOICE_LEAD_URL = 'https://example.supabase.co/functions/v1/voice-lead';
    process.env.VOICE_AGENT_SECRET = 'x'.repeat(32);
    expect(loadBackendConfig()?.functionUrl).toBe('https://example.supabase.co/functions/v1/voice-lead');
  });

  it('ignores the reserved SUPABASE_-prefixed name entirely (no fallback)', () => {
    process.env.SUPABASE_VOICE_LEAD_URL = 'https://example.supabase.co/functions/v1/voice-lead';
    process.env.VOICE_AGENT_SECRET = 'x'.repeat(32);
    expect(loadBackendConfig()).toBeNull();
  });
});

describe('submit_lead payload mapping', () => {
  it('builds the wire shape voice-lead expects', () => {
    const payload = buildSubmitLeadPayload(args());
    expect(payload.action).toBe('submit_lead');
    expect(payload.user_confirmed).toBe(true);
    expect(payload.confirmed_at).toBe('2026-08-21T10:00:00.000Z');
    expect(payload.consent).toBe(true);
    expect(payload.selected_language).toBe('en'); // English-only voice flow
    const requirement = payload.requirement as { mode: string; intent: string; fields: Record<string, unknown> };
    expect(requirement.mode).toBe('new');
    expect(requirement.intent).toBe('new_project');
    expect(requirement.fields.business_goal).toBe('Tutor marketplace');
    expect(requirement.fields.assumptions).toEqual(['Client provides content']);
  });

  it('omits the transcript excerpt without consent', () => {
    const payload = buildSubmitLeadPayload(args());
    expect(payload.transcript_consent).toBe(false);
    expect(payload.transcript_excerpt).toBeUndefined();
    expect(payload.transcript_summary).toBeTruthy();
  });

  it('includes the excerpt only with consent', () => {
    const state = confirmedState(true);
    const payload = buildSubmitLeadPayload(args({ state }));
    expect(payload.transcript_consent).toBe(true);
    expect(payload.transcript_excerpt).toBe('Visitor: hello\nBuddy: hi');
  });

  it('never includes audio in any form', () => {
    const serialized = JSON.stringify(buildSubmitLeadPayload(args()));
    expect(serialized).not.toMatch(/audio|recording|wav|mp3|pcm/i);
  });

  it('refuses to build a payload without confirmation', () => {
    const state = confirmedState();
    state.confirmedAt = null;
    expect(() => buildSubmitLeadPayload(args({ state }))).toThrow(/confirmed/);
  });

  it('maps a human-review request', () => {
    const payload = buildSubmitLeadPayload(args({ humanReview: true, reviewMessage: 'check payments scope' }));
    expect(payload.human_review).toBe(true);
    expect(payload.review_message).toBe('check payments scope');
  });

  it('round-trips through the voice-lead validator', async () => {
    // The exact payload this worker produces must be accepted by the exact
    // validation code the Edge Function runs.
    const { validateVoiceSubmission } = await import(
      '../../supabase/functions/voice-lead/validation.ts'
    );
    const result = validateVoiceSubmission(buildSubmitLeadPayload(args()));
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });
});
