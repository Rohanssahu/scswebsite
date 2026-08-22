// =============================================================================
// consultation-agent — pure validation / normalization layer.
//
// Dependency-free and runtime-agnostic so the exact code the Edge Function
// runs is unit-tested by vitest from the repo root.
//
// The caller is the Buddy agent worker (server-to-server, shared-secret
// authenticated) — but this layer still treats every field as untrusted,
// because much of it originates from client speech and LLM output. Proposal
// numbers are fully RE-VALIDATED here: totals are recomputed from per-role
// hours and rates, so model arithmetic can never reach the database.
// =============================================================================

import {
  SCOPE_COMPLEXITY_HOURS,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS as POLICY_WEEKLY_CAPACITY_HOURS,
  type PlanTierId,
  type ScopeComplexity,
  type ScopeTier,
} from '../_shared/estimationPolicy.ts';

export const MEETING_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 30 },
  company: { max: 150 },
  language: { max: 20 },
  requirementSummary: { max: 10000 },
  reviewMessage: { max: 2000 },
  fieldValue: { max: 500 },
  listItem: { max: 200 },
  listItems: { max: 25 },
  moduleName: { max: 100 },
  modules: { max: 20 },
  configVersion: { max: 40 },
  messageContent: { max: 4000 },
  proposalText: { max: 2000 },
  milestones: { max: 12 },
} as const;

/** Server-side sanity bounds — defense in depth, independent of the worker's
 * engine config (mirrors voice-lead's ESTIMATE_BOUNDS). */
export const PROPOSAL_BOUNDS = {
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

export const MEETING_INTENTS = ['new_project', 'improve_existing', 'repair_broken', 'consultation'] as const;
export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;
export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const PROPOSAL_ROLE_KEYS = ['frontend', 'backend', 'uiux', 'qa', 'devops', 'pm'] as const;
export type ProposalRoleKey = (typeof PROPOSAL_ROLE_KEYS)[number];

export const MEETING_LANGUAGES = ['en', 'hi', 'hinglish', 'mr', 'ur', 'ar'] as const;

/** Requirement fields the consultation agent may store — a strict whitelist.
 * Superset of voice-lead's ALLOWED_REQUIREMENT_FIELDS plus the consultation-
 * specific fields (roles, compliance, engagement model, …). */
export const ALLOWED_MEETING_FIELDS = [
  'intent',
  'business_goal',
  'target_users',
  'target_countries',
  'platforms',
  'core_features',
  'optional_features',
  'user_roles',
  'admin_panel',
  'integrations',
  'authentication',
  'payments',
  'notifications',
  'expected_scale',
  'design_status',
  'design_figma_availability',
  'existing_assets',
  'preferred_technology',
  'deadline',
  'budget_range',
  'support_expectations',
  'engagement_model',
  'developer_preference',
  'weekly_capacity_preference',
  'security_compliance',
  // existing-project extras
  'current_technology',
  'current_status',
  'main_problems',
  'error_symptoms',
  'repository_availability',
  'api_documentation',
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

export const MEETING_EVENT_TYPES = [
  'agent_joined',
  'greeting_spoken',
  'language_selected',
  'state_updated',
  'proposal_generated',
  'proposal_rejected',
  'confirmation_requested',
  'duplicate_finalize_blocked',
  'review_requested',
  'reconnected',
  'guard_triggered',
  'provider_timeout',
  'provider_error',
  'idle_timeout',
  'turn_limit_reached',
  'duration_limit_reached',
  'session_ended',
  'usage',
  'error',
] as const;

export const MEETING_STATUSES = ['in_progress', 'completed', 'error'] as const;

// --- helpers -----------------------------------------------------------------

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const asTrimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(email: string): boolean {
  return email.length <= MEETING_LIMITS.email.max && EMAIL_RE.test(email);
}

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned.slice(0, MEETING_LIMITS.phone.max);
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

export type MeetingValidation<T> = { ok: true; data: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

// --- requirements -------------------------------------------------------------

export type SanitizedAnswers = Record<string, string | string[]>;

/** Whitelist + size-cap the structured requirement fields. Unknown keys are
 * silently dropped (same posture as voice-lead). */
export function sanitizeMeetingRequirements(raw: unknown): SanitizedAnswers {
  if (!isDict(raw)) return {};
  const out: SanitizedAnswers = {};
  for (const key of ALLOWED_MEETING_FIELDS) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const v = value.trim().slice(0, MEETING_LIMITS.fieldValue.max);
      if (v) out[key] = v;
    } else if (Array.isArray(value)) {
      const list = cleanStringList(value, MEETING_LIMITS.listItems.max, MEETING_LIMITS.listItem.max);
      if (list.length) out[key] = list;
    }
  }
  return out;
}

export interface ValidatedStateSave {
  meetingId: string;
  answers: SanitizedAnswers;
  summary: string | null;
  language: string | null;
  /** undefined = leave the stored consent untouched. */
  transcriptConsent: boolean | undefined;
}

export function validateSaveState(body: Dict): MeetingValidation<ValidatedStateSave> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');
  const answers = sanitizeMeetingRequirements(body.fields);
  const summary = asTrimmed(body.summary).slice(0, MEETING_LIMITS.requirementSummary.max) || null;
  const langRaw = asTrimmed(body.selected_language).toLowerCase();
  const language = (MEETING_LANGUAGES as readonly string[]).includes(langRaw) ? langRaw : null;
  const transcriptConsent = typeof body.transcript_consent === 'boolean' ? body.transcript_consent : undefined;
  return { ok: true, data: { meetingId: body.meeting_id, answers, summary, language, transcriptConsent } };
}

// --- messages -------------------------------------------------------------------

export interface ValidatedMessage {
  meetingId: string;
  sender: 'client' | 'buddy' | 'system';
  content: string;
}

export function validateSaveMessage(body: Dict): MeetingValidation<ValidatedMessage> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');
  const sender = body.sender === 'client' || body.sender === 'buddy' || body.sender === 'system' ? body.sender : null;
  if (!sender) return fail('sender is invalid');
  const content = asTrimmed(body.content).slice(0, MEETING_LIMITS.messageContent.max);
  if (!content) return fail('content is required');
  return { ok: true, data: { meetingId: body.meeting_id, sender, content } };
}

// --- proposal --------------------------------------------------------------------

export interface RoleHours {
  min: number;
  max: number;
}

export interface ValidatedProposal {
  config_version: string;
  currency: 'USD';
  weekly_capacity_hours: number;
  total_hours_min: number;
  total_hours_max: number;
  total_cost_min: number;
  total_cost_max: number;
  duration_weeks_min: number;
  duration_weeks_max: number;
  confidence: 'low' | 'medium' | 'high';
  content: {
    summary: string;
    recommended_solution: string[];
    architecture: string[];
    technology_stack: string[];
    in_scope: string[];
    out_of_scope: string[];
    ai_roles: string[];
    human_roles: string[];
    milestones: Array<{ title: string; weeks: string }>;
    assumptions: string[];
    dependencies: string[];
    risks: string[];
    modules: Array<{ name: string; hours_min: number; hours_max: number }>;
    role_hours: Record<ProposalRoleKey, RoleHours>;
    hourly_rate_min: number;
    hourly_rate_max: number;
  };
  /** Budget-fit snapshot: included/deferred scope and the optional tiers.
   * `null` when the worker sent none, or sent one that failed re-validation. */
  budget_plan: SanitizedBudgetPlan | null;
}

/**
 * Validate one proposal payload. Every total is recomputed from role_hours
 * and rates; a mismatch rejects the whole payload — model arithmetic never
 * reaches the database.
 */
export function sanitizeProposal(raw: unknown): MeetingValidation<ValidatedProposal> {
  if (!isDict(raw)) return fail('proposal must be an object');
  const B = PROPOSAL_BOUNDS;

  const configVersion = asTrimmed(raw.config_version).slice(0, MEETING_LIMITS.configVersion.max);
  if (!configVersion) return fail('proposal.config_version is required');
  if (raw.currency !== 'USD') return fail('proposal.currency must be USD');

  if (!isIntIn(raw.hourly_rate_min, B.minHourlyRate, B.maxHourlyRate)) {
    return fail('proposal.hourly_rate_min out of allowed range');
  }
  if (!isIntIn(raw.hourly_rate_max, B.minHourlyRate, B.maxHourlyRate)) {
    return fail('proposal.hourly_rate_max out of allowed range');
  }
  if ((raw.hourly_rate_min as number) > (raw.hourly_rate_max as number)) {
    return fail('proposal hourly rates are inverted');
  }
  if (!isIntIn(raw.weekly_capacity_hours, B.minWeeklyCapacity, B.maxWeeklyCapacity)) {
    return fail('proposal.weekly_capacity_hours out of allowed range');
  }

  if (!isDict(raw.role_hours)) return fail('proposal.role_hours must be an object');
  const roleHours = {} as Record<ProposalRoleKey, RoleHours>;
  for (const key of Object.keys(raw.role_hours)) {
    if (!(PROPOSAL_ROLE_KEYS as readonly string[]).includes(key)) {
      return fail(`proposal.role_hours has unknown role "${key}"`);
    }
  }
  for (const key of PROPOSAL_ROLE_KEYS) {
    const entry = (raw.role_hours as Dict)[key];
    if (!isDict(entry)) return fail(`proposal.role_hours.${key} is missing`);
    if (!isIntIn(entry.min, 0, B.maxRoleHours) || !isIntIn(entry.max, 0, B.maxRoleHours)) {
      return fail(`proposal.role_hours.${key} out of allowed range`);
    }
    if ((entry.min as number) > (entry.max as number)) {
      return fail(`proposal.role_hours.${key} range is inverted`);
    }
    roleHours[key] = { min: entry.min as number, max: entry.max as number };
  }

  // Deterministic recomputation — the only arithmetic that counts.
  const hoursMin = PROPOSAL_ROLE_KEYS.reduce((s, k) => s + roleHours[k].min, 0);
  const hoursMax = PROPOSAL_ROLE_KEYS.reduce((s, k) => s + roleHours[k].max, 0);
  if (hoursMax === 0) return fail('proposal has zero total hours');
  if (hoursMin > B.maxTotalHours || hoursMax > B.maxTotalHours) {
    return fail('proposal total hours exceed the allowed maximum');
  }
  const costMin = hoursMin * (raw.hourly_rate_min as number);
  const costMax = hoursMax * (raw.hourly_rate_max as number);
  if (costMax > B.maxTotalCost) return fail('proposal total cost exceeds the allowed maximum');
  const capacity = raw.weekly_capacity_hours as number;
  const weeksMin = Math.max(1, Math.ceil(hoursMin / capacity));
  const weeksMax = Math.max(1, Math.ceil(hoursMax / capacity));
  if (weeksMax > B.maxWeeks) return fail('proposal duration exceeds the allowed maximum');

  if (raw.total_hours_min !== hoursMin || raw.total_hours_max !== hoursMax) {
    return fail('proposal total hours do not match the role breakdown');
  }
  if (raw.total_cost_min !== costMin || raw.total_cost_max !== costMax) {
    return fail('proposal totals do not match the deterministic calculation');
  }
  if (raw.duration_weeks_min !== weeksMin || raw.duration_weeks_max !== weeksMax) {
    return fail('proposal duration does not match the deterministic calculation');
  }

  const modules: ValidatedProposal['content']['modules'] = [];
  if (!Array.isArray(raw.modules) || raw.modules.length === 0 || raw.modules.length > MEETING_LIMITS.modules.max) {
    return fail('proposal.modules must have 1–20 entries');
  }
  for (const m of raw.modules) {
    if (!isDict(m)) return fail('proposal.modules has an invalid entry');
    const name = asTrimmed(m.name).slice(0, MEETING_LIMITS.moduleName.max);
    if (!name) return fail('proposal.modules has an unnamed entry');
    if (!isIntIn(m.hours_min, 0, B.maxRoleHours) || !isIntIn(m.hours_max, 0, B.maxRoleHours)) {
      return fail(`proposal module "${name}" hours out of range`);
    }
    if ((m.hours_min as number) > (m.hours_max as number)) {
      return fail(`proposal module "${name}" hours range is inverted`);
    }
    modules.push({ name, hours_min: m.hours_min as number, hours_max: m.hours_max as number });
  }

  const confidence = asTrimmed(raw.confidence);
  if (!(CONFIDENCE_LEVELS as readonly string[]).includes(confidence)) {
    return fail('proposal.confidence is invalid');
  }

  const summary = asTrimmed(raw.summary).slice(0, MEETING_LIMITS.proposalText.max);
  if (!summary) return fail('proposal.summary is required');

  const list = (v: unknown) => cleanStringList(v, MEETING_LIMITS.listItems.max, MEETING_LIMITS.listItem.max);

  const milestones: ValidatedProposal['content']['milestones'] = [];
  if (Array.isArray(raw.milestones)) {
    for (const m of raw.milestones.slice(0, MEETING_LIMITS.milestones.max)) {
      if (!isDict(m)) continue;
      const title = asTrimmed(m.title).slice(0, MEETING_LIMITS.listItem.max);
      const weeks = asTrimmed(m.weeks).slice(0, 40);
      if (title) milestones.push({ title, weeks });
    }
  }

  return {
    ok: true,
    data: {
      config_version: configVersion,
      currency: 'USD',
      weekly_capacity_hours: capacity,
      total_hours_min: hoursMin,
      total_hours_max: hoursMax,
      total_cost_min: costMin,
      total_cost_max: costMax,
      duration_weeks_min: weeksMin,
      duration_weeks_max: weeksMax,
      confidence: confidence as 'low' | 'medium' | 'high',
      content: {
        summary,
        recommended_solution: list(raw.recommended_solution),
        architecture: list(raw.architecture),
        technology_stack: list(raw.technology_stack),
        in_scope: list(raw.in_scope),
        out_of_scope: list(raw.out_of_scope),
        ai_roles: list(raw.ai_roles),
        human_roles: list(raw.human_roles),
        milestones,
        assumptions: list(raw.assumptions),
        dependencies: list(raw.dependencies),
        risks: list(raw.risks),
        modules,
        role_hours: roleHours,
        hourly_rate_min: raw.hourly_rate_min as number,
        hourly_rate_max: raw.hourly_rate_max as number,
      },
      budget_plan: sanitizeBudgetPlan(raw.budget_plan),
    },
  };
}

export interface ValidatedProposalSave {
  meetingId: string;
  proposal: ValidatedProposal;
}

export function validateSaveProposal(body: Dict): MeetingValidation<ValidatedProposalSave> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');
  const proposal = sanitizeProposal(body.proposal);
  if (!proposal.ok) return proposal;
  return { ok: true, data: { meetingId: body.meeting_id, proposal: proposal.data } };
}

// --- finalize ---------------------------------------------------------------------

export interface ValidatedFinalize {
  meetingId: string;
  intent: (typeof MEETING_INTENTS)[number];
  contact: {
    name: string;
    email: string;
    phone: string;
    company: string | null;
    preferred_contact_method: (typeof CONTACT_METHODS)[number];
  };
  confirmedAt: string;
  consentAt: string;
  answers: SanitizedAnswers;
  requirementSummary: string;
  language: string | null;
  proposal: ValidatedProposal;
  review: { reason: string; visitor_message: string | null } | null;
}

export function validateFinalize(body: Dict): MeetingValidation<ValidatedFinalize> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');

  // Confirmation + consent gates: finalization is meaningless without both.
  if (body.user_confirmed !== true) return fail('user_confirmed must be true');
  const confirmedAt = asTrimmed(body.confirmed_at);
  if (!confirmedAt || Number.isNaN(Date.parse(confirmedAt))) return fail('confirmed_at is invalid');
  if (body.consent !== true) return fail('consent must be true');
  const consentAt = asTrimmed(body.consent_at);
  if (!consentAt || Number.isNaN(Date.parse(consentAt))) return fail('consent_at is invalid');

  if (!isDict(body.contact)) return fail('contact is required');
  const name = asTrimmed(body.contact.name).slice(0, MEETING_LIMITS.name.max);
  if (name.length < MEETING_LIMITS.name.min) return fail('contact.name is invalid');
  const email = asTrimmed(body.contact.email).toLowerCase();
  if (!isValidEmail(email)) return fail('contact.email is invalid');
  const phone = normalizePhone(asTrimmed(body.contact.phone));
  if (!phone) return fail('contact.phone is invalid');
  const company = asTrimmed(body.contact.company).slice(0, MEETING_LIMITS.company.max) || null;
  const method = asTrimmed(body.contact.preferred_contact_method);
  if (!(CONTACT_METHODS as readonly string[]).includes(method)) {
    return fail('contact.preferred_contact_method is invalid');
  }

  const intent = asTrimmed(body.intent);
  if (!(MEETING_INTENTS as readonly string[]).includes(intent)) return fail('intent is invalid');

  const answers = sanitizeMeetingRequirements(body.fields);
  const requirementSummary = asTrimmed(body.requirement_summary).slice(0, MEETING_LIMITS.requirementSummary.max);
  if (!requirementSummary) return fail('requirement_summary is required');

  const proposalResult = sanitizeProposal(body.proposal);
  if (!proposalResult.ok) return proposalResult;

  const langRaw = asTrimmed(body.selected_language).toLowerCase();
  const language = (MEETING_LANGUAGES as readonly string[]).includes(langRaw) ? langRaw : null;

  let review: ValidatedFinalize['review'] = null;
  if (body.human_review === true) {
    const message = asTrimmed(body.review_message).slice(0, MEETING_LIMITS.reviewMessage.max) || null;
    review = { reason: 'client_requested_review', visitor_message: message };
  } else if (body.review_message !== undefined) {
    return fail('Unexpected review message.');
  }

  return {
    ok: true,
    data: {
      meetingId: body.meeting_id,
      intent: intent as ValidatedFinalize['intent'],
      contact: { name, email, phone, company, preferred_contact_method: method as ValidatedFinalize['contact']['preferred_contact_method'] },
      confirmedAt: new Date(confirmedAt).toISOString(),
      consentAt: new Date(consentAt).toISOString(),
      answers,
      requirementSummary,
      language,
      proposal: proposalResult.data,
      review,
    },
  };
}

/** Project mode for the leads schema. */
export function meetingProjectMode(intent: (typeof MEETING_INTENTS)[number]): 'new' | 'existing' {
  return intent === 'new_project' || intent === 'consultation' ? 'new' : 'existing';
}

export const SERVICE_BY_INTENT: Record<string, string> = {
  new_project: 'AI Consultation — New Project',
  improve_existing: 'AI Consultation — Improve Existing',
  repair_broken: 'AI Consultation — Project Rescue',
  consultation: 'AI Consultation — General',
};

// --- events / status ---------------------------------------------------------------

export interface ValidatedEvent {
  meetingId: string;
  eventType: (typeof MEETING_EVENT_TYPES)[number];
  data: Record<string, string | number | boolean>;
}

/** Whitelist event payloads: event name from the fixed list, data values are
 * scalars only (counters, codes, flags) — never free text from the visitor. */
export function validateMeetingEvent(body: Dict): MeetingValidation<ValidatedEvent> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');
  const eventType = asTrimmed(body.event_type);
  if (!(MEETING_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return fail('event_type is not allowed');
  }
  const data: Record<string, string | number | boolean> = {};
  if (isDict(body.data)) {
    for (const [key, value] of Object.entries(body.data).slice(0, 20)) {
      if (typeof key !== 'string' || key.length > 40) continue;
      if (typeof value === 'string') data[key] = value.slice(0, 200);
      else if (typeof value === 'number' && Number.isFinite(value)) data[key] = value;
      else if (typeof value === 'boolean') data[key] = value;
    }
  }
  return { ok: true, data: { meetingId: body.meeting_id, eventType: eventType as ValidatedEvent['eventType'], data } };
}

export interface ValidatedStatus {
  meetingId: string;
  status: (typeof MEETING_STATUSES)[number];
  ended: boolean;
}

export function validateMeetingStatus(body: Dict): MeetingValidation<ValidatedStatus> {
  if (!isUuid(body.meeting_id)) return fail('meeting_id must be a UUID');
  const status = asTrimmed(body.status);
  if (!(MEETING_STATUSES as readonly string[]).includes(status)) return fail('status is invalid');
  return {
    ok: true,
    data: { meetingId: body.meeting_id, status: status as ValidatedStatus['status'], ended: body.ended === true },
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
