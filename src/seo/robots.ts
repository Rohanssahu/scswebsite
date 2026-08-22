/**
 * The typed robots.txt policy, and a parser that reads the real file back.
 *
 * `public/robots.txt` is a plain text file, which means it is the one piece of
 * crawl configuration on this site that no type system protects. A single
 * well-meant edit — "block the AI bots" — would remove SCS Softwares from
 * ChatGPT search, Claude search and Perplexity while leaving the *training*
 * bots untouched, and nothing would fail.
 *
 * So the policy lives here as data, and `robots.test.ts` parses the shipped
 * file and asserts it still matches. Changing the file without changing this
 * module fails the build, and vice versa.
 *
 * Two facts about robots.txt drive the shape of everything below:
 *
 *   1. A crawler obeys exactly ONE group — the most specific one whose
 *      user-agent token matches it. A named group does not inherit `*`. That is
 *      why every group in the file repeats the same private-path Disallow lines,
 *      and why `PRIVATE_PATHS` is asserted per group rather than once.
 *   2. `noindex` is not a robots.txt directive. Keeping a route crawlable is
 *      what lets a crawler read its `noindex` meta tag and drop it. Disallowing
 *      it instead can leave the URL indexed with no snippet. Hence
 *      `FORBIDDEN_DIRECTIVES`.
 *
 * Verified against operator documentation on 2026-08-22; sources are recorded
 * in `docs/seo/AI_CRAWLER_POLICY.md`.
 */

import { SITE_ORIGIN } from './site';

/** What a crawler is for. Search and training are separate choices. */
export type CrawlerPurpose =
  /** Indexes the site so it can be surfaced and cited in results. */
  | 'search'
  /** Fetches a page because a human asked the assistant to open it. */
  | 'user-initiated'
  /** Collects content that may be used to train a model. */
  | 'training';

export interface CrawlerRule {
  /** The exact user-agent token, as it must appear after `User-agent:`. */
  token: string;
  operator: string;
  purpose: CrawlerPurpose;
  /** Why this access level, in one line. */
  note: string;
}

/**
 * The crawlers whose access decides whether this site can be discovered and
 * cited at all. Every one of them MUST have an `Allow: /` group.
 *
 * Blocking any entry here is not an "AI privacy" choice — it is a decision to
 * be absent from that product's results. Nothing may be added to a blocklist
 * from this list without the owner explicitly asking for that outcome.
 */
export const SEARCH_CRAWLERS: CrawlerRule[] = [
  {
    token: 'Googlebot',
    operator: 'Google',
    purpose: 'search',
    note: 'Google Search. Also what feeds AI Overviews and AI Mode — those read the Search index, not a separate crawl.',
  },
  {
    token: 'Bingbot',
    operator: 'Microsoft',
    purpose: 'search',
    note: 'Bing. Also what feeds Microsoft Copilot.',
  },
  {
    token: 'OAI-SearchBot',
    operator: 'OpenAI',
    purpose: 'search',
    note: "Surfaces sites in ChatGPT's search features. Distinct from GPTBot, which is training only.",
  },
  {
    token: 'Claude-SearchBot',
    operator: 'Anthropic',
    purpose: 'search',
    note: "Indexes content to improve Claude's search results. Distinct from ClaudeBot, which is training only.",
  },
  {
    token: 'PerplexityBot',
    operator: 'Perplexity',
    purpose: 'search',
    note: 'Indexes for Perplexity results. The operator states it is not used for foundation-model training.',
  },
];

/**
 * Fetches a human asked for. The operators state robots.txt may not apply to
 * these at all, so allowing them changes little in practice — but an explicit
 * Allow means a visitor who asks an assistant about this site gets the real
 * page instead of a guess.
 */
export const USER_INITIATED_CRAWLERS: CrawlerRule[] = [
  {
    token: 'ChatGPT-User',
    operator: 'OpenAI',
    purpose: 'user-initiated',
    note: 'A ChatGPT user asked for a page. OpenAI states these are not automatic crawls.',
  },
  {
    token: 'Claude-User',
    operator: 'Anthropic',
    purpose: 'user-initiated',
    note: 'A Claude user asked a question that needs this page.',
  },
  {
    token: 'Perplexity-User',
    operator: 'Perplexity',
    purpose: 'user-initiated',
    note: 'A Perplexity user asked for a page. The operator states it generally ignores robots.txt for these.',
  },
];

/**
 * Model-training crawlers. Allowed today, and revocable independently.
 *
 * The reasoning is recorded so a future reader does not have to guess: the
 * pages these read are public marketing copy about services we actually
 * deliver, nothing is confidential, and appearing in training data is one of
 * the ways a company becomes a name an assistant knows unprompted.
 *
 * Flipping any of these to `Disallow: /` is a legitimate owner decision and
 * costs nothing in search visibility — Google states `Google-Extended` is not a
 * ranking signal and does not affect inclusion in Google Search, and the other
 * two have search counterparts in `SEARCH_CRAWLERS` that read a different
 * token. If the owner ever asks for that, change the file AND `trainingAllowed`
 * below, in the same commit.
 */
export const TRAINING_CRAWLERS: CrawlerRule[] = [
  { token: 'GPTBot', operator: 'OpenAI', purpose: 'training', note: 'Foundation-model training.' },
  { token: 'ClaudeBot', operator: 'Anthropic', purpose: 'training', note: 'Model training.' },
  {
    token: 'Google-Extended',
    operator: 'Google',
    purpose: 'training',
    note: 'Gemini training and grounding. Google states it does not affect Google Search inclusion or ranking.',
  },
];

/** The owner's current answer to "may our public pages be used for training?". */
export const trainingAllowed = true;

export const ALL_DECLARED_CRAWLERS: CrawlerRule[] = [
  ...SEARCH_CRAWLERS,
  ...USER_INITIATED_CRAWLERS,
  ...TRAINING_CRAWLERS,
];

/**
 * The only paths any group may block. Both are genuinely private: `/admin*` is
 * the staff dashboard, and an `/ai-consultation/*` URL carries a per-visitor
 * meeting reference that no crawler should ever fetch.
 *
 * Deliberately absent: `/project-analysis/result` and `/ApplicationForm`. Both
 * are `noindex,nofollow` and both must stay crawlable so that directive can be
 * read. See the module comment.
 */
export const PRIVATE_PATHS = ['/admin', '/admin/', '/ai-consultation/'] as const;

/** Directives that must never appear in robots.txt on this site. */
export const FORBIDDEN_DIRECTIVES = ['noindex', 'nofollow', 'noarchive'] as const;

export const SITEMAP_DIRECTIVE = `Sitemap: ${SITE_ORIGIN}/sitemap.xml`;

export interface RobotsGroup {
  /** Every `User-agent:` token that shares this group's rules. */
  userAgents: string[];
  allow: string[];
  disallow: string[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Every non-comment, non-blank line, lower-cased — for directive scanning. */
  directiveLines: string[];
}

/**
 * Parse robots.txt into groups.
 *
 * Consecutive `User-agent:` lines share one group, which is what the standard
 * says and what every major crawler implements. Comments and blank lines are
 * ignored; a blank line does not end a group, only a new `User-agent:` after at
 * least one rule does.
 */
export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const directiveLines: string[] = [];
  let current: RobotsGroup | null = null;
  let expectingAgents = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    directiveLines.push(`${field}: ${value}`.toLowerCase());

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { userAgents: [], allow: [], disallow: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.userAgents.push(value);
      continue;
    }
    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }
    if (!current) continue;
    expectingAgents = false;
    if (field === 'allow') current.allow.push(value);
    if (field === 'disallow') current.disallow.push(value);
  }

  return { groups, sitemaps, directiveLines };
}

/** The single group a token obeys: exact match first, then the `*` fallback. */
export function groupFor(parsed: ParsedRobots, token: string): RobotsGroup | undefined {
  const lower = token.toLowerCase();
  return (
    parsed.groups.find((group) => group.userAgents.some((agent) => agent.toLowerCase() === lower)) ??
    parsed.groups.find((group) => group.userAgents.includes('*'))
  );
}

/**
 * True when a group grants access to the public site: it allows the root and
 * blocks nothing outside `PRIVATE_PATHS`.
 *
 * This is the assertion that would have caught a blanket AI block.
 */
export function grantsPublicAccess(group: RobotsGroup | undefined): boolean {
  if (!group) return false;
  if (!group.allow.includes('/')) return false;
  return group.disallow.every(
    (path) => path !== '' && (PRIVATE_PATHS as readonly string[]).includes(path),
  );
}
