/**
 * Truthful JSON-LD builders.
 *
 * Every value below is backed by something that exists: the footer's contact
 * block, the About page's founding year, the six service pages that are
 * actually built, and the social profiles the footer links to.
 *
 * Deliberately absent — and never to be added without real evidence:
 * aggregateRating, review, award, hasCredential, numberOfEmployees, extra
 * `location` entries, or any `foundingLocation` outside India.
 */

import {
  CONTACT,
  DEFAULT_SHARE_IMAGE,
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
