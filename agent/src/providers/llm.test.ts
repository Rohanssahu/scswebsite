import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveProvider } from './llm.js';

describe('resolveProvider', () => {
  it('defaults to gemini when unset', () => {
    expect(resolveProvider(undefined)).toBe('gemini');
    expect(resolveProvider(null)).toBe('gemini');
    expect(resolveProvider('')).toBe('gemini');
  });

  it('accepts gemini explicitly', () => {
    expect(resolveProvider('gemini')).toBe('gemini');
  });

  it('REFUSES openai — reasoning may not be routed away from Gemini', () => {
    // The client is told the analysis is Gemini-powered; an env var must not be
    // able to quietly make that untrue.
    expect(() => resolveProvider('openai')).toThrow(/only supported reasoning provider is "gemini"/);
  });

  it('fails loudly on an unrecognized value instead of silently falling back', () => {
    expect(() => resolveProvider('gemni')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
    expect(() => resolveProvider('Gemini')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
    expect(() => resolveProvider('anthropic')).toThrow(/Unknown BUDDY_LLM_PROVIDER/);
  });

  it('never echoes a value that is not shaped like a provider word', () => {
    // Built at runtime so this file never contains a key-shaped literal for a
    // secret scanner to flag.
    const pastedSecret = ['AIza', 'Sy', 'PLACEHOLDER', '-not-a-real-key-', '0123456789'].join('');
    expect(() => resolveProvider(pastedSecret)).toThrow(/value withheld/);
    try {
      resolveProvider(pastedSecret);
    } catch (e) {
      expect(String(e)).not.toContain(pastedSecret);
    }
  });
});

// The real @livekit/agents-plugin-google module constructs an actual SDK client
// whose own API-key handling is captured at module-load time — irrelevant to
// what we own here. Mock it so these tests exercise only OUR provider-selection
// and fail-fast logic in providers/llm.ts.
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
  });

  it('throws a clear, non-sensitive error when GOOGLE_API_KEY is missing', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'gemini';
    delete process.env.GOOGLE_API_KEY;
    const { createLlm } = await import('./llm.js');
    expect(() => createLlm()).toThrow(/GOOGLE_API_KEY is required/);
  });

  it('refuses to start at all when BUDDY_LLM_PROVIDER=openai, even with an OpenAI key present', async () => {
    process.env.BUDDY_LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    process.env.GOOGLE_API_KEY = 'test-key-not-real';
    const { createLlm } = await import('./llm.js');
    expect(() => createLlm()).toThrow(/only supported reasoning provider is "gemini"/);
  });

  it('constructs a Gemini LLM with the configured model and key', async () => {
    process.env.GOOGLE_API_KEY = 'test-key-not-real';
    process.env.BUDDY_GEMINI_MODEL = 'gemini-test-model';
    const { createLlm, resolveModel } = await import('./llm.js');
    const instance = createLlm() as unknown as Record<string, unknown>;
    expect(instance.__provider).toBe('gemini');
    expect(instance.model).toBe('gemini-test-model');
    expect(instance.apiKey).toBe('test-key-not-real');
    expect(resolveModel()).toBe('gemini-test-model');
  });

  it('defaults the Gemini model to gemini-3.6-flash when unset', async () => {
    process.env.GOOGLE_API_KEY = 'test-key-not-real';
    const { createLlm } = await import('./llm.js');
    const instance = createLlm() as unknown as Record<string, unknown>;
    expect(instance.model).toBe('gemini-3.6-flash');
  });

  it('never throws an error message containing a configured key value', async () => {
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
