// Row shapes for the owner dashboard. Each interface mirrors exactly one
// database view from 20260821300002_admin_dashboard_access.sql, so the columns
// requested by adminLeadsService are guaranteed to exist and nothing sensitive
// can be asked for by accident.

export type AdminRole = 'owner' | 'admin';

export interface AdminMembership {
  userId: string;
  role: AdminRole;
  isActive: boolean;
}

/** Lead status vocabulary after the additive widening migration. */
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'hired'
  | 'closed'
  // legacy values that may still exist on older rows
  | 'in_review'
  | 'spam';

export type LeadType = 'contact' | 'consultation' | 'project_requirement' | 'human_review';
export type ProjectMode = 'new' | 'existing';

/** public.admin_leads_list */
export interface AdminLeadRow {
  id: string;
  reference_code: string;
  lead_type: LeadType;
  source: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  preferred_contact_method: 'email' | 'phone' | 'whatsapp' | null;
  preferred_language: string | null;
  service: string | null;
  project_mode: ProjectMode | null;
  /** Selected only by the detail query — the list keeps its payload small. */
  project_summary?: string | null;
  budget_range?: string | null;
  timeline?: string | null;
  status: LeadStatus;
  human_review_requested: boolean;
  created_at: string;
  updated_at: string;
  requirement_mode: ProjectMode | null;
  meeting_reference: string | null;
  meeting_status: string | null;
  review_status: string | null;
  estimate_kind: 'consultation_proposal' | 'voice_estimate' | null;
  estimate_currency: string | null;
  estimate_hours_min: number | null;
  estimate_hours_max: number | null;
  estimate_cost_min: number | null;
  estimate_cost_max: number | null;
}

/** public.admin_lead_stats (single row) */
export interface AdminLeadStats {
  new_leads: number;
  consultations: number;
  reviews_requested: number;
  qualified_leads: number;
}

/** public.admin_lead_requirements */
export interface AdminRequirementRow {
  id: string;
  lead_id: string;
  mode: ProjectMode;
  answers: Record<string, unknown>;
  requirement_summary: string | null;
  demo_estimate: Record<string, unknown>;
  estimate_version: string;
  status: string;
  created_at: string;
}

/** public.admin_lead_estimates */
export interface AdminEstimateRow {
  id: string;
  lead_id: string | null;
  requirement_id: string | null;
  status: string;
  requires_human_review: boolean;
  currency: string;
  config_version: string;
  breakdown: Record<string, unknown>;
  total_hours_min: number;
  total_hours_max: number;
  total_cost_min: number;
  total_cost_max: number;
  duration_weeks_min: number;
  duration_weeks_max: number;
  confidence: 'low' | 'medium' | 'high';
  created_at: string;
}

/** public.admin_lead_reviews */
export interface AdminReviewRow {
  id: string;
  lead_id: string;
  requirement_id: string | null;
  reason: string | null;
  visitor_message: string | null;
  status: 'requested' | 'in_review' | 'completed' | 'rejected';
  assigned_to: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** public.admin_consultations */
export interface AdminConsultationRow {
  id: string;
  lead_id: string | null;
  public_reference: string;
  meeting_kind: 'instant' | 'scheduled';
  status: string;
  review_status: 'none' | 'requested';
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  client_timezone: string | null;
  scheduled_at: string | null;
  selected_language: string | null;
  consent_at: string;
  transcript_consent: boolean;
  transcript_consent_at: string | null;
  analysis_snapshot: Record<string, unknown>;
  requirements: Record<string, unknown>;
  requirement_summary: string | null;
  join_count: number;
  finalized_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

/** public.admin_unsubmitted_consultations */
export interface AdminUnsubmittedConsultationRow {
  id: string;
  public_reference: string;
  meeting_kind: 'instant' | 'scheduled';
  status: string;
  review_status: 'none' | 'requested';
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  selected_language: string | null;
  transcript_consent: boolean;
  join_count: number;
  requirement_summary: string | null;
  created_at: string;
}

/** public.admin_consultation_proposals */
export interface AdminProposalRow {
  id: string;
  meeting_id: string;
  lead_id: string | null;
  version: number;
  status: string;
  requires_human_review: boolean;
  currency: string;
  config_version: string;
  proposal: Record<string, unknown>;
  total_hours_min: number;
  total_hours_max: number;
  total_cost_min: number;
  total_cost_max: number;
  duration_weeks_min: number;
  duration_weeks_max: number;
  weekly_capacity_hours: number;
  confidence: 'low' | 'medium' | 'high';
  created_at: string;
}

/** public.admin_consultation_artifacts */
export interface AdminArtifactRow {
  id: string;
  meeting_id: string;
  lead_id: string | null;
  kind: 'repository' | 'figma' | 'api_docs' | 'website' | 'other_link' | 'note';
  url: string | null;
  host: string | null;
  label: string | null;
  note: string | null;
  created_at: string;
}

/** public.admin_consultation_messages — only exists when consent was given. */
export interface AdminMessageRow {
  id: string;
  meeting_id: string;
  lead_id: string | null;
  sender: 'client' | 'buddy' | 'system';
  content: string;
  created_at: string;
}

/** public.lead_internal_notes */
export interface AdminNoteRow {
  id: string;
  lead_id: string;
  author_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLeadDetail {
  lead: AdminLeadRow;
  requirements: AdminRequirementRow[];
  estimates: AdminEstimateRow[];
  reviews: AdminReviewRow[];
  consultations: AdminConsultationRow[];
  proposals: AdminProposalRow[];
  artifacts: AdminArtifactRow[];
  /** Empty when the client did not consent to transcript storage. */
  transcript: AdminMessageRow[];
  notes: AdminNoteRow[];
}

export interface AdminLeadsPage {
  rows: AdminLeadRow[];
  total: number;
  page: number;
  pageSize: number;
}
