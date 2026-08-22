/**
 * Shape of one regional landing page, in two halves.
 *
 * These modules are plain data — no React, no icons — so three consumers read
 * them without pulling in the UI:
 *
 *   - `src/components/locations/LocationPage.tsx` renders the visible page
 *   - `src/seo/registry.ts` builds the route's title, description, canonical,
 *     Service JSON-LD (with `areaServed`) and BreadcrumbList from the same
 *     object
 *   - the nav/footer/homepage/About link lists read `path` and `navLabel`
 *
 * Phase 3B split the shape into `LocationMeta` (small, always in memory) and
 * `LocationBody` (the copy, loaded as a route chunk), with `LocationContent`
 * still the union of the two.
 *
 * A regional page is NOT a localized copy of a global service page and it is
 * NOT a template with the country name swapped. The layout is shared; every
 * string below is written per country, and `locationPages.test.tsx` fails the
 * build if two countries start sharing intros, headings, FAQs, buyer concerns,
 * collaboration copy, or too much of their body text.
 *
 * Honesty rules these files follow (enforced by the same test file and by
 * `scripts/verify-dist.mjs`):
 *
 *   - SCS Softwares operates from Indore, India. Nothing else may be implied.
 *   - No office, entity, staff, address or telephone number is claimed in any
 *     target country.
 *   - No certification, regulatory compliance or guaranteed availability is
 *     claimed. Requirements are confirmed during discovery instead.
 *   - No invented market statistics, demand figures or rankings.
 */

/** A titled block of prose: a buyer concern, a project type, a fit note. */
export interface TitledBlock {
  title: string;
  body: string;
}

export interface LocationSectionHeader {
  eyebrow: string;
  heading: string;
  intro: string;
}

/** One stage of a regional engagement, from first call to ongoing support. */
export interface CollaborationStep {
  title: string;
  body: string;
  points: string[];
}

/** A link to one of the global, country-neutral service pages. */
export interface ServiceLink {
  path: string;
  label: string;
  /** Written for this country's page — never copied from the service page. */
  blurb: string;
}

export interface LocationFaq {
  question: string;
  answer: string;
}

export interface EngagementOption {
  name: string;
  body: string;
  bestFor: string;
}

/** A cross-link to another active market. Small section, one card per market. */
export interface OtherMarketLink {
  path: string;
  label: string;
  blurb: string;
}

/**
 * The disclosure block every country page renders directly under the hero. It
 * is ordinary visible body copy — not hidden text, not a footnote — and it is
 * what the build's fabricated-location scan looks for.
 */
export interface DeliveryDisclosure {
  title: string;
  /** Must state that SCS operates from Indore, India. */
  body: string;
  /** Must include remote delivery and the absence of any local presence. */
  points: string[];
}

/**
 * The language and localization section, added in Phase 3C.
 *
 * Optional, because it only earns a place on a page where a buyer would
 * otherwise reasonably assume we work in their language. The three markets
 * added in Phase 3C are all non-English-speaking, so each of them carries one;
 * the six earlier markets handle the question inside their own prose.
 *
 * It says three things, as ordinary visible copy: this page and the engagement
 * are in English, a translated interface is separately scoped professional
 * work, and machine translation is not client-facing copy. It never claims a
 * speaker of the local language, because none is verified.
 */
export interface LocalizationSection {
  title: string;
  body: string;
  points: string[];
  note: string;
}

/**
 * The lightweight half of a regional page: what the SEO registry, the sitemap,
 * the navigation lists and the breadcrumbs need. Lives in `./manifest.ts`, the
 * only locations module the main JavaScript bundle imports.
 */
export interface LocationMeta {
  /** Canonical path, e.g. `/locations/united-states`. */
  path: string;
  /** Full country name, exactly as schema.org `Country.name` will carry it. */
  countryName: string;
  /** Short label for navigation, breadcrumbs and cross-market cards. */
  navLabel: string;
  /** schema.org `Service.name`. */
  serviceName: string;
  /** schema.org `Service.serviceType`. */
  serviceType: string;
  /** `<title>` — also og:title / twitter:title unless `shareTitle` is set. */
  metaTitle: string;
  /** Meta description — also the Service JSON-LD description. */
  metaDescription: string;
  /** Shorter title for share cards. */
  shareTitle?: string;
  /** Sitemap priority. */
  priority: number;
}

/**
 * The heavy half: one market's own copy, from the hero to the FAQs. One module
 * per country, loaded as a route-level chunk when that page is opened.
 *
 * `path` is repeated here as the join key back to `LocationMeta`, so a body can
 * never be composed against another country's metadata.
 */
export interface LocationBody {
  /** Canonical path — the join key back into the manifest. */
  path: string;
  /** The single H1. */
  h1: string;
  /** One-sentence positioning line, rendered under the H1. */
  valueProp: string;
  /** Short factual chips in the hero. */
  heroHighlights: string[];
  /** Opening paragraphs. Country-specific; never shared between pages. */
  intro: string[];
  /** The India-delivery and no-local-presence disclosure. */
  disclosure: DeliveryDisclosure;
  /** What buyers in this market actually ask about before signing. */
  concerns: LocationSectionHeader & { items: TitledBlock[] };
  /** The global service pages this market most often starts from. */
  services: LocationSectionHeader & { items: ServiceLink[] };
  /** The kinds of build this market brings us. */
  projectTypes: LocationSectionHeader & { items: TitledBlock[] };
  /** How a remote engagement with this market actually runs. */
  collaboration: LocationSectionHeader & { steps: CollaborationStep[] };
  /** Working hours, meetings, written updates. No fixed-hours promise. */
  communication: LocationSectionHeader & { points: string[]; note: string };
  /** Security, privacy and data-location handling — no compliance claims. */
  security: LocationSectionHeader & { points: string[]; note: string };
  /** Human review over AI output. Required on every regional page. */
  oversight: { title: string; body: string; points: string[] };
  /** Language of delivery and what localization would actually involve. */
  localization?: LocalizationSection;
  /** How the commercial side is arranged. */
  engagement: LocationSectionHeader & { options: EngagementOption[] };
  faqs: LocationFaq[];
  /** The other active markets. Never a country without a live page. */
  otherMarkets: OtherMarketLink[];
  cta: { title: string; body: string };
}

/**
 * One whole regional page: its metadata and its copy. `./compose.ts` joins the
 * two halves on `path`, so every consumer still sees the single object it saw
 * before Phase 3B split the modules.
 */
export type LocationContent = LocationMeta & LocationBody;
