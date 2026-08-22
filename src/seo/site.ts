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

/**
 * Founding year — 2022, the year Rohan Sahu started the company in Indore.
 * Owner-verified, and the only founding year the site may state anywhere.
 *
 * It must not be confused with the founder's own experience: Rohan has more
 * than eight years in software development, four of them working directly with
 * freelance and international clients, and that history predates the company.
 * The company itself has been operating since 2022 and nothing on the site may
 * imply a longer trading history.
 */
export const FOUNDING_YEAR = 2022;

/**
 * Where the company was founded, and the only place it has ever been based.
 * Matches `CONTACT` below — one company, one city, one address.
 */
export const FOUNDING_LOCATION = {
  city: 'Indore',
  region: 'Madhya Pradesh',
  /** ISO 3166-1 alpha-2, as schema.org's `addressCountry` expects. */
  country: 'IN',
  /** The human-readable form the pages render. */
  label: 'Indore, Madhya Pradesh, India',
} as const;

/**
 * The founder, as a named person the site is allowed to describe.
 *
 * Only owner-verified fields live here. There is deliberately no education,
 * award, certification, personal profile or date of birth: none of that has
 * been supplied, so none of it may be rendered or marked up. `imagePath` points
 * at the real photograph already shipped in `public/images`.
 *
 * `sameAs` is empty on purpose. The repository contains a company LinkedIn page
 * (see `SOCIAL_PROFILES`) but no personal profile for Rohan, and a company URL
 * is not a `sameAs` for a person. Add entries here only when a real, verified
 * personal profile URL is supplied.
 */
export const FOUNDER = {
  name: 'Rohan Sahu',
  jobTitle: 'Founder & CEO',
  /**
   * The owner-supplied founder photograph, shipped from `public/images` so the
   * path is stable and `assetUrl()` can turn it into the absolute URL the
   * `Person.image` markup needs. Re-encoded to 768x768 JPEG (132 KB) from the
   * 1024x1024 PNG original in `src/asset`, which was 1.8 MB — the card renders
   * it at 352 CSS pixels, so 768 covers a 2x display with room to spare.
   */
  imagePath: '/images/rohan-sahu-founder-scs-softwares.jpg',
  imageWidth: 768,
  imageHeight: 768,
  imageAlt: 'Rohan Sahu, Founder and CEO of SCS Softwares',
  /** The `/about` section that carries the founder story, used as the URL. */
  sectionId: 'founder',
  sameAs: [] as readonly string[],
} as const;

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
