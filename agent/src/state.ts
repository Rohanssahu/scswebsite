// =============================================================================
// Buddy agent — typed, server-side project-requirement state.
//
// The LLM never writes arbitrary JSON anywhere: it can only call the
// update_requirements tool, whose arguments are parsed by the strict zod
// schema below. Unknown properties are stripped, values are length-capped,
// and the merged state lives in this process — the model has no database
// access of any kind.
// =============================================================================

import { z } from 'zod';

export const VOICE_INTENTS = ['new_project', 'improve_existing', 'repair_broken', 'consultation'] as const;
export type VoiceIntent = (typeof VOICE_INTENTS)[number];

export const VOICE_LANGUAGES = ['en', 'hi', 'hinglish'] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

const shortText = z.string().trim().min(1).max(500);
const shortList = z.array(z.string().trim().min(1).max(200)).max(25);

/** Every field Buddy may collect — mirrors ALLOWED_REQUIREMENT_FIELDS in the
 * voice-lead Edge Function. `.strict()` rejects anything else. */
export const requirementFieldsSchema = z
  .object({
    business_goal: shortText,
    target_users: shortText,
    platforms: shortList,
    core_features: shortList,
    optional_features: shortList,
    admin_panel: shortText,
    integrations: shortList,
    authentication: shortText,
    payments: shortText,
    expected_scale: shortText,
    design_status: shortText,
    existing_assets: shortText,
    preferred_technology: shortText,
    deadline: shortText,
    budget_range: shortText,
    support_expectations: shortText,
    // existing-project extras
    current_technology: shortText,
    current_status: shortText,
    main_problems: shortText,
    error_symptoms: shortText,
    repository_availability: shortText,
    deployment_details: shortText,
    urgency: shortText,
    secure_upload_needed: shortText,
  })
  .partial()
  .strict();

export type RequirementFields = z.infer<typeof requirementFieldsSchema>;

/** One structured update from the LLM per turn. */
export const stateUpdateSchema = z
  .object({
    intent: z.enum(VOICE_INTENTS).optional(),
    fields: requirementFieldsSchema.optional(),
    assumptions: shortList.optional(),
    contradictions: shortList.optional(),
    risks: shortList.optional(),
    suggested_features: shortList.optional(),
    deferred_decisions: shortList.optional(),
    confidence: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();

export type StateUpdate = z.infer<typeof stateUpdateSchema>;

export interface ProjectState {
  intent: VoiceIntent | null;
  language: VoiceLanguage | null;
  fields: RequirementFields;
  assumptions: string[];
  contradictions: string[];
  risks: string[];
  suggestedFeatures: string[];
  deferredDecisions: string[];
  confidence: 'low' | 'medium' | 'high';
  /** Set only after the visitor verbally confirms summary + estimate. */
  confirmedAt: string | null;
  /** Set only after explicit consent to store the longer transcript excerpt. */
  transcriptConsent: boolean;
}

export function emptyState(): ProjectState {
  return {
    intent: null,
    language: null,
    fields: {},
    assumptions: [],
    contradictions: [],
    risks: [],
    suggestedFeatures: [],
    deferredDecisions: [],
    confidence: 'low',
    confirmedAt: null,
    transcriptConsent: false,
  };
}

const mergeList = (current: string[], incoming: string[] | undefined, cap = 25): string[] => {
  if (!incoming?.length) return current;
  return [...new Set([...current, ...incoming])].slice(0, cap);
};

/**
 * Merge one validated update into the state. Non-empty new values win over
 * old ones (visitors correct themselves); everything else is preserved so
 * already-answered questions are never lost or re-asked.
 */
export function applyUpdate(state: ProjectState, update: StateUpdate): ProjectState {
  const next: ProjectState = {
    ...state,
    fields: { ...state.fields, ...(update.fields ?? {}) },
    assumptions: mergeList(state.assumptions, update.assumptions),
    contradictions: mergeList(state.contradictions, update.contradictions),
    risks: mergeList(state.risks, update.risks),
    suggestedFeatures: mergeList(state.suggestedFeatures, update.suggested_features),
    deferredDecisions: mergeList(state.deferredDecisions, update.deferred_decisions),
  };
  if (update.intent) next.intent = update.intent;
  if (update.confidence) next.confidence = update.confidence;
  return next;
}

/** Required fields per intent — drives "missing fields" and progress. */
export const REQUIRED_FIELDS: Record<VoiceIntent, (keyof RequirementFields)[]> = {
  new_project: [
    'business_goal',
    'target_users',
    'platforms',
    'core_features',
    'deadline',
    'budget_range',
  ],
  improve_existing: [
    'business_goal',
    'current_technology',
    'current_status',
    'core_features',
    'urgency',
    'budget_range',
  ],
  repair_broken: [
    'current_technology',
    'current_status',
    'main_problems',
    'error_symptoms',
    'urgency',
  ],
  consultation: ['business_goal'],
};

/** Fields worth asking about beyond the required ones, in ask-order. */
export const OPTIONAL_FIELDS: Record<VoiceIntent, (keyof RequirementFields)[]> = {
  new_project: [
    'optional_features',
    'admin_panel',
    'integrations',
    'authentication',
    'payments',
    'expected_scale',
    'design_status',
    'existing_assets',
    'preferred_technology',
    'support_expectations',
  ],
  improve_existing: [
    'main_problems',
    'repository_availability',
    'deployment_details',
    'integrations',
    'deadline',
    'secure_upload_needed',
  ],
  repair_broken: [
    'repository_availability',
    'deployment_details',
    'secure_upload_needed',
    'budget_range',
    'deadline',
  ],
  consultation: ['target_users', 'preferred_technology', 'budget_range'],
};

export interface StateProgress {
  intent: VoiceIntent | null;
  collected: string[];
  missingRequired: string[];
  /** 0–100, based on required fields for the detected intent. */
  percent: number;
  confidence: 'low' | 'medium' | 'high';
}

export function computeProgress(state: ProjectState): StateProgress {
  const collected = Object.keys(state.fields).filter((k) => {
    const v = state.fields[k as keyof RequirementFields];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  if (!state.intent) {
    return { intent: null, collected, missingRequired: [], percent: 0, confidence: state.confidence };
  }
  const required = REQUIRED_FIELDS[state.intent];
  const missing = required.filter((f) => !collected.includes(f));
  const percent = required.length === 0 ? 100 : Math.round(((required.length - missing.length) / required.length) * 100);
  return { intent: state.intent, collected, missingRequired: missing, percent, confidence: state.confidence };
}

/** True once an estimate may be generated. */
export function isReadyForEstimate(state: ProjectState): boolean {
  const progress = computeProgress(state);
  return progress.intent !== null && progress.missingRequired.length === 0;
}

/** Plain-language requirement summary for read-back, emails and storage. */
export function buildSummary(state: ProjectState): string {
  const f = state.fields;
  const parts: string[] = [];
  if (state.intent) parts.push(`Intent: ${state.intent.replace(/_/g, ' ')}`);
  const label: Partial<Record<keyof RequirementFields, string>> = {
    business_goal: 'Goal',
    target_users: 'Target users',
    platforms: 'Platforms',
    core_features: 'Core features',
    optional_features: 'Optional features',
    admin_panel: 'Admin panel',
    integrations: 'Integrations',
    authentication: 'Authentication',
    payments: 'Payments',
    expected_scale: 'Expected scale',
    design_status: 'Design status',
    existing_assets: 'Existing assets',
    preferred_technology: 'Preferred technology',
    deadline: 'Deadline',
    budget_range: 'Budget range',
    support_expectations: 'Support expectations',
    current_technology: 'Current technology',
    current_status: 'Current status',
    main_problems: 'Main problems',
    error_symptoms: 'Error symptoms',
    repository_availability: 'Repository availability',
    deployment_details: 'Deployment/hosting',
    urgency: 'Urgency',
    secure_upload_needed: 'Secure upload needed',
  };
  for (const key of Object.keys(label) as (keyof RequirementFields)[]) {
    const v = f[key];
    if (v === undefined) continue;
    const text = Array.isArray(v) ? v.join(', ') : v;
    if (text) parts.push(`${label[key]}: ${text}`);
  }
  if (state.assumptions.length) parts.push(`Assumptions: ${state.assumptions.join('; ')}`);
  if (state.contradictions.length) parts.push(`Open contradictions: ${state.contradictions.join('; ')}`);
  return parts.join('. ').slice(0, 9500);
}

/** Project mode for the leads schema. */
export function projectMode(intent: VoiceIntent): 'new' | 'existing' {
  return intent === 'new_project' || intent === 'consultation' ? 'new' : 'existing';
}
