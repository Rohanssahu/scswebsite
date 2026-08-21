// =============================================================================
// Buddy agent — consultation turn-taking policy.
//
// Two things live here so they can be asserted without a live session:
//
//   1. `isConfirmedClientTurn` — the single guard every consultation handler
//      uses before reacting to a transcript. INTERIM transcription results are
//      rejected outright: Buddy answers a finished turn, never a half-sentence.
//   2. `buildConsultationTurnHandling` — the exact `turnHandling` object handed
//      to `voice.AgentSession`, built from the named millisecond constants in
//      config.ts. Notably it disables preemptive generation, which would
//      otherwise start LLM inference from interim text.
//
// Nothing here sleeps or polls: turn boundaries come from the VAD silence
// window plus the endpointing delays below, i.e. from the framework's own
// detection, never from a timer we invented.
// =============================================================================

import type { ConsultationTurnTaking } from './config.js';

/** The part of a UserInputTranscribed event this policy reads. */
export interface TranscriptEventView {
  readonly isFinal: boolean;
  readonly transcript: string;
}

/**
 * True only for a CONFIRMED, non-empty end-of-turn transcript.
 *
 * Interim results (`isFinal === false`) arrive continuously while the client is
 * still talking; reacting to one would mean answering mid-sentence. An empty or
 * whitespace-only final result is a VAD burst that produced no words — noise,
 * not a turn.
 */
export function isConfirmedClientTurn(ev: TranscriptEventView): boolean {
  return ev.isFinal && ev.transcript.trim().length > 0;
}

/** Exactly the shape `voice.AgentSession({ turnHandling })` accepts. */
export interface ConsultationTurnHandling {
  endpointing: { minDelay: number; maxDelay: number };
  interruption: { enabled: true; minDuration: number };
  preemptiveGeneration: { enabled: false };
}

/**
 * Build the session's turn-handling options. All delays are MILLISECONDS.
 *
 * - `endpointing.minDelay` is the floor Buddy waits after the client stops
 *   before treating the turn as over — this is what stops him answering into a
 *   normal mid-sentence pause.
 * - `endpointing.maxDelay` is how long a thinking pause may run before he takes
 *   the turn anyway.
 * - `interruption.enabled` stays true so the client can always barge in;
 *   `minDuration` is raised above the framework default so a cough over Buddy's
 *   sentence does not cut him off.
 * - `preemptiveGeneration` is off: it runs the LLM on interim transcripts.
 */
export function buildConsultationTurnHandling(t: ConsultationTurnTaking): ConsultationTurnHandling {
  return {
    endpointing: { minDelay: t.endpointingMinDelayMs, maxDelay: t.endpointingMaxDelayMs },
    interruption: { enabled: true, minDuration: t.interruptionMinDurationMs },
    preemptiveGeneration: { enabled: false },
  };
}
