// Pure presentation and query helpers for the owner dashboard.
//
// The database columns are the source of truth: every label here maps a REAL
// column value onto owner-facing wording. Nothing is invented — where a field
// was never captured, the helpers return null and the UI shows an honest dash.

import { normalizePhone } from '@/lib/leadValidation';
import type {
  AdminLeadRow,
  AdminNoteRow,
  LeadStatus,
  LeadType,
  ProjectMode,
} from '@/services/admin/adminTypes';

// --- statuses ----------------------------------------------------------------

/** The statuses the dashboard offers, in pipeline order. */
export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'hired',
  'closed',
];

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal_sent: 'Proposal sent',
  hired: 'Hired',
  closed: 'Closed',
  // Legacy values still present on rows written before the dashboard existed.
  in_review: 'In review',
  spam: 'Spam',
};

export function leadStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

/** Tailwind classes per status — orange/pink/purple family, plus neutrals. */
export function leadStatusTone(status: string | null | undefined): string {
  switch (status) {
    case 'new':
      return 'bg-orange-100 text-orange-800 ring-orange-200';
    case 'contacted':
      return 'bg-pink-100 text-pink-800 ring-pink-200';
    case 'qualified':
      return 'bg-purple-100 text-purple-800 ring-purple-200';
    case 'proposal_sent':
      return 'bg-indigo-100 text-indigo-800 ring-indigo-200';
    case 'hired':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
    case 'closed':
      return 'bg-gray-100 text-gray-700 ring-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 ring-gray-200';
  }
}

/**
 * Moving a lead to a terminal state is worth a confirmation step; walking it
 * along the pipeline is not.
 */
export function statusNeedsConfirmation(next: LeadStatus): boolean {
  return next === 'hired' || next === 'closed';
}

export function isSelectableStatus(value: string): value is LeadStatus {
  return (LEAD_STATUS_OPTIONS as string[]).includes(value);
}

// --- sources and project type -------------------------------------------------

const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  contact: 'Contact form',
  consultation: 'Consultation',
  project_requirement: 'Project analysis',
  human_review: 'Human review',
};

/** Filter values for the source dropdown, mapped to `leads.lead_type`. */
export const LEAD_TYPE_OPTIONS: LeadType[] = [
  'contact',
  'consultation',
  'project_requirement',
  'human_review',
];

export function leadTypeLabel(leadType: string | null | undefined): string {
  if (!leadType) return 'Unknown';
  return LEAD_TYPE_LABELS[leadType as LeadType] ?? leadType;
}

/**
 * The source shown in the table. `lead_type` is the authoritative channel;
 * a meeting reference means it came through an AI consultation, which the
 * `source` column alone does not always say.
 */
export function leadSourceLabel(row: Pick<AdminLeadRow, 'lead_type' | 'meeting_reference'>): string {
  if (row.meeting_reference) return 'AI consultation';
  return leadTypeLabel(row.lead_type);
}

const MEETING_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  error: 'Error',
};

/** consultation_meetings.status, as written by the meeting Edge Functions. */
export function meetingStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return MEETING_STATUS_LABELS[status] ?? status;
}

export function projectTypeLabel(mode: ProjectMode | null | undefined): string {
  if (mode === 'new') return 'New project';
  if (mode === 'existing') return 'Existing project';
  return '—';
}

/** `project_mode` on the lead, falling back to the requirement row's mode. */
export function resolveProjectMode(
  row: Pick<AdminLeadRow, 'project_mode' | 'requirement_mode'>,
): ProjectMode | null {
  return row.project_mode ?? row.requirement_mode ?? null;
}

// --- formatting ---------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$' };

function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return '$';
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * "$12,000 – $18,000", or a single figure when both ends match. Returns null
 * when no estimate exists, so callers can render a truthful empty state rather
 * than a misleading "$0".
 */
export function formatCostRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined = 'USD',
): string | null {
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  const symbol = currencySymbol(currency);
  if (min === max) return `${symbol}${groupThousands(min)}`;
  return `${symbol}${groupThousands(min)} – ${symbol}${groupThousands(max)}`;
}

/** "320 – 420 hrs", or null when unknown. */
export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string,
): string | null {
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (min === max) return `${groupThousands(min)} ${unit}`;
  return `${groupThousands(min)} – ${groupThousands(max)} ${unit}`;
}

/** Short, locale-independent date: "21 Aug 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "21 Aug 2026, 14:05 UTC" — timestamps are always shown with their zone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${formatDate(iso)}, ${hh}:${mm} UTC`;
}

// --- safe outbound links ------------------------------------------------------

/**
 * Client-supplied URLs are untrusted. Only absolute `https:` URLs are ever
 * turned into an anchor; `http:`, `javascript:`, `data:` and relative values
 * are rendered as plain text by the caller.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > 2048) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!parsed.hostname || parsed.hostname === 'localhost') return null;
  return parsed.toString();
}

/** wa.me link for a stored phone number, or null when it is unusable. */
export function whatsAppLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized.replace(/^\+/, '')}`;
}

export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhone(phone);
  return normalized ? `tel:${normalized}` : null;
}

// --- list filters, search and pagination --------------------------------------

export const ADMIN_PAGE_SIZE = 20;

export type DateRangeKey = 'all' | 'today' | '7d' | '30d' | '90d';

export const DATE_RANGE_OPTIONS: Array<{ value: DateRangeKey; label: string }> = [
  { value: 'all', label: 'Any date' },
  { value: 'today', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export interface AdminLeadFilters {
  search: string;
  leadType: LeadType | 'all';
  status: LeadStatus | 'all';
  dateRange: DateRangeKey;
  page: number;
  pageSize: number;
}

export const DEFAULT_LEAD_FILTERS: AdminLeadFilters = {
  search: '',
  leadType: 'all',
  status: 'all',
  dateRange: 'all',
  page: 1,
  pageSize: ADMIN_PAGE_SIZE,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO lower bound for a range key, or null for "any date". */
export function dateRangeSince(range: DateRangeKey, now: number = Date.now()): string | null {
  const days: Partial<Record<DateRangeKey, number>> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
  const span = days[range];
  if (!span) return null;
  return new Date(now - span * DAY_MS).toISOString();
}

/**
 * A search term is only ever used inside a PostgREST `ilike` pattern. Commas
 * and parentheses would break out of the `or(...)` grouping, `*` and `%` are
 * wildcards, and `\` escapes — all of them are stripped rather than escaped,
 * because none is meaningful in a reference code, name or e-mail search.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[,()*%\\"']/g, '')
    .slice(0, 80);
}

/**
 * The PostgREST `or` expression for the search box. Searches only safe,
 * indexed-ish identity columns — never the free-text project summary, and
 * never a column the browser cannot select.
 */
export function buildSearchExpression(term: string): string | null {
  const safe = sanitizeSearchTerm(term);
  if (safe.length < 2) return null;
  return [
    `reference_code.ilike.%${safe}%`,
    `name.ilike.%${safe}%`,
    `email.ilike.%${safe}%`,
  ].join(',');
}

/** Inclusive `range()` bounds for a 1-based page. Never fetches everything. */
export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const size = Math.min(Math.max(Math.trunc(pageSize) || ADMIN_PAGE_SIZE, 1), 100);
  const safePage = Math.max(Math.trunc(page) || 1, 1);
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1 };
}

export function totalPages(total: number, pageSize: number): number {
  const size = Math.max(pageSize, 1);
  return Math.max(Math.ceil((Number.isFinite(total) ? total : 0) / size), 1);
}

/** Human summary under the table: "Showing 1–20 of 143". */
export function rangeSummary(total: number, page: number, pageSize: number, rows: number): string {
  if (total === 0 || rows === 0) return 'Showing 0 leads';
  const { from } = pageRange(page, pageSize);
  return `Showing ${from + 1}–${from + rows} of ${total}`;
}

/**
 * Stable TanStack Query keys. Filters are spelled out field by field (rather
 * than spreading an object) so a key never changes shape between renders.
 */
export const adminQueryKeys = {
  stats: () => ['admin', 'stats'] as const,
  leads: (filters: AdminLeadFilters) =>
    [
      'admin',
      'leads',
      sanitizeSearchTerm(filters.search),
      filters.leadType,
      filters.status,
      filters.dateRange,
      filters.page,
      filters.pageSize,
    ] as const,
  unsubmittedConsultations: () => ['admin', 'unsubmitted-consultations'] as const,
  leadDetail: (id: string) => ['admin', 'lead', id] as const,
  leadNotes: (id: string) => ['admin', 'lead', id, 'notes'] as const,
};

// --- requirement / consultation field rendering --------------------------------

/**
 * Owner-facing labels for the requirement answer keys actually written by the
 * project-analysis flow (src/data/analysisQuestions.ts) and by the consultation
 * agent (supabase/functions/consultation-agent/validation.ts). Keys not listed
 * here are still displayed, with a de-slugged label — the dashboard never
 * silently drops something the client told us.
 */
const FIELD_LABELS: Record<string, string> = {
  // project-analysis (new project)
  idea: 'Idea',
  audience: 'Target users',
  features: 'Main features',
  platform: 'Platform',
  modules: 'Core modules',
  timeline: 'Timeline',
  budget: 'Budget',
  summary: 'Summary',
  // project-analysis (existing project)
  projectType: 'Project type',
  technologies: 'Technology preference',
  working: 'What works today',
  broken: 'Existing problems',
  newFeatures: 'Requested features',
  projectLink: 'Repository / project link',
  urgency: 'Urgency',
  // consultation agent state
  intent: 'Intent',
  business_goal: 'Business goal',
  target_users: 'Target users',
  target_countries: 'Target countries',
  platforms: 'Platforms',
  core_features: 'Core features',
  optional_features: 'Optional features',
  user_roles: 'User roles',
  admin_panel: 'Admin panel',
  integrations: 'Integrations',
  authentication: 'Authentication',
  payments: 'Payments',
  notifications: 'Notifications',
  expected_scale: 'Expected scale',
  design_status: 'Design status',
  design_figma_availability: 'Design files',
  existing_assets: 'Existing assets',
  preferred_technology: 'Technology preference',
  deadline: 'Deadline',
  budget_range: 'Budget',
  support_expectations: 'Support expectations',
  engagement_model: 'Engagement model',
  developer_preference: 'Developer preference',
  weekly_capacity_preference: 'Weekly capacity preference',
  security_compliance: 'Security / compliance',
  current_technology: 'Current technology',
  current_status: 'Current status',
  main_problems: 'Existing problems',
  error_symptoms: 'Error symptoms',
  repository_availability: 'Repository availability',
  api_documentation: 'API documentation',
  deployment_details: 'Deployment details',
  secure_upload_needed: 'Secure upload needed',
  assumptions: 'Assumptions',
  contradictions: 'Contradictions',
  risks: 'Risks',
  suggested_features: 'Suggested features',
  deferred_decisions: 'Deferred decisions',
};

export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface FieldRow {
  key: string;
  label: string;
  value: string;
}

/**
 * Flatten a client-submitted JSON blob into label/value rows for display.
 * Values are stringified (never rendered as HTML by the caller) and truncated;
 * objects are dropped rather than dumped, so nothing unexpected reaches the UI.
 */
export function toFieldRows(source: unknown, limit = 60): FieldRow[] {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return [];
  const rows: FieldRow[] = [];
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (rows.length >= limit) break;
    const text = stringifyFieldValue(value);
    if (!text) continue;
    rows.push({ key, label: fieldLabel(key), value: text });
  }
  return rows;
}

function stringifyFieldValue(value: unknown): string {
  if (typeof value === 'string') return value.trim().slice(0, 2000);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string' || typeof item === 'number')
      .slice(0, 40)
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ')
      .slice(0, 2000);
  }
  return '';
}

/** Read a numeric field out of an untrusted JSON blob. */
export function jsonNumber(source: unknown, key: string): number | null {
  if (typeof source !== 'object' || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Read a string-array field out of an untrusted JSON blob. */
export function jsonStringList(source: unknown, key: string, limit = 40): string[] {
  if (typeof source !== 'object' || source === null) return [];
  const value = (source as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

/** Read a plain string field out of an untrusted JSON blob. */
export function jsonString(source: unknown, key: string): string | null {
  if (typeof source !== 'object' || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 4000) : null;
}

// --- notes --------------------------------------------------------------------

export const NOTE_MAX_LENGTH = 4000;

export function validateNote(text: string): string | null {
  const value = text.trim();
  if (!value) return 'Write something before saving the note.';
  if (value.length > NOTE_MAX_LENGTH) return `Notes are limited to ${NOTE_MAX_LENGTH} characters.`;
  return null;
}

/** Only the author may edit a note; the RLS policy enforces the same rule. */
export function canEditNote(note: AdminNoteRow, userId: string | null | undefined): boolean {
  return Boolean(userId) && note.author_id === userId;
}

/** Wording that must accompany every generated figure in the dashboard. */
export const PRELIMINARY_ESTIMATE_DISCLAIMER =
  'Preliminary estimate — generated from the client’s own answers. Not a final quotation.';
