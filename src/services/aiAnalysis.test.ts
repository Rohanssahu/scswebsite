import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Supabase client module so this service never makes network calls.
const invokeMock = vi.fn();
vi.mock('@/services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: () => ({ functions: { invoke: invokeMock } }),
}));

import { extractFromDocument, generateAiAnalysis, isReadableDocument } from '@/services/aiAnalysis';

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

describe('extractFromDocument', () => {
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
  });
});
