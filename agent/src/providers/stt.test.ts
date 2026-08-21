import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSttProvider } from './stt.js';

describe('resolveSttProvider', () => {
  it('defaults to openai when unset', () => {
    expect(resolveSttProvider(undefined)).toBe('openai');
    expect(resolveSttProvider(null)).toBe('openai');
    expect(resolveSttProvider('')).toBe('openai');
  });

  it('accepts explicit openai and gemini', () => {
    expect(resolveSttProvider('openai')).toBe('openai');
    expect(resolveSttProvider('gemini')).toBe('gemini');
  });

  it('fails loudly on an unrecognized value instead of silently falling back', () => {
    expect(() => resolveSttProvider('whisper')).toThrow(/Unknown BUDDY_STT_PROVIDER/);
    expect(() => resolveSttProvider('OpenAI')).toThrow(/Unknown BUDDY_STT_PROVIDER/);
  });
});

// The real @livekit/agents-plugin-openai module constructs an actual SDK
// client whose own API-key handling is captured at module-load time —
// irrelevant to what we own here. Mock it so these tests exercise only OUR
// provider-selection and fail-fast logic in providers/stt.ts.
vi.mock('@livekit/agents-plugin-openai', () => ({
  STT: vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
    Object.assign(this, { __provider: 'openai', ...opts });
  }),
}));

describe('createStt', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BUDDY_STT_PROVIDER;
    delete process.env.OPENAI_API_KEY;
  });

  it('constructs an OpenAI STT instance by default when OPENAI_API_KEY is present', async () => {
    delete process.env.BUDDY_STT_PROVIDER;
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as Record<string, unknown>;
    expect(instance.__provider).toBe('openai');
    expect(instance.model).toBe('gpt-4o-transcribe');
    expect(instance.detectLanguage).toBe(true);
  });

  it('throws a clear, non-sensitive error when OPENAI_API_KEY is missing', async () => {
    process.env.BUDDY_STT_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const { createStt } = await import('./stt.js');
    expect(() => createStt()).toThrow(/OPENAI_API_KEY is required/);
  });

  it('throws a clear "not available" error for gemini rather than silently falling back to openai', async () => {
    process.env.BUDDY_STT_PROVIDER = 'gemini';
    const { createStt } = await import('./stt.js');
    expect(() => createStt()).toThrow(/Gemini STT is not available/);
  });
});
