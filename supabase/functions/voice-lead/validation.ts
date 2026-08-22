// =============================================================================
// voice-lead — pure validation / normalization layer.
//
// Dependency-free and runtime-agnostic so the exact code the Edge Function
// runs is unit-tested by vitest from the repo root.
//
// The caller is the Buddy agent worker (server-to-server, shared-secret
// authenticated) — but this layer still treats every field as untrusted,
// because much of it originates from visitor speech and LLM output. The
// numeric estimate is fully RE-VALIDATED here: totals are recomputed from the
// per-role hours and rates, so model arithmetic can never reach the database.
// =============================================================================

import {
  SCOPE_COMPLEXITY_HOURS,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS as POLICY_WEEKLY_CAPACITY_HOURS,
  type PlanTierId,
  type ScopeComplexity,
  type ScopeTier,
} from '../_shared/estimationPolicy.ts';

export const VOICE_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 30 },
  company: { max: 150 },
  language: { max: 20 },
  summary: { max: 5000 },
  requirementSummary: { max: 10000 },
  transcriptSummary: { max: 2000 },
  transcriptExcerpt: { max: 8000 },
  reviewMessage: { max: 2000 },
  fieldValue: { max: 500 },
  listItem: { max: 200 },
  listItems: { max: 25 },
  moduleName: { max: 100 },
  modules: { max: 20 },
  teamRoles: { max: 12 },
  configVersion: { max: 40 },
} as const;

/** Server-side sanity bounds for the estimate — the voice-lead function's own
 * defense in depth, independent of the worker's engine config. */
export const ESTIMATE_BOUNDS = {
  // Pinned to the shared commercial policy: no client-facing rate may
  // exceed $5/hour, so nothing above it may be persisted either.
  minHourlyRate: STANDARD_HOURLY_RATE_USD,
  maxHourlyRate: STANDARD_HOURLY_RATE_USD,
  maxRoleHours: 2000,
  maxTotalHours: 10000,
  maxTotalCost: 1000000,
  maxWeeks: 260,
  minWeeklyCapacity: 10,
  maxWeeklyCapacity: POLICY_WEEKLY_CAPACITY_HOURS,
} as const;

export const VOICE_PROJECT_MODES = ['new', 'existing'] as const;
export const VOICE_INTENTS = ['new_project', 'improve_existing', 'repair_broken', 'consultation'] as const;
export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;
export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const ESTIMATE_ROLE_KEYS = ['frontend', 'backend', 'uiux', 'qa', 'devops', 'pm'] as const;
export type EstimateRoleKey = (typeof ESTIMATE_ROLE_KEYS)[number];

/** Requirement fields the voice agent may store — a strict whitelist. */
export const ALLOWED_REQUIREMENT_FIELDS = [
  'intent',
  'business_goal',
  'target_users',
  'platforms',
  'core_features',
  'optional_features',
  'admin_panel',
  'integrations',
  'authentication',
  'payments',
  'expected_scale',
  'design_status',
  'existing_assets',
  'preferred_technology',
  'deadline',
  'budget_range',
  'support_expectations',
  // existing-project extras
  'current_technology',
  'current_status',
  'main_problems',
  'error_symptoms',
  'repository_availability',
  'deployment_details',
  'urgency',
  'secure_upload_needed',
  // meta
  'assumptions',
  'contradictions',
  'risks',
  'suggested_features',
  'deferred_decisions',
] as const;

// --- helpers -----------------------------------------------------------------

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const asTrimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(email: string): boolean {
  return email.length <= VOICE_LIMITS.email.max && EMAIL_RE.test(email);
}

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned.slice(0, VOICE_LIMITS.phone.max);
}

const isIntIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

function cleanStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw.slice(0, maxItems)) {
    if (typeof item !== 'string') continue;
    const v = item.trim().slice(0, maxLen);
    if (v) out.push(v);
  }
  return out;
}

export type VoiceValidation<T> =
  | { ok: true; data: T }
  | { ok: false; error: 'invalid_request'; message: string };

const fail = <T>(message: string): VoiceValidation<T> => ({
  ok: false,
  error: 'invalid_request',
  message,
});

// --- requirement snapshot ------------------------------------------------------

export interface ValidatedVoiceRequirement {
  mode: (typeof VOICE_PROJECT_MODES)[number];
  intent: (typeof VOICE_INTENTS)[number];
  /** Whitelisted field → string | string[] map, ready for requirements.answers. */
  answers: Record<string, string | string[]>;
  requirement_summary: string;
}

export function sanitizeVoiceRequirement(raw: unknown): VoiceValidation<ValidatedVoiceRequirement> {
  if (!isDict(raw)) return fail('requirement must be an object');

  const mode = asTrimmed(raw.mode);
  if (!(VOICE_PROJECT_MODES as readonly string[]).includes(mode)) {
    return fail('requirement.mode must be "new" or "existing"');
  }
  const intent = asTrimmed(raw.intent);
  if (!(VOICE_INTENTS as readonly string[]).includes(intent)) {
    return fail('requirement.intent is invalid');
  }

  if (!isDict(raw.fields)) return fail('requirement.fields must be an object');
  const answers: Record<string, string | string[]> = {};
  for (const key of Object.keys(raw.fields)) {
    // Whitelist: silently drop unknown keys — the model must never mint new
    // database fields, and dropping (vs failing) keeps hostile output inert.
    if (!(ALLOWED_REQUIREMENT_FIELDS as readonly string[]).includes(key)) continue;
    const value = raw.fields[key];
    if (typeof value === 'string') {
      const v = value.trim().slice(0, VOICE_LIMITS.fieldValue.max);
      if (v) answers[key] = v;
    } else if (Array.isArray(value)) {
      const items = cleanStringList(value, VOICE_LIMITS.listItems.max, VOICE_LIMITS.listItem.max);
      if (items.length) answers[key] = items;
    }
    // Any other type is dropped.
  }
  if (Object.keys(answers).length === 0) {
    return fail('requirement.fields contained no valid data');
  }

  const summary = asTrimmed(raw.summary).slice(0, VOICE_LIMITS.requirementSummary.max);
  if (!summary) return fail('requirement.summary is required');

  return { ok: true, data: { mode: mode as 'new' | 'existing', intent: intent as ValidatedVoiceRequirement['intent'], answers, requirement_summary: summary } };
}

// --- preliminary estimate --------------------------------------------------------

export interface RoleHours {
  min: number;
  max: number;
}

export interface ValidatedVoiceEstimate {
  config_version: string;
  currency: 'USD';
  hourly_rate_min: number;
  hourly_rate_max: number;
  weekly_capacity_hours: number;
  role_hours: Record<EstimateRoleKey, RoleHours>;
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
  confidence: (typeof CONFIDENCE_LEVELS)[number];
  /** Budget-fit snapshot: included/deferred scope and the optional tiers.
   * `null` when the worker sent none, or sent one that failed re-validation. */
  budget_plan: SanitizedBudgetPlan | null;
}

/**
 * Validate the estimate AND recompute every total deterministically. The
 * caller's totals are compared against the recomputation — any mismatch
 * (model arithmetic, tampering, drift) rejects the whole payload.
 */
export function sanitizeVoiceEstimate(raw: unknown): VoiceValidation<ValidatedVoiceEstimate> {
  if (!isDict(raw)) return fail('estimate must be an object');
  const B = ESTIMATE_BOUNDS;

  const configVersion = asTrimmed(raw.config_version).slice(0, VOICE_LIMITS.configVersion.max);
  if (!configVersion) return fail('estimate.config_version is required');

  if (raw.currency !== 'USD') return fail('estimate.currency must be USD');

  if (!isIntIn(raw.hourly_rate_min, B.minHourlyRate, B.maxHourlyRate)) {
    return fail('estimate.hourly_rate_min out of allowed range');
  }
  if (!isIntIn(raw.hourly_rate_max, B.minHourlyRate, B.maxHourlyRate)) {
    return fail('estimate.hourly_rate_max out of allowed range');
  }
  if ((raw.hourly_rate_min as number) > (raw.hourly_rate_max as number)) {
    return fail('estimate hourly rates are inverted');
  }

  if (!isIntIn(raw.weekly_capacity_hours, B.minWeeklyCapacity, B.maxWeeklyCapacity)) {
    return fail('estimate.weekly_capacity_hours out of allowed range');
  }

  if (!isDict(raw.role_hours)) return fail('estimate.role_hours must be an object');
  const roleHours = {} as Record<EstimateRoleKey, RoleHours>;
  for (const key of Object.keys(raw.role_hours)) {
    if (!(ESTIMATE_ROLE_KEYS as readonly string[]).includes(key)) {
      return fail(`estimate.role_hours has unknown role "${key}"`);
    }
  }
  for (const key of ESTIMATE_ROLE_KEYS) {
    const entry = (raw.role_hours as Dict)[key];
    if (!isDict(entry)) return fail(`estimate.role_hours.${key} is missing`);
    if (!isIntIn(entry.min, 0, B.maxRoleHours) || !isIntIn(entry.max, 0, B.maxRoleHours)) {
      return fail(`estimate.role_hours.${key} out of allowed range`);
    }
    if ((entry.min as number) > (entry.max as number)) {
      return fail(`estimate.role_hours.${key} range is inverted`);
    }
    roleHours[key] = { min: entry.min as number, max: entry.max as number };
  }

  // Deterministic recomputation — the only arithmetic that counts.
  const hoursMin = ESTIMATE_ROLE_KEYS.reduce((s, k) => s + roleHours[k].min, 0);
  const hoursMax = ESTIMATE_ROLE_KEYS.reduce((s, k) => s + roleHours[k].max, 0);
  if (hoursMax === 0) return fail('estimate has zero total hours');
  if (hoursMin > B.maxTotalHours || hoursMax > B.maxTotalHours) {
    return fail('estimate total hours exceed the allowed maximum');
  }
  const costMin = hoursMin * (raw.hourly_rate_min as number);
  const costMax = hoursMax * (raw.hourly_rate_max as number);
  if (costMax > B.maxTotalCost) return fail('estimate total cost exceeds the allowed maximum');
  const capacity = raw.weekly_capacity_hours as number;
  const weeksMin = Math.max(1, Math.ceil(hoursMin / capacity));
  const weeksMax = Math.max(1, Math.ceil(hoursMax / capacity));
  if (weeksMax > B.maxWeeks) return fail('estimate duration exceeds the allowed maximum');

  if (raw.total_hours_min !== hoursMin || raw.total_hours_max !== hoursMax) {
    return fail('estimate total hours do not match the role breakdown');
  }
  if (raw.total_cost_min !== costMin || raw.total_cost_max !== costMax) {
    return fail('estimate totals do not match the deterministic calculation');
  }
  if (raw.duration_weeks_min !== weeksMin || raw.duration_weeks_max !== weeksMax) {
    return fail('estimate duration does not match the deterministic calculation');
  }

  const modules: ValidatedVoiceEstimate['modules'] = [];
  if (!Array.isArray(raw.modules) || raw.modules.length === 0 || raw.modules.length > VOICE_LIMITS.modules.max) {
    return fail('estimate.modules must have 1–20 entries');
  }
  for (const m of raw.modules) {
    if (!isDict(m)) return fail('estimate.modules has an invalid entry');
    const name = asTrimmed(m.name).slice(0, VOICE_LIMITS.moduleName.max);
    if (!name) return fail('estimate.modules has an unnamed entry');
    if (!isIntIn(m.hours_min, 0, B.maxRoleHours) || !isIntIn(m.hours_max, 0, B.maxRoleHours)) {
      return fail(`estimate module "${name}" hours out of range`);
    }
    if ((m.hours_min as number) > (m.hours_max as number)) {
      return fail(`estimate module "${name}" hours range is inverted`);
    }
    modules.push({ name, hours_min: m.hours_min as number, hours_max: m.hours_max as number });
  }

  const confidence = asTrimmed(raw.confidence);
  if (!(CONFIDENCE_LEVELS as readonly string[]).includes(confidence)) {
    return fail('estimate.confidence is invalid');
  }

  return {
    ok: true,
    data: {
      config_version: configVersion,
      currency: 'USD',
      hourly_rate_min: raw.hourly_rate_min as number,
      hourly_rate_max: raw.hourly_rate_max as number,
      weekly_capacity_hours: capacity,
      role_hours: roleHours,
      modules,
      architecture: cleanStringList(raw.architecture, VOICE_LIMITS.listItems.max, VOICE_LIMITS.listItem.max),
      team_roles: cleanStringList(raw.team_roles, VOICE_LIMITS.teamRoles.max, VOICE_LIMITS.listItem.max),
      assumptions: cleanStringList(raw.assumptions, VOICE_LIMITS.listItems.max, VOICE_LIMITS.listItem.max),
      exclusions: cleanStringList(raw.exclusions, VOICE_LIMITS.listItems.max, VOICE_LIMITS.listItem.max),
      risks: cleanStringList(raw.risks, VOICE_LIMITS.listItems.max, VOICE_LIMITS.listItem.max),
      total_hours_min: hoursMin,
      total_hours_max: hoursMax,
      total_cost_min: costMin,
      total_cost_max: costMax,
      duration_weeks_min: weeksMin,
      duration_weeks_max: weeksMax,
      confidence: confidence as 'low' | 'medium' | 'high',
      budget_plan: sanitizeBudgetPlan(raw.budget_plan),
    },
  };
}

// --- full submit_lead action -------------------------------------------------------

export interface ValidatedVoiceSubmission {
  session_id: string;
  lead: {
    lead_type: 'project_requirement' | 'human_review';
    source: string;
    name: string;
    email: string;
    phone: string;
    company: string | null;
    preferred_language: string | null;
    preferred_contact_method: (typeof CONTACT_METHODS)[number];
    service: string;
    project_mode: 'new' | 'existing';
    project_summary: string | null;
    budget_range: string | null;
    timeline: string | null;
    human_review_requested: boolean;
    metadata: Record<string, unknown>;
  };
  requirement: {
    mode: 'new' | 'existing';
    answers: Record<string, string | string[]>;
    requirement_summary: string;
    demo_estimate: Record<string, unknown>;
    estimate_version: string;
    selected_language: string | null;
    current_route: string;
  };
  estimate: ValidatedVoiceEstimate;
  review: { reason: string; visitor_message: string | null } | null;
  transcript_consent: boolean;
}

/**
 * Validate the agent worker's submit_lead payload end to end.
 *
 * Confirmation requirement: `user_confirmed` must be exactly true AND a
 * non-empty `confirmed_at` ISO timestamp must be present — the worker records
 * these only after the visitor verbally confirms the summary and estimate.
 */
export function validateVoiceSubmission(body: unknown): VoiceValidation<ValidatedVoiceSubmission> {
  if (!isDict(body)) return fail('Request body must be a JSON object.');

  if (!isUuid(body.session_id)) return fail('session_id must be a UUID.');

  if (body.user_confirmed !== true) {
    return fail('The visitor has not confirmed the summary and estimate.');
  }
  const confirmedAt = asTrimmed(body.confirmed_at);
  if (!confirmedAt || Number.isNaN(Date.parse(confirmedAt))) {
    return fail('confirmed_at must be a valid timestamp.');
  }
  if (body.consent !== true) return fail('Contact consent is required.');
  const consentAt = asTrimmed(body.consent_at);
  if (!consentAt || Number.isNaN(Date.parse(consentAt))) {
    return fail('consent_at must be a valid timestamp.');
  }

  if (!isDict(body.contact)) return fail('Missing contact details.');
  const name = asTrimmed(body.contact.name);
  if (name.length < VOICE_LIMITS.name.min || name.length > VOICE_LIMITS.name.max) {
    return fail('Name must be 2–100 characters.');
  }
  const email = asTrimmed(body.contact.email).toLowerCase();
  if (!isValidEmail(email)) return fail('A valid email address is required.');
  const phone = normalizePhone(asTrimmed(body.contact.phone));
  if (!phone) return fail('A valid phone number is required.');
  const company = asTrimmed(body.contact.company).slice(0, VOICE_LIMITS.company.max) || null;
  const method = asTrimmed(body.contact.preferred_contact_method);
  if (!(CONTACT_METHODS as readonly string[]).includes(method)) {
    return fail('Invalid preferred contact method.');
  }

  const requirementResult = sanitizeVoiceRequirement(body.requirement);
  if (!requirementResult.ok) return fail(requirementResult.message);
  const requirement = requirementResult.data;

  const estimateResult = sanitizeVoiceEstimate(body.estimate);
  if (!estimateResult.ok) return fail(estimateResult.message);
  const estimate = estimateResult.data;

  const language = asTrimmed(body.selected_language).slice(0, VOICE_LIMITS.language.max) || null;

  // Transcript privacy: the concise summary is always stored; the longer
  // excerpt is stored ONLY with explicit consent. Raw audio is never accepted
  // anywhere in this schema.
  const transcriptConsent = body.transcript_consent === true;
  const transcriptSummary = asTrimmed(body.transcript_summary).slice(0, VOICE_LIMITS.transcriptSummary.max);
  if (!transcriptSummary) return fail('transcript_summary is required.');
  const answers: Record<string, string | string[]> = { ...requirement.answers };
  answers.transcript_summary = transcriptSummary;
  if (transcriptConsent) {
    const excerpt = asTrimmed(body.transcript_excerpt).slice(0, VOICE_LIMITS.transcriptExcerpt.max);
    if (excerpt) answers.transcript_excerpt = excerpt;
  }

  // Human review — visitor-safe fields only.
  let review: ValidatedVoiceSubmission['review'] = null;
  const wantsReview = body.human_review === true;
  if (wantsReview) {
    const message = asTrimmed(body.review_message).slice(0, VOICE_LIMITS.reviewMessage.max) || null;
    review = { reason: 'visitor_requested_review', visitor_message: message };
  } else if (body.review_message !== undefined) {
    return fail('Unexpected review message.');
  }

  const budget = typeof answers.budget_range === 'string' ? answers.budget_range.slice(0, 100) : null;
  const deadline = typeof answers.deadline === 'string' ? answers.deadline.slice(0, 100) : null;
  const serviceByIntent: Record<string, string> = {
    new_project: 'Voice Consultation — New Project',
    improve_existing: 'Voice Consultation — Improve Existing',
    repair_broken: 'Voice Consultation — Project Rescue',
    consultation: 'Voice Consultation — General',
  };

  return {
    ok: true,
    data: {
      session_id: body.session_id as string,
      lead: {
        lead_type: wantsReview ? 'human_review' : 'project_requirement',
        source: 'buddy-voice',
        name,
        email,
        phone,
        company,
        preferred_language: language,
        preferred_contact_method: method as 'email' | 'phone' | 'whatsapp',
        service: serviceByIntent[requirement.intent],
        project_mode: requirement.mode,
        project_summary: transcriptSummary || null,
        budget_range: budget,
        timeline: deadline,
        human_review_requested: wantsReview,
        metadata: {
          consent: true,
          consent_at: consentAt,
          confirmed_at: confirmedAt,
          transcript_consent: transcriptConsent,
          channel: 'voice',
          submitted_language: language,
        },
      },
      requirement: {
        mode: requirement.mode,
        answers,
        requirement_summary: requirement.requirement_summary,
        // Stored alongside the legacy demo_estimate column for continuity;
        // the canonical copy lives in preliminary_estimates.
        demo_estimate: {
          status: 'preliminary',
          currency: 'USD',
          total_hours: estimate.total_hours_max,
          total_cost: estimate.total_cost_max,
          weekly_capacity_hours: estimate.weekly_capacity_hours,
          estimated_weeks: estimate.duration_weeks_max,
          team: [{ role: 'Blended (see preliminary_estimates)', hours: estimate.total_hours_max, hourly_rate: estimate.hourly_rate_max }],
        },
        estimate_version: `voice-${estimate.config_version}`,
        selected_language: language,
        current_route: 'buddy-voice',
      },
      estimate,
      review,
      transcript_consent: transcriptConsent,
    },
  };
}

// --- session events ------------------------------------------------------------------

export const SESSION_EVENT_TYPES = [
  'session_started',
  'session_ended',
  'language_selected',
  'state_updated',
  'estimate_generated',
  'estimate_rejected',
  'confirmation_requested',
  'lead_submitted',
  'review_requested',
  'guard_triggered',
  'provider_timeout',
  'provider_error',
  'idle_timeout',
  'turn_limit_reached',
  'duration_limit_reached',
  'usage',
  'error',
] as const;

export const SESSION_STATUSES = ['active', 'completed', 'abandoned', 'expired', 'error'] as const;

export interface ValidatedSessionEvent {
  session_id: string;
  event_type: (typeof SESSION_EVENT_TYPES)[number];
  data: Record<string, string | number | boolean>;
}

/**
 * Privacy-safe event data: only primitive values, short strings, ≤ 20 keys.
 * Prompt content, transcripts and contact details never fit this shape by
 * construction (long strings are truncated to 120 chars and keys whitelisted
 * by pattern).
 */
export function validateSessionEvent(body: unknown): VoiceValidation<ValidatedSessionEvent> {
  if (!isDict(body)) return fail('Request body must be a JSON object.');
  if (!isUuid(body.session_id)) return fail('session_id must be a UUID.');
  const eventType = asTrimmed(body.event_type);
  if (!(SESSION_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return fail('Unknown event type.');
  }
  const data: Record<string, string | number | boolean> = {};
  if (isDict(body.data)) {
    for (const key of Object.keys(body.data).slice(0, 20)) {
      if (!/^[a-z0-9_]{1,40}$/.test(key)) continue;
      const value = body.data[key];
      if (typeof value === 'number' && Number.isFinite(value)) data[key] = value;
      else if (typeof value === 'boolean') data[key] = value;
      else if (typeof value === 'string') data[key] = value.slice(0, 120);
    }
  }
  return {
    ok: true,
    data: { session_id: body.session_id as string, event_type: eventType as ValidatedSessionEvent['event_type'], data },
  };
}

export interface ValidatedSessionStatus {
  session_id: string;
  status: (typeof SESSION_STATUSES)[number];
  disconnect_reason: string | null;
  turn_count: number | null;
  selected_language: string | null;
  started: boolean;
  ended: boolean;
}

export function validateSessionStatus(body: unknown): VoiceValidation<ValidatedSessionStatus> {
  if (!isDict(body)) return fail('Request body must be a JSON object.');
  if (!isUuid(body.session_id)) return fail('session_id must be a UUID.');
  const status = asTrimmed(body.status);
  if (!(SESSION_STATUSES as readonly string[]).includes(status)) return fail('Unknown status.');
  const reason = asTrimmed(body.disconnect_reason).slice(0, 200) || null;
  const language = asTrimmed(body.selected_language).slice(0, VOICE_LIMITS.language.max) || null;
  let turnCount: number | null = null;
  if (body.turn_count !== undefined) {
    if (!isIntIn(body.turn_count, 0, 100000)) return fail('turn_count out of range.');
    turnCount = body.turn_count as number;
  }
  return {
    ok: true,
    data: {
      session_id: body.session_id as string,
      status: status as ValidatedSessionStatus['status'],
      disconnect_reason: reason,
      turn_count: turnCount,
      selected_language: language,
      started: body.started === true,
      ended: body.ended === true,
    },
  };
}

// --- budget-fit plan (Phase 8 snapshot) --------------------------------------
//
// The worker sends the plan it computed; this function re-derives every figure
// from the shared policy rather than trusting any of them. The rate is pinned,
// tier costs are recomputed from hours, the base option must fit the client's
// own budget and the optional tiers must stay inside +20% / +30%. A snapshot
// that fails any check is dropped (null) — the lead is still stored, just
// without an unverifiable plan.

const COVERAGE_BANDS = ['full', 'high-partial', 'low-partial', 'below-mvp', 'unknown'] as const;
const PLAN_TIER_IDS = ['base', 'recommended', 'growth'] as const;
const SCOPE_TIERS = ['essential', 'important', 'optional', 'unclear'] as const;
const SCOPE_COMPLEXITIES = ['simple', 'standard', 'complex'] as const;

export interface SanitizedScopeItem {
  label: string;
  tier: ScopeTier;
  complexity: ScopeComplexity;
  hours: number;
}

export interface SanitizedPlanTier {
  hours: number;
  cost_usd: number;
  weeks: number;
  budget_ceiling_usd: number;
  percent_above_budget: number;
  included_scope: SanitizedScopeItem[];
  deferred_scope: SanitizedScopeItem[];
  added_vs_base: SanitizedScopeItem[];
}

export interface SanitizedBudgetPlan {
  policy_version: string;
  estimate_version: string;
  revision: number;
  currency: 'USD';
  selected_budget_usd: number;
  budget_provided: boolean;
  hourly_rate_usd: number;
  weekly_capacity_hours: number;
  available_hours: number;
  budget_fit_percent: number;
  coverage_band: string;
  covers_essential_scope: boolean;
  total_requested_hours: number;
  total_requested_cost_usd: number;
  included_scope: SanitizedScopeItem[];
  deferred_scope: SanitizedScopeItem[];
  unclear_scope: SanitizedScopeItem[];
  base_estimate: SanitizedPlanTier;
  optional_20_percent_estimate: SanitizedPlanTier | null;
  optional_30_percent_estimate: SanitizedPlanTier | null;
  client_selected_option: PlanTierId | null;
  assumptions: string[];
  provider: string | null;
  model: string | null;
  human_review_required: true;
}

const MAX_PLAN_SCOPE_ITEMS = 60;
const MAX_PLAN_LABEL = 200;

function planScopeList(raw: unknown): SanitizedScopeItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SanitizedScopeItem[] = [];
  for (const entry of raw) {
    if (out.length >= MAX_PLAN_SCOPE_ITEMS) break;
    if (!isDict(entry)) continue;
    const label = asTrimmed(entry.label).slice(0, MAX_PLAN_LABEL);
    if (!label) continue;
    const tier = (SCOPE_TIERS as readonly string[]).includes(entry.tier as string)
      ? (entry.tier as ScopeTier)
      : 'unclear';
    const complexity = (SCOPE_COMPLEXITIES as readonly string[]).includes(entry.complexity as string)
      ? (entry.complexity as ScopeComplexity)
      : 'standard';
    // Hours come from the policy table, never from the payload.
    out.push({ label, tier, complexity, hours: SCOPE_COMPLEXITY_HOURS[complexity] });
  }
  return out;
}

function planTier(raw: unknown, budgetUsd: number, maxPercent: number): SanitizedPlanTier | null {
  if (!isDict(raw)) return null;
  if (!isIntIn(raw.hours, 0, 100000)) return null;
  if (!isIntIn(raw.weeks, 0, 520)) return null;
  if (!isIntIn(raw.percent_above_budget, 0, maxPercent)) return null;
  const hours = raw.hours as number;
  const cost = hours * STANDARD_HOURLY_RATE_USD;
  const ceiling = Math.floor((budgetUsd * (100 + (raw.percent_above_budget as number))) / 100);
  if (cost > ceiling) return null;
  return {
    hours,
    cost_usd: cost,
    weeks: raw.weeks as number,
    budget_ceiling_usd: ceiling,
    percent_above_budget: raw.percent_above_budget as number,
    included_scope: planScopeList(raw.included_scope),
    deferred_scope: planScopeList(raw.deferred_scope),
    added_vs_base: planScopeList(raw.added_vs_base),
  };
}

export function sanitizeBudgetPlan(raw: unknown): SanitizedBudgetPlan | null {
  if (!isDict(raw)) return null;
  if (raw.currency !== 'USD') return null;
  if (raw.hourly_rate_usd !== STANDARD_HOURLY_RATE_USD) return null;
  if (!isIntIn(raw.selected_budget_usd, 0, 10000000)) return null;
  if (!isIntIn(raw.available_hours, 0, 100000)) return null;
  if (!isIntIn(raw.budget_fit_percent, 0, 100)) return null;
  if (!isIntIn(raw.total_requested_hours, 0, 100000)) return null;
  if (!isIntIn(raw.weekly_capacity_hours, 1, POLICY_WEEKLY_CAPACITY_HOURS)) return null;
  if (!isIntIn(raw.revision, 1, 100000)) return null;
  if (typeof raw.budget_provided !== 'boolean' || typeof raw.covers_essential_scope !== 'boolean') return null;
  if (!(COVERAGE_BANDS as readonly string[]).includes(raw.coverage_band as string)) return null;

  const budget = raw.selected_budget_usd as number;
  const base = planTier(raw.base_estimate, budget, 0);
  if (!base) return null;
  const recommended = raw.optional_20_percent_estimate == null ? null : planTier(raw.optional_20_percent_estimate, budget, 20);
  const growth = raw.optional_30_percent_estimate == null ? null : planTier(raw.optional_30_percent_estimate, budget, 30);
  if (raw.optional_20_percent_estimate != null && !recommended) return null;
  if (raw.optional_30_percent_estimate != null && !growth) return null;

  return {
    policy_version: asTrimmed(raw.policy_version).slice(0, 40) || 'unknown',
    estimate_version: asTrimmed(raw.estimate_version).slice(0, 40) || 'unknown',
    revision: raw.revision as number,
    currency: 'USD',
    selected_budget_usd: budget,
    budget_provided: raw.budget_provided as boolean,
    hourly_rate_usd: STANDARD_HOURLY_RATE_USD,
    weekly_capacity_hours: raw.weekly_capacity_hours as number,
    available_hours: raw.available_hours as number,
    budget_fit_percent: raw.budget_fit_percent as number,
    coverage_band: raw.coverage_band as string,
    covers_essential_scope: raw.covers_essential_scope as boolean,
    total_requested_hours: raw.total_requested_hours as number,
    total_requested_cost_usd: (raw.total_requested_hours as number) * STANDARD_HOURLY_RATE_USD,
    included_scope: planScopeList(raw.included_scope),
    deferred_scope: planScopeList(raw.deferred_scope),
    unclear_scope: planScopeList(raw.unclear_scope),
    base_estimate: base,
    optional_20_percent_estimate: recommended,
    optional_30_percent_estimate: growth,
    client_selected_option: (PLAN_TIER_IDS as readonly string[]).includes(raw.client_selected_option as string)
      ? (raw.client_selected_option as PlanTierId)
      : null,
    assumptions: cleanStringList(raw.assumptions, 25, 300),
    provider: asTrimmed(raw.provider).slice(0, 60) || null,
    model: asTrimmed(raw.model).slice(0, 60) || null,
    human_review_required: true,
  };
}
