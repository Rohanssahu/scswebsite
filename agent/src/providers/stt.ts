// =============================================================================
// Buddy agent — STT provider abstraction.
//
//   BUDDY_STT_PROVIDER=livekit  (DEFAULT) — LiveKit Inference STT. Billed
//     through the LiveKit project, so it needs NO third-party speech key:
//     the worker's existing LIVEKIT_API_KEY / LIVEKIT_API_SECRET are the only
//     credentials involved.
//   BUDDY_STT_PROVIDER=openai   — explicit opt-in for owners with OpenAI API
//     billing. Never selected automatically.
//   BUDDY_STT_PROVIDER=gemini   — REJECTED, with the reason (see below).
//
// Model: `deepgram/flux-general-en` (BUDDY_STT_MODEL), language fixed to 'en'.
// Buddy's voice is English-only, and pinning the language stops accented
// English from being transcribed as another language.
//
// Verified against the INSTALLED declarations, not documentation:
//   node_modules/@livekit/agents/dist/inference/stt.d.ts
//     * `inference.STT` constructor accepts
//       { model?: ModelWithLanguage; language?: STTLanguages; baseURL?;
//         encoding?; sampleRate?; apiKey?; apiSecret?; modelOptions?;
//         fallback?; connOptions?; vad? } — every field optional.
//     * `DeepgramFluxModels` = 'deepgram/flux-general' |
//       'deepgram/flux-general-en' | 'deepgram/flux-general-multi'.
//     * credentials resolve from LIVEKIT_INFERENCE_API_KEY ?? LIVEKIT_API_KEY
//       and LIVEKIT_INFERENCE_API_SECRET ?? LIVEKIT_API_SECRET
//       (dist/inference/stt.js) — no Deepgram/OpenAI/Google credential is read.
//
// TURN-TAKING: Deepgram Flux DOES report end-of-turn server-side —
// `DeepgramFluxOptions` exposes eot_threshold / eager_eot_threshold /
// eot_timeout_ms, and the installed `resolveVADForModel` treats every
// non-Speechmatics model as "handles endpointing server-side" (it ignores a
// `vad` handed to inference.STT itself). We hand it none, so the AgentSession's
// Silero VAD and the LiveKit turn detector configured in agent.ts / meeting.ts
// keep working exactly as before — Flux's EOT signal complements them. No
// delays are introduced here, no option is set that would answer on interim
// text, and barge-in is untouched.
//
// Why Gemini is not an STT provider (investigated, not assumed):
//   - The LiveKit Google plugin's STT class is backed by Google Cloud
//     Speech-to-Text, which needs GOOGLE_APPLICATION_CREDENTIALS (a GCP
//     service account) — a Gemini Developer API key is NOT a speech credential.
//   - Gemini Live (google.beta.realtime.RealtimeModel) runs on GOOGLE_API_KEY
//     but replaces the whole cascaded stt/llm/tts session with one realtime
//     connection; Buddy depends on strict-Zod multi-step tool calling, so that
//     is a redesign, not an STT swap.
//   GEMINI/GOOGLE_API_KEY is still REQUIRED — it powers the Gemini LLM.
// =============================================================================

import { inference, type stt } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';

export type SttProvider = 'livekit' | 'openai';

/**
 * The English-capable streaming descriptors this agent accepts, all members of
 * the installed `DeepgramFluxModels` union. The Flux family is required, not
 * incidental: it is the family that reports end-of-turn server-side.
 */
export const SUPPORTED_STT_MODELS = [
  'deepgram/flux-general-en',
  'deepgram/flux-general',
  'deepgram/flux-general-multi',
] as const;

export type SttModel = (typeof SUPPORTED_STT_MODELS)[number];

/** The English conversational model Buddy runs on. */
export const DEFAULT_STT_MODEL: SttModel = 'deepgram/flux-general-en';

/** Buddy's voice is English-only; the language is pinned, never detected. */
export const STT_LANGUAGE = 'en';

/**
 * Echoes an untrusted env value back only when it is SHAPED like the thing it
 * was supposed to be — a short provider word, or a `vendor/model` descriptor.
 * Stripping stray characters is not enough: a credential pasted into the wrong
 * variable is often plain alphanumerics and would sail through. Anything that
 * does not match the expected shape is withheld, so a startup error can never
 * become the place a secret gets printed.
 */
function safeValue(raw: string, shape: RegExp): string {
  return shape.test(raw) ? raw : '(value withheld)';
}

const PROVIDER_SHAPE = /^[A-Za-z0-9_-]{1,16}$/;
const MODEL_SHAPE = /^[a-z0-9]+\/[a-z0-9.-]{1,32}$/;

export function resolveSttProvider(envValue?: string | null): SttProvider {
  const value = (envValue ?? '').trim();
  if (!value || value === 'livekit') return 'livekit';
  if (value === 'openai') return 'openai';
  if (value === 'gemini') {
    throw new Error(
      'BUDDY_STT_PROVIDER=gemini is not a valid speech-to-text option: a Gemini ' +
        'API key is not a speech credential (Google Cloud Speech-to-Text needs a ' +
        'GCP service account, and Gemini Live is a realtime redesign, not an STT ' +
        'swap). Use BUDDY_STT_PROVIDER=livekit (default, LiveKit Inference — no ' +
        'extra key needed). GOOGLE_API_KEY is still required for the Gemini LLM.',
    );
  }
  throw new Error(
    `Unknown BUDDY_STT_PROVIDER "${safeValue(value, PROVIDER_SHAPE)}" — must be "livekit" or "openai". ` +
      'Refusing to silently fall back to a different provider.',
  );
}

export function resolveSttModel(envValue?: string | null): SttModel {
  const value = (envValue ?? '').trim();
  if (!value) return DEFAULT_STT_MODEL;
  if ((SUPPORTED_STT_MODELS as readonly string[]).includes(value)) return value as SttModel;
  throw new Error(
    `Unknown BUDDY_STT_MODEL "${safeValue(value, MODEL_SHAPE)}" — must be one of ` +
      `${SUPPORTED_STT_MODELS.join(', ')}. Refusing to start on an unverified model.`,
  );
}

/**
 * Options callers may pin per conversation mode.
 *
 * With the `livekit` provider the language is FIXED to 'en' for both the
 * general website voice flow and consultation meetings — Buddy is English-only,
 * so both flows get the identical STT implementation. The field is still
 * honoured by the `openai` provider.
 */
export interface SttOptions {
  /** BCP-47 code to force. Only used by the openai provider. */
  language?: string;
}

/**
 * LiveKit Inference STT — the production path. No third-party speech key: the
 * LiveKit project credentials the worker already registers with are what
 * authenticate this, and the model runs server-side in LiveKit Cloud.
 */
function createLivekitStt(model: SttModel): stt.STT {
  if (!process.env.LIVEKIT_API_KEY && !process.env.LIVEKIT_INFERENCE_API_KEY) {
    throw new Error(
      'LIVEKIT_API_KEY is required for the livekit STT provider (LiveKit Inference) — ' +
        'the same key the worker registers with. No speech-provider key is needed.',
    );
  }
  if (!process.env.LIVEKIT_API_SECRET && !process.env.LIVEKIT_INFERENCE_API_SECRET) {
    throw new Error(
      'LIVEKIT_API_SECRET is required for the livekit STT provider (LiveKit Inference) — ' +
        'the same secret the worker registers with. No speech-provider key is needed.',
    );
  }
  // Explicit type argument: the installed generic cannot be inferred from
  // `model` alone, and every accepted descriptor is a Deepgram Flux model.
  return new inference.STT<SttModel>({ model, language: STT_LANGUAGE });
}

/** Explicit opt-in only — kept for owners who have OpenAI API billing. */
function createOpenAiStt(options: SttOptions): stt.STT {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for the openai STT provider');
  }
  const pinned = options.language?.trim();
  return new openai.STT({
    model: 'gpt-4o-transcribe',
    ...(pinned ? { language: pinned, detectLanguage: false } : { detectLanguage: true }),
  });
}

export function createStt(options: SttOptions = {}): stt.STT {
  const provider = resolveSttProvider(process.env.BUDDY_STT_PROVIDER);
  if (provider === 'openai') return createOpenAiStt(options);
  return createLivekitStt(resolveSttModel(process.env.BUDDY_STT_MODEL));
}
