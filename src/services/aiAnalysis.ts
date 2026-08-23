// AI project analysis service — talks to the `ai-estimate` Supabase Edge
// Function, which holds the Gemini key server-side. The frontend never sees any
// AI secret, and it never computes a price: every figure in the response was
// produced by the shared estimation policy on the server.
//
// Failure handling is deliberate. A provider failure THROWS. Callers then show
// either the "AI analysis temporarily unavailable" state or the explicitly
// labelled basic estimate (src/data/basicEstimate.ts) — never a basic result
// dressed up as a Gemini analysis.

import {
  STANDARD_HOURLY_RATE_USD,
  parseSelectedBudgetUsd,
  type BudgetPlan,
} from '@/policy/estimationPolicy';
import { AnalysisResult, AnswerMap, ProjectMode, UploadedFileMeta } from '@/types/projectAnalysis';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { isConnectionError, reportNetworkFailure } from './networkStatus';

/** True when the AI backend can be reached (Supabase public config present). */
export const isAiAnalysisReady = isSupabaseConfigured;

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'rtf', 'xml', 'yml', 'yaml'];
const MAX_TEXT_CHARS = 24_000;
const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_STORED_SUMMARY_CHARS = 2_000;

export interface ReadDocument {
  name: string;
  size: number;
  /** Plain text content (text-like files). */
  text?: string;
  /** Base64 content without the data: prefix (PDF files). */
  pdfBase64?: string;
}

export class UnsupportedDocumentError extends Error {}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

/** True for files the AI intake can actually read (PDF + text formats). */
export function isReadableDocument(file: Pick<File, 'name'>): boolean {
  const ext = extensionOf(file.name);
  return ext === 'pdf' || TEXT_EXTENSIONS.includes(ext);
}

/** Read a File into a payload the `ai-estimate` extract task accepts. */
export async function readDocument(file: File): Promise<ReadDocument> {
  const ext = extensionOf(file.name);
  if (ext === 'pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new UnsupportedDocumentError('PDF must be under 4MB');
    }
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return { name: file.name, size: file.size, pdfBase64: btoa(binary) };
  }
  if (TEXT_EXTENSIONS.includes(ext)) {
    const text = (await file.text()).slice(0, MAX_TEXT_CHARS);
    if (!text.trim()) throw new UnsupportedDocumentError('The file is empty');
    return { name: file.name, size: file.size, text };
  }
  throw new UnsupportedDocumentError('Only PDF and text documents (txt, md, csv, json…) can be read');
}

/**
 * What actually came back from the extraction, so the UI can tell the visitor
 * the truth instead of always claiming the document was read:
 *   - `answers`      → questionnaire fields were pre-filled
 *   - `summary-only` → the document was understood but nothing mapped
 *   - `empty`        → nothing usable came back; keep asking the questions
 * A provider failure throws instead (callers keep their existing fallback).
 */
export type ExtractionStatus = 'answers' | 'summary-only' | 'empty';

export interface ExtractionResult {
  /** Auto-filled questionnaire answers (only fields the AI was confident about). */
  answers: AnswerMap;
  /** Short summary of the document, reused later by the analyze task. */
  docSummary: string;
  /** Number of questionnaire fields the document actually filled. */
  extractedFieldsCount: number;
  /** Useful project details that map to no questionnaire field. */
  unmappedImportantDetails: string[];
  /** Which of the three honest outcomes above this extraction is. */
  status: ExtractionStatus;
}

const MAX_UNMAPPED_DETAILS = 10;
const MAX_UNMAPPED_DETAIL_CHARS = 300;

function readUnmappedDetails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim().slice(0, MAX_UNMAPPED_DETAIL_CHARS))
    .slice(0, MAX_UNMAPPED_DETAILS);
}

/**
 * The document text the analysis should carry forward: the summary plus any
 * detail that mapped to no questionnaire field. Empty when the extraction
 * produced nothing meaningful, so a failed read never masquerades as content.
 */
export function documentContextFor(result: ExtractionResult): string {
  return [result.docSummary, ...result.unmappedImportantDetails].filter(Boolean).join('\n').slice(0, MAX_STORED_SUMMARY_CHARS);
}

/** Ask the AI to read a document and auto-fill the questionnaire. */
export async function extractFromDocument(mode: ProjectMode, doc: ReadDocument): Promise<ExtractionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('AI backend is not configured');
  // Never spend a provider call on metadata alone: without real content the
  // request would carry only the file name and size.
  if (!doc.text?.trim() && !doc.pdfBase64?.trim()) {
    throw new UnsupportedDocumentError('The file is empty');
  }
  const { data, error } = await supabase.functions.invoke('ai-estimate', {
    body: {
      task: 'extract',
      mode,
      docName: doc.name,
      // `docText` / `pdfBase64` are the exact property names the ai-estimate
      // Edge Function reads (supabase/functions/ai-estimate/index.ts).
      docText: doc.text,
      pdfBase64: doc.pdfBase64,
    },
  });
  if (error || !data?.ok) {
    if (isConnectionError(error)) reportNetworkFailure('ai');
    throw new Error(error?.message ?? 'Document extraction failed');
  }
  const answers = (data.answers ?? {}) as AnswerMap;
  const docSummary = typeof data.docSummary === 'string' ? data.docSummary.slice(0, MAX_STORED_SUMMARY_CHARS) : '';
  const extractedFieldsCount = Object.keys(answers).length;
  return {
    answers,
    docSummary,
    extractedFieldsCount,
    unmappedImportantDetails: readUnmappedDetails(data.unmappedImportantDetails),
    status: extractedFieldsCount > 0 ? 'answers' : docSummary.trim() ? 'summary-only' : 'empty',
  };
}

/** Conversational status line for the chat flow — one per honest outcome. */
export function extractionChatNotice(fileName: string, filled: number, status: ExtractionStatus): string {
  if (filled > 0) {
    return `I read "${fileName}" and pre-filled ${filled} answer${filled === 1 ? '' : 's'}. Use "Back / edit answer" to change anything — I just need the remaining details.`;
  }
  // Nothing was pre-filled: only claim the document was understood when the
  // server actually returned a summary for it.
  if (status !== 'empty') {
    return `I understood "${fileName}" and will use it in the analysis, but it didn't answer any of the questionnaire fields — I still need to ask you a few clarification questions.`;
  }
  return `I couldn't analyze "${fileName}" — nothing usable came back from it. Let's continue with the questions instead.`;
}

/** Compact status line for the manual form — one per honest outcome. */
export function extractionFormStatus(fileName: string, filled: number, status: ExtractionStatus): string {
  if (filled > 0) {
    return `Read "${fileName}" and pre-filled ${filled} unanswered question${filled === 1 ? '' : 's'}.`;
  }
  if (status !== 'empty') {
    return `Understood "${fileName}" and will use it in the analysis — no questionnaire field could be pre-filled, so please answer the questions below.`;
  }
  return `Couldn't analyze "${fileName}" — please answer the questions below. It stays attached as a reference.`;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim());
}

/** Raised when the AI backend could not produce a usable analysis. */
export class AiAnalysisUnavailableError extends Error {
  constructor(message = 'AI analysis is temporarily unavailable.') {
    super(message);
    this.name = 'AiAnalysisUnavailableError';
  }
}

function isPlanTier(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.hours === 'number' &&
    typeof t.costUsd === 'number' &&
    typeof t.weeks === 'number' &&
    typeof t.percentAboveBudget === 'number' &&
    Array.isArray(t.includedScope) &&
    Array.isArray(t.deferredScope) &&
    Array.isArray(t.addedVsBase)
  );
}

/**
 * Validate the server's budget plan. This is defense in depth — the Edge
 * Function already built it from the shared policy — but it is also the
 * client-side guarantee that no rendered figure ever breaches the commercial
 * rules: rate at or below $5/hour, base plan inside the client's own budget,
 * optional tiers inside +20% / +30%.
 */
export function isValidBudgetPlan(raw: unknown): raw is BudgetPlan {
  if (typeof raw !== 'object' || raw === null) return false;
  const p = raw as Record<string, unknown>;
  if (p.currency !== 'USD') return false;
  if (typeof p.hourlyRateUsd !== 'number' || p.hourlyRateUsd > STANDARD_HOURLY_RATE_USD || p.hourlyRateUsd <= 0) return false;
  if (typeof p.weeklyCapacityHours !== 'number' || p.weeklyCapacityHours <= 0) return false;
  if (typeof p.selectedBudgetUsd !== 'number' || p.selectedBudgetUsd < 0) return false;
  if (typeof p.budgetProvided !== 'boolean') return false;
  if (typeof p.availableHours !== 'number' || p.availableHours < 0) return false;
  if (typeof p.budgetFitPercent !== 'number' || p.budgetFitPercent < 0 || p.budgetFitPercent > 100) return false;
  if (typeof p.mayUseSeventyToEightyWording !== 'boolean') return false;
  if (p.humanReviewRequired !== true) return false;
  if (!Array.isArray(p.scope) || !Array.isArray(p.unclearScope)) return false;
  if (!isPlanTier(p.base)) return false;
  const base = p.base as { costUsd: number };
  // The budget-fit option can never cost more than the client's own budget.
  if (base.costUsd > (p.selectedBudgetUsd as number)) return false;
  for (const [tier, maxPercent] of [
    [p.recommended, 20],
    [p.growth, 30],
  ] as const) {
    if (tier === null || tier === undefined) continue;
    if (!isPlanTier(tier)) return false;
    const t = tier as { costUsd: number; percentAboveBudget: number };
    if (t.percentAboveBudget > maxPercent) return false;
    if (t.costUsd > (p.selectedBudgetUsd as number) * (1 + maxPercent / 100)) return false;
  }
  return true;
}

/**
 * Reject malformed AI output so the caller falls back to the LABELLED basic
 * estimate instead of rendering a half-built result as an AI analysis.
 *
 * The `ai-estimate` Edge Function already rebuilds the response from an
 * allowlist and computes every number with the shared policy (see
 * supabase/functions/ai-estimate/gemini.ts). This check is the second line.
 */
function validateAnalysis(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.healthScore === 'number' &&
    (r.riskLevel === 'Low' || r.riskLevel === 'Medium' || r.riskLevel === 'High') &&
    isStringArray(r.requirementSummary) &&
    isStringArray(r.currentlyWorking) &&
    Array.isArray(r.problemsDetected) &&
    r.problemsDetected.every(
      (p: Record<string, unknown>) =>
        p &&
        typeof p.title === 'string' &&
        ['low', 'medium', 'high'].includes(p.severity as string) &&
        typeof p.summary === 'string' &&
        typeof p.detail === 'string',
    ) &&
    Array.isArray(r.missingFeatures) &&
    isStringArray(r.recommendedSolution) &&
    // The team table may legitimately be empty when the selected budget cannot
    // fund even the core scope — that state is reported, not padded out.
    Array.isArray(r.team) &&
    r.team.every(
      (t: Record<string, unknown>) =>
        t &&
        typeof t.role === 'string' &&
        typeof t.hours === 'number' &&
        t.hours > 0 &&
        typeof t.hourlyRate === 'number' &&
        t.hourlyRate > 0 &&
        t.hourlyRate <= STANDARD_HOURLY_RATE_USD,
    ) &&
    typeof r.weeklyCapacityHours === 'number' &&
    r.weeklyCapacityHours > 0 &&
    r.weeklyCapacityHours <= STANDARD_WEEKLY_CAPACITY_CEILING &&
    typeof r.hourlyRateUsd === 'number' &&
    r.hourlyRateUsd <= STANDARD_HOURLY_RATE_USD &&
    isStringArray(r.assumptions) &&
    Array.isArray(r.milestones) &&
    r.milestones.length > 0 &&
    r.milestones.every(
      (m: Record<string, unknown>) => m && typeof m.title === 'string' && typeof m.week === 'string' && Array.isArray(m.deliverables),
    ) &&
    isStringArray(r.benefits) &&
    isStringArray(r.nextSteps) &&
    isStringArray(r.planNarrative) &&
    isValidBudgetPlan(r.budgetPlan) &&
    typeof r.estimateSnapshot === 'object' &&
    r.estimateSnapshot !== null
  );
}

/** Nothing client-facing may claim more than a 40-hour delivery week. */
const STANDARD_WEEKLY_CAPACITY_CEILING = 40;

const KNOWN_ANALYSIS_KEYS = [
  'healthScore',
  'riskLevel',
  'requirementSummary',
  'currentlyWorking',
  'problemsDetected',
  'missingFeatures',
  'recommendedSolution',
  'team',
  'weeklyCapacityHours',
  'hourlyRateUsd',
  'assumptions',
  'milestones',
  'benefits',
  'nextSteps',
  'budgetPlan',
  'planNarrative',
  'estimateSnapshot',
  'provider',
  'model',
] as const;

/** Rebuild the AI result from a known-key allowlist so any unexpected field
 * on the raw response is dropped rather than spread through unchecked. */
function stripUnknownKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of KNOWN_ANALYSIS_KEYS) out[key] = raw[key];
  return out;
}

/**
 * Generate the full analysis with Gemini from the visitor's answers plus any
 * document summaries attached to their uploaded files.
 *
 * Throws {@link AiAnalysisUnavailableError} on ANY failure — a caller must then
 * show the unavailable state or the labelled basic estimate. It never returns a
 * partially-trusted result.
 */
export async function generateAiAnalysis(
  mode: ProjectMode,
  answers: AnswerMap,
  files: UploadedFileMeta[],
  revision = 1,
): Promise<AnalysisResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new AiAnalysisUnavailableError('AI backend is not configured');
  const docSummary = files
    .map((f) => f.text)
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8_000);
  const { data, error } = await supabase.functions.invoke('ai-estimate', {
    body: {
      task: 'analyze',
      mode,
      answers,
      docSummary: docSummary || undefined,
      // Sent as a hint only; the server re-parses the budget from the answers
      // and clamps it with the shared policy either way.
      clientBudgetUsd: parseSelectedBudgetUsd(answers.budget) ?? undefined,
      revision,
    },
  });
  if (error || !data?.ok) {
    if (isConnectionError(error)) reportNetworkFailure('ai');
    throw new AiAnalysisUnavailableError(error?.message ?? 'AI analysis failed');
  }
  if (!validateAnalysis(data.result)) throw new AiAnalysisUnavailableError('AI returned an invalid analysis');
  const safe = stripUnknownKeys(data.result as Record<string, unknown>);
  return {
    ...(safe as unknown as Omit<AnalysisResult, 'mode' | 'generatedAt' | 'source'>),
    healthScore: Math.max(0, Math.min(100, Math.round(safe.healthScore as number))),
    mode,
    generatedAt: new Date().toISOString(),
    source: 'ai',
  };
}
