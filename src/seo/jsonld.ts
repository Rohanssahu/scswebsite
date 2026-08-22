/**
 * Truthful JSON-LD builders.
 *
 * Every value below is backed by something that exists: the footer's contact
 * block, the About page's founding year, the six service pages that are
 * actually built, and the social profiles the footer links to.
 *
 * Deliberately absent — and never to be added without real evidence:
 * aggregateRating, review, award, hasCredential, alumniOf, knowsAbout,
 * numberOfEmployees, extra `location` entries, or any `foundingLocation`
 * outside Indore, India.
 */

import {
  CONTACT,
  DEFAULT_SHARE_IMAGE,
  FOUNDER,
  FOUNDING_LOCATION,
  FOUNDING_YEAR,
  POSITIONING,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_ORIGIN,
  SOCIAL_PROFILES,
  assetUrl,
  canonicalUrl,
} from './site';

export type JsonLd = Record<string, unknown>;

/** Stable @id for the single organisation node, referenced by other nodes. */
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/**
 * Stable @id for the single founder node.
 *
 * It resolves to the founder section on `/about` — a real fragment on a real
 * indexable page, so the identifier a crawler follows lands on the visible
 * story rather than a URL that answers nothing. There is no dedicated founder
 * route, and one is not needed: the section carries the whole story.
 */
export const FOUNDER_ID = `${SITE_ORIGIN}/about#${FOUNDER.sectionId}`;

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: assetUrl('/images/logo.png'),
    },
    image: DEFAULT_SHARE_IMAGE,
    description: POSITIONING,
    foundingDate: String(FOUNDING_YEAR),
    foundingLocation: {
      '@type': 'Place',
      name: FOUNDING_LOCATION.label,
      address: {
        '@type': 'PostalAddress',
        addressLocality: FOUNDING_LOCATION.city,
        addressRegion: FOUNDING_LOCATION.region,
        addressCountry: FOUNDING_LOCATION.country,
      },
    },
    // A reference, not an inline node: the Person is defined once, on /about,
    // where the story a reader can actually verify is rendered.
    founder: { '@id': FOUNDER_ID },
    email: CONTACT.email,
    telephone: CONTACT.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.street,
      addressLocality: CONTACT.city,
      addressRegion: CONTACT.region,
      postalCode: CONTACT.postalCode,
      addressCountry: CONTACT.country,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT.email,
        telephone: CONTACT.phone,
        availableLanguage: ['en', 'ar', 'ur'],
      },
    ],
    sameAs: [...SOCIAL_PROFILES],
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    description: POSITIONING,
    inLanguage: ['en', 'ar', 'ur'],
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * The founder, as a `Person` node.
 *
 * Emitted on `/about` only — the one page that renders his name, designation,
 * photograph and story as visible text, which is the condition for marking any
 * of it up. `worksFor` points at the single Organization node defined on the
 * homepage, and that node points back here through its `founder` property, so
 * the two are linked in both directions without either being duplicated.
 *
 * The field list is closed on purpose. `sameAs` is emitted only when
 * `FOUNDER.sameAs` holds a verified personal profile URL, which today it does
 * not — the company LinkedIn page in `SOCIAL_PROFILES` belongs to the
 * Organization, not to the person. Never add award, hasCredential, alumniOf,
 * knowsAbout, birthDate, address, telephone or email to this node without
 * owner-supplied evidence for that specific field.
 */
export function personJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    url: FOUNDER_ID,
    image: assetUrl(FOUNDER.imagePath),
    worksFor: { '@id': ORGANIZATION_ID },
    ...(FOUNDER.sameAs.length > 0 ? { sameAs: [...FOUNDER.sameAs] } : {}),
  };
}

/**
 * A Service node for one of the six service pages that really exist.
 * `serviceType` and `description` come from the page itself, so the markup can
 * never describe a service the page does not.
 */
export function serviceJsonLd(input: {
  name: string;
  serviceType: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    serviceType: input.serviceType,
    description: input.description,
    url: canonicalUrl(input.path),
    provider: { '@id': ORGANIZATION_ID },
    // Delivery is remote from India; this is not an office claim.
    areaServed: { '@type': 'Place', name: 'Worldwide' },
  };
}

/**
 * A Service node for one of the regional landing pages (Phase 3A).
 *
 * Identical in spirit to `serviceJsonLd`, with one difference that matters: the
 * `areaServed` is a schema.org `Country` rather than the "Worldwide" `Place`,
 * because the page really is about one market. That is the only location claim
 * the markup makes — availability of a service in a country.
 *
 * `provider` is a reference to the single India-based Organization node defined
 * on the homepage, so there is exactly one organisation on the site and it has
 * exactly one address, in Indore.
 *
 * Deliberately absent, and never to be added for a target country: LocalBusiness,
 * PostalAddress, GeoCoordinates, telephone, openingHours, aggregateRating,
 * review, FAQPage, branch or `location` nodes.
 */
export function regionalServiceJsonLd(input: {
  name: string;
  serviceType: string;
  description: string;
  path: string;
  /** schema.org `Country.name`, e.g. "United States". */
  countryName: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    serviceType: input.serviceType,
    description: input.description,
    url: canonicalUrl(input.path),
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'Country', name: input.countryName },
  };
}

/** A ContactPage node carrying only the contact details the page shows. */
export function contactPageJsonLd(path: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: canonicalUrl(path),
    name: `Contact ${SITE_NAME}`,
    about: { '@id': ORGANIZATION_ID },
    mainEntity: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      email: CONTACT.email,
      telephone: CONTACT.phone,
    },
  };
}

/**
 * BreadcrumbList builder. Intentionally NOT wired into any route: the site
 * renders no visible breadcrumb trail today, and Google requires the markup to
 * match a visible trail. Phase 2 adds visible breadcrumbs and then calls this.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
