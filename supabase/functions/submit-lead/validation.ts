// =============================================================================
// submit-lead — pure validation / normalization layer.
//
// This module is dependency-free and runtime-agnostic (no Deno / DOM / Node
// APIs) so the exact code the Edge Function runs is also unit-tested by
// vitest from the repo root. All browser input passes through here before it
// can reach the database.
// =============================================================================

export type LeadAction = 'contact' | 'consultation' | 'project_requirement' | 'human_review';

export const LEAD_ACTIONS: LeadAction[] = [
  'contact',
  'consultation',
  'project_requirement',
  'human_review',
];

export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 30 },
  company: { max: 150 },
  country: { max: 100 },
  summary: { min: 20, max: 5000 },
  requirementSummary: { max: 10000 },
  reviewMessage: { max: 2000 },
  reviewReason: { max: 500 },
  service: { max: 100 },
  budgetRange: { max: 100 },
  timeline: { max: 100 },
  language: { max: 10 },
  route: { max: 300 },
  turnstileToken: { min: 10, max: 4096 },
  answers: {
    maxKeys: 60,
    maxKeyLength: 64,
    maxStringLength: 2000,
    maxArrayItems: 25,
    maxArrayItemLength: 300,
    maxSerializedLength: 20000,
  },
  estimate: {
    maxTeamRoles: 20,
    maxRoleLength: 100,
    maxHours: 100000,
    maxHourlyRate: 2000,
    maxCost: 10000000,
    maxWeeks: 520,
    maxWeeklyCapacity: 168,
  },
} as const;

export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;
export const PROJECT_MODES = ['new', 'existing'] as const;
export const RISK_LEVELS = ['Low', 'Medium', 'High'] as const;

// Origins allowed to call the function. Production origins are fixed;
// localhost entries cover Vite dev (5173/8080) and vite preview (4173).
// Extra origins (e.g. https://<user>.github.io) come from the
// ALLOWED_ORIGINS secret, comma-separated.
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://scssoftwares.com',
  'https://www.scssoftwares.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

export function resolveAllowedOrigins(envValue?: string | null): string[] {
  const extra = (envValue ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => /^https?:\/\//.test(o));
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

export function isOriginAllowed(origin: string | null | undefined, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.includes(origin.replace(/\/+$/, ''));
}

// --- small helpers -----------------------------------------------------------

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asTrimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// Pragmatic email check: one @, non-empty local part, dot in domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= LIMITS.email.max && EMAIL_RE.test(email);
}

/** Keep a leading +, drop separators, require 7–15 digits (E.164-ish). */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned.slice(0, LIMITS.phone.max);
}

interface FieldError {
  field: string;
  message: string;
}

const err = (field: string, message: string): FieldError => ({ field, message });

// --- answers -----------------------------------------------------------------

export type AnswersPayload = Record<string, string | string[]>;

export function sanitizeAnswers(raw: unknown): { answers?: AnswersPayload; error?: FieldError } {
  if (!isDict(raw)) return { error: err('requirement.answers', 'answers must be an object') };
  const keys = Object.keys(raw);
  if (keys.length === 0) return { error: err('requirement.answers', 'answers must not be empty') };
  if (keys.length > LIMITS.answers.maxKeys) {
    return { error: err('requirement.answers', 'too many answers') };
  }
  const out: AnswersPayload = {};
  for (const key of keys) {
    if (key.length > LIMITS.answers.maxKeyLength) {
      return { error: err('requirement.answers', 'answer key too long') };
    }
    const value = raw[key];
    if (typeof value === 'string') {
      if (value.length > LIMITS.answers.maxStringLength) {
        return { error: err('requirement.answers', `answer "${key}" is too long`) };
      }
      out[key] = value.trim();
    } else if (Array.isArray(value)) {
      if (value.length > LIMITS.answers.maxArrayItems) {
        return { error: err('requirement.answers', `answer "${key}" has too many items`) };
      }
      const items: string[] = [];
      for (const item of value) {
        if (typeof item !== 'string' || item.length > LIMITS.answers.maxArrayItemLength) {
          return { error: err('requirement.answers', `answer "${key}" has an invalid item`) };
        }
        items.push(item.trim());
      }
      out[key] = items;
    } else {
      return { error: err('requirement.answers', `answer "${key}" has an unsupported type`) };
    }
  }
  if (JSON.stringify(out).length > LIMITS.answers.maxSerializedLength) {
    return { error: err('requirement.answers', 'answers payload is too large') };
  }
  return { answers: out };
}

// --- demo estimate -----------------------------------------------------------

export interface DemoEstimatePayload {
  status: 'demo';
  currency: 'USD';
  total_hours: number;
  total_cost: number;
  weekly_capacity_hours: number;
  estimated_weeks: number;
  health_score?: number;
  risk_level?: (typeof RISK_LEVELS)[number];
  team: Array<{ role: string; hours: number; hourly_rate: number }>;
}

const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/**
 * Whitelist-copy the demo estimate: only expected fields, only sane numeric
 * ranges. Anything else is rejected — the estimate is demo output, never a
 * quotation, so there is no reason to accept surprising shapes.
 */
export function sanitizeDemoEstimate(raw: unknown): { estimate?: DemoEstimatePayload; error?: FieldError } {
  if (!isDict(raw)) return { error: err('requirement.demo_estimate', 'demo_estimate must be an object') };
  const e = LIMITS.estimate;
  if (!inRange(raw.total_hours, 0, e.maxHours)) {
    return { error: err('requirement.demo_estimate', 'total_hours out of range') };
  }
  if (!inRange(raw.total_cost, 0, e.maxCost)) {
    return { error: err('requirement.demo_estimate', 'total_cost out of range') };
  }
  if (!inRange(raw.weekly_capacity_hours, 1, e.maxWeeklyCapacity)) {
    return { error: err('requirement.demo_estimate', 'weekly_capacity_hours out of range') };
  }
  if (!inRange(raw.estimated_weeks, 0, e.maxWeeks)) {
    return { error: err('requirement.demo_estimate', 'estimated_weeks out of range') };
  }
  if (!Array.isArray(raw.team) || raw.team.length === 0 || raw.team.length > e.maxTeamRoles) {
    return { error: err('requirement.demo_estimate', 'team must have 1–20 roles') };
  }
  const team: DemoEstimatePayload['team'] = [];
  for (const member of raw.team) {
    if (!isDict(member)) return { error: err('requirement.demo_estimate', 'invalid team member') };
    const role = asTrimmed(member.role);
    if (!role || role.length > e.maxRoleLength) {
      return { error: err('requirement.demo_estimate', 'invalid team role name') };
    }
    if (!inRange(member.hours, 0, e.maxHours) || !inRange(member.hourly_rate, 0, e.maxHourlyRate)) {
      return { error: err('requirement.demo_estimate', 'team numbers out of range') };
    }
    team.push({ role, hours: member.hours, hourly_rate: member.hourly_rate });
  }
  const estimate: DemoEstimatePayload = {
    status: 'demo',
    currency: 'USD',
    total_hours: raw.total_hours as number,
    total_cost: raw.total_cost as number,
    weekly_capacity_hours: raw.weekly_capacity_hours as number,
    estimated_weeks: raw.estimated_weeks as number,
    team,
  };
  if (raw.health_score !== undefined) {
    if (!inRange(raw.health_score, 0, 100)) {
      return { error: err('requirement.demo_estimate', 'health_score out of range') };
    }
    estimate.health_score = raw.health_score as number;
  }
  if (raw.risk_level !== undefined) {
    if (!RISK_LEVELS.includes(raw.risk_level as (typeof RISK_LEVELS)[number])) {
      return { error: err('requirement.demo_estimate', 'invalid risk_level') };
    }
    estimate.risk_level = raw.risk_level as (typeof RISK_LEVELS)[number];
  }
  return { estimate };
}

// --- full submission ---------------------------------------------------------

export interface ValidatedLead {
  lead_type: LeadAction;
  source: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  preferred_language: string | null;
  preferred_contact_method: string | null;
  service: string | null;
  project_mode: string | null;
  project_summary: string | null;
  budget_range: string | null;
  timeline: string | null;
  human_review_requested: boolean;
  metadata: Record<string, unknown>;
}

export interface ValidatedRequirement {
  mode: (typeof PROJECT_MODES)[number];
  answers: AnswersPayload;
  requirement_summary: string | null;
  demo_estimate: DemoEstimatePayload;
  estimate_version: string;
  selected_language: string | null;
  current_route: string | null;
}

export interface ValidatedReview {
  reason: string | null;
  visitor_message: string | null;
}

export interface ValidatedSubmission {
  action: LeadAction;
  turnstileToken: string;
  lead: ValidatedLead;
  requirement: ValidatedRequirement | null;
  review: ValidatedReview | null;
}

export type ValidationResult =
  | { ok: true; data: ValidatedSubmission }
  | { ok: false; error: 'honeypot' | 'invalid_request'; message: string };

const TOP_LEVEL_KEYS = new Set([
  'action',
  'turnstileToken',
  'scs_hp_check',
  'consent',
  'lead',
  'requirement',
  'review',
  'context',
]);

const fail = (message: string): ValidationResult => ({
  ok: false,
  error: 'invalid_request',
  message,
});

function optionalText(raw: unknown, field: string, max: number): { value: string | null; error?: FieldError } {
  const value = asTrimmed(raw);
  if (!value) return { value: null };
  if (value.length > max) return { value: null, error: err(field, `${field} is too long`) };
  return { value };
}

/**
 * Validate + normalize one raw request body. Never throws; strips every
 * property it does not explicitly copy. Turnstile token verification (a
 * network call) is done by the caller — here we only check its shape.
 */
export function validateSubmission(body: unknown): ValidationResult {
  if (!isDict(body)) return fail('Request body must be a JSON object.');

  for (const key of Object.keys(body)) {
    if (!TOP_LEVEL_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }

  // Honeypot: the hidden trap field must stay empty. Non-semantic name so
  // browsers/password managers never autofill it (a semantic "website" name
  // falsely rejected real autofill-using visitors). A stray legacy `website`
  // property is still rejected by the unexpected-property check above.
  if (asTrimmed(body.scs_hp_check) !== '') {
    return { ok: false, error: 'honeypot', message: 'Invalid submission.' };
  }

  const action = body.action as LeadAction;
  if (!LEAD_ACTIONS.includes(action)) return fail('Unknown action.');

  const turnstileToken = asTrimmed(body.turnstileToken);
  if (
    turnstileToken.length < LIMITS.turnstileToken.min ||
    turnstileToken.length > LIMITS.turnstileToken.max
  ) {
    return fail('Missing or invalid Turnstile token.');
  }

  if (body.consent !== true) return fail('Consent is required.');

  if (!isDict(body.lead)) return fail('Missing lead details.');
  const rawLead = body.lead;

  const name = asTrimmed(rawLead.name);
  if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
    return fail('Name must be 2–100 characters.');
  }

  const email = asTrimmed(rawLead.email).toLowerCase();
  if (!isValidEmail(email)) return fail('A valid email address is required.');

  let phone: string | null = null;
  const rawPhone = asTrimmed(rawLead.phone);
  if (rawPhone) {
    phone = normalizePhone(rawPhone);
    if (!phone) return fail('Phone number is not valid.');
  }
  if ((action === 'consultation' || action === 'human_review') && !phone) {
    return fail('A phone/WhatsApp number is required.');
  }

  const company = optionalText(rawLead.company, 'company', LIMITS.company.max);
  if (company.error) return fail(company.error.message);
  const country = optionalText(rawLead.country, 'country', LIMITS.country.max);
  if (country.error) return fail(country.error.message);
  const service = optionalText(rawLead.service, 'service', LIMITS.service.max);
  if (service.error) return fail(service.error.message);
  const budgetRange = optionalText(rawLead.budget_range, 'budget_range', LIMITS.budgetRange.max);
  if (budgetRange.error) return fail(budgetRange.error.message);
  const timeline = optionalText(rawLead.timeline, 'timeline', LIMITS.timeline.max);
  if (timeline.error) return fail(timeline.error.message);
  const preferredLanguage = optionalText(
    rawLead.preferred_language,
    'preferred_language',
    LIMITS.language.max,
  );
  if (preferredLanguage.error) return fail(preferredLanguage.error.message);

  let preferredContactMethod: string | null = null;
  const rawMethod = asTrimmed(rawLead.preferred_contact_method);
  if (rawMethod) {
    if (!CONTACT_METHODS.includes(rawMethod as (typeof CONTACT_METHODS)[number])) {
      return fail('Invalid preferred contact method.');
    }
    preferredContactMethod = rawMethod;
  }

  let projectMode: string | null = null;
  const rawMode = asTrimmed(rawLead.project_mode);
  if (rawMode) {
    if (!PROJECT_MODES.includes(rawMode as (typeof PROJECT_MODES)[number])) {
      return fail('Invalid project mode.');
    }
    projectMode = rawMode;
  }

  const projectSummary = asTrimmed(rawLead.project_summary);
  const summaryRequired = action === 'contact' || action === 'consultation';
  if (summaryRequired || projectSummary) {
    if (projectSummary.length < LIMITS.summary.min || projectSummary.length > LIMITS.summary.max) {
      return fail(`Please describe your request in ${LIMITS.summary.min}–${LIMITS.summary.max} characters.`);
    }
  }

  if (action === 'consultation') {
    if (!service.value) return fail('Please choose a service.');
    if (!projectMode) return fail('Please choose new or existing project.');
    if (!budgetRange.value) return fail('Please choose a budget range.');
    if (!timeline.value) return fail('Please choose a timeline.');
  }

  // Safe request context → sanitized metadata (never tokens / raw IPs here).
  const context = isDict(body.context) ? body.context : {};
  const sourceRoute = optionalText(context.route, 'context.route', LIMITS.route.max);
  const contextLanguage = optionalText(context.language, 'context.language', LIMITS.language.max);
  const metadata: Record<string, unknown> = {
    consent: true,
    submitted_language: contextLanguage.value ?? preferredLanguage.value ?? null,
  };

  const lead: ValidatedLead = {
    lead_type: action,
    source: sourceRoute.value,
    name,
    email,
    phone,
    company: company.value,
    country: country.value,
    preferred_language: preferredLanguage.value,
    preferred_contact_method: preferredContactMethod,
    service: service.value,
    project_mode: projectMode,
    project_summary: projectSummary || null,
    budget_range: budgetRange.value,
    timeline: timeline.value,
    human_review_requested: action === 'human_review',
    metadata,
  };

  // Requirement block — required for project_requirement and human_review.
  let requirement: ValidatedRequirement | null = null;
  if (action === 'project_requirement' || action === 'human_review') {
    if (!isDict(body.requirement)) return fail('Missing requirement details.');
    const rawReq = body.requirement;

    const mode = asTrimmed(rawReq.mode);
    if (!PROJECT_MODES.includes(mode as (typeof PROJECT_MODES)[number])) {
      return fail('Requirement mode must be "new" or "existing".');
    }

    const answersResult = sanitizeAnswers(rawReq.answers);
    if (answersResult.error) return fail(answersResult.error.message);

    const summary = asTrimmed(rawReq.requirement_summary);
    if (summary.length > LIMITS.requirementSummary.max) {
      return fail('Requirement summary is too long.');
    }

    const estimateResult = sanitizeDemoEstimate(rawReq.demo_estimate);
    if (estimateResult.error) return fail(estimateResult.error.message);

    const version = optionalText(rawReq.estimate_version, 'estimate_version', 40);
    if (version.error) return fail(version.error.message);
    const selectedLanguage = optionalText(rawReq.selected_language, 'selected_language', LIMITS.language.max);
    if (selectedLanguage.error) return fail(selectedLanguage.error.message);
    const currentRoute = optionalText(rawReq.current_route, 'current_route', LIMITS.route.max);
    if (currentRoute.error) return fail(currentRoute.error.message);

    requirement = {
      mode: mode as (typeof PROJECT_MODES)[number],
      answers: answersResult.answers as AnswersPayload,
      requirement_summary: summary || null,
      demo_estimate: estimateResult.estimate as DemoEstimatePayload,
      estimate_version: version.value ?? 'demo-v1',
      selected_language: selectedLanguage.value,
      current_route: currentRoute.value,
    };
    lead.project_mode = requirement.mode;
  }

  // Review block — only for human_review, and only visitor-safe fields.
  // assigned_to / reviewed_at / status / prices can never come from here.
  let review: ValidatedReview | null = null;
  if (action === 'human_review') {
    const rawReview = isDict(body.review) ? body.review : {};
    const reason = optionalText(rawReview.reason, 'review.reason', LIMITS.reviewReason.max);
    if (reason.error) return fail('Review reason is too long.');
    const message = optionalText(rawReview.visitor_message, 'review.visitor_message', LIMITS.reviewMessage.max);
    if (message.error) return fail('Review message is too long.');
    review = {
      reason: reason.value ?? 'visitor_requested_review',
      visitor_message: message.value,
    };
  } else if (body.review !== undefined) {
    return fail('Unexpected review block.');
  }

  return {
    ok: true,
    data: { action, turnstileToken, lead, requirement, review },
  };
}
