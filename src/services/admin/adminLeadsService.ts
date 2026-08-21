// Central typed data layer for the owner dashboard.
//
// RULES THIS FILE ENFORCES
//   * Every read goes through an `admin_*` database view, with an EXPLICIT
//     column list — never `select('*')`. A column the view does not expose
//     cannot even be named here.
//   * Every list read is paginated and filtered server-side. The dashboard
//     never downloads the table.
//   * Postgres/PostgREST error text never reaches the UI: failures collapse to
//     a small code set with fixed, safe messages.
//   * Writes never touch a table. The three security-definer RPCs
//     (admin_set_lead_status / admin_add_lead_note / admin_update_lead_note)
//     re-check authorization in SQL and each touch exactly one column.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/services/admin/adminClient';
import {
  buildSearchExpression,
  dateRangeSince,
  pageRange,
  type AdminLeadFilters,
} from '@/services/admin/adminLeadsCore';
import type {
  AdminArtifactRow,
  AdminConsultationRow,
  AdminEstimateRow,
  AdminLeadDetail,
  AdminLeadRow,
  AdminLeadStats,
  AdminLeadsPage,
  AdminMessageRow,
  AdminNoteRow,
  AdminProposalRow,
  AdminRequirementRow,
  AdminReviewRow,
  AdminUnsubmittedConsultationRow,
  LeadStatus,
} from '@/services/admin/adminTypes';

export type AdminDataErrorCode =
  | 'not_configured'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'unknown';

const ADMIN_DATA_MESSAGES: Record<AdminDataErrorCode, string> = {
  not_configured: 'The dashboard is not configured for this environment.',
  session_expired: 'Your session expired. Please sign in again.',
  forbidden: 'This account does not have dashboard access.',
  not_found: 'That record no longer exists.',
  network: 'Could not load data. Check your connection and try again.',
  unknown: 'Something went wrong loading this data. Please try again.',
};

export class AdminDataError extends Error {
  constructor(public code: AdminDataErrorCode) {
    super(ADMIN_DATA_MESSAGES[code]);
    this.name = 'AdminDataError';
  }
}

export function isSessionExpired(error: unknown): boolean {
  return error instanceof AdminDataError && error.code === 'session_expired';
}

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
}

/**
 * Collapse a PostgREST error into a safe code. The original `message`,
 * `details` and `hint` are deliberately dropped — they can carry SQL, column
 * names and row values.
 */
export function mapDataError(error: PostgrestErrorLike | null | undefined): AdminDataError {
  if (!error) return new AdminDataError('unknown');
  const code = error.code ?? '';
  const status = error.status;
  // PGRST301 = JWT expired / invalid; 401 covers a revoked session.
  if (code === 'PGRST301' || code === 'PGRST303' || status === 401) {
    return new AdminDataError('session_expired');
  }
  // 42501 = insufficient privilege; 42P01 = relation missing (migration not applied).
  if (code === '42501' || status === 403) return new AdminDataError('forbidden');
  if (code === 'PGRST116') return new AdminDataError('not_found');
  if (status !== undefined && status >= 500) return new AdminDataError('network');
  if (!code && !status) return new AdminDataError('network');
  return new AdminDataError('unknown');
}

function requireClient(client?: SupabaseClient | null): SupabaseClient {
  const resolved = client ?? getAdminClient();
  if (!resolved) throw new AdminDataError('not_configured');
  return resolved;
}

// --- explicit column lists (one per view) ------------------------------------

export const LEAD_LIST_COLUMNS = [
  'id',
  'reference_code',
  'lead_type',
  'source',
  'name',
  'email',
  'phone',
  'company',
  'country',
  'preferred_contact_method',
  'preferred_language',
  'service',
  'project_mode',
  'status',
  'human_review_requested',
  'created_at',
  'updated_at',
  'requirement_mode',
  'meeting_reference',
  'meeting_status',
  'review_status',
  'estimate_kind',
  'estimate_currency',
  'estimate_hours_min',
  'estimate_hours_max',
  'estimate_cost_min',
  'estimate_cost_max',
].join(', ');

/**
 * The detail screen additionally needs the three long-text columns. They are
 * deliberately left out of the list query so a page of 20 rows stays small.
 */
export const LEAD_DETAIL_COLUMNS = [LEAD_LIST_COLUMNS, 'project_summary', 'budget_range', 'timeline'].join(
  ', ',
);

export const STATS_COLUMNS = 'new_leads, consultations, reviews_requested, qualified_leads';

export const REQUIREMENT_COLUMNS =
  'id, lead_id, mode, answers, requirement_summary, demo_estimate, estimate_version, status, created_at';

export const ESTIMATE_COLUMNS = [
  'id',
  'lead_id',
  'requirement_id',
  'status',
  'requires_human_review',
  'currency',
  'config_version',
  'breakdown',
  'total_hours_min',
  'total_hours_max',
  'total_cost_min',
  'total_cost_max',
  'duration_weeks_min',
  'duration_weeks_max',
  'confidence',
  'created_at',
].join(', ');

export const REVIEW_COLUMNS =
  'id, lead_id, requirement_id, reason, visitor_message, status, assigned_to, reviewed_at, created_at, updated_at';

export const CONSULTATION_COLUMNS = [
  'id',
  'lead_id',
  'public_reference',
  'meeting_kind',
  'status',
  'review_status',
  'name',
  'email',
  'phone',
  'company',
  'client_timezone',
  'scheduled_at',
  'selected_language',
  'consent_at',
  'transcript_consent',
  'transcript_consent_at',
  'analysis_snapshot',
  'requirements',
  'requirement_summary',
  'join_count',
  'finalized_at',
  'started_at',
  'ended_at',
  'created_at',
].join(', ');

export const UNSUBMITTED_CONSULTATION_COLUMNS = [
  'id',
  'public_reference',
  'meeting_kind',
  'status',
  'review_status',
  'name',
  'email',
  'phone',
  'company',
  'scheduled_at',
  'started_at',
  'ended_at',
  'selected_language',
  'transcript_consent',
  'join_count',
  'requirement_summary',
  'created_at',
].join(', ');

export const PROPOSAL_COLUMNS = [
  'id',
  'meeting_id',
  'lead_id',
  'version',
  'status',
  'requires_human_review',
  'currency',
  'config_version',
  'proposal',
  'total_hours_min',
  'total_hours_max',
  'total_cost_min',
  'total_cost_max',
  'duration_weeks_min',
  'duration_weeks_max',
  'weekly_capacity_hours',
  'confidence',
  'created_at',
].join(', ');

export const ARTIFACT_COLUMNS =
  'id, meeting_id, lead_id, kind, url, host, label, note, created_at';

export const MESSAGE_COLUMNS = 'id, meeting_id, lead_id, sender, content, created_at';

export const NOTE_COLUMNS = 'id, lead_id, author_id, note, created_at, updated_at';

/** Transcript pages are capped — a long meeting must not blow up the request. */
export const TRANSCRIPT_LIMIT = 500;

// --- reads --------------------------------------------------------------------

export async function fetchLeadStats(client?: SupabaseClient | null): Promise<AdminLeadStats> {
  const supabase = requireClient(client);
  const { data, error } = await supabase
    .from('admin_lead_stats')
    .select(STATS_COLUMNS)
    .maybeSingle();
  if (error) throw mapDataError(error as PostgrestErrorLike);
  if (!data) {
    // No row means is_active_admin() was false — the guard will catch up.
    return { new_leads: 0, consultations: 0, reviews_requested: 0, qualified_leads: 0 };
  }
  return data as unknown as AdminLeadStats;
}

export async function fetchLeads(
  filters: AdminLeadFilters,
  client?: SupabaseClient | null,
): Promise<AdminLeadsPage> {
  const supabase = requireClient(client);
  const { from, to } = pageRange(filters.page, filters.pageSize);

  let query = supabase
    .from('admin_leads_list')
    .select(LEAD_LIST_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.leadType !== 'all') query = query.eq('lead_type', filters.leadType);
  if (filters.status !== 'all') query = query.eq('status', filters.status);

  const since = dateRangeSince(filters.dateRange);
  if (since) query = query.gte('created_at', since);

  const search = buildSearchExpression(filters.search);
  if (search) query = query.or(search);

  const { data, error, count } = await query;
  if (error) throw mapDataError(error as PostgrestErrorLike);

  return {
    rows: (data ?? []) as unknown as AdminLeadRow[],
    total: typeof count === 'number' ? count : ((data as unknown[] | null)?.length ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/**
 * Consultation meetings that never became a lead. Shown as their own section so
 * the dashboard is truthful about abandoned/incomplete sessions instead of
 * inventing lead rows for them.
 */
export async function fetchUnsubmittedConsultations(
  limit = 10,
  client?: SupabaseClient | null,
): Promise<AdminUnsubmittedConsultationRow[]> {
  const supabase = requireClient(client);
  const { data, error } = await supabase
    .from('admin_unsubmitted_consultations')
    .select(UNSUBMITTED_CONSULTATION_COLUMNS)
    .order('created_at', { ascending: false })
    .range(0, Math.max(limit - 1, 0));
  if (error) throw mapDataError(error as PostgrestErrorLike);
  return (data ?? []) as unknown as AdminUnsubmittedConsultationRow[];
}

/**
 * Everything route 3 shows, assembled from the safe views. Related records are
 * fetched by lead id / meeting id; the transcript request is only issued when a
 * meeting actually recorded consent (and the view would refuse it anyway).
 */
export async function fetchLeadDetail(
  leadId: string,
  client?: SupabaseClient | null,
): Promise<AdminLeadDetail> {
  const supabase = requireClient(client);

  const leadResult = await supabase
    .from('admin_leads_list')
    .select(LEAD_DETAIL_COLUMNS)
    .eq('id', leadId)
    .maybeSingle();
  if (leadResult.error) throw mapDataError(leadResult.error as PostgrestErrorLike);
  if (!leadResult.data) throw new AdminDataError('not_found');
  const lead = leadResult.data as unknown as AdminLeadRow;

  const [requirements, estimates, reviews, consultations, notes] = await Promise.all([
    supabase
      .from('admin_lead_requirements')
      .select(REQUIREMENT_COLUMNS)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_lead_estimates')
      .select(ESTIMATE_COLUMNS)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_lead_reviews')
      .select(REVIEW_COLUMNS)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_consultations')
      .select(CONSULTATION_COLUMNS)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_lead_notes')
      .select(NOTE_COLUMNS)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false }),
  ]);

  for (const result of [requirements, estimates, reviews, consultations, notes]) {
    if (result.error) throw mapDataError(result.error as PostgrestErrorLike);
  }

  const consultationRows = (consultations.data ?? []) as unknown as AdminConsultationRow[];
  const meetingIds = consultationRows.map((row) => row.id);
  const consented = consultationRows.filter((row) => row.transcript_consent).map((row) => row.id);

  const [proposals, artifacts, transcript] = await Promise.all([
    meetingIds.length
      ? supabase
          .from('admin_consultation_proposals')
          .select(PROPOSAL_COLUMNS)
          .in('meeting_id', meetingIds)
          .order('version', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    meetingIds.length
      ? supabase
          .from('admin_consultation_artifacts')
          .select(ARTIFACT_COLUMNS)
          .in('meeting_id', meetingIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    consented.length
      ? supabase
          .from('admin_consultation_messages')
          .select(MESSAGE_COLUMNS)
          .in('meeting_id', consented)
          .order('created_at', { ascending: true })
          .range(0, TRANSCRIPT_LIMIT - 1)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [proposals, artifacts, transcript]) {
    if (result.error) throw mapDataError(result.error as PostgrestErrorLike);
  }

  return {
    lead,
    requirements: (requirements.data ?? []) as unknown as AdminRequirementRow[],
    estimates: (estimates.data ?? []) as unknown as AdminEstimateRow[],
    reviews: (reviews.data ?? []) as unknown as AdminReviewRow[],
    consultations: consultationRows,
    proposals: (proposals.data ?? []) as unknown as AdminProposalRow[],
    artifacts: (artifacts.data ?? []) as unknown as AdminArtifactRow[],
    transcript: (transcript.data ?? []) as unknown as AdminMessageRow[],
    notes: (notes.data ?? []) as unknown as AdminNoteRow[],
  };
}

export async function fetchLeadNotes(
  leadId: string,
  client?: SupabaseClient | null,
): Promise<AdminNoteRow[]> {
  const supabase = requireClient(client);
  const { data, error } = await supabase
    .from('admin_lead_notes')
    .select(NOTE_COLUMNS)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw mapDataError(error as PostgrestErrorLike);
  return (data ?? []) as unknown as AdminNoteRow[];
}

// --- writes -------------------------------------------------------------------
//
// All three go through a security-definer RPC. The browser holds no INSERT,
// UPDATE or DELETE privilege on any table, so these are the only mutations that
// exist — and each one validates its own authorization in SQL.

/** Move a lead along the pipeline. The function accepts no other column. */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  client?: SupabaseClient | null,
): Promise<{ id: string; reference_code: string; status: LeadStatus; updated_at: string }> {
  const supabase = requireClient(client);
  const { data, error } = await supabase.rpc('admin_set_lead_status', {
    p_lead_id: leadId,
    p_status: status,
  });
  if (error) throw mapDataError(error as PostgrestErrorLike);
  if (!data) throw new AdminDataError('not_found');
  return data as unknown as {
    id: string;
    reference_code: string;
    status: LeadStatus;
    updated_at: string;
  };
}

/** The author is taken from auth.uid() inside the function, never sent. */
export async function addLeadNote(
  leadId: string,
  note: string,
  client?: SupabaseClient | null,
): Promise<AdminNoteRow> {
  const supabase = requireClient(client);
  const { data, error } = await supabase.rpc('admin_add_lead_note', {
    p_lead_id: leadId,
    p_note: note.trim(),
  });
  if (error) throw mapDataError(error as PostgrestErrorLike);
  if (!data) throw new AdminDataError('unknown');
  return data as unknown as AdminNoteRow;
}

/** Editing is refused by the function unless the caller wrote the note. */
export async function updateLeadNote(
  noteId: string,
  note: string,
  client?: SupabaseClient | null,
): Promise<AdminNoteRow> {
  const supabase = requireClient(client);
  const { data, error } = await supabase.rpc('admin_update_lead_note', {
    p_note_id: noteId,
    p_note: note.trim(),
  });
  if (error) throw mapDataError(error as PostgrestErrorLike);
  if (!data) throw new AdminDataError('not_found');
  return data as unknown as AdminNoteRow;
}
