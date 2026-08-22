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

import { LOCATION_META } from '@/content/locations';
import { SERVICE_META } from '@/content/services';
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

/**
 * The services this company offers, as a catalogue on the Organization node.
 *
 * Every entry is derived from `SERVICE_META`, so an item can only exist here if
 * a real, indexable, written service page exists for it — there is no
 * hand-maintained list to drift, and no way to advertise a service the site
 * does not describe.
 *
 * Why this is worth marking up: `Organization.description` is prose. A search
 * engine or an assistant answering "which company builds AI voice agents and
 * serves UK clients" has to infer the offer from that sentence. The catalogue
 * states it, linked to the page that proves it.
 *
 * It carries no `price`, `priceRange`, `priceSpecification` or `availability`:
 * pricing here depends on scope, no rate card is published, and an invented
 * one would be exactly the kind of unsupported claim the rest of this module
 * exists to prevent.
 */
export function serviceCatalog(): JsonLd {
  return {
    '@type': 'OfferCatalog',
    name: `Services offered by ${SITE_NAME}`,
    itemListElement: SERVICE_META.map((service) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: service.serviceName,
        serviceType: service.serviceType,
        url: canonicalUrl(service.path),
        provider: { '@id': ORGANIZATION_ID },
      },
    })),
  };
}

/**
 * The markets this company states it serves, as schema.org `Country` nodes.
 *
 * Derived from `LOCATION_META`, so a country appears here only when it has a
 * written market page that carries the India-delivery disclosure. This is a
 * statement of *service availability*, which is what `areaServed` means — it is
 * not a location claim, and it is deliberately the only country-level markup on
 * the site. There is no `LocalBusiness`, no second `address`, no foreign
 * `telephone` and no branch node anywhere, because there is one company and it
 * is in Indore.
 *
 * `India` leads the list because it is where the company actually is; the nine
 * others follow in the order the manifest lists them.
 */
export function marketsServed(): JsonLd[] {
  return [
    { '@type': 'Country', name: 'India' },
    ...LOCATION_META.map((location) => ({ '@type': 'Country', name: location.countryName })),
  ];
}

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
    // What we offer, and where we say we offer it. Both are derived from the
    // pages that exist, so neither can describe something the site does not.
    hasOfferCatalog: serviceCatalog(),
    areaServed: marketsServed(),
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
 * A reference to the founder Person node, for use as an `author`.
 *
 * Deliberately a bare `@id` reference rather than an inline Person: the node
 * itself is defined once, on `/about`, next to the visible name, photograph and
 * story that license it. An article points at that definition instead of
 * restating it, so there is exactly one Rohan Sahu in the graph.
 *
 * The rule that governs its use is editorial, not technical, and no type can
 * enforce it: **this may only be attached to a page Rohan actually wrote or
 * reviewed.** An author byline on content he did not write is a false
 * authorship claim, and it is the specific failure mode that makes "E-E-A-T
 * optimisation" dishonest. See `INSIGHT_META.author` for how that is recorded.
 */
export function founderAuthorRef(): JsonLd {
  return { '@id': FOUNDER_ID };
}

/**
 * An `Article` node for one published insight.
 *
 * Every field is backed by something on the page: the headline is the visible
 * H1, the description is the visible standfirst, the dates are the ones the
 * page renders, and the author is the person named in the visible byline.
 *
 * Deliberately absent, and never to be added without evidence for that specific
 * field: `aggregateRating`, `review`, `speakable`, `wordCount` inflated beyond
 * the real body, `citation` to a source not actually cited, or an `author`
 * pointing at anyone who did not write the piece.
 */
export function articleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  imagePath?: string;
}): JsonLd {
  const url = canonicalUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.headline,
    description: input.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: founderAuthorRef(),
    publisher: { '@id': ORGANIZATION_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en',
    image: input.imagePath ? assetUrl(input.imagePath) : DEFAULT_SHARE_IMAGE,
  };
}

/**
 * The `Blog`/collection node for the insights hub.
 *
 * `CollectionPage` rather than `Blog`: the section is a small set of
 * long-form engineering write-ups, not a posting stream, and describing it as
 * what it is costs nothing.
 */
export function insightsHubJsonLd(input: { path: string; name: string; description: string }): JsonLd {
  const url = canonicalUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
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
