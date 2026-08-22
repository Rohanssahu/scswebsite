/**
 * The entity graph, checked as a graph.
 *
 * The existing tests check each node in isolation: the Organization has the
 * right address, the Person has the right job title, a Service names the right
 * provider. What none of them checks is whether the nodes actually join up —
 * whether a `provider`, `publisher`, `author` or `isPartOf` reference resolves
 * to a node that is defined somewhere, or dangles.
 *
 * A dangling `@id` is a specific and quiet failure: the markup validates, every
 * per-node test passes, and a consumer following the reference finds nothing.
 * The whole point of using stable `@id`s rather than repeating the Organization
 * inline is that one definition is reachable from everywhere, so this is the
 * property worth asserting.
 *
 * It also guards the two fields added for AI/entity visibility — the service
 * catalogue and `areaServed` — against the way they would most plausibly go
 * wrong: advertising a service or a market that has no page.
 */

import { describe, expect, it } from 'vitest';
import { ALL_ROUTES, ROUTE_SEO, indexableRoutes } from './registry';
import { FOUNDER_ID, ORGANIZATION_ID, WEBSITE_ID, organizationJsonLd } from './jsonld';
import { CONTACT, FOUNDING_LOCATION, FOUNDING_YEAR, SITE_NAME, SITE_ORIGIN } from './site';
import { SERVICE_META } from '@/content/services';
import { LOCATION_META } from '@/content/locations';

type Node = Record<string, unknown>;

const ALL_NODES: { route: string; node: Node }[] = ALL_ROUTES.flatMap((route) =>
  route.jsonLd.map((node) => ({ route: route.routePattern, node: node as Node })),
);

/** Every `@id` reference anywhere in the graph, with where it was found. */
function references(node: unknown, route: string, path = '', out: { route: string; path: string; id: string }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => references(item, route, `${path}[${index}]`, out));
    return out;
  }
  if (node && typeof node === 'object') {
    const record = node as Node;
    const keys = Object.keys(record);
    // A bare `{ '@id': ... }` is a reference; a node that also carries `@type`
    // is a definition, and its own `@id` is not a reference to anything.
    if (keys.length === 1 && keys[0] === '@id' && typeof record['@id'] === 'string') {
      out.push({ route, path, id: record['@id'] as string });
      return out;
    }
    for (const [key, value] of Object.entries(record)) {
      if (key === '@id') continue;
      references(value, route, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

const DEFINED_IDS = new Set(
  ALL_NODES.map(({ node }) => node['@id']).filter((id): id is string => typeof id === 'string'),
);

describe('the graph joins up', () => {
  it('resolves every @id reference to a node defined somewhere on the site', () => {
    const dangling = ALL_NODES.flatMap(({ route, node }) => references(node, route)).filter(
      (reference) => !DEFINED_IDS.has(reference.id),
    );
    expect(
      dangling,
      `dangling references: ${dangling.map((d) => `${d.route} ${d.path} -> ${d.id}`).join('; ')}`,
    ).toEqual([]);
  });

  it('defines the Organization exactly once, on the homepage', () => {
    const definitions = ALL_NODES.filter(
      ({ node }) => node['@id'] === ORGANIZATION_ID && node['@type'] === 'Organization' && 'address' in node,
    );
    expect(definitions).toHaveLength(1);
    expect(definitions[0].route).toBe('/');
  });

  it('defines the Person exactly once, on /about', () => {
    const definitions = ALL_NODES.filter(({ node }) => node['@id'] === FOUNDER_ID && node['@type'] === 'Person');
    expect(definitions).toHaveLength(1);
    expect(definitions[0].route).toBe('/about');
  });

  it('points the founder @id at a real fragment on a real indexable page', () => {
    // The identifier a consumer follows must land on the visible story, not on
    // a URL that answers nothing.
    expect(FOUNDER_ID).toBe(`${SITE_ORIGIN}/about#founder`);
    const aboutPaths = indexableRoutes().map((route) => route.canonicalPath);
    expect(aboutPaths).toContain('/about');
  });

  it('links Organization and Person in both directions', () => {
    const organization = ROUTE_SEO['/'].jsonLd.find((node) => node['@type'] === 'Organization') as Node;
    const person = ROUTE_SEO['/about'].jsonLd.find((node) => node['@type'] === 'Person') as Node;
    expect(organization.founder).toEqual({ '@id': FOUNDER_ID });
    expect(person.worksFor).toEqual({ '@id': ORGANIZATION_ID });
  });

  it('keeps the three stable ids on the canonical origin', () => {
    for (const id of [ORGANIZATION_ID, WEBSITE_ID, FOUNDER_ID]) {
      expect(id.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
    }
  });
});

describe('the Organization describes only what exists', () => {
  const organization = organizationJsonLd();

  it('states the one name, year, city and address', () => {
    expect(organization.name).toBe(SITE_NAME);
    expect(organization.foundingDate).toBe(String(FOUNDING_YEAR));
    expect(FOUNDING_YEAR).toBe(2022);
    expect(organization.address).toMatchObject({
      addressLocality: CONTACT.city,
      addressCountry: FOUNDING_LOCATION.country,
    });
  });

  it('offers exactly the services that have a page', () => {
    const catalog = organization.hasOfferCatalog as Node;
    const offered = (catalog.itemListElement as Node[]).map(
      (offer) => (offer.itemOffered as Node).url as string,
    );
    expect(offered.sort()).toEqual(SERVICE_META.map((service) => `${SITE_ORIGIN}${service.path}`).sort());
  });

  it('points every catalogue item back at this same Organization', () => {
    const catalog = organization.hasOfferCatalog as Node;
    for (const offer of catalog.itemListElement as Node[]) {
      expect((offer.itemOffered as Node).provider).toEqual({ '@id': ORGANIZATION_ID });
    }
  });

  it('quotes no price anywhere in the catalogue', () => {
    // No rate card is published, so any price here would be invented.
    const serialized = JSON.stringify(organization.hasOfferCatalog);
    for (const forbidden of ['price', 'priceRange', 'priceSpecification', 'priceCurrency', 'availability']) {
      expect(serialized, `catalogue carries ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('serves exactly India plus the markets that have a page', () => {
    const served = (organization.areaServed as Node[]).map((country) => country.name as string);
    expect(served).toEqual(['India', ...LOCATION_META.map((location) => location.countryName)]);
    for (const country of organization.areaServed as Node[]) {
      expect(country['@type']).toBe('Country');
    }
  });

  it('turns areaServed into no location claim of any kind', () => {
    // areaServed says "we serve here". It must never acquire an address, a
    // phone number, coordinates or a LocalBusiness type, which would say
    // "we are here" — and we are only ever in Indore.
    const serialized = JSON.stringify(organization.areaServed);
    for (const forbidden of ['LocalBusiness', 'PostalAddress', 'GeoCoordinates', 'telephone', 'address', 'branch']) {
      expect(serialized, `areaServed carries ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe('nothing in the graph contradicts the one company', () => {
  it('emits no LocalBusiness, branch or second address anywhere', () => {
    const serialized = JSON.stringify(ALL_NODES.map(({ node }) => node));
    for (const forbidden of ['LocalBusiness', 'branchOf', 'hasPOS', 'openingHours', 'geo']) {
      expect(serialized, `the graph carries ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('names exactly one street address, in Indore', () => {
    const addresses = JSON.stringify(ALL_NODES.map(({ node }) => node)).match(/"streetAddress":"[^"]*"/g) ?? [];
    expect(new Set(addresses).size).toBeLessThanOrEqual(1);
    if (addresses.length) expect(addresses[0]).toContain(CONTACT.street);
  });

  it('names exactly one telephone number', () => {
    const phones = JSON.stringify(ALL_NODES.map(({ node }) => node)).match(/"telephone":"[^"]*"/g) ?? [];
    expect(new Set(phones)).toEqual(new Set([`"telephone":"${CONTACT.phone}"`]));
  });

  it('emits no rating, review, award or headcount anywhere in the graph', () => {
    const serialized = JSON.stringify(ALL_NODES.map(({ node }) => node));
    for (const forbidden of [
      'aggregateRating',
      'AggregateRating',
      'reviewCount',
      'ratingValue',
      '"review"',
      'award',
      'numberOfEmployees',
      'hasCredential',
      'alumniOf',
    ]) {
      expect(serialized, `the graph carries ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('emits no FAQPage, on any route', () => {
    // The FAQ answers are visible on the service, market and article pages, but
    // FAQ rich results are restricted to well-known authoritative sites, so the
    // markup would earn nothing and would be one more claim to keep in sync.
    for (const { route, node } of ALL_NODES) {
      expect(node['@type'], route).not.toBe('FAQPage');
    }
  });
});
