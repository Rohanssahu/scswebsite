/**
 * The reusable case-study content model — and the gate that stops an
 * evidence-free draft from ever being published.
 *
 * ---------------------------------------------------------------------------
 * Why this file exists before any case study does
 * ---------------------------------------------------------------------------
 *
 * There are no case studies on this site, and there is no honest way to write
 * one today: the repository contains no client name, no testimonial, no metric,
 * no app-store link and no deployment URL. Every one of those has to come from
 * the owner, with the client's permission.
 *
 * The pressure to fill that gap is real, and it is always resolved the same
 * dishonest way — a plausible "leading UK fintech" who "saw a 40% uplift",
 * invented because it reads well and nobody checks. That page then gets cited
 * by an assistant, and the fabrication is laundered into an answer.
 *
 * So the model is defined first, with the evidence requirements encoded in the
 * types, and the publish gate written before there is anything to publish.
 *
 * ---------------------------------------------------------------------------
 * How the gate works
 * ---------------------------------------------------------------------------
 *
 * A study carries a `status`. Only `'published'` may be routed, prerendered,
 * put in the sitemap or marked up, and `publishableCaseStudies()` is the only
 * way to obtain a list of those — it drops anything else, and
 * `assertPublishable()` states exactly what is missing.
 *
 * A `'draft-evidence-required'` study is a shopping list, not a page. It exists
 * so the missing evidence can be tracked in the same place as the content, and
 * it is structurally incapable of reaching `dist`: nothing routes it, so no
 * HTML file is emitted, so it cannot be crawled, indexed or linked. That is a
 * stronger guarantee than a `noindex` page, which still ships, still gets
 * fetched, and still relies on a crawler honouring a directive.
 *
 * `docs/seo/CASE_STUDY_EVIDENCE_REQUIRED.md` carries the same list in prose,
 * for the owner rather than for the compiler.
 */

/** Evidence the owner must supply before a claim may be rendered. */
export type EvidenceKind =
  /** Written permission to name the client, from the client. */
  | 'client-naming-consent'
  /** Written permission to describe the project at all, even anonymised. */
  | 'project-disclosure-consent'
  /** A public URL that proves the product exists: app store, live site. */
  | 'public-deployment-url'
  /** A screenshot the client has agreed may be published. */
  | 'approved-screenshot'
  /** A figure the client has confirmed in writing, with its measurement basis. */
  | 'client-confirmed-metric'
  /** A quote attributable to a named person who agreed to be quoted. */
  | 'attributable-testimonial'
  /** Confirmation of the real start and end dates. */
  | 'confirmed-timeline';

/**
 * A measurable outcome.
 *
 * Every field is required, and that is the point: a number without a stated
 * basis, a stated measurement window and a named source is not a result, it is
 * a marketing claim. If any of the four cannot be filled in truthfully, the
 * outcome does not go on the page.
 */
export interface VerifiedOutcome {
  /** What changed, in the client's own terms. */
  description: string;
  /** The figure, exactly as the client confirmed it. Never rounded upward. */
  value: string;
  /** How it was measured, and over what period. */
  basis: string;
  /** Who confirmed it, and in what form. Kept for the record, not rendered. */
  confirmedBy: string;
}

/** One case study. */
export interface CaseStudy {
  /**
   * `'published'` is the only status that may be rendered, routed, listed in
   * the sitemap or marked up. See the module comment.
   */
  status: 'published' | 'draft-evidence-required';
  /** Canonical path, e.g. `/case-studies/<slug>`. */
  path: string;
  /**
   * The client's real name, or an approved anonymised description such as
   * "a UK-based clinic group". `null` while naming consent is outstanding.
   *
   * An anonymised description must still be *true* and must still be approved:
   * "a leading European retailer" invented to sound impressive is a fabrication
   * whether or not a name is attached to it.
   */
  client: string | null;
  /** Whether the client agreed to be named, or only to be described. */
  clientNamed: boolean;
  /** The project, as the client would describe it. */
  projectName: string | null;
  /** The business problem, in the client's terms rather than ours. */
  problem: string;
  /** Mobile app, web application, SaaS platform, AI feature, modernization. */
  projectType: string;
  /**
   * What SCS Softwares actually did — and, where the project was shared,
   * what it did not. "Contributed to" and "delivered" are different claims and
   * must not be blurred, the same distinction `/about` already makes about the
   * 150+ project figure.
   */
  contribution: string[];
  /** Languages, frameworks and services genuinely used on this project. */
  technology: string[];
  /** How delivery ran: discovery, milestones, review cadence, handover. */
  deliveryApproach: string[];
  /** Real problems encountered. A study with no challenges is an advert. */
  challenges: string[];
  /** What was built to address them. */
  solution: string[];
  /**
   * Results, and only ones a client has confirmed in writing. Empty is a
   * perfectly good value, and far better than an invented figure.
   */
  outcomes: VerifiedOutcome[];
  /** Service pages this study evidences. Must be real `/services/*` paths. */
  serviceLinks: string[];
  /** The market page, when the client is in one of the nine active markets. */
  marketLink: string | null;
  /** Live, in maintenance, completed and handed over, or discontinued. */
  projectStatus: string;
  /** Images the owner has confirmed may be published. */
  approvedImages: { src: string; alt: string; width: number; height: number }[];
  /** ISO date the study was published. */
  datePublished: string | null;
  /**
   * Everything still missing. Must be empty for `status: 'published'`, and is
   * the whole content of a draft.
   */
  missingEvidence: EvidenceKind[];
}

/** Human-readable description of each evidence requirement, for the report. */
export const EVIDENCE_DESCRIPTIONS: Record<EvidenceKind, string> = {
  'client-naming-consent':
    "Written confirmation from the client that SCS Softwares may publish their name. An email saying yes is enough; an assumption is not.",
  'project-disclosure-consent':
    'Written confirmation that the project may be described publicly at all, including in anonymised form. Some contracts forbid this outright.',
  'public-deployment-url':
    'A URL anyone can open that proves the product exists — App Store or Play Store listing, or the live web application.',
  'approved-screenshot':
    'At least one screenshot the client has agreed may be published, with any customer data removed.',
  'client-confirmed-metric':
    'Any figure quoted as a result, confirmed by the client in writing, together with how it was measured and over what period.',
  'attributable-testimonial':
    'A quote, the name and role of the person giving it, and their agreement to be quoted publicly.',
  'confirmed-timeline':
    'The real start and end dates of the engagement, if the study is going to mention duration at all.',
};

/**
 * Why a study cannot be published, or `null` when it can.
 *
 * Checks the status flag *and* the actual content, so a study cannot be marked
 * published while still carrying an unmet requirement or an unsourced number.
 */
export function assertPublishable(study: CaseStudy): string | null {
  if (study.status !== 'published') {
    const missing = study.missingEvidence.length
      ? study.missingEvidence.join(', ')
      : 'status is not "published"';
    return `${study.path}: draft — awaiting ${missing}`;
  }
  if (study.missingEvidence.length > 0) {
    return `${study.path}: marked published but still lists missing evidence: ${study.missingEvidence.join(', ')}`;
  }
  if (!study.client) {
    return `${study.path}: no client name or approved anonymised description`;
  }
  if (!study.datePublished) {
    return `${study.path}: no publication date`;
  }
  for (const outcome of study.outcomes) {
    if (!outcome.basis || !outcome.confirmedBy) {
      return `${study.path}: outcome "${outcome.description}" has no measurement basis or confirming source`;
    }
  }
  if (study.serviceLinks.length === 0) {
    return `${study.path}: links to no service page, so it evidences nothing`;
  }
  return null;
}

/**
 * The studies that may actually be rendered.
 *
 * Every consumer — a future route table, a hub, the sitemap — must obtain its
 * list from here rather than filtering itself, so there is one place where the
 * evidence rule is applied.
 */
export function publishableCaseStudies(studies: CaseStudy[]): CaseStudy[] {
  return studies.filter((study) => assertPublishable(study) === null);
}

/**
 * Whether a case-studies hub is warranted yet.
 *
 * Two complete studies is the threshold: a hub listing one is a worse page than
 * the study itself, and a hub listing none is an empty section that gets
 * crawled as thin content — which is exactly what `/BlogPage` used to be.
 */
export const CASE_STUDY_HUB_THRESHOLD = 2;

export function hubIsWarranted(studies: CaseStudy[]): boolean {
  return publishableCaseStudies(studies).length >= CASE_STUDY_HUB_THRESHOLD;
}
