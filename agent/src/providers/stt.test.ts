// STT provider selection. These tests construct the REAL
// `@livekit/agents` inference.STT class, so the constructor call in stt.ts is
// verified against the installed package rather than against a mock's idea of
// it. Only the OpenAI plugin is mocked: it builds an actual SDK client whose
// key handling is captured at module-load time, which is not what we own here.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeLogger } from '@livekit/agents';
import {
  DEFAULT_STT_MODEL,
  STT_LANGUAGE,
  SUPPORTED_STT_MODELS,
  resolveSttModel,
  resolveSttProvider,
} from './stt.js';

/** Internals the installed inference.STT keeps on the instance. */
type SttInternals = {
  provider?: string;
  model?: string;
  label?: string;
  opts?: { model?: string; language?: string; apiKey?: string; apiSecret?: string };
  vad?: unknown;
};

// The installed inference.STT touches the framework logger while constructing,
// which the worker CLI initializes before any job entrypoint runs (and
// therefore before createStt()). Tests must do the same explicitly.
beforeAll(() => {
  initializeLogger({ pretty: false, level: 'silent' });
});

const LIVEKIT_KEY = 'APItestkeynotreal';
const LIVEKIT_SECRET = 'secretvaluethatmustnotbelogged';

describe('resolveSttProvider', () => {
  it('defaults to livekit when unset — LiveKit Inference is the production path', () => {
    expect(resolveSttProvider(undefined)).toBe('livekit');
    expect(resolveSttProvider(null)).toBe('livekit');
    expect(resolveSttProvider('')).toBe('livekit');
  });

  it('accepts explicit livekit and openai', () => {
    expect(resolveSttProvider('livekit')).toBe('livekit');
    expect(resolveSttProvider('openai')).toBe('openai');
  });

  it('rejects gemini with the actual reason — an API key is not a speech credential', () => {
    expect(() => resolveSttProvider('gemini')).toThrow(/not a valid speech-to-text option/);
    expect(() => resolveSttProvider('gemini')).toThrow(/GOOGLE_API_KEY is still required for the Gemini LLM/);
    // and it does not quietly become another billable provider
    expect(() => resolveSttProvider('gemini')).not.toThrow(/falling back/);
  });

  it('fails loudly on an unrecognized value instead of silently falling back', () => {
    expect(() => resolveSttProvider('whisper')).toThrow(/Unknown BUDDY_STT_PROVIDER/);
    expect(() => resolveSttProvider('LiveKit')).toThrow(/Unknown BUDDY_STT_PROVIDER/);
    expect(() => resolveSttProvider('deepgram')).toThrow(/Refusing to silently fall back/);
  });

  it('never echoes an unexpected value verbatim into the error', () => {
    const pasted = 'sk-live-0123456789abcdef@@@';
    expect(() => resolveSttProvider(pasted)).toThrow(/Unknown BUDDY_STT_PROVIDER/);
    try {
      resolveSttProvider(pasted);
    } catch (error) {
      expect((error as Error).message).not.toContain(pasted);
    }
  });
});

describe('resolveSttModel', () => {
  it('defaults to the English conversational Deepgram Flux model', () => {
    expect(resolveSttModel(undefined)).toBe('deepgram/flux-general-en');
    expect(resolveSttModel('')).toBe('deepgram/flux-general-en');
    expect(DEFAULT_STT_MODEL).toBe('deepgram/flux-general-en');
  });

  it('accepts only descriptors the installed inference module declares', () => {
    for (const model of SUPPORTED_STT_MODELS) {
      expect(resolveSttModel(model)).toBe(model);
    }
    expect(SUPPORTED_STT_MODELS).toContain('deepgram/flux-general-en');
  });

  it('fails safely on an unknown or misspelled model', () => {
    expect(() => resolveSttModel('deepgram/flux-general-english')).toThrow(/Unknown BUDDY_STT_MODEL/);
    expect(() => resolveSttModel('openai/whisper-1')).toThrow(/Unknown BUDDY_STT_MODEL/);
    expect(() => resolveSttModel('nova-3')).toThrow(/Refusing to start on an unverified model/);
  });
});

vi.mock('@livekit/agents-plugin-openai', () => ({
  STT: vi.fn().mockImplementation(function (this: Record<string, unknown>, opts: Record<string, unknown>) {
    Object.assign(this, { __provider: 'openai', ...opts });
  }),
}));

describe('createStt', () => {
  beforeEach(() => {
    // LiveKit Inference authenticates with the credentials the worker already
    // has; nothing else is set, which is the point of the tests below.
    process.env.LIVEKIT_API_KEY = LIVEKIT_KEY;
    process.env.LIVEKIT_API_SECRET = LIVEKIT_SECRET;
    delete process.env.BUDDY_STT_PROVIDER;
    delete process.env.BUDDY_STT_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BUDDY_STT_PROVIDER;
    delete process.env.BUDDY_STT_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  it('builds a LiveKit Inference STT by default', async () => {
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as SttInternals;

    expect(instance.provider).toBe('livekit');
    expect(instance.label).toBe('inference.STT');
  });

  it('configures the exact English model and language', async () => {
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as SttInternals;

    expect(instance.model).toBe('deepgram/flux-general-en');
    expect(instance.opts?.model).toBe('deepgram/flux-general-en');
    expect(instance.opts?.language).toBe('en');
    expect(STT_LANGUAGE).toBe('en');
  });

  it('honours an explicitly configured supported model', async () => {
    process.env.BUDDY_STT_PROVIDER = 'livekit';
    process.env.BUDDY_STT_MODEL = 'deepgram/flux-general';
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as SttInternals;

    expect(instance.model).toBe('deepgram/flux-general');
    expect(instance.opts?.language).toBe('en');
  });

  it('needs no OpenAI, Deepgram or Google speech credential', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_API_KEY;
    const { createStt } = await import('./stt.js');

    expect(() => createStt()).not.toThrow();
    const instance = createStt() as unknown as SttInternals;
    expect(instance.provider).toBe('livekit');
  });

  it('explains itself when the worker has no LiveKit credentials at all', async () => {
    delete process.env.LIVEKIT_API_KEY;
    const { createStt } = await import('./stt.js');
    expect(() => createStt()).toThrow(/LIVEKIT_API_KEY is required for the livekit STT provider/);
  });

  it('fails at startup on a bad model rather than transcribing with something else', async () => {
    process.env.BUDDY_STT_MODEL = 'deepgram/nova-3';
    const { createStt } = await import('./stt.js');
    expect(() => createStt()).toThrow(/Unknown BUDDY_STT_MODEL/);
  });

  it('rejects gemini instead of silently using a billable provider', async () => {
    process.env.BUDDY_STT_PROVIDER = 'gemini';
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { createStt } = await import('./stt.js');

    expect(() => createStt()).toThrow(/not a valid speech-to-text option/);
    // OPENAI_API_KEY being present must not rescue it.
    expect(() => createStt()).not.toThrow(/OPENAI_API_KEY/);
  });

  it('gives both Buddy flows the identical STT implementation', async () => {
    const { createStt } = await import('./stt.js');
    // agent.ts (general website voice) passes nothing; meeting.ts (consultation)
    // pins English. English-only Buddy: both must land on the same thing.
    const general = createStt() as unknown as SttInternals;
    const consultation = createStt({ language: 'en' }) as unknown as SttInternals;

    expect(consultation.constructor).toBe(general.constructor);
    expect(consultation.provider).toBe(general.provider);
    expect(consultation.model).toBe(general.model);
    expect(consultation.opts?.language).toBe(general.opts?.language);
    expect(consultation.opts?.language).toBe('en');
  });

  it('hands no VAD to the inference STT, so the session VAD and turn detector stay in charge', async () => {
    // The installed resolveVADForModel ignores a VAD passed here (Flux does
    // endpointing server-side) and warns. We pass none, so the Silero VAD and
    // turn detection configured in agent.ts / meeting.ts are untouched.
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as SttInternals;
    expect(instance.vad).toBeUndefined();
  });

  it('logs nothing, and never puts a credential in an error message', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const { createStt } = await import('./stt.js');
    createStt();

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();

    process.env.BUDDY_STT_MODEL = LIVEKIT_SECRET;
    try {
      createStt();
      throw new Error('expected a startup failure');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/Unknown BUDDY_STT_MODEL/);
      expect(message).not.toContain(LIVEKIT_SECRET);
      expect(message).not.toContain(LIVEKIT_KEY);
    }
    for (const spy of spies) spy.mockRestore();
  });

  // OpenAI stays available for owners who have API billing — explicit only.
  it('uses OpenAI only when it is explicitly selected and configured', async () => {
    process.env.BUDDY_STT_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { createStt } = await import('./stt.js');
    const instance = createStt({ language: 'en' }) as unknown as Record<string, unknown>;

    expect(instance.__provider).toBe('openai');
    expect(instance.model).toBe('gpt-4o-transcribe');
    expect(instance.language).toBe('en');
    expect(instance.detectLanguage).toBe(false);
  });

  it('keeps automatic detection for the openai provider when no language is pinned', async () => {
    process.env.BUDDY_STT_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { createStt } = await import('./stt.js');
    const instance = createStt() as unknown as Record<string, unknown>;

    expect(instance.detectLanguage).toBe(true);
    expect(instance.language).toBeUndefined();
  });

  it('throws a clear, non-sensitive error when the openai provider has no key', async () => {
    process.env.BUDDY_STT_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const { createStt } = await import('./stt.js');
    expect(() => createStt()).toThrow(/OPENAI_API_KEY is required/);
  });

  it('is never chosen automatically: no OpenAI STT is built without opting in', async () => {
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const openaiPlugin = await import('@livekit/agents-plugin-openai');
    const { createStt } = await import('./stt.js');

    const instance = createStt() as unknown as SttInternals;

    expect(instance.provider).toBe('livekit');
    expect(openaiPlugin.STT).not.toHaveBeenCalled();
  });
});
