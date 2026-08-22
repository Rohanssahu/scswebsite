import type { EstimateSnapshot } from '@/policy/estimationPolicy';

// Shared types for secure lead submission (browser → submit-lead Edge
// Function). Field names mirror the database columns so the payload mapping
// stays obvious end to end.

export type LeadAction = 'contact' | 'consultation' | 'project_requirement' | 'human_review';

export type PreferredContactMethod = 'email' | 'phone' | 'whatsapp';
export type LeadProjectMode = 'new' | 'existing';

export interface LeadDetails {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  preferred_language?: string;
  preferred_contact_method?: PreferredContactMethod;
  service?: string;
  project_mode?: LeadProjectMode;
  project_summary?: string;
  budget_range?: string;
  timeline?: string;
}

/**
 * Whitelisted preliminary-estimate payload. Always preliminary — never a
 * quotation. Every figure was produced by the shared estimation policy
 * (src/policy/estimationPolicy.ts) at the standard rate.
 */
export interface PreliminaryEstimatePayload {
  status: 'preliminary';
  currency: 'USD';
  total_hours: number;
  total_cost: number;
  hourly_rate_usd: number;
  weekly_capacity_hours: number;
  estimated_weeks: number;
  health_score?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  team: Array<{ role: string; hours: number; hourly_rate: number }>;
  /** The structured budget-fit snapshot the admin team reviews. */
  budget_plan: EstimateSnapshot;
  /** Which option the client picked, when they picked one. */
  client_selected_option: 'base' | 'recommended' | 'growth' | null;
  /** Always true — no preliminary estimate is a commitment. */
  human_review_required: true;
}

export interface RequirementPayload {
  mode: LeadProjectMode;
  answers: Record<string, string | string[]>;
  requirement_summary?: string;
  demo_estimate: PreliminaryEstimatePayload;
  estimate_version: string;
  selected_language?: string;
  current_route?: string;
}

export interface ReviewPayload {
  reason?: string;
  visitor_message?: string;
}

export interface SubmitLeadRequest {
  action: LeadAction;
  turnstileToken: string;
  consent: true;
  /**
   * Honeypot — must always be sent empty; bots that fill it are rejected.
   * Deliberately non-semantic name: autofill/password managers must never
   * recognize it (a semantic name like "website" caused false rejections
   * of real autofill-using visitors).
   */
  scs_hp_check: string;
  lead: LeadDetails;
  requirement?: RequirementPayload;
  review?: ReviewPayload;
  context?: { route?: string; language?: string };
}

export interface SubmitLeadSuccess {
  ok: true;
  action: LeadAction;
  referenceCode: string;
  reviewStatus?: 'requested';
}

export interface SubmitLeadFailure {
  ok: false;
  error: string;
  message: string;
}
