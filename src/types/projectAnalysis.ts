// Shared types for the project-estimation experience.
// All data flowing through these types is demo/dummy data — no backend involved.

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
  assumptions: string[];
  milestones: Milestone[];
  benefits: string[];
  nextSteps: string[];
  generatedAt: string;
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
