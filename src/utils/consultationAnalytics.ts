// =============================================================================
// Consultation analytics — privacy-safe events ONLY.
//
// The allowlist below is the complete set of events and the complete set of
// property keys that may ever be sent. Names, emails, phone numbers,
// transcript text, repository URLs, file names, tokens, references and
// requirement content are structurally impossible to send through this module:
// values are coerced to a small enum/number set by `sanitizeProps`.
//
// Nothing is sent unless GA has been initialized by the host app (currently it
// is not, so these calls are inert no-ops — by design, this module never
// bootstraps a tracker on its own).
// =============================================================================

import { logEvent } from '@/utils/analytics';

export const CONSULTATION_EVENTS = [
  'consultation_schedule_started',
  'consultation_scheduled',
  'consultation_lobby_opened',
  'consultation_joined',
  'agent_joined',
  'first_response_received',
  'proposal_presented',
  'consultation_completed',
  'human_review_requested',
  'consultation_failed',
] as const;

export type ConsultationEvent = (typeof CONSULTATION_EVENTS)[number];

/** Coarse, non-identifying error categories. */
export const ERROR_CATEGORIES = [
  'mic_denied',
  // Coarse device-check outcomes. Never a device id, name or label.
  'mic_unavailable',
  'mic_no_voice',
  'mic_publish_failed',
  'speaker_unconfirmed',
  'camera_denied',
  'agent_unavailable',
  'agent_timeout',
  'connect_failed',
  'reconnect_failed',
  'service_unavailable',
  'verification_failed',
  'rate_limited',
  'access_denied',
  'unsupported_browser',
  'duplicate_submission',
  'unknown',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export interface SafeProps {
  /** 'instant' | 'scheduled' */
  kind?: 'instant' | 'scheduled';
  /** whether an analysis snapshot was attached (boolean → 1/0) */
  hasAnalysis?: boolean;
  /** coarse error category for consultation_failed */
  category?: ErrorCategory;
  /** small integers only (proposal version, retry count) */
  count?: number;
}

/** Reduce props to the label/value pair GA accepts, dropping anything else. */
function sanitizeProps(props: SafeProps | undefined): { label?: string; value?: number } {
  if (!props) return {};
  const labelParts: string[] = [];
  if (props.kind === 'instant' || props.kind === 'scheduled') labelParts.push(props.kind);
  if (typeof props.hasAnalysis === 'boolean') labelParts.push(props.hasAnalysis ? 'with_analysis' : 'no_analysis');
  if (props.category && (ERROR_CATEGORIES as readonly string[]).includes(props.category)) {
    labelParts.push(props.category);
  }
  const value =
    typeof props.count === 'number' && Number.isFinite(props.count)
      ? Math.min(100, Math.max(0, Math.round(props.count)))
      : undefined;
  return { ...(labelParts.length ? { label: labelParts.join('|') } : {}), ...(value !== undefined ? { value } : {}) };
}

/** Track one consultation event. Unknown event names are ignored. */
export function trackConsultation(event: ConsultationEvent, props?: SafeProps): void {
  if (!(CONSULTATION_EVENTS as readonly string[]).includes(event)) return;
  try {
    logEvent({ category: 'AI Consultation', action: event, ...sanitizeProps(props) });
  } catch {
    // analytics must never break the meeting
  }
}
