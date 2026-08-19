import { AnalysisDraft, AnalysisResult, DemoBooking } from '@/types/projectAnalysis';

// Thin localStorage layer so drafts survive reloads and mode switches.
// Swap these helpers for real API persistence later.

const DRAFT_KEY = 'scs-analysis-draft';
const RESULT_KEY = 'scs-analysis-result';
const BOOKING_KEY = 'scs-demo-booking';

export function emptyDraft(): AnalysisDraft {
  return { mode: null, method: null, answers: {}, files: [], updatedAt: new Date().toISOString() };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadDraft(): AnalysisDraft {
  return safeParse<AnalysisDraft>(localStorage.getItem(DRAFT_KEY)) ?? emptyDraft();
}

export function saveDraft(draft: AnalysisDraft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function hasDraftAnswers(draft: AnalysisDraft): boolean {
  return Object.values(draft.answers).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}

export function loadResult(): AnalysisResult | null {
  return safeParse<AnalysisResult>(localStorage.getItem(RESULT_KEY));
}

export function saveResult(result: AnalysisResult): void {
  localStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function saveBooking(booking: DemoBooking): void {
  localStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
}
