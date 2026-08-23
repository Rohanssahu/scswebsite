// Shared types for Buddy — Your SCS Guide (demo).
// Everything here is frontend-only demo data; no real AI, backend or audio upload.

import { AnalysisResult, AnswerMap, ProjectMode } from './projectAnalysis';

/** Animation states the avatar adapter must support. */
export type AvatarState =
  | 'idle'
  | 'welcome'
  | 'speaking'
  | 'listening'
  | 'thinking'
  | 'pointing'
  | 'success'
  | 'minimized';

/** What a quick-reply / message action button does when pressed. */
export type GuideActionKind =
  | 'navigate' // go to a route, optional #hash for a section
  | 'start-tour'
  | 'flow-new' // start the new-project requirement flow
  | 'flow-existing' // start the existing-project requirement flow
  | 'send' // send a canned message as the visitor
  | 'whatsapp' // open wa.me with a prefilled (not sent) message
  | 'open-results' // open the detailed recommendation panel
  | 'contact-handoff' // prefill the contact form and navigate there
  | 'schedule-handoff' // navigate to the schedule-call page
  | 'run-analysis' // start the simulated demo analysis
  | 'flow-edit' // reopen the requirement flow at the review step
  | 'download-report' // build the branded, watermarked estimate report as a PDF
  | 'open-voice'; // open the real-time voice session panel

export interface GuideAction {
  /**
   * Canonical English label. Kept stable in state/storage; translated at
   * render time via the `actions.<valueKey(label)>` i18n lookup.
   */
  label: string;
  kind: GuideActionKind;
  /** Target route for `navigate` / handoff kinds. */
  to?: string;
  /** Canned message for `send` (canonical English, used for intent matching). */
  message?: string;
}

/** A translatable piece of text: an i18n key plus interpolation params. */
export interface LocalizedText {
  key: string;
  params?: Record<string, unknown>;
}

export interface GuideChatMessage {
  id: string;
  from: 'guide' | 'user';
  /** Resolved fallback text (in the language active when the message was sent). */
  text: string;
  /** i18n key — when present the bubble re-renders in the current language. */
  tKey?: string;
  tParams?: Record<string, unknown>;
  actions?: GuideAction[];
}

export interface GuideIntent {
  id: string;
  /** Case-insensitive keyword groups; a group matches when all its words appear. */
  keywords: string[][];
  /** i18n key of the response text. */
  responseKey: string;
  actions: GuideAction[];
}

export interface TourStep {
  id: string;
  /** Route the step lives on. */
  route: string;
  /** Matches a data-guide-id attribute on the page. Missing targets are skipped. */
  targetId: string;
  /** i18n keys for the step card. */
  titleKey: string;
  textKey: string;
}

/** Demo estimate: the existing analysis result plus guide-specific extras. */
export interface GuideEstimate extends AnalysisResult {
  /** Canonical English service name; translated via `services.names.*` at render. */
  recommendedService: string;
  suggestedTech: string[];
  /** i18n keys under guide.estimate.prosList / consList / risksList. */
  pros: string[];
  cons: string[];
  risks: string[];
  /** Language-aware requirement summary (labels translate, answers stay as given). */
  summaryItems: LocalizedText[];
  cheaperAlternative: LocalizedText;
  /** Deferred scope framed as a phase two. Never a boosted weekly capacity —
   * the standard 40-hour delivery week is the only capacity Buddy quotes. */
  phasedAlternative: LocalizedText;
  /** The policy's client-facing budget wording, rendered verbatim. */
  budgetLines: string[];
  recommendedNextStep: LocalizedText;
  totalHours: number;
  totalCost: number;
  estimatedWeeks: number;
}

export type FlowStatus = 'active' | 'review' | 'analyzing' | 'done';

export interface RequirementFlowState {
  mode: ProjectMode;
  index: number;
  answers: AnswerMap;
  status: FlowStatus;
}

export interface TourState {
  active: boolean;
  index: number;
  paused: boolean;
}
