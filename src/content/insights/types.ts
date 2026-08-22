/**
 * Shape of one published insight article.
 *
 * Split the same way the service and location content is split, and for the
 * same reason: `InsightMeta` is small enough to live in the main bundle (the
 * SEO registry, the hub list and the breadcrumbs read it), while `InsightBody`
 * is the article itself and loads as a route chunk.
 *
 * ---------------------------------------------------------------------------
 * The rules these articles follow, and why each one exists
 * ---------------------------------------------------------------------------
 *
 * 1. **An article may only be published if SCS Softwares has first-hand
 *    experience of the thing it describes.** Both articles that exist today
 *    are about systems in this repository: the estimator behind
 *    `/project-analysis`, and the LiveKit voice agent behind `/schedule-call`.
 *    A general "10 tips" piece assembled from other people's blogs adds nothing
 *    an assistant cannot already get elsewhere, and dilutes the pages that do
 *    carry something original.
 *
 * 2. **`author` is a factual claim about who wrote it.** It becomes an
 *    `Article.author` pointing at the founder `Person` node. Setting it on a
 *    piece Rohan did not write or review is a false authorship claim — the
 *    exact thing that makes "E-E-A-T optimisation" dishonest — so the field is
 *    required and its one legal value is the founder.
 *
 * 3. **No invented specifics.** No client name, no project name, no metric, no
 *    timeline, no budget, no "we increased X by Y". `insightPages.test.tsx`
 *    scans the rendered text for those shapes and fails the build.
 *
 * 4. **No guarantees.** Nothing may promise a ranking, a cost, a delivery date
 *    or an outcome.
 *
 * 5. **Nothing internal.** No prompt text, no credential, no client data, no
 *    unreleased capability.
 */

/** A body section: one H2 and the prose under it. */
export interface InsightSection {
  /** Section heading — becomes an H2, and an entry in the on-page contents. */
  heading: string;
  /** Stable fragment id, so the contents list and any deep link agree. */
  id: string;
  /** Paragraphs of prose. */
  body: string[];
  /** An optional bulleted list under the prose. */
  points?: string[];
  /** An optional callout: the honest caveat that belongs with this section. */
  note?: string;
}

/** A question the article answers directly, for readers who skip to the end. */
export interface InsightFaq {
  question: string;
  answer: string;
}

/** A link out to the service page this article is really about. */
export interface InsightLink {
  path: string;
  label: string;
  blurb: string;
}

/**
 * The lightweight half. Read by `src/seo/registry.ts`, the hub and the
 * breadcrumbs, so it must not pull in a line of article prose.
 */
export interface InsightMeta {
  /** Canonical path, e.g. `/insights/estimating-an-ai-app-project`. */
  path: string;
  /** Short label for the hub card, breadcrumbs and cross-links. */
  navLabel: string;
  /** `<title>`. */
  metaTitle: string;
  /** Meta description — also the `Article.description`. */
  metaDescription: string;
  /** Shorter title for share cards. */
  shareTitle?: string;
  /**
   * ISO date the article was first published. A real date, and the same one the
   * page renders.
   */
  datePublished: string;
  /**
   * ISO date of the last **material** change. Equal to `datePublished` until the
   * article's substance actually changes — bumping it to look fresh is exactly
   * the kind of signal manipulation the rest of this codebase refuses.
   */
  dateModified: string;
  /**
   * Who wrote it. One legal value today, and it is a factual claim — see rule 2
   * in the module comment.
   */
  author: 'rohan-sahu';
  /** Sitemap priority. */
  priority: number;
}

/** The heavy half: the article. Loaded as a route chunk. */
export interface InsightBody {
  /** Canonical path — the join key back into the manifest. */
  path: string;
  /** The single H1. */
  h1: string;
  /** The standfirst under the H1: the article's answer in two sentences. */
  standfirst: string;
  /**
   * Why this article can be written at all — the first-hand experience behind
   * it, stated to the reader rather than implied. Rendered as a visible note,
   * not a hidden credibility signal.
   */
  basis: string;
  /** Reading-time estimate in minutes, from the real word count. */
  readingMinutes: number;
  sections: InsightSection[];
  faqs: InsightFaq[];
  /** The service pages this article should hand a reader on to. */
  related: InsightLink[];
  cta: { title: string; body: string };
}

export type InsightContent = InsightMeta & InsightBody;
