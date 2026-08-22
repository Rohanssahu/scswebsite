/**
 * The founder and company story rendered on `/about`.
 *
 * Every sentence here is owner-verified. It is the only place the story exists,
 * so the visible copy, the `Person` structured data and the tests all read the
 * same words and cannot drift apart.
 *
 * The prose is English-only, the way `@/content/locations/siteBlocks` and the
 * service and location copy already are. It is deliberately not duplicated per
 * locale or per market: there is one company, one founder and one founding
 * story, and a translated or country-specific variant would be a second version
 * of a fact that has only one true form.
 *
 * Verified facts, and the boundaries around them:
 *   - The company was founded in Indore, Madhya Pradesh, India, in 2022.
 *   - "more than eight years" and "over four years" describe Rohan Sahu's own
 *     career, not the company's trading history. The company has been operating
 *     since 2022 and no line here may suggest otherwise.
 *   - 150+ projects were "contributed to or delivered" — the wording is exact,
 *     because not every one of them was an independently owned SCS Softwares
 *     product.
 *
 * Deliberately absent, and never to be added without evidence: education,
 * awards, certifications, revenue, headcount, offices outside Indore, media
 * coverage, personal profiles or any personal detail beyond the professional
 * record above.
 */

import { FOUNDER, FOUNDING_LOCATION, FOUNDING_YEAR } from '@/seo/site';

export interface FounderFact {
  label: string;
  value: string;
}

export interface FounderReason {
  title: string;
  body: string;
}

export const founderSection = {
  eyebrow: 'Founder & company story',

  /** The visible H2. `/about` keeps its single H1 in the hero above this. */
  heading: `Meet ${FOUNDER.name}, ${FOUNDER.jobTitle}`,

  /** Rendered as real HTML text next to the photograph, not baked into it. */
  name: FOUNDER.name,
  jobTitle: FOUNDER.jobTitle,
  imageSrc: FOUNDER.imagePath,
  imageAlt: FOUNDER.imageAlt,
  imageWidth: FOUNDER.imageWidth,
  imageHeight: FOUNDER.imageHeight,

  /** The one founding line, assembled from the single founding-year constant. */
  origin: `Founded in ${FOUNDING_LOCATION.city} in ${FOUNDING_YEAR}`,
  originDetail: `SCS Softwares was founded in ${FOUNDING_LOCATION.label}.`,

  /**
   * The founder's own record. Written in words rather than as "8+ years" so a
   * reader cannot mistake a personal career length for the company's age — the
   * confusion this whole section exists to remove.
   */
  credentials: [
    'More than eight years in software development',
    'Over four years working directly with freelance and international clients',
  ],

  story: [
    'SCS Softwares was founded in Indore, India, in 2022 by Rohan Sahu, a software professional with more than eight years of experience in technology and over four years of experience working directly with freelance and international clients.',
    'The company was created after Rohan repeatedly observed the same gap in software delivery: clients often had promising ideas and genuine market requirements, but many development teams failed to understand the complete business vision or carry the product through to a production-ready launch. As a result, projects frequently stopped after planning, UI/UX design or frontend development without becoming reliable products that real customers could use.',
    'SCS Softwares was founded to bridge that gap. Its approach connects product understanding, requirements analysis, design, engineering, AI capabilities, testing, deployment and post-launch improvement as one continuous delivery process.',
    'The company has worked with more than 50 clients and contributed to or delivered over 150 mobile, web and AI/ML projects. During the past three years, it has continued supporting clients through long-term development, SaaS delivery, product launches, performance improvements and ongoing product growth.',
    'Today, Rohan leads SCS Softwares with a product-first mindset and a skilled delivery team focused on turning practical ideas into scalable, production-ready software designed for real markets.',
  ],

  /**
   * The two counts the owner has verified, in the one phrasing the site uses.
   * `scripts/verify-dist.mjs` reads these exact strings when it decides which
   * client/project figures are supported, so a different number appearing
   * anywhere still fails the build.
   */
  trackRecord: [
    { label: 'Clients served', value: '50+ clients' },
    { label: 'Mobile, web and AI/ML projects delivered or contributed to', value: '150+ projects' },
    { label: 'Founded in Indore, Madhya Pradesh, India', value: String(FOUNDING_YEAR) },
  ] satisfies FounderFact[],

  whyHeading: 'Why SCS Softwares was founded',
  whyIntro:
    'Three commitments came out of those years of client work, and they still decide how a project runs here.',
  reasons: [
    {
      title: 'Understand the business before writing code',
      body: 'Requirements, users and commercial goals come first. We would rather spend the first week agreeing what the product has to achieve than discover in month three that the build answers the wrong question.',
    },
    {
      title: 'Deliver production-ready products, not incomplete prototypes',
      body: 'A design file, a clickable demo or a frontend with nothing behind it is not a product. Work continues through engineering, testing and deployment until real customers can use it.',
    },
    {
      title: 'Support products after launch through long-term partnerships',
      body: 'Launch is where the real feedback starts. We stay on for the fixes, the performance work and the next set of features, which is why most of our client relationships run for years rather than one release.',
    },
  ] satisfies FounderReason[],

  ctaText:
    'If you are weighing up an idea or an existing product, the quickest way to start is a free project analysis — or write to us and we will read it properly.',
  primaryCta: { label: 'Get a free project analysis', path: '/project-analysis' },
  secondaryCta: { label: 'Contact the team', path: '/contact' },
} as const;

/**
 * The one-line pointer the homepage renders under its "why us" block.
 *
 * It states the founding fact and links through; it does not repeat the story,
 * and it does not stuff "founder" into the anchor text. `/about` is the page
 * that should rank for the founder queries, so the link exists to pass a
 * reader — and a crawler — to it, not to compete with it.
 */
export const homeFounderLink = {
  sentence: `${founderSection.name} founded SCS Softwares in ${FOUNDING_LOCATION.city} in ${FOUNDING_YEAR}, and still leads delivery here.`,
  linkLabel: 'Read our story',
  path: '/about',
} as const;

/** The two owner-verified counts, for the build-time honesty scan. */
export const VERIFIED_COUNT_CLAIMS = ['50+ clients', '150+ projects'] as const;
