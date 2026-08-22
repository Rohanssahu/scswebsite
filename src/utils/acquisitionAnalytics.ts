// =============================================================================
// Acquisition reporting — one event per session, enum values only.
//
// Same discipline as `conversionAnalytics.ts` and `consultationAnalytics.ts`:
// this module is a wrapper whose *signature* is the safety argument. It takes
// no caller-supplied strings at all. It reads `document.referrer` and
// `location.search` itself, hands them to `classifyTrafficSource`, and forwards
// only the enum member that comes back.
//
// The referrer URL, the query string, every UTM value and the full path stay
// inside this module and `trafficSource.ts`. Nothing here can send an email
// address, a phone number, a name, a token or a meeting reference, because
// there is no parameter through which one could arrive.
//
// It also does not change how page views work. `RouteAnalytics` still sends
// exactly one `page_view` per route navigation; this adds one separate
// `traffic_source` event, once, on the first tracked page of a session.
// =============================================================================

import { logEvent } from '@/utils/analytics';
import {
  LANDING_GROUPS,
  TRAFFIC_SOURCES,
  type LandingGroup,
  type TrafficSource,
  classifyTrafficSource,
  isAiSource,
  landingGroupFor,
} from '@/utils/trafficSource';

/**
 * Marks the session as already reported. `sessionStorage`, not `localStorage`:
 * the question is "where did *this visit* come from", so it must reset when the
 * tab session does. The value is the literal string below and nothing else — no
 * timestamp, no identifier, nothing that could become a fingerprint.
 */
const SESSION_KEY = 'scs-acquisition-reported';

function alreadyReported(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    // Private mode, or storage blocked. Reporting twice is harmless; failing is
    // not acceptable, so treat an unreadable store as "not yet reported".
    return false;
  }
}

function markReported(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // No storage: the event may repeat within the session. Still no PII.
  }
}

/** Exposed for the tests, which need a clean slate per case. */
export function resetAcquisitionReporting(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // nothing to reset
  }
}

export interface AcquisitionReport {
  source: TrafficSource;
  landing: LandingGroup;
  /** True when `source` is an AI assistant rather than a search engine or site. */
  ai: boolean;
}

/**
 * Work out the report for a visit. Pure, so the tests can drive it directly.
 *
 * Returns `null` for an internal referrer — a same-site navigation is not an
 * acquisition, and reporting one would overwrite the real source with
 * "referral" on every second page.
 */
export function acquisitionFor(
  referrer: string,
  search: string,
  pathname: string,
): AcquisitionReport | null {
  const source = classifyTrafficSource(referrer, search);
  if (source === 'internal') return null;
  return { source, landing: landingGroupFor(pathname), ai: isAiSource(source) };
}

/**
 * Report the acquisition for this session, once.
 *
 * The label is `<source>|<landing>` — two enum members joined, e.g.
 * `chatgpt|service` or `google-search|market`. Both halves are validated
 * against their lists before the event is sent, so even a future refactor that
 * passed something else through would be dropped rather than transmitted.
 */
export function trackAcquisition(pathname: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (alreadyReported()) return;

  try {
    const report = acquisitionFor(document.referrer ?? '', window.location.search ?? '', pathname);
    if (!report) return;
    if (!(TRAFFIC_SOURCES as readonly string[]).includes(report.source)) return;
    if (!(LANDING_GROUPS as readonly string[]).includes(report.landing)) return;

    markReported();
    logEvent({
      category: 'Acquisition',
      action: 'traffic_source',
      label: `${report.source}|${report.landing}`,
      // 1 for an AI assistant, 0 otherwise. A single metric that answers
      // "did AI send anyone this month" without a segment definition.
      value: report.ai ? 1 : 0,
    });
  } catch {
    // Analytics must never break a page.
  }
}
