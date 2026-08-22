// =============================================================================
// Site-wide conversion events — privacy-safe ONLY.
//
// Same discipline as `consultationAnalytics.ts`, applied to the three
// conversions that happen outside a consultation: the contact form, the
// requirement/human-review submission on the estimate, and a completed project
// analysis. Consultation scheduling and completion already report themselves
// through `trackConsultation`, so they are deliberately absent here.
//
// The signature is the whole safety argument: a caller can pass an event name
// from a closed list and, at most, one enum-valued property. There is no
// parameter that a name, an email address, a phone number, a reference code, a
// requirement description or a document could be passed through, by accident or
// otherwise.
// =============================================================================

import { logEvent } from '@/utils/analytics';

export const CONVERSION_EVENTS = [
  'contact_submitted',
  'requirement_submitted',
  'human_review_requested',
  'project_analysis_completed',
] as const;

export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];

/** The only property values that may accompany a conversion. */
export const CONVERSION_KINDS = ['ai', 'demo', 'idea', 'document', 'requirement', 'review'] as const;

export type ConversionKind = (typeof CONVERSION_KINDS)[number];

/** Report one conversion. Unknown names and unknown kinds are dropped. */
export function trackConversion(event: ConversionEvent, kind?: ConversionKind): void {
  if (!(CONVERSION_EVENTS as readonly string[]).includes(event)) return;
  const safeKind = kind && (CONVERSION_KINDS as readonly string[]).includes(kind) ? kind : undefined;
  try {
    logEvent({ category: 'Conversion', action: event, ...(safeKind ? { label: safeKind } : {}) });
  } catch {
    // A conversion is already recorded in the database; analytics may not break it.
  }
}
