// Shared types for the SCS Virtual Guide — Demo.
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
  | 'run-analysis'; // start the simulated demo analysis

export interface GuideAction {
  label: string;
  kind: GuideActionKind;
  /** Target route for `navigate` / handoff kinds. */
  to?: string;
  /** Canned message for `send`. */
  message?: string;
}

export interface GuideChatMessage {
  id: string;
  from: 'guide' | 'user';
  text: string;
  actions?: GuideAction[];
}

export interface GuideIntent {
  id: string;
  /** Case-insensitive keyword groups; a group matches when all its words appear. */
  keywords: string[][];
  response: string;
  actions: GuideAction[];
}

export interface TourStep {
  id: string;
  /** Route the step lives on. */
  route: string;
  /** Matches a data-guide-id attribute on the page. Missing targets are skipped. */
  targetId: string;
  title: string;
  text: string;
}

/** Demo estimate: the existing analysis result plus guide-specific extras. */
export interface GuideEstimate extends AnalysisResult {
  recommendedService: string;
  suggestedTech: string[];
  pros: string[];
  cons: string[];
  risks: string[];
  cheaperAlternative: string;
  fasterAlternative: string;
  recommendedNextStep: string;
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
