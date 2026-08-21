// =============================================================================
// Buddy agent — tool parameter schemas that must stay provider-portable.
//
// Every tool's parameters are converted into the ACTIVE provider's
// function-declaration format on EVERY LLM request, and Gemini's format is the
// strict one: its Schema proto accepts `enum` values as STRINGS only.
//
// `z.literal(true)` compiles to `{"type":"boolean","const":true}` in JSON
// Schema, which @livekit/agents-plugin-google rewrites to
// `{"type":"boolean","enum":[true]}` — and the Gemini API then rejects the
// WHOLE request with 400 INVALID_ARGUMENT:
//
//   Invalid value at 'tools[0].function_declarations[0].parameters
//   .properties[0].value.enum[0]' (TYPE_STRING), true
//
// That failure is silent exactly where it hurts most. @livekit/agents retries,
// emits an `llm_error` event and then closes the stream with NO chunks instead
// of throwing, so the voice session produces no reply at all: Buddy stays on
// "thinking" and the client's turn is never answered, while the scripted
// greeting and opening lines (pure TTS, no LLM) still play normally.
//
// So consent is typed as a plain boolean and ENFORCED IN THE TOOL BODY, which
// is where every other authorization check already lives — the model was never
// trusted to set it truthfully anyway. gemini_tool_schema.test.ts guards the
// rule for the whole agent.
// =============================================================================

import { z } from 'zod';

/**
 * Parameters for the two submission tools (`submit_lead` in the general voice
 * flow, `finalize_consultation` in a consultation meeting).
 *
 * `contact_consent` is a plain boolean on the wire; a `false` (or absent) value
 * must be refused by the tool body — see {@link CONSENT_REQUIRED_REPLY}.
 */
export const submissionToolParameters = z
  .object({
    contact_consent: z.boolean(),
    human_review: z.boolean().default(false),
    review_message: z.string().trim().max(2000).optional(),
  })
  .strict();

export type SubmissionToolArgs = z.infer<typeof submissionToolParameters>;

/** What a submission tool returns when consent was not actually given. */
export const CONSENT_REQUIRED_REPLY =
  'Cannot submit: ask the client, in one short question, whether they consent to SCS Softwares contacting them about this request, and only call this tool again after they clearly say yes.';
