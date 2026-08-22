// =============================================================================
// consultation-meeting — pure validation / policy layer.
//
// Dependency-free and runtime-agnostic (standard `crypto` only), so the exact
// code the Edge Function runs is unit-tested by vitest from the repo root.
//
// Posture (same as livekit-token / submit-lead):
//   * strict top-level key allowlists — unknown properties are rejected;
//   * the browser can never choose room names, identities, agent names,
//     grants, references or access tokens;
//   * every browser-provided value is length-capped and whitelisted;
//   * analysis-snapshot numbers are clamped and flagged as client-reported —
//     they are NEVER treated as validated estimates.
// =============================================================================

// Origin allowlist — same policy as submit-lead/livekit-token. Local copy so
// the function stays self-contained for deployment.
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

// --- constants -------------------------------------------------------------------

/** Languages offered for the consultation conversation. */
export const CONSULTATION_LANGUAGES = ['en', 'hi', 'hinglish', 'mr', 'ur', 'ar'] as const;
export type ConsultationLanguage = (typeof CONSULTATION_LANGUAGES)[number];

export const MEETING_ACTIONS = [
  'create',
  'resolve',
  'join',
  'reschedule',
  'cancel',
  'submit_links',
  'request_review',
] as const;
export type MeetingAction = (typeof MEETING_ACTIONS)[number];

export const ARTIFACT_KINDS = ['repository', 'figma', 'api_docs', 'website', 'other_link', 'note'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** Hosts accepted for repository links (exact or subdomain match). */
export const REPOSITORY_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org'];
/** Hosts accepted for Figma links. */
export const FIGMA_HOSTS = ['figma.com'];

export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  phone: { max: 30 },
  company: { max: 150 },
  timezone: { max: 64 },
  language: { max: 20 },
  turnstileToken: { min: 10, max: 4096 },
  reference: { max: 20 },
  accessToken: { min: 40, max: 128 },
  url: { max: 2048 },
  label: { max: 200 },
  note: { max: 2000 },
  reviewMessage: { max: 2000 },
  maxLinksPerRequest: 10,
  maxLinksPerMeeting: 20,
} as const;

/** How far ahead a meeting can be scheduled (days) and grace behind now (ms). */
export const MAX_SCHEDULE_AHEAD_DAYS = 120;
export const SCHEDULE_PAST_GRACE_MS = 5 * 60 * 1000;

/** Instant meetings expire this long after creation if never finalized. */
export const INSTANT_MEETING_TTL_MS = 24 * 60 * 60 * 1000;
/** Scheduled meetings can be joined until this long after the start time. */
export const SCHEDULED_JOIN_GRACE_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_EARLY_JOIN_MINUTES = 15;

export const TOKEN_TTL_SECONDS = 600;

export interface RateWindow {
  windowMinutes: number;
  maxMeetings: number;
}

/** Defaults: 3 meetings/hour and 8/day per (salted, hashed) IP. */
export const DEFAULT_RATE_WINDOWS: RateWindow[] = [
  { windowMinutes: 60, maxMeetings: 3 },
  { windowMinutes: 24 * 60, maxMeetings: 8 },
];

export function resolveRateWindows(envValue?: string | null): RateWindow[] {
  if (!envValue) return DEFAULT_RATE_WINDOWS;
  const parts = envValue.split(',').map((p) => Number.parseInt(p.trim(), 10));
  if (parts.length !== 2 || parts.some((n) => !Number.isInteger(n) || n < 1 || n > 1000)) {
    return DEFAULT_RATE_WINDOWS;
  }
  return [
    { windowMinutes: 60, maxMeetings: parts[0] },
    { windowMinutes: 24 * 60, maxMeetings: parts[1] },
  ];
}

/** Feature flag: anything except the exact string "true" means disabled. */
export function isConsultationEnabled(envValue?: string | null): boolean {
  return envValue === 'true';
}

/** Must match the worker's BUDDY_AGENT_NAME (agent/src/agent.ts). Comes ONLY
 * from the server environment — never from the request. */
export const DEFAULT_AGENT_NAME = 'buddy-it-manager';

export function resolveAgentName(envValue?: string | null): string {
  const value = (envValue ?? '').trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : DEFAULT_AGENT_NAME;
}

// --- random identifiers -----------------------------------------------------------

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomFrom(alphabet: string, length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Non-sequential public meeting reference, e.g. SCSM-7K2P9QX4AB. */
export function generatePublicReference(): string {
  return `SCSM-${randomFrom(REFERENCE_ALPHABET, 10)}`;
}

export function isValidReference(value: unknown): value is string {
  return typeof value === 'string' && /^SCSM-[A-Z0-9]{10}$/.test(value);
}

/** Bearer access token, returned to the creator exactly once. */
export function generateAccessToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 hex of the access token — the only form ever stored. */
export async function hashAccessToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time hex-string comparison (both sides are hashes). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Random, unguessable room name for one consultation join. */
export function generateRoomName(): string {
  return `scsm-${randomFrom(ROOM_ALPHABET, 16)}`;
}

export function generateParticipantIdentity(): string {
  return `client-${randomFrom(ROOM_ALPHABET, 12)}`;
}

// --- small helpers ----------------------------------------------------------------

const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;

const optionalStr = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  return str(v, max);
};

const strList = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .slice(0, maxItems)
        .map((i) => i.trim().slice(0, maxLen))
    : [];

const clampInt = (v: unknown, min: number, max: number): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= min && n <= max ? n : null;
};

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= LIMITS.email.max;
}

export function normalizePhone(value: string): string | null {
  const cleaned = value.replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}

/** Loose IANA timezone shape check ("Asia/Kolkata", "UTC", "America/New_York"). */
export function isValidTimezone(value: string): boolean {
  if (value.length > LIMITS.timezone.max) return false;
  return /^[A-Za-z]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(value);
}

// --- analysis snapshot -------------------------------------------------------------

/** Whitelisted, size-capped snapshot of the completed project analysis.
 * Browser numbers are clamped and stored under `reported` with an explicit
 * client_reported flag — they never become validated estimates. */
export interface AnalysisSnapshot {
  mode: 'new' | 'existing';
  /** 'ai' = Gemini-classified; 'basic' = the labelled local engine.
   * 'demo' is accepted for snapshots created before the labels were renamed. */
  source: 'ai' | 'basic' | 'demo';
  generatedAt: string | null;
  /** The budget the client selected on the website, in whole USD, or null. */
  selectedBudgetUsd: number | null;
  projectType: string | null;
  platforms: string[];
  features: string[];
  currentCondition: string | null;
  technologyPreferences: string | null;
  existingProblems: string[];
  missingFeatures: string[];
  priorities: string[];
  reported: {
    client_reported: true;
    totalHours: number | null;
    totalCost: number | null;
    durationWeeks: number | null;
    weeklyCapacityHours: number | null;
  } | null;
}

const SNAPSHOT_KEYS = new Set([
  'mode',
  'source',
  'generatedAt',
  'projectType',
  'platforms',
  'features',
  'currentCondition',
  'technologyPreferences',
  'existingProblems',
  'missingFeatures',
  'priorities',
  'reportedEstimate',
  'selectedBudgetUsd',
]);

/**
 * Whitelist-sanitize a browser-provided analysis snapshot. Returns null when
 * the input is missing or unusable — a meeting without a snapshot is a valid
 * general consultation.
 */
export function sanitizeAnalysisSnapshot(raw: unknown): AnalysisSnapshot | null {
  if (!isDict(raw)) return null;
  for (const key of Object.keys(raw)) {
    if (!SNAPSHOT_KEYS.has(key)) return null; // unknown fields → reject snapshot
  }
  const mode = raw.mode === 'new' || raw.mode === 'existing' ? raw.mode : null;
  if (!mode) return null;
  const source =
    raw.source === 'ai' || raw.source === 'basic' || raw.source === 'demo'
      ? (raw.source as AnalysisSnapshot['source'])
      : 'basic';
  // Re-clamped here: a browser-supplied budget is untrusted, and the meeting's
  // estimate engine re-parses it again before any figure is computed from it.
  const selectedBudgetUsd = clampInt(raw.selectedBudgetUsd, 0, 10000000);

  let generatedAt: string | null = null;
  if (typeof raw.generatedAt === 'string' && !Number.isNaN(Date.parse(raw.generatedAt))) {
    generatedAt = new Date(raw.generatedAt).toISOString();
  }

  let reported: AnalysisSnapshot['reported'] = null;
  if (isDict(raw.reportedEstimate)) {
    const r = raw.reportedEstimate;
    reported = {
      client_reported: true,
      totalHours: clampInt(r.totalHours, 0, 100000),
      totalCost: clampInt(r.totalCost, 0, 10000000),
      durationWeeks: clampInt(r.durationWeeks, 0, 520),
      weeklyCapacityHours: clampInt(r.weeklyCapacityHours, 1, 168),
    };
    if (
      reported.totalHours === null &&
      reported.totalCost === null &&
      reported.durationWeeks === null &&
      reported.weeklyCapacityHours === null
    ) {
      reported = null;
    }
  }

  return {
    mode,
    source,
    generatedAt,
    projectType: optionalStr(raw.projectType, 200),
    platforms: strList(raw.platforms, 10, 120),
    features: strList(raw.features, 25, 200),
    currentCondition: optionalStr(raw.currentCondition, 1000),
    technologyPreferences: optionalStr(raw.technologyPreferences, 500),
    existingProblems: strList(raw.existingProblems, 15, 300),
    missingFeatures: strList(raw.missingFeatures, 15, 200),
    priorities: strList(raw.priorities, 10, 200),
    reported,
    selectedBudgetUsd,
  };
}

// --- request validation -------------------------------------------------------------

export type ValidationFailure = { ok: false; error: 'invalid_request' | 'honeypot'; message: string };
const fail = (message: string): ValidationFailure => ({ ok: false, error: 'invalid_request', message });

export interface ValidatedCreateRequest {
  action: 'create';
  turnstileToken: string;
  meetingKind: 'instant' | 'scheduled';
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  clientTimezone: string;
  scheduledAtUtc: string | null;
  preferredLanguage: ConsultationLanguage | null;
  transcriptConsent: boolean;
  analysisSnapshot: AnalysisSnapshot | null;
}

const CREATE_KEYS = new Set([
  'action',
  'turnstileToken',
  'scs_hp_check',
  'consent',
  'meetingKind',
  'name',
  'email',
  'phone',
  'company',
  'clientTimezone',
  'scheduledAtUtc',
  'preferredLanguage',
  'transcriptConsent',
  'analysisSnapshot',
]);

export function validateCreateRequest(
  body: Record<string, unknown>,
  nowMs: number,
): ValidatedCreateRequest | ValidationFailure {
  for (const key of Object.keys(body)) {
    if (!CREATE_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }

  // Honeypot: any non-empty value means a bot filled the invisible field.
  if (typeof body.scs_hp_check === 'string' && body.scs_hp_check.trim() !== '') {
    return { ok: false, error: 'honeypot', message: 'Submission rejected.' };
  }

  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (
    turnstileToken.length < LIMITS.turnstileToken.min ||
    turnstileToken.length > LIMITS.turnstileToken.max
  ) {
    return fail('Missing or invalid Turnstile token.');
  }

  if (body.consent !== true) return fail('AI-consultation and data-processing consent is required.');

  const meetingKind = body.meetingKind === 'instant' || body.meetingKind === 'scheduled' ? body.meetingKind : null;
  if (!meetingKind) return fail('meetingKind must be "instant" or "scheduled".');

  const name = str(body.name, LIMITS.name.max);
  if (!name || name.length < LIMITS.name.min) return fail('A valid name is required.');

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) return fail('A valid email address is required.');

  let phone: string | null = null;
  if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
    if (typeof body.phone !== 'string') return fail('Invalid phone number.');
    phone = normalizePhone(body.phone);
    if (!phone) return fail('Invalid phone number.');
  }

  const company = optionalStr(body.company, LIMITS.company.max);
  if (body.company !== undefined && body.company !== null && body.company !== '' && company === null) {
    return fail('Invalid company name.');
  }

  const clientTimezone = typeof body.clientTimezone === 'string' ? body.clientTimezone.trim() : '';
  if (!clientTimezone || !isValidTimezone(clientTimezone)) {
    return fail('A valid IANA timezone is required.');
  }

  let scheduledAtUtc: string | null = null;
  if (meetingKind === 'scheduled') {
    const parsed = typeof body.scheduledAtUtc === 'string' ? Date.parse(body.scheduledAtUtc) : NaN;
    if (Number.isNaN(parsed)) return fail('A valid scheduled time is required.');
    if (parsed < nowMs - SCHEDULE_PAST_GRACE_MS) return fail('Scheduled time is in the past.');
    if (parsed > nowMs + MAX_SCHEDULE_AHEAD_DAYS * 24 * 60 * 60 * 1000) {
      return fail(`Scheduled time is more than ${MAX_SCHEDULE_AHEAD_DAYS} days ahead.`);
    }
    scheduledAtUtc = new Date(parsed).toISOString();
  } else if (body.scheduledAtUtc !== undefined && body.scheduledAtUtc !== null) {
    return fail('scheduledAtUtc is only valid for scheduled meetings.');
  }

  let preferredLanguage: ConsultationLanguage | null = null;
  if (body.preferredLanguage !== undefined && body.preferredLanguage !== null) {
    if (typeof body.preferredLanguage !== 'string') return fail('Invalid preferred language.');
    const lang = body.preferredLanguage.trim().toLowerCase();
    if (!(CONSULTATION_LANGUAGES as readonly string[]).includes(lang)) {
      return fail('Unsupported preferred language.');
    }
    preferredLanguage = lang as ConsultationLanguage;
  }

  const analysisSnapshot =
    body.analysisSnapshot === undefined || body.analysisSnapshot === null
      ? null
      : sanitizeAnalysisSnapshot(body.analysisSnapshot);

  return {
    action: 'create',
    turnstileToken,
    meetingKind,
    name,
    email,
    phone,
    company,
    clientTimezone,
    scheduledAtUtc,
    preferredLanguage,
    transcriptConsent: body.transcriptConsent === true,
    analysisSnapshot,
  };
}

// --- token-scoped actions (resolve / join / cancel / reschedule / links / review) ----

export interface ScopedRequestBase {
  reference: string;
  accessToken: string;
}

export function validateScopedBase(body: Record<string, unknown>): ScopedRequestBase | ValidationFailure {
  if (!isValidReference(body.reference)) return fail('Invalid meeting reference.');
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  if (
    accessToken.length < LIMITS.accessToken.min ||
    accessToken.length > LIMITS.accessToken.max ||
    !/^[a-f0-9]+$/.test(accessToken)
  ) {
    return fail('Invalid access token.');
  }
  return { reference: body.reference, accessToken };
}

const SCOPED_ONLY_KEYS = new Set(['action', 'reference', 'accessToken']);

export function validateScopedOnly(body: Record<string, unknown>): ScopedRequestBase | ValidationFailure {
  for (const key of Object.keys(body)) {
    if (!SCOPED_ONLY_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }
  return validateScopedBase(body);
}

export interface ValidatedRescheduleRequest extends ScopedRequestBase {
  scheduledAtUtc: string;
  clientTimezone: string;
}

const RESCHEDULE_KEYS = new Set(['action', 'reference', 'accessToken', 'scheduledAtUtc', 'clientTimezone']);

export function validateRescheduleRequest(
  body: Record<string, unknown>,
  nowMs: number,
): ValidatedRescheduleRequest | ValidationFailure {
  for (const key of Object.keys(body)) {
    if (!RESCHEDULE_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }
  const base = validateScopedBase(body);
  if ('ok' in base) return base;
  const parsed = typeof body.scheduledAtUtc === 'string' ? Date.parse(body.scheduledAtUtc) : NaN;
  if (Number.isNaN(parsed)) return fail('A valid scheduled time is required.');
  if (parsed < nowMs - SCHEDULE_PAST_GRACE_MS) return fail('Scheduled time is in the past.');
  if (parsed > nowMs + MAX_SCHEDULE_AHEAD_DAYS * 24 * 60 * 60 * 1000) {
    return fail(`Scheduled time is more than ${MAX_SCHEDULE_AHEAD_DAYS} days ahead.`);
  }
  const clientTimezone = typeof body.clientTimezone === 'string' ? body.clientTimezone.trim() : '';
  if (!clientTimezone || !isValidTimezone(clientTimezone)) return fail('A valid IANA timezone is required.');
  return { ...base, scheduledAtUtc: new Date(parsed).toISOString(), clientTimezone };
}

// --- link submission -----------------------------------------------------------------

export interface ValidatedArtifact {
  kind: ArtifactKind;
  url: string | null;
  host: string | null;
  label: string | null;
  note: string | null;
}

export type UrlValidation = { ok: true; url: string; host: string } | { ok: false; reason: string };

const hostMatches = (host: string, allowed: string[]): boolean =>
  allowed.some((a) => host === a || host.endsWith(`.${a}`));

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[|.*\.local)$|^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i;

/**
 * Validate one client-provided URL. HTTPS only, no embedded credentials, no
 * private/localhost hosts, host allowlists for repository/Figma links. These
 * URLs are stored as untrusted metadata and are NEVER fetched or cloned.
 */
export function validateArtifactUrl(kind: ArtifactKind, rawUrl: string): UrlValidation {
  if (rawUrl.length > LIMITS.url.max) return { ok: false, reason: 'url_too_long' };
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (parsed.username || parsed.password) return { ok: false, reason: 'credentials_in_url' };
  const host = parsed.hostname.toLowerCase();
  if (!host || PRIVATE_HOST_PATTERN.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, reason: 'host_not_allowed' };
  }
  if (kind === 'repository' && !hostMatches(host, REPOSITORY_HOSTS)) {
    return { ok: false, reason: 'repository_host_not_allowed' };
  }
  if (kind === 'figma' && !hostMatches(host, FIGMA_HOSTS)) {
    return { ok: false, reason: 'figma_host_not_allowed' };
  }
  return { ok: true, url: parsed.toString().slice(0, LIMITS.url.max), host };
}

export interface ValidatedLinksRequest extends ScopedRequestBase {
  artifacts: ValidatedArtifact[];
}

const LINKS_KEYS = new Set(['action', 'reference', 'accessToken', 'links']);
const LINK_ITEM_KEYS = new Set(['kind', 'url', 'label', 'note']);

export function validateLinksRequest(body: Record<string, unknown>): ValidatedLinksRequest | ValidationFailure {
  for (const key of Object.keys(body)) {
    if (!LINKS_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }
  const base = validateScopedBase(body);
  if ('ok' in base) return base;
  if (!Array.isArray(body.links) || body.links.length === 0) return fail('links must be a non-empty array.');
  if (body.links.length > LIMITS.maxLinksPerRequest) {
    return fail(`At most ${LIMITS.maxLinksPerRequest} links per request.`);
  }
  const artifacts: ValidatedArtifact[] = [];
  for (const item of body.links) {
    if (!isDict(item)) return fail('Each link must be an object.');
    for (const key of Object.keys(item)) {
      if (!LINK_ITEM_KEYS.has(key)) return fail(`Unexpected link property "${key}".`);
    }
    const kind = (ARTIFACT_KINDS as readonly string[]).includes(item.kind as string)
      ? (item.kind as ArtifactKind)
      : null;
    if (!kind) return fail('Invalid link kind.');
    const label = optionalStr(item.label, LIMITS.label.max);
    const note = optionalStr(item.note, LIMITS.note.max);
    if (kind === 'note') {
      if (!note) return fail('A note requires text.');
      if (item.url !== undefined && item.url !== null && item.url !== '') {
        return fail('A note cannot carry a URL.');
      }
      artifacts.push({ kind, url: null, host: null, label, note });
      continue;
    }
    const rawUrl = typeof item.url === 'string' ? item.url.trim() : '';
    if (!rawUrl) return fail('A URL is required for this link kind.');
    const checked = validateArtifactUrl(kind, rawUrl);
    if (!checked.ok) return fail(`Link rejected (${checked.reason}).`);
    artifacts.push({ kind, url: checked.url, host: checked.host, label, note });
  }
  return { ...base, artifacts };
}

export interface ValidatedReviewRequest extends ScopedRequestBase {
  message: string | null;
}

const REVIEW_KEYS = new Set(['action', 'reference', 'accessToken', 'message']);

export function validateReviewRequest(body: Record<string, unknown>): ValidatedReviewRequest | ValidationFailure {
  for (const key of Object.keys(body)) {
    if (!REVIEW_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }
  const base = validateScopedBase(body);
  if ('ok' in base) return base;
  const message = optionalStr(body.message, LIMITS.reviewMessage.max);
  return { ...base, message };
}

// --- join-window evaluation ------------------------------------------------------------

export interface JoinWindowInput {
  meetingKind: 'instant' | 'scheduled';
  status: string;
  scheduledAtMs: number | null;
  earlyJoinMinutes: number;
  createdAtMs: number;
  nowMs: number;
}

export type JoinWindowResult =
  | { canJoin: true }
  | { canJoin: false; reason: 'too_early' | 'expired' | 'cancelled' | 'completed' | 'not_joinable'; opensAtMs?: number };

/** Deterministic join-window policy — unit-tested, no clock access of its own. */
export function evaluateJoinWindow(input: JoinWindowInput): JoinWindowResult {
  if (input.status === 'cancelled') return { canJoin: false, reason: 'cancelled' };
  if (input.status === 'completed') return { canJoin: false, reason: 'completed' };
  if (input.status === 'expired' || input.status === 'error') return { canJoin: false, reason: 'expired' };
  if (input.status !== 'scheduled' && input.status !== 'in_progress') {
    return { canJoin: false, reason: 'not_joinable' };
  }
  if (input.meetingKind === 'instant') {
    if (input.nowMs > input.createdAtMs + INSTANT_MEETING_TTL_MS) {
      return { canJoin: false, reason: 'expired' };
    }
    return { canJoin: true };
  }
  if (input.scheduledAtMs === null) return { canJoin: false, reason: 'not_joinable' };
  const opensAtMs = input.scheduledAtMs - input.earlyJoinMinutes * 60 * 1000;
  if (input.nowMs < opensAtMs) return { canJoin: false, reason: 'too_early', opensAtMs };
  if (input.nowMs > input.scheduledAtMs + SCHEDULED_JOIN_GRACE_MS) {
    return { canJoin: false, reason: 'expired' };
  }
  return { canJoin: true };
}
