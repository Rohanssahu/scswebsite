/**
 * THE centralized, typed SEO registry.
 *
 * One entry per route the router can serve. Everything downstream reads from
 * here and nothing else:
 *   - the client `<Seo>` component (per-route document head)
 *   - `scripts/prerender.mjs` (build-time physical HTML + <head> injection)
 *   - `sitemap.xml` generation (indexable ∩ successfully prerendered)
 *   - the metadata/canonical/noindex/sitemap unit tests
 *
 * Adding a route to `App.tsx` without adding it here fails `registry.test.ts`.
 */

import {
  DEFAULT_SHARE_IMAGE,
  DEFAULT_SHARE_IMAGE_ALT,
  POSITIONING,
  SITE_NAME,
  TWITTER_HANDLE,
  canonicalUrl,
  normalizeCanonicalPath,
} from './site';
import {
  breadcrumbJsonLd,
  contactPageJsonLd,
  organizationJsonLd,
  serviceJsonLd,
  webSiteJsonLd,
  type JsonLd,
} from './jsonld';
import { SERVICE_CONTENT, serviceBreadcrumb } from '@/content/services';

export type RobotsDirective = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

/**
 * Why a route is or is not indexable. Drives the sitemap and documents intent
 * so a later change cannot silently flip a private route into the index.
 */
export type Indexability =
  /** Public marketing/content page — belongs in the index and the sitemap. */
  | 'indexable'
  /** Public but no standalone search value (thin/placeholder/legal duplicate). */
  | 'noindex-utility'
  /** Staff-only or per-visitor private surface. */
  | 'noindex-private'
  /** Depends on a session/reference that only one visitor holds. */
  | 'noindex-session'
  /** A legacy path kept alive purely to forward to its replacement. */
  | 'redirect'
  /** The catch-all for paths the router does not know. */
  | 'not-found';

export interface OpenGraphMeta {
  title: string;
  description: string;
  type: 'website' | 'article' | 'profile';
  /** Absent for routes with no canonical (catch-all, private dynamic routes). */
  url: string | null;
  siteName: string;
  image: string;
  imageAlt: string;
  locale: string;
}

export interface TwitterMeta {
  card: 'summary' | 'summary_large_image';
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  site: string;
  creator: string;
}

export interface RouteSeo {
  /** react-router path pattern, exactly as registered in App.tsx. */
  routePattern: string;
  /** Canonical, normalized path. Equal to routePattern for static routes. */
  canonicalPath: string;
  /**
   * Absolute canonical URL on the one production origin, or `null` when the
   * route must not advertise one: the catch-all (a single HTML file answers
   * many unknown URLs, so any canonical would be a lie) and the private
   * dynamic routes (noindex already, and their URLs carry a per-visitor
   * reference that does not belong in the head).
   */
  canonical: string | null;
  title: string;
  description: string;
  robots: RobotsDirective;
  indexability: Indexability;
  /** True when the build emits a physical HTML file for this path. */
  prerender: boolean;
  /** Sitemap priority; only read for indexable routes. */
  priority: number;
  og: OpenGraphMeta;
  twitter: TwitterMeta;
  /** Truthful structured data for this route, if any. */
  jsonLd: JsonLd[];
  /** Set only for `indexability: 'redirect'` entries. */
  redirectTo?: string;
}

interface RouteSpec {
  path: string;
  title: string;
  description: string;
  robots: RobotsDirective;
  indexability: Indexability;
  prerender: boolean;
  priority?: number;
  ogType?: OpenGraphMeta['type'];
  jsonLd?: JsonLd[];
  redirectTo?: string;
  /** Overrides for share cards when the page title is too long for one. */
  shareTitle?: string;
  /**
   * Explicit canonical target. Defaults to the route's own path; `null` omits
   * the canonical entirely. A redirect route points at its destination.
   */
  canonical?: string | null;
}

function buildRoute(spec: RouteSpec): RouteSeo {
  const canonicalPath = normalizeCanonicalPath(spec.path);
  const canonical =
    spec.canonical === null ? null : canonicalUrl(spec.canonical ?? canonicalPath);
  const shareTitle = spec.shareTitle ?? spec.title;
  return {
    routePattern: spec.path,
    canonicalPath,
    canonical,
    title: spec.title,
    description: spec.description,
    robots: spec.robots,
    indexability: spec.indexability,
    prerender: spec.prerender,
    priority: spec.priority ?? 0.5,
    og: {
      title: shareTitle,
      description: spec.description,
      type: spec.ogType ?? 'website',
      url: canonical,
      siteName: SITE_NAME,
      image: DEFAULT_SHARE_IMAGE,
      imageAlt: DEFAULT_SHARE_IMAGE_ALT,
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: spec.description,
      image: DEFAULT_SHARE_IMAGE,
      imageAlt: DEFAULT_SHARE_IMAGE_ALT,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
    },
    jsonLd: spec.jsonLd ?? [],
    ...(spec.redirectTo ? { redirectTo: normalizeCanonicalPath(spec.redirectTo) } : {}),
  };
}

/**
 * The four remaining `/gig/*` pages under `src/pages/gigs`.
 *
 * Web and mobile development used to live here too. Both moved to the
 * canonical `/services/*` pages below; their old paths stay alive as noindex
 * forwarding stubs (see LEGACY_SERVICE_REDIRECTS). UI/UX, cloud, DevOps and
 * digital marketing are unchanged and are scheduled for a later phase.
 */
const SERVICE_PAGES: { path: string; name: string; serviceType: string; description: string; title: string }[] = [
  {
    path: '/gig/digital-marketing',
    name: 'Digital Marketing',
    serviceType: 'Digital Marketing',
    description:
      'SEO, paid search, social and content marketing programmes run alongside your product build, so the site we ship is the site that gets found.',
    title: 'Digital Marketing Services | SCS Softwares',
  },
  {
    path: '/gig/ui-ux-design',
    name: 'UI/UX Design',
    serviceType: 'UI/UX Design',
    description:
      'User research, wireframes, design systems and accessible interface design for web and mobile products — handed to developers as build-ready specifications.',
    title: 'UI/UX Design Services | SCS Softwares',
  },
  {
    path: '/gig/cloud-solutions',
    name: 'Cloud Solutions',
    serviceType: 'Cloud Consulting and Migration',
    description:
      'Cloud migration, infrastructure-as-code, serverless architecture and cost optimisation on AWS, Azure and Google Cloud, delivered remotely from India.',
    title: 'Cloud Solutions & Migration | SCS Softwares',
  },
  {
    path: '/gig/devops-services',
    name: 'DevOps Services',
    serviceType: 'DevOps Engineering',
    description:
      'CI/CD pipelines, containerisation, infrastructure automation and monitoring set up so your team can ship changes safely and repeatedly.',
    title: 'DevOps Services & CI/CD | SCS Softwares',
  },
];

const SERVICE_ROUTES: RouteSpec[] = SERVICE_PAGES.map((service) => ({
  path: service.path,
  title: service.title,
  description: service.description,
  robots: 'index,follow',
  indexability: 'indexable',
  prerender: true,
  priority: 0.8,
  jsonLd: [
    serviceJsonLd({
      name: service.name,
      serviceType: service.serviceType,
      description: service.description,
      path: service.path,
    }),
  ],
}));

/**
 * The five canonical software-development service pages.
 *
 * Title, description, Service JSON-LD and the BreadcrumbList all come from the
 * same content module the page body renders, so the metadata and the visible
 * page cannot describe different things.
 */
const CANONICAL_SERVICE_ROUTES: RouteSpec[] = SERVICE_CONTENT.map((service) => ({
  path: service.path,
  title: service.metaTitle,
  description: service.metaDescription,
  shareTitle: service.shareTitle,
  robots: 'index,follow',
  indexability: 'indexable',
  prerender: true,
  priority: service.priority,
  jsonLd: [
    serviceJsonLd({
      name: service.serviceName,
      serviceType: service.serviceType,
      description: service.metaDescription,
      path: service.path,
    }),
    breadcrumbJsonLd(serviceBreadcrumb(service)),
  ],
}));

/**
 * Old service URLs, kept alive so existing links and bookmarks still resolve.
 *
 * Each one prerenders to the same forwarding stub `/consultation-form` uses: a
 * 200 response carrying `noindex,follow`, a canonical pointing at the
 * replacement, a meta refresh for clients without JavaScript, and a script
 * redirect for everyone else. They are excluded from the sitemap because
 * `indexableRoutes()` only accepts `indexability: 'indexable'`.
 */
const LEGACY_SERVICE_REDIRECTS: RouteSpec[] = [
  {
    path: '/gig/mobile-development',
    title: 'Mobile App Development Has Moved | SCS Softwares',
    description:
      'Our mobile app development service now lives at /services/mobile-app-development. You are being forwarded to the new page.',
    robots: 'noindex,follow',
    indexability: 'redirect',
    prerender: true,
    redirectTo: '/services/mobile-app-development',
    canonical: '/services/mobile-app-development',
  },
  {
    path: '/gig/web-development',
    title: 'Web Development Has Moved | SCS Softwares',
    description:
      'Our web development service now lives at /services/web-application-development. You are being forwarded to the new page.',
    robots: 'noindex,follow',
    indexability: 'redirect',
    prerender: true,
    redirectTo: '/services/web-application-development',
    canonical: '/services/web-application-development',
  },
];

const ROUTE_SPECS: RouteSpec[] = [
  {
    path: '/',
    title: 'SCS Softwares | AI, Mobile App & Custom Software Development in India',
    description: POSITIONING,
    shareTitle: 'SCS Softwares — AI, Mobile & Custom Software Development',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 1.0,
    jsonLd: [organizationJsonLd(), webSiteJsonLd()],
  },
  {
    path: '/about',
    title: 'About SCS Softwares | Software & AI Development Team in Indore, India',
    description:
      'SCS Softwares was founded in 2018 in Indore, India. Meet the team behind our mobile, web, custom software and AI development work, and see how we run a project.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.8,
  },
  {
    path: '/contact',
    title: 'Contact SCS Softwares | Talk to Our India-Based Development Team',
    description:
      'Get in touch with SCS Softwares in Indore, India. Send us your project details by form, email info@scssoftwares.com, or call +91 7828690192.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.8,
    jsonLd: [contactPageJsonLd('/contact')],
  },
  {
    path: '/products',
    title: 'Ready-to-Customise Software Products | SCS Softwares',
    description:
      'Browse the software products SCS Softwares can tailor to your business — booking apps, appointment systems, HR and inventory tools, e-learning and marketplace platforms.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.8,
  },
  {
    path: '/ProductDetailsPage',
    title: 'RoomJi — Room & Flat Booking App | SCS Softwares',
    description:
      'RoomJi is a room and flat booking app built by SCS Softwares in Indore, India: nearby property search, image galleries and online booking. We can tailor it to your brand.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.6,
  },
  {
    path: '/project-analysis',
    title: 'Free AI Project Analysis & Software Cost Estimate | SCS Softwares',
    description:
      'Answer a few questions and our AI produces an indicative team, hour, cost and timeline estimate for your software project. No signup, and the estimate is indicative only.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.9,
  },
  {
    path: '/schedule-call',
    title: 'Start an AI Video Consultation or Book a Call | SCS Softwares',
    description:
      'Start an instant AI video consultation with Buddy, our AI consultation agent, or pick a slot for a call with the SCS Softwares team in Indore, India.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.9,
  },
  {
    path: '/careers',
    title: 'Careers at SCS Softwares | Developer & Design Jobs in Indore',
    description:
      'Open roles, internships and life inside the SCS Softwares office in Indore, India. See what we look for and how our hiring process works.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.6,
  },
  ...CANONICAL_SERVICE_ROUTES,
  ...SERVICE_ROUTES,
  {
    path: '/PrivacyPolicy',
    title: 'Privacy Policy | SCS Softwares',
    description:
      'How SCS Softwares collects, uses, stores and protects the information you send through this website, and how to contact us about your data.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.3,
  },
  {
    path: '/TermsAndConditions',
    title: 'Terms and Conditions | SCS Softwares',
    description:
      'The terms that apply when you use the SCS Softwares website and the services offered through it, including user responsibilities and limits of liability.',
    robots: 'index,follow',
    indexability: 'indexable',
    prerender: true,
    priority: 0.3,
  },

  // ---- Public, prerendered, but deliberately kept out of the index ----
  {
    path: '/BlogPage',
    title: 'Insights | SCS Softwares',
    // Placeholder until real articles ship — see Phase 2. Kept out of the index
    // so an empty section cannot be crawled as thin content.
    description:
      'SCS Softwares insights on AI, mobile and web engineering. We are preparing our first published articles — talk to the team in the meantime.',
    robots: 'noindex,follow',
    indexability: 'noindex-utility',
    prerender: true,
  },
  {
    path: '/ApplicationForm',
    title: 'Job Application Form | SCS Softwares',
    description:
      'Apply for a role at SCS Softwares. This form sends your details straight to our hiring team in Indore, India.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-private',
    prerender: true,
  },
  {
    path: '/project-analysis/result',
    title: 'Your Project Analysis | SCS Softwares',
    description:
      'Your indicative project estimate. This result belongs to your browser session and is not a public page.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-session',
    prerender: true,
  },
  {
    path: '/consultation-form',
    title: 'Book a Consultation | SCS Softwares',
    description: 'This page has moved to the SCS Softwares scheduling page.',
    robots: 'noindex,follow',
    indexability: 'redirect',
    prerender: true,
    redirectTo: '/schedule-call',
    // Point crawlers at the page that replaced this one, not back at itself.
    canonical: '/schedule-call',
  },

  ...LEGACY_SERVICE_REDIRECTS,

  // ---- Dynamic / private: served by the 404.html SPA fallback ----
  {
    path: '/ai-consultation/:meetingReference',
    title: 'AI Video Consultation | SCS Softwares',
    description:
      'Your private AI video consultation room. Access needs the meeting reference that was issued to you.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-session',
    prerender: false,
    canonical: null,
  },
  {
    path: '/admin',
    title: 'Admin | SCS Softwares',
    description: 'Internal SCS Softwares dashboard. Staff sign-in required.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-private',
    prerender: false,
    canonical: null,
  },
  {
    path: '/admin/login',
    title: 'Admin Sign In | SCS Softwares',
    description: 'Internal SCS Softwares dashboard sign-in. Staff only.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-private',
    prerender: false,
    canonical: null,
  },
  {
    path: '/admin/leads/:id',
    title: 'Lead Detail | SCS Softwares',
    description: 'Internal SCS Softwares lead record. Staff only.',
    robots: 'noindex,nofollow',
    indexability: 'noindex-private',
    prerender: false,
    canonical: null,
  },
  {
    path: '*',
    title: 'Page Not Found | SCS Softwares',
    description:
      'We could not find that page. Head back to the SCS Softwares homepage or tell us what you were looking for.',
    robots: 'noindex,nofollow',
    indexability: 'not-found',
    prerender: false,
    canonical: null,
  },
];

/** Every route, keyed by its react-router pattern. */
export const ROUTE_SEO: Record<string, RouteSeo> = Object.fromEntries(
  ROUTE_SPECS.map((spec) => [spec.path, buildRoute(spec)]),
);

export const ALL_ROUTES: RouteSeo[] = ROUTE_SPECS.map((spec) => ROUTE_SEO[spec.path]);

export const NOT_FOUND_SEO = ROUTE_SEO['*'];

/** Site-wide defaults, used for `index.html` and as the last-resort fallback. */
export const DEFAULT_SEO = ROUTE_SEO['/'];

/** Routes the build must emit a physical HTML file for. */
export function prerenderRoutes(): RouteSeo[] {
  return ALL_ROUTES.filter((route) => route.prerender);
}

/** Routes eligible for `sitemap.xml` before the prerender result is known. */
export function indexableRoutes(): RouteSeo[] {
  return ALL_ROUTES.filter(
    (route) => route.indexability === 'indexable' && route.robots === 'index,follow' && route.prerender,
  );
}

/** True for any pattern that contains a react-router parameter or wildcard. */
export function isDynamicPattern(pattern: string): boolean {
  return pattern.includes(':') || pattern.includes('*');
}

/**
 * Resolve the SEO record for a live pathname, including dynamic segments.
 * Falls back to the not-found record, which is `noindex,nofollow` — so an
 * unregistered path can never be served as indexable.
 */
export function matchRouteSeo(pathname: string): RouteSeo {
  const path = normalizeCanonicalPath(pathname);

  const exact = ALL_ROUTES.find((route) => !isDynamicPattern(route.routePattern) && route.canonicalPath === path);
  if (exact) return exact;

  if (path === '/ai-consultation' || path.startsWith('/ai-consultation/')) {
    return ROUTE_SEO['/ai-consultation/:meetingReference'];
  }
  if (path.startsWith('/admin/leads/')) return ROUTE_SEO['/admin/leads/:id'];
  if (path === '/admin' || path.startsWith('/admin/')) return ROUTE_SEO['/admin'];

  return NOT_FOUND_SEO;
}

/**
 * Canonical URL a live pathname should advertise, or `null` when it must not
 * advertise one (unknown paths and the private dynamic routes).
 */
export function canonicalFor(pathname: string): string | null {
  return matchRouteSeo(pathname).canonical;
}
