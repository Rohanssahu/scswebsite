// AI project analysis service — talks to the `ai-estimate` Supabase Edge
// Function (which holds the OpenAI key server-side). The frontend never sees
// any AI secret. Every consumer must treat failures as non-fatal: the flow
// falls back to the local demo engine so the visitor is never blocked.

import { AnalysisResult, AnswerMap, ProjectMode, UploadedFileMeta } from '@/types/projectAnalysis';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

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

export interface ExtractionResult {
  /** Auto-filled questionnaire answers (only fields the AI was confident about). */
  answers: AnswerMap;
  /** Short summary of the document, reused later by the analyze task. */
  docSummary: string;
}

/** Ask the AI to read a document and auto-fill the questionnaire. */
export async function extractFromDocument(mode: ProjectMode, doc: ReadDocument): Promise<ExtractionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('AI backend is not configured');
  const { data, error } = await supabase.functions.invoke('ai-estimate', {
    body: {
      task: 'extract',
      mode,
      docName: doc.name,
      docText: doc.text,
      pdfBase64: doc.pdfBase64,
    },
  });
  if (error || !data?.ok) throw new Error(error?.message ?? 'Document extraction failed');
  return {
    answers: (data.answers ?? {}) as AnswerMap,
    docSummary: typeof data.docSummary === 'string' ? data.docSummary.slice(0, MAX_STORED_SUMMARY_CHARS) : '',
  };
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.trim());
}

/**
 * Reject malformed AI output so the caller falls back to the demo engine.
 *
 * This is a shape/type check only — the `ai-estimate` Edge Function already
 * rejects unknown fields and clamps every cost/duration-driving number
 * (hourlyRate, hours, weeklyCapacityHours) to a safe deterministic range
 * server-side (see supabase/functions/ai-estimate/gemini.ts,
 * validateAndClampAnalysis). This client-side check is defense in depth, not
 * the primary safety net.
 */
function validateAnalysis(raw: unknown): raw is Omit<AnalysisResult, 'mode' | 'generatedAt' | 'source'> {
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
    isStringArray(r.missingFeatures) &&
    isStringArray(r.recommendedSolution) &&
    Array.isArray(r.team) &&
    r.team.length > 0 &&
    r.team.every(
      (t: Record<string, unknown>) =>
        t &&
        typeof t.role === 'string' &&
        typeof t.hours === 'number' &&
        t.hours > 0 &&
        t.hours <= 600 &&
        typeof t.hourlyRate === 'number' &&
        t.hourlyRate > 0 &&
        t.hourlyRate <= 25,
    ) &&
    typeof r.weeklyCapacityHours === 'number' &&
    r.weeklyCapacityHours > 0 &&
    r.weeklyCapacityHours <= 60 &&
    isStringArray(r.assumptions) &&
    Array.isArray(r.milestones) &&
    r.milestones.length > 0 &&
    r.milestones.every(
      (m: Record<string, unknown>) => m && typeof m.title === 'string' && typeof m.week === 'string' && isStringArray(m.deliverables),
    ) &&
    isStringArray(r.benefits) &&
    isStringArray(r.nextSteps)
  );
}

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
  'assumptions',
  'milestones',
  'benefits',
  'nextSteps',
] as const;

/** Rebuild the AI result from a known-key allowlist so any unexpected field
 * on the raw response is dropped rather than spread through unchecked. */
function stripUnknownKeys(raw: Record<string, unknown>): Omit<AnalysisResult, 'mode' | 'generatedAt' | 'source'> {
  const out = {} as Record<string, unknown>;
  for (const key of KNOWN_ANALYSIS_KEYS) out[key] = raw[key];
  return out as Omit<AnalysisResult, 'mode' | 'generatedAt' | 'source'>;
}

/**
 * Generate the full analysis with AI from the visitor's answers plus any
 * document summaries attached to their uploaded files. Throws on any failure —
 * callers fall back to the local demo engine.
 */
export async function generateAiAnalysis(
  mode: ProjectMode,
  answers: AnswerMap,
  files: UploadedFileMeta[],
): Promise<AnalysisResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('AI backend is not configured');
  const docSummary = files
    .map((f) => f.text)
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 8_000);
  const { data, error } = await supabase.functions.invoke('ai-estimate', {
    body: { task: 'analyze', mode, answers, docSummary: docSummary || undefined },
  });
  if (error || !data?.ok) throw new Error(error?.message ?? 'AI analysis failed');
  if (!validateAnalysis(data.result)) throw new Error('AI returned an invalid analysis');
  const safeResult = stripUnknownKeys(data.result);
  return {
    ...safeResult,
    healthScore: Math.max(0, Math.min(100, Math.round(safeResult.healthScore))),
    mode,
    generatedAt: new Date().toISOString(),
    source: 'ai',
  };
}
