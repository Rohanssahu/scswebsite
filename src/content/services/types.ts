/**
 * Shape of one canonical service page.
 *
 * These modules are plain data — no React, no icons — so three consumers can
 * read them without pulling in the UI:
 *
 *   - `src/components/services/ServicePage.tsx` renders the visible page
 *   - `src/seo/registry.ts` builds the route's title, description, canonical,
 *     Service JSON-LD and BreadcrumbList JSON-LD from the same object
 *   - the nav/footer/homepage link lists read `path` and `navLabel`
 *
 * Because the metadata and the copy come from one object, the `<title>` and
 * meta description can never describe a page the body does not.
 *
 * Content rules these files follow (see `servicePages.test.tsx`, which enforces
 * them): no guaranteed outcomes, no foreign offices, no invented clients,
 * case studies, testimonials, project counts, awards or certifications, and no
 * "best"/"number one" claims.
 */

/** Icon slot, resolved to a lucide icon inside the layout. */
export type ServiceIconKey = 'custom-software' | 'mobile' | 'web' | 'saas' | 'modernization';

export interface ProblemBlock {
  title: string;
  body: string;
}

/** One group of supported platforms, solution types or feature areas. */
export interface CapabilityGroup {
  title: string;
  body: string;
  items: string[];
}

/** One stage of delivery: discovery, architecture/UX, build, QA, launch. */
export interface ProcessStep {
  title: string;
  body: string;
  points: string[];
}

export interface EngagementOption {
  name: string;
  body: string;
  bestFor: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** A link to one of the other four canonical service pages. */
export interface RelatedLink {
  path: string;
  label: string;
  blurb: string;
}

export interface ServiceSectionHeader {
  eyebrow: string;
  heading: string;
  intro: string;
}

export interface ServiceContent {
  /** Canonical path, e.g. `/services/mobile-app-development`. */
  path: string;
  /** Short label for navigation, breadcrumbs and related-service cards. */
  navLabel: string;
  /** schema.org `Service.name`. */
  serviceName: string;
  /** schema.org `Service.serviceType`. */
  serviceType: string;
  /** `<title>` — also the og:title / twitter:title unless `shareTitle` is set. */
  metaTitle: string;
  /** Meta description — also the Service JSON-LD description. */
  metaDescription: string;
  /** Shorter title for share cards, when the page title is long. */
  shareTitle?: string;
  /** Sitemap priority. */
  priority: number;
  icon: ServiceIconKey;
  /** The single H1. */
  h1: string;
  /** One-sentence value proposition, rendered directly under the H1. */
  valueProp: string;
  /** Short factual chips in the hero. */
  heroHighlights: string[];
  /** Opening paragraphs, rendered as the overview block. */
  intro: string[];
  problems: ServiceSectionHeader & { items: ProblemBlock[] };
  capabilities: ServiceSectionHeader & { groups: CapabilityGroup[] };
  approach: ServiceSectionHeader & { points: string[] };
  process: ServiceSectionHeader & { steps: ProcessStep[] };
  engagement: ServiceSectionHeader & { options: EngagementOption[] };
  security: ServiceSectionHeader & { points: string[]; note: string };
  faqs: FaqItem[];
  related: RelatedLink[];
  cta: { title: string; body: string };
}
