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

/** Whitelisted demo-estimate payload. Always demo/preliminary — never a quotation. */
export interface DemoEstimatePayload {
  status: 'demo';
  currency: 'USD';
  total_hours: number;
  total_cost: number;
  weekly_capacity_hours: number;
  estimated_weeks: number;
  health_score?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  team: Array<{ role: string; hours: number; hourly_rate: number }>;
}

export interface RequirementPayload {
  mode: LeadProjectMode;
  answers: Record<string, string | string[]>;
  requirement_summary?: string;
  demo_estimate: DemoEstimatePayload;
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
  /** Honeypot — must always be sent empty; bots that fill it are rejected. */
  website: string;
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
