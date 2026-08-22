// =============================================================================
// Buddy agent — LLM provider.
//
// Buddy's reasoning provider is GEMINI, and only Gemini. The rest of the worker
// never knows that: it receives an opaque `llm.LLM` instance from createLlm().
//
//   BUDDY_LLM_PROVIDER=gemini   (default, and the only accepted value)
//
// The OpenAI LLM option that used to live here has been REMOVED on purpose.
// Requirement extraction, analysis, scope classification and proposal wording
// are a single commercial pipeline; letting a worker env var silently move that
// reasoning to a different provider meant the "Gemini-powered" analysis a
// client was shown could in fact have come from somewhere else. An
// unrecognized value now fails loudly at startup instead.
//
// OpenAI is still a legitimate *speech-to-text* option (see ./stt.ts) — that is
// a different role in the pipeline and does not touch reasoning:
//   STT: LiveKit Inference / Deepgram Flux (OpenAI optional, opt-in)
//   LLM reasoning: Gemini
//   TTS: ElevenLabs
// =============================================================================

import type { llm } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';

export type LlmProvider = 'gemini';

export function resolveProvider(envValue?: string | null): LlmProvider {
  const value = (envValue ?? '').trim();
  if (!value || value === 'gemini') return 'gemini';
  // Only echo back a value that is shaped like a provider word, so a credential
  // pasted into the wrong variable never reaches a log.
  const safe = /^[A-Za-z0-9_-]{1,16}$/.test(value) ? value : '(value withheld)';
  throw new Error(
    `Unknown BUDDY_LLM_PROVIDER "${safe}" — the only supported reasoning provider is "gemini". ` +
      'Refusing to route requirement analysis and pricing wording to a different provider. ' +
      '(OpenAI remains available for speech-to-text only, via BUDDY_STT_PROVIDER.)',
  );
}

/** The single place Buddy's Gemini model name is hardcoded.
 * `BUDDY_GEMINI_MODEL` overrides it. */
export const DEFAULT_BUDDY_GEMINI_MODEL = 'gemini-3.6-flash';

/** The model actually in use, for the provider metadata stored with an estimate. */
export function resolveModel(): string {
  return process.env.BUDDY_GEMINI_MODEL?.trim() || DEFAULT_BUDDY_GEMINI_MODEL;
}

export function createLlm(): llm.LLM {
  // Validate the env var even though there is a single provider: a typo must
  // fail loudly rather than look like a successful default.
  resolveProvider(process.env.BUDDY_LLM_PROVIDER);
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required — Gemini is the reasoning provider.');
  }
  return new google.LLM({
    model: resolveModel(),
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.3,
  });
}
