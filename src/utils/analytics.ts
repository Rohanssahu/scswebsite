// =============================================================================
// The single GA4 access point. Privacy-safe by construction.
//
// The tag itself is loaded exactly once, by the snippet in index.html. Nothing
// here injects a second one, and nothing here calls `config` — so there is
// exactly one measurement stream and no possibility of a duplicated hit from
// two loaders disagreeing about who owns the page.
//
// Phase 4 replaced react-ga4 with a direct `window.gtag` call. react-ga4 queues
// every hit until its own `initialize()` runs, and `initialize()` was never
// called anywhere in this app — so every consultation event raised since the
// feature shipped was buffered in memory and silently discarded. Talking to the
// tag index.html already installed removes the second initialization path
// entirely, which is also why it cannot come back.
//
// What may leave the browser is deliberately narrow: an event name, a coarse
// label, a small integer, and a route that has been through `normalizeRoute`.
// Names, email addresses, phone numbers, requirement text, transcripts, meeting
// references, lead ids, Turnstile tokens and document contents have no path
// through this module — the two exported functions accept nothing that could
// carry them, and the route normalizer strips the two URL shapes that could.
// =============================================================================

import { SITE_ORIGIN } from '@/seo/site';

type GtagFn = (command: string, ...args: unknown[]) => void;

/** The tag installed by index.html, or undefined wherever it was not loaded. */
function tag(): GtagFn | undefined {
  if (typeof window === 'undefined') return undefined;
  const fn = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof fn === 'function' ? fn : undefined;
}

/** Send one gtag command. A no-op under SSR, in tests, or if the tag is blocked. */
function send(command: string, ...args: unknown[]): void {
  try {
    tag()?.(command, ...args);
  } catch {
    // Analytics must never break a page.
  }
}

/**
 * Routes whose URL carries an identifier. `/ai-consultation/abc123` names a
 * booking and `/admin/leads/42` names a person, so neither may be reported
 * verbatim: each collapses to its parameter name before anything is sent.
 */
const DYNAMIC_ROUTES: [RegExp, string][] = [
  [/^\/ai-consultation\/[^/]+\/?$/, '/ai-consultation/:reference'],
  [/^\/admin\/leads\/[^/]+\/?$/, '/admin/leads/:id'],
];

/** Paths that report no page view at all: an internal tool, not an audience. */
const EXCLUDED = /^\/admin(?:\/|$)/;

/**
 * Reduce a pathname to something safe to report: query string and fragment
 * dropped (either can carry a token), trailing slash normalized, and any
 * dynamic segment replaced by its parameter name.
 */
export function normalizeRoute(pathname: string): string {
  const bare = pathname.split('?')[0].split('#')[0] || '/';
  const path = bare.length > 1 ? bare.replace(/\/+$/, '') || '/' : bare;
  for (const [pattern, template] of DYNAMIC_ROUTES) if (pattern.test(path)) return template;
  return path;
}

/** True when this route reports a page view at all. */
export function isTrackedRoute(pathname: string): boolean {
  return !EXCLUDED.test(normalizeRoute(pathname));
}

/**
 * Report one page view for a client-side route change.
 *
 * `page_location` is rebuilt from the production origin and the normalized
 * path rather than read from `location.href`, so a stray query parameter can
 * never ride along. A route with a dynamic segment reports no title either:
 * the document title on those screens can name the person the record belongs
 * to.
 */
export function logPageView(path: string, title?: string): void {
  if (!isTrackedRoute(path)) return;
  const page = normalizeRoute(path);
  const isDynamic = DYNAMIC_ROUTES.some(([pattern]) => pattern.test(page) || page.includes(':'));
  send('event', 'page_view', {
    page_path: page,
    page_location: `${SITE_ORIGIN}${page === '/' ? '/' : page}`,
    ...(isDynamic ? {} : { page_title: typeof document === 'undefined' ? undefined : (title ?? document.title) }),
  });
}

/**
 * Report one event. `category`, `action` and `label` are supplied by the two
 * allowlist modules that wrap this one; `value` is a small integer. No caller
 * passes free text, and nothing here would sanitise it if one did — which is
 * why the allowlists, not this function, are where new events get reviewed.
 */
export function logEvent({
  category,
  action,
  label,
  value,
}: {
  category: string;
  action: string;
  label?: string;
  value?: number;
}): void {
  send('event', action, {
    event_category: category,
    ...(label ? { event_label: label } : {}),
    ...(typeof value === 'number' ? { value } : {}),
  });
}
