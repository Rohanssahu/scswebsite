// Shared types for the project-estimation experience.
//
// Every monetary figure carried here comes from the shared estimation policy
// (src/policy/estimationPolicy.ts) — either computed server-side by the
// `ai-estimate` Edge Function after Gemini classified the scope, or computed
// locally by the explicitly-labelled basic engine (src/data/basicEstimate.ts).
// Nothing in this file is ever a final quotation.

import type { BudgetPlan, EstimateSnapshot } from '@/policy/estimationPolicy';

export type ProjectMode = 'new' | 'existing';
export type EntryMethod = 'ai' | 'manual';

export type QuestionType = 'text' | 'textarea' | 'single' | 'multi';

export interface AnalysisQuestion {
  id: string;
  /** Conversational phrasing used by the chat assistant. */
  chatPrompt: string;
  /** Short label used by the manual form stepper. */
  label: string;
  type: QuestionType;
  options?: string[];
  /** Lets the visitor type their own value when no option fits (single/multi only). */
  allowCustom?: boolean;
  /** Placeholder for the free-text "type your own" input. */
  customPlaceholder?: string;
  optional?: boolean;
  placeholder?: string;
  /** Extra helper copy shown under the field / inside the chat bubble. */
  hint?: string;
}

/** Answers keyed by question id. Multi-selects are stored as string arrays. */
export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue>;

export interface UploadedFileMeta {
  name: string;
  size: number;
  /** AI-extracted summary of the document's content, reused during analysis. */
  text?: string;
}

export interface AnalysisDraft {
  mode: ProjectMode | null;
  method: EntryMethod | null;
  answers: AnswerMap;
  files: UploadedFileMeta[];
  updatedAt: string;
}

export interface RoleEstimate {
  role: string;
  hours: number;
  /** Never above STANDARD_HOURLY_RATE_USD. Set by the policy, not by a model. */
  hourlyRate: number;
}

export interface DetectedIssue {
  title: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  detail: string;
}

export interface Milestone {
  title: string;
  week: string;
  deliverables: string[];
}

export interface AnalysisResult {
  mode: ProjectMode;
  healthScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  requirementSummary: string[];
  currentlyWorking: string[];
  problemsDetected: DetectedIssue[];
  missingFeatures: string[];
  recommendedSolution: string[];
  team: RoleEstimate[];
  weeklyCapacityHours: number;
  /** The single client-facing rate. Always STANDARD_HOURLY_RATE_USD. */
  hourlyRateUsd: number;
  assumptions: string[];
  milestones: Milestone[];
  benefits: string[];
  nextSteps: string[];
  /** Budget-fit MVP plus the two optional tiers. The source of every figure. */
  budgetPlan: BudgetPlan;
  /** Ready-to-render client-facing wording for the plan above. */
  planNarrative: string[];
  /** Structured snapshot persisted with the lead and shown to the admin team. */
  estimateSnapshot: EstimateSnapshot;
  generatedAt: string;
  /**
   * 'ai'    — Gemini classified the scope on the server.
   * 'basic' — the explicitly-labelled local engine ran instead. NEVER shown as
   *           an AI analysis.
   */
  source: 'ai' | 'basic';
  /** True when the AI path was attempted and failed. Surfaced to the visitor. */
  aiUnavailable?: boolean;
  provider?: string | null;
  model?: string | null;
}

export interface DemoBooking {
  date: string;
  slot: string;
  name: string;
  email: string;
  phone: string;
  meetingPreference: string;
  message?: string;
}
