// =============================================================================
// Where a visit came from — as a closed enum, never as a URL.
//
// The problem this solves: the site had no way to tell whether AI assistants
// were sending anyone at all. GA4's own channel grouping folds ChatGPT,
// Perplexity and Copilot referrals into "Referral" or, worse, "Direct" (several
// assistants strip the referrer), so the one question worth asking — "is
// anything we did for AI visibility working?" — was unanswerable.
//
// The privacy rule is the same as everywhere else in this directory and it is
// enforced by the shape of the code, not by care: this module takes a referrer
// string and a query string, and returns one member of a fixed list. The
// referrer URL itself, the query string itself, any UTM value, any path and any
// identifier are read inside these functions and never leave them. There is no
// code path from an input to an outgoing event that is not an enum member.
//
// What this CANNOT do, stated here so nobody reads more into the numbers than
// they hold — see docs/seo/AI_VISIBILITY_MEASUREMENT.md:
//   - Assistants that strip the referrer and add no UTM are indistinguishable
//     from someone typing the URL. They land in `direct`.
//   - A citation that a reader never clicks produces no data at all.
//   - `google-ai` cannot be separated from ordinary Google organic: an AI
//     Overview click sends the same `google.com` referrer as a blue link.
// =============================================================================

/**
 * The buckets. Deliberately coarse — each one has to mean something a person
 * can act on, and each one has to be distinguishable from the evidence a
 * browser actually provides.
 */
export const TRAFFIC_SOURCES = [
  /** ChatGPT — referrer `chatgpt.com`/`openai.com`, or `utm_source=chatgpt.com`. */
  'chatgpt',
  /** Perplexity — referrer `perplexity.ai`. */
  'perplexity',
  /** Claude — referrer `claude.ai`. */
  'claude',
  /** Gemini / Google AI Studio — referrer `gemini.google.com` or `bard.google.com`. */
  'gemini',
  /** Microsoft Copilot — referrer `copilot.microsoft.com` or `bing.com/chat`. */
  'copilot',
  /** Any other assistant we recognise but have not given its own bucket. */
  'ai-other',
  /** Google web search. Includes AI Overview clicks — they are not separable. */
  'google-search',
  /** Bing web search. */
  'bing-search',
  /** Another search engine (DuckDuckGo, Yahoo, Yandex, Ecosia, Brave). */
  'other-search',
  /** A social network. */
  'social',
  /** Some other website. */
  'referral',
  /** No referrer and no campaign marker. Includes referrer-stripping assistants. */
  'direct',
  /** Same-site navigation — reported for nothing, present so the type is total. */
  'internal',
] as const;

export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

/** Assistants that send a real referrer. Longest host suffix wins. */
const AI_HOSTS: [string, TrafficSource][] = [
  ['chatgpt.com', 'chatgpt'],
  ['chat.openai.com', 'chatgpt'],
  ['openai.com', 'chatgpt'],
  ['perplexity.ai', 'perplexity'],
  ['claude.ai', 'claude'],
  ['gemini.google.com', 'gemini'],
  ['bard.google.com', 'gemini'],
  ['aistudio.google.com', 'gemini'],
  ['copilot.microsoft.com', 'copilot'],
  ['edgeservices.bing.com', 'copilot'],
  ['you.com', 'ai-other'],
  ['phind.com', 'ai-other'],
  ['poe.com', 'ai-other'],
  ['grok.com', 'ai-other'],
  ['x.ai', 'ai-other'],
  ['mistral.ai', 'ai-other'],
  ['duckduckgo.com/chat', 'ai-other'],
];

const SEARCH_HOSTS: [string, TrafficSource][] = [
  ['google.', 'google-search'],
  ['bing.com', 'bing-search'],
  ['duckduckgo.com', 'other-search'],
  ['search.yahoo.com', 'other-search'],
  ['yandex.', 'other-search'],
  ['ecosia.org', 'other-search'],
  ['search.brave.com', 'other-search'],
  ['baidu.com', 'other-search'],
];

const SOCIAL_HOSTS = [
  'facebook.com',
  'l.facebook.com',
  'instagram.com',
  'linkedin.com',
  'lnkd.in',
  't.co',
  'twitter.com',
  'x.com',
  'reddit.com',
  'youtube.com',
  'whatsapp.com',
  'wa.me',
  't.me',
];

/**
 * `utm_source` values assistants are known to append. ChatGPT appends
 * `utm_source=chatgpt.com` to links it renders, which is the one case where an
 * AI referral is unambiguous even when the referrer is stripped.
 *
 * Matched against the *value only*, and only to pick a bucket. The value is
 * never forwarded.
 */
const UTM_SOURCE_HINTS: [string, TrafficSource][] = [
  ['chatgpt.com', 'chatgpt'],
  ['chatgpt', 'chatgpt'],
  ['openai', 'chatgpt'],
  ['perplexity', 'perplexity'],
  ['claude', 'claude'],
  ['gemini', 'gemini'],
  ['copilot', 'copilot'],
];

/** Hostname of a referrer string, lower-cased, or '' when there isn't one. */
function hostOf(referrer: string): string {
  if (!referrer) return '';
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Path of a referrer string, lower-cased, or '' when there isn't one. */
function pathOf(referrer: string): string {
  if (!referrer) return '';
  try {
    return new URL(referrer).pathname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Classify one visit.
 *
 * `search` is a raw query string (`location.search`). Only `utm_source` is read
 * from it, only to choose a bucket, and only when it matches a known hint —
 * so a campaign parameter carrying a customer identifier cannot become a label.
 */
export function classifyTrafficSource(
  referrer: string,
  search: string,
  selfHost = 'scssoftwares.com',
): TrafficSource {
  // A UTM marker wins over the referrer: it is the only evidence that survives
  // an assistant stripping the referrer, which is the case worth catching.
  const utmSource = readUtmSource(search);
  if (utmSource) {
    for (const [hint, source] of UTM_SOURCE_HINTS) {
      if (utmSource.includes(hint)) return source;
    }
  }

  const host = hostOf(referrer);
  if (!host) return 'direct';
  if (host === selfHost || host.endsWith(`.${selfHost}`)) return 'internal';

  const full = `${host}${pathOf(referrer)}`;
  for (const [needle, source] of AI_HOSTS) {
    if (host === needle || host.endsWith(`.${needle}`) || full.startsWith(needle)) return source;
  }
  // Bing's chat surface lives on a path, so it is checked before bing.com.
  if (host.endsWith('bing.com') && pathOf(referrer).startsWith('/chat')) return 'copilot';
  for (const [needle, source] of SEARCH_HOSTS) {
    if (host === needle.replace(/\.$/, '') || host.includes(needle)) return source;
  }
  if (SOCIAL_HOSTS.some((needle) => host === needle || host.endsWith(`.${needle}`))) return 'social';
  return 'referral';
}

/** The `utm_source` value, lower-cased, or null. Never leaves this module. */
function readUtmSource(search: string): string | null {
  if (!search) return null;
  try {
    const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('utm_source');
    return value ? value.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** True for the buckets that represent an AI assistant rather than a search engine. */
export function isAiSource(source: TrafficSource): boolean {
  return ['chatgpt', 'perplexity', 'claude', 'gemini', 'copilot', 'ai-other'].includes(source);
}

/**
 * Which kind of page a visitor landed on. A second coarse enum, so
 * "which country pages do assistants send people to" is answerable without
 * cross-referencing a path dimension that may be sampled away.
 *
 * Derived from the path shape only — no path is ever sent from here.
 */
export const LANDING_GROUPS = [
  'home',
  'service',
  'services-hub',
  'market',
  'locations-hub',
  'about',
  'contact',
  'project-analysis',
  'schedule-call',
  'insight',
  'other',
] as const;

export type LandingGroup = (typeof LANDING_GROUPS)[number];

export function landingGroupFor(pathname: string): LandingGroup {
  const path = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/services') return 'services-hub';
  if (path.startsWith('/services/')) return 'service';
  if (path === '/locations') return 'locations-hub';
  if (path.startsWith('/locations/')) return 'market';
  if (path === '/about') return 'about';
  if (path === '/contact') return 'contact';
  if (path.startsWith('/project-analysis')) return 'project-analysis';
  if (path === '/schedule-call') return 'schedule-call';
  if (path.startsWith('/insights')) return 'insight';
  return 'other';
}
