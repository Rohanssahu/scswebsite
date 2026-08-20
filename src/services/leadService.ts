// Typed lead-submission service. Every public form goes through here — the
// components never talk to Supabase directly. The Edge Function re-validates
// everything; this layer maps UI state to the wire payload and normalizes
// errors into safe, user-presentable shapes.

import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabaseClient';
import { normalizePhone } from '@/lib/leadValidation';
import type { AnalysisResult, AnswerMap } from '@/types/projectAnalysis';
import { estimatedWeeks, totalCost, totalHours } from '@/data/demoAnalysis';
import type {
  DemoEstimatePayload,
  LeadProjectMode,
  PreferredContactMethod,
  RequirementPayload,
  SubmitLeadRequest,
  SubmitLeadSuccess,
} from '@/types/leads';

export const ESTIMATE_VERSION = 'demo-v1';

/** Error safe to show to a visitor. `code` is machine-readable. */
export class LeadSubmissionError extends Error {
  constructor(
    public code:
      | 'not_configured'
      | 'network'
      | 'turnstile_failed'
      | 'rate_limited'
      | 'invalid_request'
      | 'server',
    message: string,
  ) {
    super(message);
    this.name = 'LeadSubmissionError';
  }
}

const trimOrUndefined = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

// --- payload builders (pure; unit-tested) ------------------------------------

export interface ContactInput {
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
}

export function buildContactRequest(
  input: ContactInput,
  turnstileToken: string,
  context: { route: string; language: string },
  honeypot = '',
): SubmitLeadRequest {
  return {
    action: 'contact',
    turnstileToken,
    consent: true,
    website: honeypot,
    lead: {
      name: input.name.trim(),
      email: input.email.trim(),
      company: trimOrUndefined(input.company),
      service: trimOrUndefined(input.service),
      project_summary: input.message.trim(),
      preferred_language: context.language,
    },
    context,
  };
}

export interface ConsultationInput {
  name: string;
  email: string;
  phone: string;
  company?: string;
  projectMode: LeadProjectMode;
  service: string;
  requirement: string;
  budgetRange: string;
  timeline: string;
  contactMethod: PreferredContactMethod;
}

export function buildConsultationRequest(
  input: ConsultationInput,
  turnstileToken: string,
  context: { route: string; language: string },
  honeypot = '',
): SubmitLeadRequest {
  return {
    action: 'consultation',
    turnstileToken,
    consent: true,
    website: honeypot,
    lead: {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: normalizePhone(input.phone) ?? input.phone.trim(),
      company: trimOrUndefined(input.company),
      service: input.service.trim(),
      project_mode: input.projectMode,
      project_summary: input.requirement.trim(),
      budget_range: input.budgetRange.trim(),
      timeline: input.timeline.trim(),
      preferred_contact_method: input.contactMethod,
      preferred_language: context.language,
    },
    context,
  };
}

/**
 * Map the browser-side demo AnalysisResult onto the whitelisted wire shape.
 * Only expected numeric fields are copied; totals are recomputed from the
 * role table (not trusted from stored state). Always marked demo/USD.
 */
export function buildDemoEstimatePayload(result: AnalysisResult): DemoEstimatePayload {
  const team = result.team
    .slice(0, 20)
    .map((r) => ({
      role: String(r.role).slice(0, 100),
      hours: clampNumber(r.hours, 0, 100000),
      hourly_rate: clampNumber(r.hourlyRate, 0, 2000),
    }));
  const safeResult: AnalysisResult = {
    ...result,
    team: team.map((t) => ({ role: t.role, hours: t.hours, hourlyRate: t.hourly_rate })),
  };
  const capacity = clampNumber(result.weeklyCapacityHours, 1, 168);
  return {
    status: 'demo',
    currency: 'USD',
    total_hours: clampNumber(totalHours(safeResult.team), 0, 100000),
    total_cost: clampNumber(totalCost(safeResult.team), 0, 10000000),
    weekly_capacity_hours: capacity,
    estimated_weeks: clampNumber(estimatedWeeks(safeResult.team, capacity), 0, 520),
    health_score: clampNumber(result.healthScore, 0, 100),
    risk_level: ['Low', 'Medium', 'High'].includes(result.riskLevel) ? result.riskLevel : undefined,
    team,
  };
}

function clampNumber(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, n));
}

/** Keep only string / string[] answers, matching server-side limits. */
export function buildAnswersPayload(answers: AnswerMap): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(answers).slice(0, 60)) {
    if (typeof value === 'string') {
      const v = value.trim().slice(0, 2000);
      if (v) out[key.slice(0, 64)] = v;
    } else if (Array.isArray(value)) {
      const items = value
        .filter((i): i is string => typeof i === 'string')
        .slice(0, 25)
        .map((i) => i.trim().slice(0, 300))
        .filter(Boolean);
      if (items.length) out[key.slice(0, 64)] = items;
    }
  }
  return out;
}

export interface RequirementInput {
  contact: { name: string; email: string; phone?: string };
  mode: LeadProjectMode;
  answers: AnswerMap;
  result: AnalysisResult;
  reviewMessage?: string;
}

export function buildRequirementPayload(input: RequirementInput, context: { route: string; language: string }): RequirementPayload {
  let answers = buildAnswersPayload(input.answers);
  if (Object.keys(answers).length === 0) {
    // Draft answers can be cleared after generating — fall back to the
    // generated summary so the server (which requires answers) accepts it.
    answers = { summary: input.result.requirementSummary.join('\n').slice(0, 2000) };
  }
  return {
    mode: input.mode,
    answers,
    requirement_summary: input.result.requirementSummary.join('\n').slice(0, 10000),
    demo_estimate: buildDemoEstimatePayload(input.result),
    estimate_version: ESTIMATE_VERSION,
    selected_language: context.language,
    current_route: context.route,
  };
}

export function buildRequirementRequest(
  input: RequirementInput,
  turnstileToken: string,
  context: { route: string; language: string },
  honeypot = '',
): SubmitLeadRequest {
  return {
    action: 'project_requirement',
    turnstileToken,
    consent: true,
    website: honeypot,
    lead: {
      name: input.contact.name.trim(),
      email: input.contact.email.trim(),
      phone: input.contact.phone ? (normalizePhone(input.contact.phone) ?? input.contact.phone.trim()) : undefined,
      project_mode: input.mode,
      preferred_language: context.language,
    },
    requirement: buildRequirementPayload(input, context),
    context,
  };
}

export function buildHumanReviewRequest(
  input: RequirementInput,
  turnstileToken: string,
  context: { route: string; language: string },
  honeypot = '',
): SubmitLeadRequest {
  const base = buildRequirementRequest(input, turnstileToken, context, honeypot);
  return {
    ...base,
    action: 'human_review',
    review: {
      reason: 'visitor_requested_review',
      visitor_message: trimOrUndefined(input.reviewMessage),
    },
  };
}

// --- transport ----------------------------------------------------------------

/**
 * Submit a lead through the `submit-lead` Edge Function.
 * Throws LeadSubmissionError with a safe, presentable message on failure.
 */
export async function submitLead(request: SubmitLeadRequest): Promise<SubmitLeadSuccess> {
  if (!isSupabaseConfigured) {
    throw new LeadSubmissionError('not_configured', 'Submissions are temporarily unavailable.');
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new LeadSubmissionError('not_configured', 'Submissions are temporarily unavailable.');
  }

  const { data, error } = await supabase.functions.invoke('submit-lead', { body: request });

  if (error) {
    // FunctionsHttpError carries the response; read the safe server message.
    const context = (error as { context?: Response }).context;
    let payload: { error?: string; message?: string } | null = null;
    if (context && typeof context.json === 'function') {
      try {
        payload = await context.json();
      } catch {
        payload = null;
      }
    }
    const code =
      payload?.error === 'turnstile_failed'
        ? 'turnstile_failed'
        : payload?.error === 'rate_limited'
          ? 'rate_limited'
          : payload?.error === 'invalid_request' || payload?.error === 'honeypot'
            ? 'invalid_request'
            : 'network';
    throw new LeadSubmissionError(code, payload?.message ?? 'Could not reach the submission service. Please try again.');
  }

  if (!data || data.ok !== true || typeof data.referenceCode !== 'string') {
    throw new LeadSubmissionError('server', 'Unexpected response from the submission service.');
  }
  return data as SubmitLeadSuccess;
}
