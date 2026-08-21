// =============================================================================
// Buddy agent — LLM provider abstraction.
//
// The frontend and the rest of the worker never know which provider is in
// use: they receive an opaque `llm.LLM` instance from createLlm(). Exactly
// ONE provider is active at a time, selected by BUDDY_LLM_PROVIDER.
//
//   BUDDY_LLM_PROVIDER=gemini   (default) — implemented, uses GOOGLE_API_KEY
//   BUDDY_LLM_PROVIDER=openai   — implemented, uses OPENAI_API_KEY
//
// Nothing in the frontend, Edge Functions or database changes — the provider
// is invisible outside this module. An unrecognized value fails loudly
// instead of silently falling back, so a typo in worker env config can never
// silently switch providers.
// =============================================================================

import type { llm } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import * as openai from '@livekit/agents-plugin-openai';

export type LlmProvider = 'openai' | 'gemini';

export function resolveProvider(envValue?: string | null): LlmProvider {
  const value = (envValue ?? '').trim();
  if (!value || value === 'gemini') return 'gemini';
  if (value === 'openai') return 'openai';
  throw new Error(
    `Unknown BUDDY_LLM_PROVIDER "${envValue}" — must be "gemini" or "openai". ` +
      'Refusing to silently fall back to a different provider.',
  );
}

function createOpenAiLlm(): llm.LLM {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for the openai provider');
  }
  return new openai.LLM({
    model: process.env.BUDDY_OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature: 0.3,
  });
}

function createGeminiLlm(): llm.LLM {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required for the gemini provider');
  }
  return new google.LLM({
    model: process.env.BUDDY_GEMINI_MODEL ?? 'gemini-2.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.3,
  });
}

export function createLlm(): llm.LLM {
  const provider = resolveProvider(process.env.BUDDY_LLM_PROVIDER);
  return provider === 'gemini' ? createGeminiLlm() : createOpenAiLlm();
}
