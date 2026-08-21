// =============================================================================
// Buddy agent — AI Consultation Meeting mode.
//
// Runs when a room is dispatched with participant metadata
// `{ mode: 'consultation', meetingId }` (minted server-side by the
// consultation-meeting Edge Function — never by the browser). Reuses the same
// voice pipeline (Silero VAD → OpenAI STT → provider LLM → ElevenLabs TTS),
// the same deterministic estimate engine, and the same strict-tool posture as
// the general Buddy flow; persistence goes through the consultation-agent
// Edge Function with the shared VOICE_AGENT_SECRET.
//
// The pure helpers at the top (snapshot seeding, proposal wire building,
// finalize payload) are unit-tested in meeting.test.ts.
// =============================================================================

import { type JobContext, llm, voice } from '@livekit/agents';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import type * as silero from '@livekit/agents-plugin-silero';
import { z } from 'zod';
import {
  ConsultationClient,
  loadConsultationBackendConfig,
  type ContactDetails,
  type MeetingContext,
} from './backend.js';
import { loadSessionLimits } from './config.js';
import {
  EstimateError,
  buildPreliminaryEstimate,
  describeEstimate,
  estimateInputSchema,
  type EstimateInput,
  type PreliminaryEstimate,
} from './estimate.js';
import {
  isValidEmail,
  normalizePhone,
  screenUserInput,
  spellEmailForReadback,
  spellPhoneForReadback,
} from './guards.js';
import { loadKnowledge } from './knowledge.js';
import {
  CONSULTATION_GREETING_GENERAL,
  CONSULTATION_GREETING_WITH_ANALYSIS,
  buildConsultationPrompt,
} from './prompts.js';
import { createLlm } from './providers/llm.js';
import { createStt } from './providers/stt.js';
import {
  CONSULTATION_LANGUAGES,
  applyUpdate,
  buildSummary,
  computeProgress,
  emptyState,
  requirementFieldsSchema,
  stateUpdateSchema,
  type ProjectState,
  type RequirementFields,
} from './state.js';

const STATE_TOPIC = 'buddy.state';

// =============================================================================
// Pure helpers (unit-tested)
// =============================================================================

/** Analysis snapshot as stored by the consultation-meeting Edge Function. */
export interface StoredAnalysisSnapshot {
  mode?: unknown;
  source?: unknown;
  projectType?: unknown;
  platforms?: unknown;
  features?: unknown;
  currentCondition?: unknown;
  technologyPreferences?: unknown;
  existingProblems?: unknown;
  missingFeatures?: unknown;
  priorities?: unknown;
  reported?: unknown;
}

const asStr = (v: unknown, max = 500): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

const asList = (v: unknown, maxItems = 25, maxLen = 200): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .slice(0, maxItems)
        .map((i) => i.trim().slice(0, maxLen))
    : [];

/**
 * Seed the requirement state from the (server-sanitized) analysis snapshot.
 * Only fills fields that are still empty, so previously saved answers — e.g.
 * after a reconnect — always win. Returns the seeded state and the list of
 * field names now known (used to tell the LLM what NOT to re-ask).
 */
export function seedStateFromSnapshot(
  state: ProjectState,
  snapshot: StoredAnalysisSnapshot,
): { state: ProjectState; knownFields: string[] } {
  const mode = snapshot.mode === 'new' || snapshot.mode === 'existing' ? snapshot.mode : null;
  if (!mode) return { state, knownFields: [] };

  const next: ProjectState = { ...state, fields: { ...state.fields } };
  if (!next.intent) next.intent = mode === 'existing' ? 'improve_existing' : 'new_project';

  const setIfEmpty = (key: keyof RequirementFields, value: string | string[] | null) => {
    if (value === null || (Array.isArray(value) && value.length === 0)) return;
    const current = next.fields[key];
    const empty = current === undefined || (Array.isArray(current) && current.length === 0);
    if (empty) (next.fields as Record<string, string | string[]>)[key] = value;
  };

  setIfEmpty('platforms', asList(snapshot.platforms, 10, 120));
  setIfEmpty('core_features', asList(snapshot.features));
  const tech = asStr(snapshot.technologyPreferences);
  if (mode === 'existing') {
    setIfEmpty('current_technology', tech);
    setIfEmpty('current_status', asStr(snapshot.currentCondition, 500));
    const problems = asList(snapshot.existingProblems, 15, 300);
    setIfEmpty('main_problems', problems.length ? problems.join('; ').slice(0, 500) : null);
  } else {
    setIfEmpty('preferred_technology', tech);
  }

  const missing = asList(snapshot.missingFeatures, 15, 200);
  if (missing.length) {
    next.suggestedFeatures = [...new Set([...next.suggestedFeatures, ...missing])].slice(0, 25);
  }
  const priorities = asList(snapshot.priorities, 10, 200);
  if (priorities.length) {
    next.assumptions = [
      ...new Set([...next.assumptions, ...priorities.map((p) => `Client priority: ${p}`)]),
    ].slice(0, 25);
  }

  const knownFields = Object.keys(next.fields).filter((k) => {
    const v = next.fields[k as keyof RequirementFields];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  return { state: next, knownFields };
}

/** Restore state from the requirements previously saved for this meeting
 * (reconnect / rejoin) — confirmed answers are never lost. */
export function seedStateFromSaved(state: ProjectState, saved: Record<string, unknown>): ProjectState {
  const next: ProjectState = { ...state, fields: { ...state.fields } };
  const intent = saved.intent;
  if (
    !next.intent &&
    (intent === 'new_project' || intent === 'improve_existing' || intent === 'repair_broken' || intent === 'consultation')
  ) {
    next.intent = intent;
  }
  const fieldsOnly: Record<string, unknown> = { ...saved };
  delete fieldsOnly.intent;
  delete fieldsOnly.assumptions;
  delete fieldsOnly.contradictions;
  delete fieldsOnly.risks;
  delete fieldsOnly.suggested_features;
  delete fieldsOnly.deferred_decisions;
  const parsed = requirementFieldsSchema.safeParse(fieldsOnly);
  if (parsed.success) next.fields = { ...parsed.data, ...next.fields };
  next.assumptions = [...new Set([...asList(saved.assumptions), ...next.assumptions])].slice(0, 25);
  next.risks = [...new Set([...asList(saved.risks), ...next.risks])].slice(0, 25);
  next.suggestedFeatures = [...new Set([...asList(saved.suggested_features), ...next.suggestedFeatures])].slice(0, 25);
  next.deferredDecisions = [...new Set([...asList(saved.deferred_decisions), ...next.deferredDecisions])].slice(0, 25);
  return next;
}

/** Plain-text rendering of the snapshot for the system prompt. */
export function renderSnapshotSummary(snapshot: StoredAnalysisSnapshot): string {
  const mode = snapshot.mode === 'new' || snapshot.mode === 'existing' ? snapshot.mode : null;
  if (!mode) return '';
  const lines: string[] = [`- Project mode: ${mode === 'new' ? 'new project' : 'existing project'}`];
  const push = (label: string, value: string | null) => {
    if (value) lines.push(`- ${label}: ${value}`);
  };
  push('Project type', asStr(snapshot.projectType, 200));
  const platforms = asList(snapshot.platforms, 10, 120);
  if (platforms.length) lines.push(`- Platforms: ${platforms.join(', ')}`);
  const features = asList(snapshot.features);
  if (features.length) lines.push(`- Features: ${features.join(', ')}`);
  push('Current condition', asStr(snapshot.currentCondition, 500));
  push('Technology preferences', asStr(snapshot.technologyPreferences, 300));
  const problems = asList(snapshot.existingProblems, 15, 300);
  if (problems.length) lines.push(`- Known problems: ${problems.join('; ')}`);
  const missing = asList(snapshot.missingFeatures, 15, 200);
  if (missing.length) lines.push(`- Missing features: ${missing.join(', ')}`);
  const priorities = asList(snapshot.priorities, 10, 200);
  if (priorities.length) lines.push(`- Client priorities: ${priorities.join(', ')}`);
  const reported = snapshot.reported;
  if (typeof reported === 'object' && reported !== null) {
    lines.push(
      '- The client saw a rough browser-side demo estimate. Treat it as UNVERIFIED — your proposal numbers come only from the update_proposal tool.',
    );
  }
  return lines.join('\n').slice(0, 4000);
}

/** Narrative content of the proposal — classified by the LLM; contains no
 * numbers that reach storage (all arithmetic comes from the engine). */
export const proposalContentSchema = z
  .object({
    summary: z.string().trim().min(10).max(2000),
    recommended_solution: z.array(z.string().trim().min(1).max(200)).min(1).max(15),
    technology_stack: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
    in_scope: z.array(z.string().trim().min(1).max(200)).min(1).max(25),
    out_of_scope: z.array(z.string().trim().min(1).max(200)).max(25).default([]),
    ai_roles: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
    human_roles: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
    milestones: z
      .array(z.object({ title: z.string().trim().min(1).max(200), weeks: z.string().trim().min(1).max(40) }).strict())
      .max(12)
      .default([]),
    dependencies: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
  })
  .strict();

export type ProposalContent = z.infer<typeof proposalContentSchema>;

/** Combined tool input: engine classification + narrative content. */
export const updateProposalSchema = estimateInputSchema.extend(proposalContentSchema.shape).strict();
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

/** Split the combined tool input back into engine vs narrative halves. */
export function splitProposalInput(input: UpdateProposalInput): { estimate: EstimateInput; content: ProposalContent } {
  const {
    summary,
    recommended_solution,
    technology_stack,
    in_scope,
    out_of_scope,
    ai_roles,
    human_roles,
    milestones,
    dependencies,
    ...estimate
  } = input;
  return {
    estimate: estimate as EstimateInput,
    content: {
      summary,
      recommended_solution,
      technology_stack,
      in_scope,
      out_of_scope,
      ai_roles,
      human_roles,
      milestones,
      dependencies,
    },
  };
}

/** Build the exact wire payload the consultation-agent Edge Function
 * re-validates (sanitizeProposal). Every number comes from the engine. */
export function buildProposalWire(estimate: PreliminaryEstimate, content: ProposalContent): Record<string, unknown> {
  return {
    config_version: estimate.config_version,
    currency: estimate.currency,
    hourly_rate_min: estimate.hourly_rate_min,
    hourly_rate_max: estimate.hourly_rate_max,
    weekly_capacity_hours: estimate.weekly_capacity_hours,
    role_hours: estimate.role_hours,
    total_hours_min: estimate.total_hours_min,
    total_hours_max: estimate.total_hours_max,
    total_cost_min: estimate.total_cost_min,
    total_cost_max: estimate.total_cost_max,
    duration_weeks_min: estimate.duration_weeks_min,
    duration_weeks_max: estimate.duration_weeks_max,
    confidence: estimate.confidence,
    modules: estimate.modules,
    summary: content.summary,
    recommended_solution: content.recommended_solution,
    architecture: estimate.architecture,
    technology_stack: content.technology_stack,
    in_scope: content.in_scope,
    out_of_scope: [...content.out_of_scope, ...estimate.exclusions].slice(0, 25),
    ai_roles: content.ai_roles,
    human_roles: content.human_roles.length ? content.human_roles : estimate.team_roles,
    milestones: content.milestones,
    assumptions: estimate.assumptions,
    dependencies: content.dependencies,
    risks: estimate.risks,
  };
}

/** Browser-facing proposal view published on the buddy.state data topic. */
export function buildProposalView(
  estimate: PreliminaryEstimate,
  content: ProposalContent,
  version: number,
): Record<string, unknown> {
  return {
    version,
    status: 'preliminary',
    requiresHumanReview: true,
    summary: content.summary,
    recommendedSolution: content.recommended_solution,
    architecture: estimate.architecture,
    technologyStack: content.technology_stack,
    inScope: content.in_scope,
    outOfScope: [...content.out_of_scope, ...estimate.exclusions].slice(0, 25),
    aiRoles: content.ai_roles,
    humanRoles: content.human_roles.length ? content.human_roles : estimate.team_roles,
    milestones: content.milestones,
    assumptions: estimate.assumptions,
    dependencies: content.dependencies,
    risks: estimate.risks,
    totalHoursMin: estimate.total_hours_min,
    totalHoursMax: estimate.total_hours_max,
    totalCostMin: estimate.total_cost_min,
    totalCostMax: estimate.total_cost_max,
    durationWeeksMin: estimate.duration_weeks_min,
    durationWeeksMax: estimate.duration_weeks_max,
    weeklyCapacityHours: estimate.weekly_capacity_hours,
    currency: estimate.currency,
    confidence: estimate.confidence,
  };
}

export interface FinalizeConsultationArgs {
  meetingId: string;
  state: ProjectState;
  proposalWire: Record<string, unknown>;
  contact: ContactDetails;
  consentAt: string;
  humanReview: boolean;
  reviewMessage?: string;
}

/** Build the exact finalize wire payload consultation-agent validates. Pure. */
export function buildFinalizePayload(args: FinalizeConsultationArgs): Record<string, unknown> {
  const { state } = args;
  if (!state.intent) throw new Error('intent missing');
  if (!state.confirmedAt) throw new Error('client has not confirmed');
  return {
    action: 'finalize',
    meeting_id: args.meetingId,
    user_confirmed: true,
    confirmed_at: state.confirmedAt,
    consent: true,
    consent_at: args.consentAt,
    intent: state.intent,
    contact: {
      name: args.contact.name,
      email: args.contact.email,
      phone: args.contact.phone,
      company: args.contact.company ?? '',
      preferred_contact_method: args.contact.preferredContactMethod,
    },
    fields: {
      ...state.fields,
      ...(state.assumptions.length ? { assumptions: state.assumptions } : {}),
      ...(state.contradictions.length ? { contradictions: state.contradictions } : {}),
      ...(state.risks.length ? { risks: state.risks } : {}),
      ...(state.suggestedFeatures.length ? { suggested_features: state.suggestedFeatures } : {}),
      ...(state.deferredDecisions.length ? { deferred_decisions: state.deferredDecisions } : {}),
    },
    requirement_summary: buildSummary(state),
    selected_language: state.language,
    proposal: args.proposalWire,
    human_review: args.humanReview,
    ...(args.humanReview && args.reviewMessage ? { review_message: args.reviewMessage } : {}),
  };
}

// =============================================================================
// Runtime
// =============================================================================

export interface ConsultationMeta {
  meetingId: string;
  preferredLanguage: string | null;
}

export async function runConsultationMeeting(ctx: JobContext, meta: ConsultationMeta): Promise<void> {
  const limits = loadSessionLimits();
  const knowledge = loadKnowledge();
  const backendConfig = loadConsultationBackendConfig();
  const client = backendConfig ? new ConsultationClient(backendConfig) : null;
  const meetingId = meta.meetingId;

  // ---- meeting context (server-to-server; the browser provides nothing) -----
  let context: MeetingContext | null = null;
  if (client) {
    context = await client.loadContext(meetingId);
    if (!context) {
      // one retry — a cold function boot should not kill the meeting
      context = await client.loadContext(meetingId);
    }
  }

  const logEvent = (eventType: string, data: Record<string, string | number | boolean> = {}) => {
    if (client) void client.meetingEvent(meetingId, eventType, data).catch(() => undefined);
  };

  // ---- per-meeting state (server-side only; never model-writable) -----------
  let state: ProjectState = emptyState();
  if (context) {
    state = seedStateFromSaved(state, context.requirements);
  }
  const snapshot = (context?.analysisSnapshot ?? {}) as StoredAnalysisSnapshot;
  const seeded = seedStateFromSnapshot(state, snapshot);
  state = seeded.state;
  const hasAnalysis = seeded.knownFields.length > 0 || Boolean(snapshot.mode);
  const preferred = context?.preferredLanguage ?? meta.preferredLanguage;
  if (preferred && (CONSULTATION_LANGUAGES as readonly string[]).includes(preferred)) {
    state.language = preferred as ProjectState['language'];
  }
  state.transcriptConsent = context?.transcriptConsent ?? false;
  const consentAt = context?.consentAt ?? new Date().toISOString();

  let estimate: PreliminaryEstimate | null = null;
  let proposalContent: ProposalContent | null = null;
  let proposalVersion = 0;
  let proposalWire: Record<string, unknown> | null = null;
  let contact: ContactDetails | null = null;
  let submittedReference: string | null = null;
  let alreadyFinalized = context?.finalized ?? false;
  let turnCount = 0;
  let greeted = false;

  const publishState = (extra: Record<string, unknown> = {}) => {
    const progress = computeProgress(state);
    const payload = {
      type: 'buddy.state',
      mode: 'consultation',
      progress,
      language: state.language,
      estimate: estimate
        ? {
            totalHoursMin: estimate.total_hours_min,
            totalHoursMax: estimate.total_hours_max,
            totalCostMin: estimate.total_cost_min,
            totalCostMax: estimate.total_cost_max,
            durationWeeksMin: estimate.duration_weeks_min,
            durationWeeksMax: estimate.duration_weeks_max,
            weeklyCapacityHours: estimate.weekly_capacity_hours,
            currency: estimate.currency,
            confidence: estimate.confidence,
            modules: estimate.modules,
            teamRoles: estimate.team_roles,
            assumptions: estimate.assumptions,
            exclusions: estimate.exclusions,
            risks: estimate.risks,
            status: 'preliminary',
          }
        : null,
      proposal:
        estimate && proposalContent ? buildProposalView(estimate, proposalContent, proposalVersion) : null,
      confirmed: Boolean(state.confirmedAt),
      referenceCode: submittedReference,
      finalized: alreadyFinalized,
      ...extra,
    };
    const data = new TextEncoder().encode(JSON.stringify(payload));
    void ctx.room.localParticipant
      ?.publishData(data, { reliable: true, topic: STATE_TOPIC })
      .catch(() => undefined);
  };

  const fieldsForSave = (): Record<string, unknown> => ({
    ...state.fields,
    ...(state.intent ? { intent: state.intent } : {}),
    ...(state.assumptions.length ? { assumptions: state.assumptions } : {}),
    ...(state.contradictions.length ? { contradictions: state.contradictions } : {}),
    ...(state.risks.length ? { risks: state.risks } : {}),
    ...(state.suggestedFeatures.length ? { suggested_features: state.suggestedFeatures } : {}),
    ...(state.deferredDecisions.length ? { deferred_decisions: state.deferredDecisions } : {}),
  });

  const persistState = (transcriptConsent?: boolean) => {
    if (!client) return;
    void client
      .saveState(meetingId, fieldsForSave(), buildSummary(state).slice(0, 9500), state.language, transcriptConsent)
      .catch(() => undefined);
  };

  const persistMessage = (sender: 'client' | 'buddy', content: string) => {
    // Consent gate is re-checked server-side; this is just to avoid the call.
    if (!client || !state.transcriptConsent || !content.trim()) return;
    void client.saveMessage(meetingId, sender, content.trim().slice(0, 4000)).catch(() => undefined);
  };

  // ---- tools (STRICT schemas; server-side authorization inside each) ---------
  const tools = {
    set_language: llm.tool({
      description:
        'Set the conversation language the client chose (en, hi, hinglish, mr = Marathi, ur = Urdu, ar = Arabic).',
      parameters: z.object({ language: z.enum(CONSULTATION_LANGUAGES) }).strict(),
      execute: async ({ language }) => {
        state.language = language;
        logEvent('language_selected', { language });
        persistState();
        publishState();
        return `Language set to ${language}. Continue the conversation strictly in this language. Now summarize the attached analysis (or say none is attached) and start clarifying.`;
      },
    }),

    update_requirements: llm.tool({
      description:
        'Record newly learned requirement details after each client answer (spoken OR typed in chat). Only include fields the client actually addressed this turn. Returns which required fields are still missing — ask about those next, one at a time.',
      parameters: stateUpdateSchema,
      execute: async (update) => {
        state = applyUpdate(state, update);
        const progress = computeProgress(state);
        logEvent('state_updated', {
          collected: progress.collected.length,
          missing: progress.missingRequired.length,
          percent: progress.percent,
        });
        persistState();
        publishState();
        if (!state.intent) {
          return 'Recorded. Intent is still unknown — find out whether this is a new project, an improvement, a repair, or a general consultation.';
        }
        if (progress.missingRequired.length > 0) {
          return `Recorded. Still missing (required): ${progress.missingRequired.join(', ')}. Ask about ONE of these next.`;
        }
        return 'Recorded. All required fields are collected — call update_proposal now (or refresh it if answers changed), then keep clarifying optional details as natural.';
      },
    }),

    update_proposal: llm.tool({
      description:
        'Generate or refresh the preliminary proposal once the required requirement fields are collected. You provide only classifications and narrative (solution, scope, roles, milestones); the server computes every number. Returns the figures to present.',
      parameters: updateProposalSchema,
      execute: async (input) => {
        const { estimate: estimateInput, content } = splitProposalInput(input);
        try {
          estimate = buildPreliminaryEstimate(state, estimateInput);
        } catch (e) {
          const code = e instanceof EstimateError ? e.code : 'invalid_input';
          logEvent('proposal_rejected', { code });
          if (code === 'not_ready') {
            const progress = computeProgress(state);
            return `Cannot build the proposal yet — missing required fields: ${progress.missingRequired.join(', ')}. Collect those first.`;
          }
          return 'The proposal input was invalid. Re-check the module list and classifications, then try once more.';
        }
        proposalContent = content;
        proposalWire = buildProposalWire(estimate, content);
        proposalVersion += 1;
        if (client) {
          const saved = await client.saveProposal(meetingId, proposalWire).catch(() => null);
          if (saved?.ok && typeof saved.body?.version === 'number') {
            proposalVersion = saved.body.version as number;
          }
        }
        logEvent('proposal_generated', {
          version: proposalVersion,
          hours_max: estimate.total_hours_max,
          cost_max: estimate.total_cost_max,
          confidence: estimate.confidence,
        });
        publishState();
        return (
          `PRELIMINARY proposal v${proposalVersion} (present briefly, then ask the client to confirm the summary): ${describeEstimate(estimate)}. ` +
          `The full proposal is visible in the client's Live Proposal panel. Say clearly it is preliminary and requires human review by SCS before any final quotation. ` +
          `Requirement summary to read back: ${buildSummary(state).slice(0, 1200)}`
        );
      },
    }),

    mark_confirmed: llm.tool({
      description:
        'Record that the client clearly confirmed the requirement summary and preliminary proposal. Call this ONLY after an explicit yes, and quote their confirming words.',
      parameters: z.object({ visitor_words: z.string().trim().min(2).max(300) }).strict(),
      execute: async ({ visitor_words }) => {
        if (!estimate || !proposalContent) {
          return 'No proposal has been presented yet — generate and present it before asking for confirmation.';
        }
        state.confirmedAt = new Date().toISOString();
        logEvent('confirmation_requested', { confirmed: true });
        publishState();
        return `Confirmation recorded ("${visitor_words.slice(0, 120)}"). Now verify the contact details on file — full name, email, mobile number, optional company and preferred contact method — reading email and phone back for verification (verify_contact).`;
      },
    }),

    verify_contact: llm.tool({
      description:
        'Validate the collected contact details. Returns exact read-back strings for the email (letter by letter) and phone (digit by digit) — read them to the client and get a yes before finalizing.',
      parameters: z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.string().trim().max(254),
          phone: z.string().trim().max(30),
          company: z.string().trim().max(150).optional(),
          preferred_contact_method: z.enum(['email', 'phone', 'whatsapp']),
        })
        .strict(),
      execute: async (args) => {
        const email = args.email.toLowerCase();
        if (!isValidEmail(email)) {
          return 'That email address is not valid — ask the client to repeat it slowly.';
        }
        const phone = normalizePhone(args.phone);
        if (!phone) {
          return 'That phone number is not valid — ask for it again with the country code.';
        }
        contact = {
          name: args.name,
          email,
          phone,
          company: args.company || undefined,
          preferredContactMethod: args.preferred_contact_method,
        };
        return (
          `Details are valid. Read back to the client for confirmation — email: "${spellEmailForReadback(email)}", ` +
          `phone: "${spellPhoneForReadback(phone)}". After they confirm both, confirm transcript consent if not yet set, then call finalize_consultation when they say to submit.`
        );
      },
    }),

    set_transcript_consent: llm.tool({
      description:
        'Record whether the client consents to storing the meeting chat/transcript with their request. Default is false (structured summary only).',
      parameters: z.object({ consent: z.boolean() }).strict(),
      execute: async ({ consent }) => {
        state.transcriptConsent = consent;
        persistState(consent);
        return consent
          ? 'Transcript consent recorded — the meeting chat will be stored with their request.'
          : 'No transcript will be stored — only the structured requirement summary.';
      },
    }),

    finalize_consultation: llm.tool({
      description:
        'Store the confirmed requirements, proposal and contact details as a submission to SCS. Call only after: proposal confirmed, contact details verified and read back, and the client explicitly said to submit. Set human_review=true when they asked for a human project-manager review.',
      parameters: z
        .object({
          contact_consent: z.literal(true),
          human_review: z.boolean().default(false),
          review_message: z.string().trim().max(2000).optional(),
        })
        .strict(),
      execute: async ({ human_review, review_message }) => {
        // Server-side authorization chain — none of this trusts the model:
        if (!client) {
          return 'Submissions are not available right now. Apologize and point the client to the contact form at /contact.';
        }
        if (!estimate || !proposalWire || !state.confirmedAt) {
          return 'Cannot finalize: the client has not confirmed a presented proposal yet.';
        }
        if (!contact) {
          return 'Cannot finalize: contact details have not been verified with verify_contact.';
        }
        if (submittedReference) {
          return `Already submitted — the reference code is ${submittedReference}. Do not submit again.`;
        }
        if (alreadyFinalized) {
          return 'This meeting was already finalized earlier. Tell the client their request is already recorded with SCS.';
        }
        const payload = buildFinalizePayload({
          meetingId,
          state,
          proposalWire,
          contact,
          consentAt,
          humanReview: human_review,
          reviewMessage: review_message,
        });
        const result = await client.finalize(payload);
        if (result.ok && result.referenceCode) {
          submittedReference = result.referenceCode;
          alreadyFinalized = true;
          logEvent(human_review ? 'review_requested' : 'session_ended', { finalized: true });
          publishState();
          const spaced = result.referenceCode.split('').join(' ');
          return `Stored successfully. Tell the client their reference code slowly: ${spaced} (written ${result.referenceCode}). Remind them an SCS consultant reviews everything before any final quotation, and offer to continue discussing or end the meeting.`;
        }
        if (result.error === 'duplicate_submission') {
          alreadyFinalized = true;
          logEvent('duplicate_finalize_blocked');
          return 'This meeting was already finalized earlier. Tell the client their request is already recorded.';
        }
        logEvent('error', { where: 'finalize', code: result.error ?? 'unknown', status: result.status });
        return 'Saving failed. Apologize briefly and offer the contact form at /contact instead. Do not retry more than once.';
      },
    }),

    request_human_review: llm.tool({
      description:
        'Record that the client wants a human project-manager follow-up WITHOUT submitting the full requirement yet (before finalization). This is a request — never promise a confirmed meeting time.',
      parameters: z.object({ message: z.string().trim().max(2000).optional() }).strict(),
      execute: async ({ message }) => {
        logEvent('review_requested', { pre_finalize: true, has_message: Boolean(message) });
        return 'Noted — a human follow-up request will be attached when the consultation is submitted. Encourage the client to also confirm and submit the requirement so the SCS team has the full context. Never promise a specific meeting time.';
      },
    }),
  };

  // ---- voice pipeline ---------------------------------------------------------
  const session = new voice.AgentSession({
    vad: ctx.proc.userData.vad as silero.VAD,
    // Six consultation languages; OpenAI STT's detectLanguage handles
    // code-switching (see src/providers/stt.ts for why STT stays on OpenAI).
    stt: createStt(),
    llm: createLlm(),
    tts: new elevenlabs.TTS({
      model: process.env.ELEVENLABS_MODEL ?? 'eleven_turbo_v2_5',
      voiceId: process.env.ELEVENLABS_VOICE_ID,
    }),
    turnHandling: {
      endpointing: { minDelay: 0.6, maxDelay: 4.0 },
    },
    userAwayTimeout: limits.idleTimeoutSeconds,
    maxToolSteps: 5,
  });

  const agent = new voice.Agent({
    instructions: buildConsultationPrompt(knowledge, {
      clientName: context?.clientName ?? '',
      analysisSummary: hasAnalysis ? renderSnapshotSummary(snapshot) : '',
      knownFields: seeded.knownFields,
      transcriptConsent: state.transcriptConsent,
    }),
    tools,
  });

  // ---- limits, auditing, transcript persistence ---------------------------------
  session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
    if (!ev.isFinal) return;
    turnCount += 1;
    persistMessage('client', ev.transcript);
    const guard = screenUserInput(ev.transcript);
    if (guard.flagged) {
      logEvent('guard_triggered', { pattern: guard.reason ?? 'unknown', turn: turnCount });
    }
    if (turnCount >= limits.maxLlmTurns) {
      logEvent('turn_limit_reached', { turns: turnCount });
      void session.say(
        'We have covered a lot — let me stop here. Your progress is saved; you can rejoin this meeting or use the contact form to continue. Thank you!',
      );
      void endSession('turn_limit');
    }
  });

  session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
    if (ev.item.type === 'message' && ev.item.role === 'assistant') {
      persistMessage('buddy', ev.item.textContent ?? '');
    }
  });

  session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev) => {
    if (ev.newState === 'away') {
      logEvent('idle_timeout', { turns: turnCount });
      void endSession('idle_timeout');
    }
  });

  session.on(voice.AgentSessionEventTypes.Error, (ev) => {
    logEvent('provider_error', { label: String(ev.error?.type ?? 'unknown').slice(0, 100) });
  });

  session.on(voice.AgentSessionEventTypes.SessionUsageUpdated, (ev) => {
    const total = ev.usage.modelUsage.reduce((s, u) => {
      const withTokens = u as { inputTokens?: number; outputTokens?: number };
      return s + (withTokens.inputTokens ?? 0) + (withTokens.outputTokens ?? 0);
    }, 0);
    if (total > 0) logEvent('usage', { tokens: total, turns: turnCount });
  });

  let ended = false;
  const endSession = async (reason: string) => {
    if (ended) return;
    ended = true;
    clearTimeout(maxDurationTimer);
    persistState();
    if (client) {
      // A finalized meeting is 'completed'; otherwise it stays 'in_progress'
      // so the client can rejoin within the join window (state is preserved).
      if (submittedReference || alreadyFinalized) {
        await client.meetingStatus(meetingId, 'completed', true).catch(() => undefined);
      }
      logEvent('session_ended', { reason, turns: turnCount });
    }
    await session.close().catch(() => undefined);
  };

  const maxDurationTimer = setTimeout(() => {
    logEvent('duration_limit_reached', { seconds: limits.maxSessionSeconds });
    void session.say(
      'Our meeting time is up — thank you for the conversation! Your progress is saved and you can rejoin from the same link.',
    );
    setTimeout(() => void endSession('duration_limit'), 8000);
  }, limits.maxSessionSeconds * 1000);

  ctx.addShutdownCallback(async () => {
    await endSession('shutdown');
  });

  await session.start({
    agent,
    room: ctx.room,
    // Text input (lk.chat) stays enabled — the meeting chat tab and the mic-
    // denied fallback ride on the framework defaults, and typed messages flow
    // through the SAME tools/state as speech.
    // No recording of any kind: raw audio is never stored (privacy default).
    record: false,
  });

  logEvent('agent_joined', { rejoin: Boolean(context && Object.keys(context.requirements).length > 0) });
  publishState();

  // Spoken greeting — automatic, exactly once, without waiting for the client.
  if (!greeted) {
    greeted = true;
    logEvent('greeting_spoken', { has_analysis: hasAnalysis });
    await session.say(hasAnalysis ? CONSULTATION_GREETING_WITH_ANALYSIS : CONSULTATION_GREETING_GENERAL, {
      allowInterruptions: true,
    });
  }
}
