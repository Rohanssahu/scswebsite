import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveProvider } from './llm.js';

describe('resolveProvider', () => {
  it('defaults to gemini when unset', () => {
    expect(resolveProvider(undefined)).toBe('gemini');
    expect(resolveProvider(null)).toBe('gemini');
    expect(resolveProvider('')).toBe('gemini');
  });

  it('accepts explicit gemini and openai', () => {
    expect(resolveProvider('gemini')).toBe('gemini');
    expect(resolveProvider('openai')).toBe('openai');
  });

  it('fails loudly on an unrecognized value instead of silently falling back', () => {
    expect(() => resolveProvider('gemni')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
    expect(() => resolveProvider('OpenAI')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
    expect(() => resolveProvider('anthropic')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
  });
});

// The real @livekit/agents-plugin-openai / -google modules construct actual
// SDK clients whose own API-key handling is captured at module-load time —
// irrelevant to what we own here. Mock both so these tests exercise only
// OUR provider-selection and fail-fast logic in providers/llm.ts.
vi.mock('@livekit/agents-plugin-openai', () => ({
  LLM: vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
    Object.assign(this, { __provider: 'openai', ...opts });
  }),
}));
vi.mock('@livekit/agents-plugin-google', () => ({
  LLM: vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
    Object.assign(this, { __provider: 'gemini', ...opts });
  }),
}));

describe('createLlm', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BUDDY_LLM_PROVIDER;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.BUDDY_GEMINI_MODEL;
    delete process.env.BUDDY_OPENAI_MODEL;
  });

  it('throws a clear, non-sensitive error when GOOGLE_API_KEY is missing for gemini', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'gemini';
    delete process.env.GOOGLE_API_KEY;
    const { createLlm } = await import('./llm.js');
    expect(() => createLlm()).toThrow(/GOOGLE_API_KEY is required/);
  });

  it('throws a clear, non-sensitive error when OPENAI_API_KEY is missing for openai', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const { createLlm } = await import('./llm.js');
    expect(() => createLlm()).toThrow(/OPENAI_API_KEY is required/);
  });

  it('constructs a Gemini LLM with the configured model and key when GOOGLE_API_KEY is present', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'gemini';
    process.env.GOOGLE_API_KEY = 'test-key-not-real';
    process.env.BUDDY_GEMINI_MODEL = 'gemini-test-model';
    const { createLlm } = await import('./llm.js');
    const instance = createLlm() as unknown as Record<string, unknown>;
    expect(instance.__provider).toBe('gemini');
    expect(instance.model).toBe('gemini-test-model');
    expect(instance.apiKey).toBe('test-key-not-real');
  });

  it('defaults the Gemini model to gemini-2.5-flash when unset', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'gemini';
    process.env.GOOGLE_API_KEY = 'test-key-not-real';
    const { createLlm } = await import('./llm.js');
    const instance = createLlm() as unknown as Record<string, unknown>;
    expect(instance.model).toBe('gemini-2.5-flash');
  });

  it('constructs an OpenAI LLM when OPENAI_API_KEY is present', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { createLlm } = await import('./llm.js');
    const instance = createLlm() as unknown as Record<string, unknown>;
    expect(instance.__provider).toBe('openai');
    expect(instance.model).toBe('gpt-4o-mini');
  });

  it('never throws an error message containing the configured key value', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'gemini';
    delete process.env.GOOGLE_API_KEY;
    process.env.OPENAI_API_KEY = 'super-secret-value-should-not-leak';
    const { createLlm } = await import('./llm.js');
    try {
      createLlm();
    } catch (e) {
      expect(String(e)).not.toContain('super-secret-value-should-not-leak');
    }
  });
});
