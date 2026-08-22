/**
 * Shape of one canonical service page, in two halves.
 *
 * These modules are plain data — no React, no icons — so three consumers can
 * read them without pulling in the UI:
 *
 *   - `src/components/services/ServicePage.tsx` renders the visible page
 *   - `src/seo/registry.ts` builds the route's title, description, canonical,
 *     Service JSON-LD and BreadcrumbList JSON-LD from the same object
 *   - the nav/footer/homepage link lists read `path` and `navLabel`
 *
 * Phase 3B split the shape in two so those consumers stop paying for each
 * other's data:
 *
 *   - `ServiceMeta` is the small half (path, labels, schema.org names, title,
 *     description, priority). It lives in `./manifest.ts` and is the only part
 *     the SEO registry, the navigation and the breadcrumbs need, so it is the
 *     only part in the main JavaScript bundle.
 *   - `ServiceBody` is the page's copy. One module per service, several hundred
 *     lines each, loaded as a route-level chunk when the page is opened.
 *
 * `ServiceContent` is still the union of the two, and `./compose.ts` joins them
 * on `path`. Because the metadata and the copy are joined on that one key, the
 * `<title>` and meta description can never describe a page the body does not.
 *
 * Content rules these files follow (see `servicePages.test.tsx`, which enforces
 * them): no guaranteed outcomes, no foreign offices, no invented clients,
 * case studies, testimonials, project counts, awards or certifications, and no
 * "best"/"number one" claims.
 */

/** Icon slot, resolved to a lucide icon inside the layout. */
export type ServiceIconKey =
  | 'custom-software'
  | 'mobile'
  | 'web'
  | 'saas'
  | 'modernization'
  | 'ai'
  | 'machine-learning'
  | 'voice'
  | 'video-consultation'
  | 'conversational'
  | 'automation'
  | 'design'
  | 'cloud'
  | 'devops'
  | 'marketing';

/**
 * Which menu group a service belongs to, in the header, footer and hub.
 *
 * `software` and `ai` are the two engineering pillars. `design` and `platform`
 * are the supporting delivery services (UI/UX, cloud, DevOps), and `growth` is
 * kept separate again so marketing support is never presented as part of the
 * engineering offer.
 */
export type ServiceGroup = 'software' | 'ai' | 'design' | 'platform' | 'growth';

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

/**
 * The lightweight half: everything the SEO registry, the navigation lists and
 * the breadcrumbs need, and nothing else. Lives in `./manifest.ts`, which the
 * main bundle imports synchronously.
 */
export interface ServiceMeta {
  /** Canonical path, e.g. `/services/mobile-app-development`. */
  path: string;
  /** Menu group. Defaults to software when a page predates the AI group. */
  group: ServiceGroup;
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
}

/**
 * The heavy half: the page's own copy. One module per service, loaded as a
 * route-level chunk when that page is opened rather than with the app shell.
 *
 * `path` is repeated here as the join key back to `ServiceMeta` — it is the one
 * field both halves carry, so a body can never be composed against the wrong
 * metadata.
 */
export interface ServiceBody {
  /** Canonical path — the join key back into the manifest. */
  path: string;
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
  /**
   * Concrete situations the service is bought for. Required on the AI pages,
   * where "what would we actually use this for?" is the buyer's first question.
   */
  useCases?: ServiceSectionHeader & { items: ProblemBlock[] };
  capabilities: ServiceSectionHeader & { groups: CapabilityGroup[] };
  /** How the service connects to the systems a client already runs. */
  integration?: ServiceSectionHeader & { points: string[] };
  /**
   * What the service cannot do, and the review that compensates. Required on
   * every AI page, because model output is probabilistic, and on the design,
   * platform and growth pages, where the scope boundary is the honest part of
   * the offer.
   */
  limitations?: ServiceSectionHeader & {
    points: string[];
    oversight: { title: string; points: string[] };
    note: string;
  };
  approach: ServiceSectionHeader & { points: string[] };
  process: ServiceSectionHeader & { steps: ProcessStep[] };
  engagement: ServiceSectionHeader & { options: EngagementOption[] };
  security: ServiceSectionHeader & { points: string[]; note: string };
  faqs: FaqItem[];
  related: RelatedLink[];
  cta: { title: string; body: string };
}

/**
 * One whole service page: its metadata and its copy. Composed on demand by
 * `./compose.ts` once the body chunk has loaded, so every existing consumer
 * still sees the single object it saw before Phase 3B split the modules.
 */
export type ServiceContent = ServiceMeta & ServiceBody;
