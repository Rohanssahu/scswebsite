import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Supabase client module so this service never makes network calls.
const invokeMock = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: () => ({ functions: { invoke: invokeMock } }),
}));

import {
  documentContextFor,
  extractFromDocument,
  extractionChatNotice,
  extractionFormStatus,
  generateAiAnalysis,
  isReadableDocument,
  readDocument,
  UnsupportedDocumentError,
} from '@/services/aiAnalysis';

function validAnalysisResult(overrides: Record<string, unknown> = {}) {
  return {
    healthScore: 80,
    riskLevel: 'Low',
    requirementSummary: ['Goal: build an app'],
    currentlyWorking: ['N/A — new build'],
    problemsDetected: [{ title: 'Tight timeline', severity: 'medium', summary: 'Short deadline', detail: 'Needs parallel work' }],
    missingFeatures: ['Payments'],
    recommendedSolution: ['Start with an MVP'],
    team: [{ role: 'Backend Developer', hours: 80, hourlyRate: 15 }],
    weeklyCapacityHours: 40,
    assumptions: ['Client provides content'],
    milestones: [{ title: 'Phase 1', week: 'Week 1-2', deliverables: ['Auth'] }],
    benefits: ['Transparent pricing'],
    nextSteps: ['Book a call'],
    ...overrides,
  };
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe('isReadableDocument', () => {
  it('accepts pdf and known text extensions, rejects everything else', () => {
    expect(isReadableDocument({ name: 'spec.pdf' })).toBe(true);
    expect(isReadableDocument({ name: 'notes.md' })).toBe(true);
    expect(isReadableDocument({ name: 'archive.zip' })).toBe(false);
    expect(isReadableDocument({ name: 'app.exe' })).toBe(false);
  });
});

const PRD_MARKDOWN = `# Buildora AI — PRD

## Overview
A new SaaS platform that turns product briefs into build-ready specifications.

## Features
- User profiles
- Search & filters
- Stripe payments
- Analytics dashboard

## Timeline
1-3 months, budget approximately $12,000.`;

/** A File stand-in for readDocument (jsdom-free: only .name/.size/.text used). */
function fakeTextFile(name: string, content: string): File {
  return { name, size: content.length, text: async () => content } as unknown as File;
}

describe('extractFromDocument', () => {
  it('sends the actual non-empty document text in the docText property the Edge Function reads', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, answers: { idea: 'A SaaS spec platform' }, docSummary: 'New SaaS platform for specs.' },
      error: null,
    });
    const doc = await readDocument(fakeTextFile('buildora-ai-prd.md', PRD_MARKDOWN));
    await extractFromDocument('new', doc);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [functionName, options] = invokeMock.mock.calls[0];
    expect(functionName).toBe('ai-estimate');
    const body = options.body as Record<string, unknown>;
    expect(body.task).toBe('extract');
    expect(body.mode).toBe('new');
    expect(body.docName).toBe('buildora-ai-prd.md');
    // The document body travels in `docText` — not the filename, MIME type or size.
    expect(body.docText).toBe(PRD_MARKDOWN);
    expect((body.docText as string).trim().length).toBeGreaterThan(100);
    expect(body).not.toHaveProperty('mimeType');
    expect(body).not.toHaveProperty('size');
    expect(Object.keys(body).sort()).toEqual(['docName', 'docText', 'mode', 'pdfBase64', 'task']);
  });

  it('rejects empty / whitespace-only document content before calling the backend', async () => {
    await expect(extractFromDocument('new', { name: 'empty.md', size: 0, text: '   \n  ' })).rejects.toBeInstanceOf(
      UnsupportedDocumentError,
    );
    await expect(extractFromDocument('new', { name: 'empty.md', size: 0 })).rejects.toBeInstanceOf(UnsupportedDocumentError);
    await expect(extractFromDocument('new', { name: 'empty.pdf', size: 0, pdfBase64: '  ' })).rejects.toBeInstanceOf(
      UnsupportedDocumentError,
    );
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('rejects an empty text file at read time, before any payload is built', async () => {
    await expect(readDocument(fakeTextFile('empty.md', '   \n\t '))).rejects.toBeInstanceOf(UnsupportedDocumentError);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('preserves the base64 PDF flow and its 4MB limit', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, answers: {}, docSummary: 'A PDF spec.' }, error: null });
    await extractFromDocument('new', { name: 'spec.pdf', size: 2048, pdfBase64: 'JVBERi0xLjQK' });
    const body = invokeMock.mock.calls[0][1].body as Record<string, unknown>;
    expect(body.pdfBase64).toBe('JVBERi0xLjQK');
    expect(body.docText).toBeUndefined();

    const tooBig = { name: 'big.pdf', size: 5 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as File;
    await expect(readDocument(tooBig)).rejects.toThrow('PDF must be under 4MB');
  });

  it('throws when the backend reports an error or !ok', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(extractFromDocument('new', { name: 'a.txt', size: 1, text: 'hi' })).rejects.toThrow('boom');

    invokeMock.mockResolvedValueOnce({ data: { ok: false }, error: null });
    await expect(extractFromDocument('new', { name: 'a.txt', size: 1, text: 'hi' })).rejects.toThrow('Document extraction failed');
  });

  it('caps the returned docSummary client-side to 2000 chars', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, answers: {}, docSummary: 'x'.repeat(5000) }, error: null });
    const result = await extractFromDocument('new', { name: 'a.txt', size: 1, text: 'hi' });
    expect(result.docSummary.length).toBe(2000);
  });

  it('reports status "answers" with a count when questionnaire fields were filled', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        answers: { idea: 'A SaaS spec platform', platform: 'Web + Mobile' },
        docSummary: 'New SaaS platform for specs.',
        unmappedImportantDetails: ['SOC 2 readiness required', '', 42, '  trimmed  '],
      },
      error: null,
    });
    const result = await extractFromDocument('new', { name: 'prd.md', size: 10, text: PRD_MARKDOWN });
    expect(result.status).toBe('answers');
    expect(result.extractedFieldsCount).toBe(2);
    expect(result.unmappedImportantDetails).toEqual(['SOC 2 readiness required', 'trimmed']);
    expect(documentContextFor(result)).toContain('New SaaS platform for specs.');
    expect(documentContextFor(result)).toContain('SOC 2 readiness required');
  });

  it('reports status "summary-only" when a summary came back with no mapped answers', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, answers: {}, docSummary: 'A GDPR data-retention policy; no software scope defined.' },
      error: null,
    });
    const result = await extractFromDocument('new', { name: 'policy.md', size: 10, text: PRD_MARKDOWN });
    expect(result.status).toBe('summary-only');
    expect(result.extractedFieldsCount).toBe(0);
    expect(documentContextFor(result)).toContain('GDPR');
  });

  it('reports status "empty" when neither answers nor a summary came back', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, answers: {}, docSummary: '' }, error: null });
    const result = await extractFromDocument('new', { name: 'prd.md', size: 10, text: PRD_MARKDOWN });
    expect(result.status).toBe('empty');
    expect(documentContextFor(result)).toBe('');
  });

  it('strips unknown response keys instead of surfacing them', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, answers: { idea: 'App' }, docSummary: 'Summary.', sneaky: 'drop', unmappedImportantDetails: 'not-an-array' },
      error: null,
    });
    const result = await extractFromDocument('new', { name: 'prd.md', size: 10, text: PRD_MARKDOWN });
    expect(Object.keys(result).sort()).toEqual([
      'answers',
      'docSummary',
      'extractedFieldsCount',
      'status',
      'unmappedImportantDetails',
    ]);
    expect(result.unmappedImportantDetails).toEqual([]);
  });
});

describe('extraction UI messages', () => {
  it('mentions how many answers were pre-filled when fields mapped', () => {
    expect(extractionChatNotice('prd.md', 4, 'answers')).toContain('pre-filled 4 answers');
    expect(extractionChatNotice('prd.md', 1, 'answers')).toContain('pre-filled 1 answer');
    expect(extractionFormStatus('prd.md', 3, 'answers')).toContain('pre-filled 3 unanswered questions');
  });

  it('says the document was understood but clarification questions remain when only a summary came back', () => {
    const chat = extractionChatNotice('prd.md', 0, 'summary-only');
    expect(chat).toContain('understood');
    expect(chat).toContain('clarification questions');
    expect(chat).not.toMatch(/pre-filled \d/);
    expect(extractionFormStatus('prd.md', 0, 'summary-only')).toContain('no questionnaire field could be pre-filled');
  });

  it('never claims the document was read when the extraction was empty', () => {
    const chat = extractionChatNotice('prd.md', 0, 'empty');
    expect(chat).toContain("couldn't analyze");
    expect(chat).toContain('continue with the questions');
    expect(chat).not.toMatch(/\bI read\b|understood/);
    const form = extractionFormStatus('prd.md', 0, 'empty');
    expect(form).toContain("Couldn't analyze");
    expect(form).not.toMatch(/\bRead\b|Understood/);
  });
});

describe('generateAiAnalysis — validation and fallback contract', () => {
  it('throws (so the caller falls back to the demo engine) when the backend errors', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'network down' } });
    await expect(generateAiAnalysis('new', {}, [])).rejects.toThrow('network down');
  });

  it('throws when the response is malformed, never returning a half-valid result', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, result: { healthScore: 'not-a-number' } }, error: null });
    await expect(generateAiAnalysis('new', {}, [])).rejects.toThrow('AI returned an invalid analysis');
  });

  it('rejects team.hourlyRate above the deterministic bound even if the shape is otherwise valid', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, result: validAnalysisResult({ team: [{ role: 'Dev', hours: 40, hourlyRate: 9999 }] }) },
      error: null,
    });
    await expect(generateAiAnalysis('new', {}, [])).rejects.toThrow('AI returned an invalid analysis');
  });

  it('rejects weeklyCapacityHours above the deterministic bound', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, result: validAnalysisResult({ weeklyCapacityHours: 400 }) },
      error: null,
    });
    await expect(generateAiAnalysis('new', {}, [])).rejects.toThrow('AI returned an invalid analysis');
  });

  it('returns a well-formed result tagged source:"ai" and strips unknown top-level keys', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, result: validAnalysisResult({ totalCost: 999999, sneakyField: 'nope' }) },
      error: null,
    });
    const result = await generateAiAnalysis('new', {}, []);
    expect(result.source).toBe('ai');
    expect(result.mode).toBe('new');
    expect(result).not.toHaveProperty('totalCost');
    expect(result).not.toHaveProperty('sneakyField');
    expect(result.riskLevel).toBe('Low');
  });

  it('clamps healthScore into [0, 100] and rounds it', async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, result: validAnalysisResult({ healthScore: 80.6 }) }, error: null });
    const result = await generateAiAnalysis('new', {}, []);
    expect(result.healthScore).toBe(81);
  });
});

describe('no secrets in this module', () => {
  it('never references an AI provider env var or key-shaped literal', () => {
    const path = fileURLToPath(new URL('./aiAnalysis.ts', import.meta.url));
    const source = readFileSync(path, 'utf8');
    expect(source).not.toMatch(/GOOGLE_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY|VITE_.*(GOOGLE|GEMINI|OPENAI)/);
    expect(source).not.toMatch(/AIza[0-9A-Za-z_-]{10,}|sk-[0-9A-Za-z]{10,}/);
    // No document content is ever logged from the client either.
    expect(source).not.toMatch(/console\.[a-z]+\([^)]*\b(doc\.text|docText|pdfBase64)\b/);
  });
});
