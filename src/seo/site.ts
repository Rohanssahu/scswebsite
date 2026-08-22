/**
 * Single source of truth for the production host, brand positioning and the
 * canonical-URL rules used by every other SEO module.
 *
 * The site is deployed to GitHub Pages behind the custom apex domain declared
 * in `public/CNAME`. Every absolute URL the site emits — canonical, Open Graph,
 * Twitter, sitemap, JSON-LD — must use exactly this origin: no `www.`, no
 * `*.github.io`, no preview hosts. `normalizeOrigin()` below folds the known
 * legacy hosts onto it so stray links cannot leak a second indexable host.
 */

/** The one production origin. Never interpolate a different host anywhere. */
export const SITE_ORIGIN = 'https://scssoftwares.com';

/** Hosts that used to appear in the codebase and must fold onto SITE_ORIGIN. */
export const LEGACY_ORIGINS = [
  'https://www.scssoftwares.com',
  'http://www.scssoftwares.com',
  'http://scssoftwares.com',
  'https://rohanssahu.github.io/scswebsite',
  'https://rohanssahu.github.io',
] as const;

export const SITE_NAME = 'SCS Softwares';
export const SITE_LEGAL_NAME = 'SCS Softwares';

/**
 * The agreed default positioning line. It is factual: an India-based studio,
 * the four delivery areas, and the AI specialisms that exist in this repository
 * (AI/ML work, the LiveKit voice agent "Buddy", the AI video consultation
 * agent, and the automation/estimation tooling). It claims no foreign office
 * and no guaranteed outcome.
 */
export const POSITIONING =
  'India-based mobile app, web application, custom software and AI development company specializing in AI/ML, AI voice agents, AI video consultation agents and business automation.';

/** Founding year — matches the About page story copy (`about.story.p1`). */
export const FOUNDING_YEAR = 2018;

/** Verified contact details, identical to the ones rendered in the footer. */
export const CONTACT = {
  email: 'info@scssoftwares.com',
  supportEmail: 'support@scssoftwares.com',
  phone: '+917828690192',
  phoneDisplay: '+91 7828690192',
  street: '9th Floor, Shekhar Central, Palasia Square',
  city: 'Indore',
  region: 'MP',
  postalCode: '452001',
  country: 'IN',
} as const;

/** Public profiles that exist and are linked from the footer. */
export const SOCIAL_PROFILES = [
  'https://www.facebook.com/share/19FARSMgHA/?mibextid=wwXIfr',
  'https://www.linkedin.com/company/105694530',
  'https://www.instagram.com/scssoftwares24?igsh=MzhiMW15bms3endj',
] as const;

export const TWITTER_HANDLE = '@scssoftwares';

/**
 * Shared social preview image: a real 1200x630 file in `public/images`, so the
 * `summary_large_image` Twitter card is honest about its aspect ratio (the old
 * metadata pointed at a 500x500 logo while declaring 1200x630).
 */
export const DEFAULT_SHARE_IMAGE_PATH = '/images/og-cover.png';
export const DEFAULT_SHARE_IMAGE_ALT = 'SCS Softwares';
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;

/**
 * Fold any known production/legacy host prefix off a URL or path, leaving a
 * root-relative path. Unknown absolute URLs are returned untouched so external
 * links are never rewritten by accident.
 */
export function stripKnownOrigin(input: string): string {
  const trimmed = input.trim();
  for (const origin of [SITE_ORIGIN, ...LEGACY_ORIGINS]) {
    if (trimmed === origin) return '/';
    if (trimmed.startsWith(`${origin}/`)) return trimmed.slice(origin.length);
  }
  return trimmed;
}

/**
 * Reduce any internal href to the single canonical path form:
 * root-relative, no query, no hash, no `index.html`, no duplicate slashes and
 * no trailing slash (except the root itself). Path case is preserved because
 * GitHub Pages serves case-sensitive paths — `/ProductDetailsPage` is a real
 * route and must not be folded to lowercase.
 */
export function normalizeCanonicalPath(input: string): string {
  if (!input) return '/';
  let path = stripKnownOrigin(input);

  // A still-absolute URL belongs to another host — canonicalising it is wrong.
  // The second test catches protocol-relative URLs (`//cdn.example.com/x`) by
  // requiring a dotted hostname, so an internal path that merely starts with a
  // doubled slash (`//about//team`) is still normalized rather than passed
  // through as if it named another host.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || /^\/\/[^/]*\.[^/]/.test(path)) return path;

  path = path.split('#')[0].split('?')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  path = path.replace(/\/index\.html?$/i, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** Absolute canonical URL for an internal path. */
export function canonicalUrl(path: string): string {
  const normalized = normalizeCanonicalPath(path);
  return normalized === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${normalized}`;
}

/** Absolute URL for an asset that lives under `public/`. */
export function assetUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export const DEFAULT_SHARE_IMAGE = assetUrl(DEFAULT_SHARE_IMAGE_PATH);
