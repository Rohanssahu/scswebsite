// =============================================================================
// Buddy agent — LLM provider abstraction.
//
// The frontend and the rest of the worker never know which provider is in
// use: they receive an opaque `llm.LLM` instance from createLlm(). Exactly
// ONE provider is active at a time, selected by BUDDY_LLM_PROVIDER.
//
//   BUDDY_LLM_PROVIDER=openai   (default) — implemented
//   BUDDY_LLM_PROVIDER=gemini   — documented placeholder, NOT implemented
//
// Adding Gemini later:
//   1. `npm install @livekit/agents-plugin-google`
//   2. Implement createGeminiLlm() below with
//        new google.LLM({ model: process.env.BUDDY_GEMINI_MODEL ?? 'gemini-2.0-flash',
//                         apiKey: process.env.GOOGLE_API_KEY })
//   3. Set BUDDY_LLM_PROVIDER=gemini and GOOGLE_API_KEY in the worker env.
// Nothing in the frontend, Edge Functions or database changes — the provider
// is invisible outside this module.
// =============================================================================

import type { llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';

export type LlmProvider = 'openai' | 'gemini';

export function resolveProvider(envValue?: string | null): LlmProvider {
  return envValue === 'gemini' ? 'gemini' : 'openai';
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

/** Placeholder — see the header for the exact steps to enable Gemini. */
function createGeminiLlm(): llm.LLM {
  throw new Error(
    'Gemini provider is not implemented yet. Install @livekit/agents-plugin-google, ' +
      'implement createGeminiLlm() in src/providers/llm.ts, and set GOOGLE_API_KEY. ' +
      'Until then run with BUDDY_LLM_PROVIDER=openai.',
  );
}

export function createLlm(): llm.LLM {
  const provider = resolveProvider(process.env.BUDDY_LLM_PROVIDER);
  return provider === 'gemini' ? createGeminiLlm() : createOpenAiLlm();
}
