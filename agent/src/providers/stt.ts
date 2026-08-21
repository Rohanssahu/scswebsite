// =============================================================================
// Buddy agent — STT provider abstraction.
//
// OpenAI is currently the ONLY working provider. This seam exists so a future
// Gemini STT integration can be dropped in behind BUDDY_STT_PROVIDER without
// touching agent.ts/meeting.ts again — it does NOT mean Gemini STT works today.
//
//   BUDDY_STT_PROVIDER=openai   (default) — implemented, uses OPENAI_API_KEY
//   BUDDY_STT_PROVIDER=gemini   — NOT implemented, fails clearly (see below)
//
// Why Gemini STT is not wired up (investigated, not assumed):
//   - The LiveKit Google plugin's STT class is backed by Google Cloud
//     Speech-to-Text, which requires GOOGLE_APPLICATION_CREDENTIALS (a GCP
//     service account / Vertex-style setup) — not the Gemini Developer API
//     key (GOOGLE_API_KEY) this project uses everywhere else.
//   - Gemini Live (google.beta.realtime.RealtimeModel) CAN run on
//     GOOGLE_API_KEY alone and could, in a "half-cascade" text-output mode,
//     feed a separate TTS. But it replaces the entire cascaded
//     stt/llm/tts AgentSession with one realtime connection, not a drop-in
//     STT swap, and LiveKit's Node plugin has open upstream issues with
//     tool-calling/generateReply() on realtime models. Buddy depends on
//     strict-Zod multi-step tool calling, so this is not a safe swap today.
// =============================================================================

import type { stt } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';

export type SttProvider = 'openai' | 'gemini';

export function resolveSttProvider(envValue?: string | null): SttProvider {
  const value = (envValue ?? '').trim();
  if (!value || value === 'openai') return 'openai';
  if (value === 'gemini') return 'gemini';
  throw new Error(
    `Unknown BUDDY_STT_PROVIDER "${envValue}" — must be "openai" or "gemini". ` +
      'Refusing to silently fall back to a different provider.',
  );
}

function createOpenAiStt(): stt.STT {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for the openai STT provider');
  }
  return new openai.STT({
    model: 'gpt-4o-transcribe',
    detectLanguage: true,
  });
}

/** Not implemented — see the header for why this is not a safe drop-in yet. */
function createGeminiStt(): stt.STT {
  throw new Error(
    'Gemini STT is not available: Google Cloud Speech-to-Text needs ' +
      'GOOGLE_APPLICATION_CREDENTIALS (a GCP service account), and Gemini Live ' +
      'requires a full realtime-session redesign — neither is a safe drop-in ' +
      'today. Run with BUDDY_STT_PROVIDER=openai.',
  );
}

export function createStt(): stt.STT {
  const provider = resolveSttProvider(process.env.BUDDY_STT_PROVIDER);
  return provider === 'gemini' ? createGeminiStt() : createOpenAiStt();
}
