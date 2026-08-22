import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALL_ROUTES,
  NOT_FOUND_SEO,
  ROUTE_SEO,
  canonicalFor,
  indexableRoutes,
  isDynamicPattern,
  matchRouteSeo,
  prerenderRoutes,
  type RouteSeo,
} from './registry';
import { POSITIONING, SITE_ORIGIN } from './site';
import { SERVICE_CONTENT, serviceBreadcrumb } from '@/content/services';
import {
  LOCATION_CONTENT,
  LOCATIONS_HUB_PATH,
  locationBreadcrumb,
  locationsHub,
  locationsHubBreadcrumb,
} from '@/content/locations';

const APP_SOURCE = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

/**
 * Every `path="…"` the router registers, as react-router patterns. In App.tsx
 * the attribute appears only on <Route> elements, several of which span lines,
 * so this matches the attribute rather than the opening tag.
 */
function routerPaths(): string[] {
  const declared = [...APP_SOURCE.matchAll(/\bpath="([^"]+)"/g)].map((m) => m[1]);
  // `/admin` is a layout route whose children are declared relatively.
  return declared.map((path) => (path.startsWith('/') || path === '*' ? path : `/admin/${path}`));
}

describe('route metadata', () => {
  it('registers every route the router serves', () => {
    for (const path of routerPaths()) {
      expect(ROUTE_SEO[path], `no SEO entry for router path "${path}"`).toBeDefined();
    }
    // The /admin index route has no `path` attribute of its own.
    expect(ROUTE_SEO['/admin']).toBeDefined();
  });

  it('serves no route the router does not know', () => {
    const known = new Set([...routerPaths(), '/admin']);
    for (const route of ALL_ROUTES) {
      expect(known.has(route.routePattern), `registry has orphan route "${route.routePattern}"`).toBe(true);
    }
  });

  it('gives every route a non-empty title and description', () => {
    for (const route of ALL_ROUTES) {
      expect(route.title.length, route.routePattern).toBeGreaterThan(10);
      expect(route.description.length, route.routePattern).toBeGreaterThan(40);
    }
  });

  it('gives every route a unique title', () => {
    const titles = ALL_ROUTES.map((route) => route.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('gives every route a unique description', () => {
    const descriptions = ALL_ROUTES.map((route) => route.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('keeps indexable titles and descriptions inside search-result limits', () => {
    for (const route of indexableRoutes()) {
      expect(route.title.length, `${route.routePattern} title`).toBeLessThanOrEqual(75);
      expect(route.description.length, `${route.routePattern} description`).toBeLessThanOrEqual(190);
    }
  });

  it('carries complete Open Graph and Twitter metadata everywhere', () => {
    for (const route of ALL_ROUTES) {
      expect(route.og.title).toBeTruthy();
      expect(route.og.description).toBeTruthy();
      expect(route.og.siteName).toBe('SCS Softwares');
      expect(route.og.image.startsWith(`${SITE_ORIGIN}/images/`)).toBe(true);
      expect(route.og.imageAlt).toBeTruthy();
      expect(route.twitter.card).toBe('summary_large_image');
      expect(route.twitter.title).toBeTruthy();
      expect(route.twitter.description).toBeTruthy();
      expect(route.twitter.site).toBe('@scssoftwares');
    }
  });

  it('uses the agreed positioning line as the homepage description', () => {
    expect(ROUTE_SEO['/'].description).toBe(POSITIONING);
  });

  it('never claims a foreign office or a guaranteed result', () => {
    const forbidden = [
      /\boffices? in (?:the )?(?:USA|UK|Canada|Australia|Germany|Netherlands|Singapore|UAE|Turkey|Dubai|London|New York)/i,
      /\bguarantee/i,
      /\b\d+\+? (?:happy )?clients\b/i,
      /\b\d+% satisfaction/i,
      /\b\d+\+ years\b/i,
      /\b(?:award-winning|no\.?\s?1|#1)\b/i,
    ];
    for (const route of ALL_ROUTES) {
      for (const pattern of forbidden) {
        expect(route.title, route.routePattern).not.toMatch(pattern);
        expect(route.description, route.routePattern).not.toMatch(pattern);
      }
    }
  });
});

describe('canonical discipline', () => {
  it('puts every canonical on the single production origin', () => {
    for (const route of ALL_ROUTES) {
      if (route.canonical === null) continue;
      expect(route.canonical.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
      expect(route.canonical).not.toContain('www.');
      expect(route.canonical).not.toContain('github.io');
    }
  });

  it('self-canonicalises every static route that advertises a canonical', () => {
    for (const route of ALL_ROUTES) {
      if (route.canonical === null) continue; // covered by the null-canonical test below
      if (isDynamicPattern(route.routePattern) || route.indexability === 'redirect') continue;
      expect(route.canonical).toBe(
        route.canonicalPath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route.canonicalPath}`,
      );
    }
  });

  it('points the legacy consultation path at its replacement', () => {
    const route = ROUTE_SEO['/consultation-form'];
    expect(route.indexability).toBe('redirect');
    expect(route.redirectTo).toBe('/schedule-call');
    expect(route.canonical).toBe(`${SITE_ORIGIN}/schedule-call`);
  });

  it('forwards every migrated gig path to its canonical service page', () => {
    const migrations: [string, string][] = [
      ['/gig/web-development', '/services/web-application-development'],
      ['/gig/mobile-development', '/services/mobile-app-development'],
      ['/gig/ui-ux-design', '/services/ui-ux-design'],
      ['/gig/cloud-solutions', '/services/cloud-solutions'],
      ['/gig/devops-services', '/services/devops-engineering'],
      ['/gig/digital-marketing', '/services/digital-marketing'],
    ];
    for (const [from, to] of migrations) {
      const route = ROUTE_SEO[from];
      expect(route.indexability, from).toBe('redirect');
      expect(route.robots, from).toBe('noindex,follow');
      expect(route.prerender, from).toBe(true);
      expect(route.redirectTo, from).toBe(to);
      expect(route.canonical, from).toBe(`${SITE_ORIGIN}${to}`);
      // Still routable, still absent from the sitemap.
      expect(indexableRoutes().map((r) => r.canonicalPath)).not.toContain(from);
    }
  });

  it('emits no canonical where a single document answers many URLs', () => {
    for (const pattern of ['*', '/ai-consultation/:meetingReference', '/admin', '/admin/login', '/admin/leads/:id']) {
      expect(ROUTE_SEO[pattern].canonical, pattern).toBeNull();
    }
    expect(canonicalFor('/ai-consultation/ABC123')).toBeNull();
    expect(canonicalFor('/anything-unknown')).toBeNull();
  });

  it('resolves a live pathname to its canonical regardless of slash or query', () => {
    expect(canonicalFor('/about/')).toBe(`${SITE_ORIGIN}/about`);
    expect(canonicalFor('/project-analysis?method=manual')).toBe(`${SITE_ORIGIN}/project-analysis`);
    expect(canonicalFor('/')).toBe(`${SITE_ORIGIN}/`);
  });
});

describe('noindex routes', () => {
  const noindex = (path: string): RouteSeo => matchRouteSeo(path);

  it('blocks the whole admin dashboard', () => {
    for (const path of ['/admin', '/admin/', '/admin/login', '/admin/leads/42', '/admin/anything/deep']) {
      expect(noindex(path).robots, path).toBe('noindex,nofollow');
    }
  });

  it('blocks every AI consultation room', () => {
    for (const path of ['/ai-consultation', '/ai-consultation/ABC123', '/ai-consultation/ABC123/extra']) {
      expect(noindex(path).robots, path).toBe('noindex,nofollow');
    }
  });

  it('blocks the session-scoped analysis result and the job application form', () => {
    expect(noindex('/project-analysis/result').robots).toBe('noindex,nofollow');
    expect(noindex('/project-analysis/result').indexability).toBe('noindex-session');
    expect(noindex('/ApplicationForm').robots).toBe('noindex,nofollow');
    expect(noindex('/ApplicationForm').indexability).toBe('noindex-private');
  });

  it('falls back to noindex,nofollow for an unknown route', () => {
    for (const path of ['/nope', '/blogs', '/QRMenuDetailsPage', '/a/b/c']) {
      expect(noindex(path), path).toBe(NOT_FOUND_SEO);
      expect(noindex(path).robots).toBe('noindex,nofollow');
    }
  });

  it('marks the empty insights index noindex until real articles exist', () => {
    expect(ROUTE_SEO['/BlogPage'].robots).toBe('noindex,follow');
    expect(ROUTE_SEO['/BlogPage'].indexability).toBe('noindex-utility');
  });

  it('leaves the analysis start page indexable, unlike its result page', () => {
    expect(noindex('/project-analysis').robots).toBe('index,follow');
  });

  it('uses index,follow for every public page and nothing else', () => {
    for (const route of ALL_ROUTES) {
      if (route.indexability === 'indexable') expect(route.robots, route.routePattern).toBe('index,follow');
      else expect(route.robots, route.routePattern).not.toBe('index,follow');
    }
  });
});

describe('sitemap route matching', () => {
  it('includes only indexable, prerendered, index,follow routes', () => {
    for (const route of indexableRoutes()) {
      expect(route.indexability).toBe('indexable');
      expect(route.robots).toBe('index,follow');
      expect(route.prerender).toBe(true);
    }
  });

  it('excludes every private, session, redirect and placeholder route', () => {
    const paths = indexableRoutes().map((route) => route.canonicalPath);
    for (const excluded of [
      '/admin',
      '/admin/login',
      '/gig/web-development',
      '/gig/mobile-development',
      '/gig/ui-ux-design',
      '/gig/cloud-solutions',
      '/gig/devops-services',
      '/gig/digital-marketing',
      '/ai-consultation/:meetingReference',
      '/project-analysis/result',
      '/ApplicationForm',
      '/BlogPage',
      '/consultation-form',
      '/*',
    ]) {
      expect(paths).not.toContain(excluded);
    }
  });

  it('matches the known set of public URLs exactly', () => {
    expect(indexableRoutes().map((route) => route.canonicalPath).sort()).toEqual(
      [
        '/',
        '/PrivacyPolicy',
        '/ProductDetailsPage',
        '/TermsAndConditions',
        '/about',
        '/careers',
        '/contact',
        '/products',
        '/project-analysis',
        '/schedule-call',
        '/services',
        '/services/ai-automation-integration',
        '/services/ai-development',
        '/services/ai-video-consultation-agents',
        '/services/ai-voice-agent-development',
        '/services/cloud-solutions',
        '/services/conversational-ai-development',
        '/services/custom-software-development',
        '/services/devops-engineering',
        '/services/digital-marketing',
        '/services/machine-learning-development',
        '/services/mobile-app-development',
        '/services/saas-development',
        '/services/software-modernization',
        '/services/ui-ux-design',
        '/services/web-application-development',
        '/locations',
        '/locations/united-states',
        '/locations/united-kingdom',
        '/locations/united-arab-emirates',
      ].sort(),
    );
  });

  it('lists no duplicate canonical URLs', () => {
    const canonicals = indexableRoutes().map((route) => route.canonical);
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it('never prerenders a dynamic pattern', () => {
    for (const route of prerenderRoutes()) {
      expect(isDynamicPattern(route.routePattern), route.routePattern).toBe(false);
    }
  });

  it('prerenders every indexable route', () => {
    for (const route of ALL_ROUTES) {
      if (route.indexability === 'indexable') expect(route.prerender, route.routePattern).toBe(true);
    }
  });
});

describe('structured data', () => {
  it('puts Organization and WebSite on the homepage only', () => {
    expect(ROUTE_SEO['/'].jsonLd.map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
    for (const route of ALL_ROUTES) {
      if (route.routePattern === '/') continue;
      expect(route.jsonLd.map((node) => node['@type']), route.routePattern).not.toContain('Organization');
      expect(route.jsonLd.map((node) => node['@type']), route.routePattern).not.toContain('WebSite');
    }
  });

  it('leaves no indexable page under /gig — they are all forwarding stubs now', () => {
    const gigRoutes = ALL_ROUTES.filter((route) => route.canonicalPath.startsWith('/gig/'));
    expect(gigRoutes).toHaveLength(6);
    for (const route of gigRoutes) {
      expect(route.indexability, route.canonicalPath).toBe('redirect');
      expect(route.jsonLd, route.canonicalPath).toHaveLength(0);
      expect(route.redirectTo?.startsWith('/services/'), route.canonicalPath).toBe(true);
    }
  });

  it('puts a Service and a BreadcrumbList node on each canonical service page', () => {
    const servicePages = ALL_ROUTES.filter((route) => route.canonicalPath.startsWith('/services/'));
    expect(servicePages).toHaveLength(SERVICE_CONTENT.length);
    expect(SERVICE_CONTENT).toHaveLength(15);
    for (const route of servicePages) {
      expect(route.jsonLd.map((node) => node['@type']), route.canonicalPath).toEqual(['Service', 'BreadcrumbList']);
      expect(route.jsonLd[0].url).toBe(route.canonical);
    }
  });

  it('matches every Service node to the page copy it describes', () => {
    for (const service of SERVICE_CONTENT) {
      const route = ROUTE_SEO[service.path];
      expect(route.title).toBe(service.metaTitle);
      expect(route.description).toBe(service.metaDescription);
      const node = route.jsonLd[0] as { name: string; serviceType: string; description: string };
      expect(node.name).toBe(service.serviceName);
      expect(node.serviceType).toBe(service.serviceType);
      expect(node.description).toBe(service.metaDescription);
    }
  });

  it('gives every BreadcrumbList the same trail the page renders, ending on itself', () => {
    for (const service of SERVICE_CONTENT) {
      const crumbs = serviceBreadcrumb(service);
      const node = ROUTE_SEO[service.path].jsonLd[1] as {
        itemListElement: { position: number; name: string; item: string }[];
      };
      expect(node.itemListElement).toHaveLength(crumbs.length);
      node.itemListElement.forEach((element, index) => {
        expect(element.position).toBe(index + 1);
        expect(element.name).toBe(crumbs[index].name);
        expect(element.item).toBe(
          crumbs[index].path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${crumbs[index].path}`,
        );
      });
      expect(node.itemListElement[0].name).toBe('Home');
      expect(node.itemListElement.at(-1)?.item).toBe(ROUTE_SEO[service.path].canonical);
    }
  });

  it('emits a BreadcrumbList only where a visible breadcrumb trail is rendered', () => {
    // The two hubs and every page under them render a trail; nothing else does.
    for (const route of ALL_ROUTES) {
      const hasBreadcrumb = route.jsonLd.some((node) => node['@type'] === 'BreadcrumbList');
      const rendersTrail =
        route.canonicalPath === '/services' ||
        route.canonicalPath.startsWith('/services/') ||
        route.canonicalPath === '/locations' ||
        route.canonicalPath.startsWith('/locations/');
      expect(hasBreadcrumb, route.routePattern).toBe(rendersTrail);
    }
  });

  it('gives the services hub a BreadcrumbList but no Service node', () => {
    const hub = ROUTE_SEO['/services'];
    expect(hub.indexability).toBe('indexable');
    expect(hub.prerender).toBe(true);
    expect(hub.jsonLd.map((node) => node['@type'])).toEqual(['BreadcrumbList']);
    const trail = hub.jsonLd[0] as { itemListElement: { name: string; item: string }[] };
    expect(trail.itemListElement.map((item) => item.name)).toEqual(['Home', 'Services']);
    expect(trail.itemListElement.at(-1)?.item).toBe(hub.canonical);
  });

  it('routes every service breadcrumb through the hub', () => {
    for (const service of SERVICE_CONTENT) {
      const trail = ROUTE_SEO[service.path].jsonLd[1] as { itemListElement: { name: string; item: string }[] };
      expect(trail.itemListElement.map((item) => item.name), service.path).toEqual([
        'Home',
        'Services',
        service.navLabel,
      ]);
      expect(trail.itemListElement[1].item).toBe(ROUTE_SEO['/services'].canonical);
    }
  });

  it('contains no rating, review, award or headcount claim', () => {
    // Property names and @type values only: a description may legitimately use
    // the English word "review" (a security review is a service we perform),
    // but the markup must never carry a `review` or `aggregateRating` node.
    const forbidden = ['aggregateRating', 'review', 'reviews', 'award', 'awards', 'numberOfEmployees', 'hasCredential'];
    const walk = (node: unknown, where: string): void => {
      if (Array.isArray(node)) {
        node.forEach((child, index) => walk(child, `${where}[${index}]`));
        return;
      }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        expect(forbidden, `${where}.${key}`).not.toContain(key.toLowerCase().replace(/^@/, ''));
        if (key === '@type') {
          expect(
            ['AggregateRating', 'Review', 'Rating'].includes(String(value)),
            `${where} declares @type ${String(value)}`,
          ).toBe(false);
        }
        walk(value, `${where}.${key}`);
      }
    };
    for (const route of ALL_ROUTES) walk(route.jsonLd, route.routePattern);
  });

  it('uses only the verified contact details', () => {
    const organization = ROUTE_SEO['/'].jsonLd[0] as {
      email: string;
      telephone: string;
      foundingDate: string;
      address: { addressLocality: string; addressCountry: string };
    };
    expect(organization.email).toBe('info@scssoftwares.com');
    expect(organization.telephone).toBe('+917828690192');
    expect(organization.address.addressLocality).toBe('Indore');
    expect(organization.address.addressCountry).toBe('IN');
    expect(organization.foundingDate).toBe('2018');
  });
});

describe('Phase 3A regional routes', () => {
  const hub = () => ROUTE_SEO[LOCATIONS_HUB_PATH];

  it('registers the hub and exactly the three active markets', () => {
    expect(LOCATIONS_HUB_PATH).toBe('/locations');
    expect(LOCATION_CONTENT.map((location) => location.path)).toEqual([
      '/locations/united-states',
      '/locations/united-kingdom',
      '/locations/united-arab-emirates',
    ]);
    for (const location of LOCATION_CONTENT) expect(ROUTE_SEO[location.path], location.path).toBeDefined();
  });

  it('uses the flat /locations/<country> form and no abbreviation or city page', () => {
    for (const location of LOCATION_CONTENT) {
      expect(location.path).toMatch(/^\/locations\/[a-z-]+$/);
      expect(location.path.split('/')).toHaveLength(3);
      for (const bad of ['/usa', '/uk', '/uae', '?country=', 'dubai', 'london', 'new-york']) {
        expect(location.path.includes(bad), `${location.path} contains ${bad}`).toBe(false);
      }
    }
  });

  it('makes every regional route indexable, prerendered and self-canonical', () => {
    for (const route of [hub(), ...LOCATION_CONTENT.map((location) => ROUTE_SEO[location.path])]) {
      expect(route.indexability, route.canonicalPath).toBe('indexable');
      expect(route.robots, route.canonicalPath).toBe('index,follow');
      expect(route.prerender, route.canonicalPath).toBe(true);
      expect(route.canonical, route.canonicalPath).toBe(`${SITE_ORIGIN}${route.canonicalPath}`);
      expect(route.og.url, route.canonicalPath).toBe(route.canonical);
      expect(route.twitter.card, route.canonicalPath).toBe('summary_large_image');
    }
  });

  it('gives the hub a BreadcrumbList and nothing else', () => {
    expect(hub().jsonLd.map((node) => node['@type'])).toEqual(['BreadcrumbList']);
    const trail = hub().jsonLd[0] as { itemListElement: { name: string; item: string }[] };
    expect(trail.itemListElement.map((item) => item.name)).toEqual(['Home', 'Locations']);
    expect(trail.itemListElement.at(-1)?.item).toBe(hub().canonical);
    expect(locationsHubBreadcrumb().map((crumb) => crumb.name)).toEqual(['Home', 'Locations']);
    expect(locationsHub.navLabel).toBe('Locations');
  });

  it('gives each country page a Service with areaServed Country, plus a BreadcrumbList', () => {
    for (const location of LOCATION_CONTENT) {
      const route = ROUTE_SEO[location.path];
      expect(route.jsonLd.map((node) => node['@type']), location.path).toEqual(['Service', 'BreadcrumbList']);
      const service = route.jsonLd[0] as {
        url: string;
        name: string;
        serviceType: string;
        description: string;
        provider: { '@id': string };
        areaServed: { '@type': string; name: string };
      };
      expect(service.url).toBe(route.canonical);
      expect(service.name).toBe(location.serviceName);
      expect(service.serviceType).toBe(location.serviceType);
      expect(service.description).toBe(location.metaDescription);
      // The provider is the one India-based Organization node, by reference.
      expect(service.provider['@id']).toBe(`${SITE_ORIGIN}/#organization`);
      expect(service.areaServed['@type']).toBe('Country');
      expect(service.areaServed.name).toBe(location.countryName);
    }
  });

  it('routes every country breadcrumb through the locations hub, ending on itself', () => {
    for (const location of LOCATION_CONTENT) {
      const crumbs = locationBreadcrumb(location);
      expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', 'Locations', location.navLabel]);
      const node = ROUTE_SEO[location.path].jsonLd[1] as {
        itemListElement: { position: number; name: string; item: string }[];
      };
      expect(node.itemListElement).toHaveLength(3);
      node.itemListElement.forEach((element, index) => {
        expect(element.position).toBe(index + 1);
        expect(element.name).toBe(crumbs[index].name);
        expect(element.item).toBe(
          crumbs[index].path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${crumbs[index].path}`,
        );
      });
      expect(node.itemListElement[1].item).toBe(ROUTE_SEO[LOCATIONS_HUB_PATH].canonical);
      expect(node.itemListElement.at(-1)?.item).toBe(ROUTE_SEO[location.path].canonical);
    }
  });

  it('adds no LocalBusiness, address, coordinates, phone, hours, rating or FAQPage', () => {
    const forbiddenTypes = [
      'LocalBusiness',
      'PostalAddress',
      'GeoCoordinates',
      'Place',
      'FAQPage',
      'AggregateRating',
      'Review',
      'OpeningHoursSpecification',
    ];
    const forbiddenKeys = ['telephone', 'address', 'geo', 'openinghours', 'openinghoursspecification', 'branchof', 'location'];
    const walk = (node: unknown, where: string): void => {
      if (Array.isArray(node)) {
        node.forEach((child, index) => walk(child, `${where}[${index}]`));
        return;
      }
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        expect(forbiddenKeys, `${where}.${key}`).not.toContain(key.toLowerCase());
        if (key === '@type') {
          expect(forbiddenTypes, `${where} declares @type ${String(value)}`).not.toContain(String(value));
        }
        walk(value, `${where}.${key}`);
      }
    };
    for (const route of [ROUTE_SEO[LOCATIONS_HUB_PATH], ...LOCATION_CONTENT.map((l) => ROUTE_SEO[l.path])]) {
      walk(route.jsonLd, route.canonicalPath);
    }
  });

  it('adds no hreflang alternate for these pages — they are not translations', () => {
    // Phase 3A ships regional service pages, not localized variants of one
    // page, so nothing here may advertise an alternate. The registry has no
    // hreflang field at all; this test documents that as a decision.
    for (const route of [ROUTE_SEO[LOCATIONS_HUB_PATH], ...LOCATION_CONTENT.map((l) => ROUTE_SEO[l.path])]) {
      expect(Object.keys(route)).not.toContain('hreflang');
      expect(Object.keys(route)).not.toContain('alternates');
    }
  });

  it('never puts a country name in a title in a way that implies presence', () => {
    // "in the United States" would read as an office; "for US businesses" does not.
    for (const location of LOCATION_CONTENT) {
      const route = ROUTE_SEO[location.path];
      expect(route.title, location.path).not.toMatch(/\b(?:in|based in|located in) (?:the )?(?:US|USA|UK|UAE|United States|United Kingdom|United Arab Emirates|Dubai|Abu Dhabi|London|New York)\b/i);
      expect(route.description, location.path).not.toMatch(/\boffices? in\b/i);
      expect(route.title, location.path).not.toMatch(/\bour (?:US|USA|UK|UAE) (?:office|team)\b/i);
    }
  });

  it('gives the hub and every market page a distinct title and description', () => {
    const routes = [ROUTE_SEO[LOCATIONS_HUB_PATH], ...LOCATION_CONTENT.map((l) => ROUTE_SEO[l.path])];
    expect(new Set(routes.map((route) => route.title)).size).toBe(routes.length);
    expect(new Set(routes.map((route) => route.description)).size).toBe(routes.length);
    for (const route of routes) {
      expect(route.title.length, `${route.canonicalPath} title`).toBeLessThanOrEqual(75);
      expect(route.description.length, `${route.canonicalPath} description`).toBeGreaterThan(80);
      expect(route.description.length, `${route.canonicalPath} description`).toBeLessThanOrEqual(190);
    }
  });
});

// ---------------------------------------------------------------------------
// Internal-link integrity, checked at the source level rather than only in the
// built output: the product showcase previously linked fifteen cards to routes
// that were never registered, and the insights page pushed visitors to /blogs.
// Every one of those landed on the 404 screen.
// ---------------------------------------------------------------------------

/**
 * Comments are stripped before scanning: several of these files carry a comment
 * naming the exact dead route or broken pattern they were repaired from, and a
 * scanner that matched those would report the documentation as the defect.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const SOURCE_FILES = (() => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
    }
  };
  walk(join(process.cwd(), 'src'));
  return files.map(
    (file) => [file.replace(`${process.cwd()}/`, ''), stripComments(readFileSync(file, 'utf8'))] as const,
  );
})();

describe('internal link integrity', () => {
  /** Literal destinations passed to <Link to="…">, navigate('…') and href="/…". */
  const internalTargets = () => {
    const found: { file: string; target: string }[] = [];
    for (const [file, source] of SOURCE_FILES) {
      const patterns = [/\bto="(\/[^"]*)"/g, /\bto={'(\/[^']*)'}/g, /\bnavigate\('(\/[^']*)'\)/g, /\bhref="(\/[^"]*)"/g];
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) found.push({ file, target: match[1] });
      }
    }
    return found;
  };

  it('finds link targets to check', () => {
    expect(internalTargets().length).toBeGreaterThan(30);
  });

  it('points every internal link at a registered route', () => {
    for (const { file, target } of internalTargets()) {
      const route = matchRouteSeo(target);
      expect(route, `${file} links to "${target}", which resolves to the 404 route`).not.toBe(NOT_FOUND_SEO);
    }
  });

  it('no longer references the removed product detail routes or /blogs', () => {
    const dead = [
      '/blogs',
      '/ServiceBookingDetailsPage',
      '/DigitalCardDetailsPage',
      '/DoctorAppDetailsPage',
      '/QRMenuDetailsPage',
      '/ElearningPlatformDetailsPage',
      '/RealEstateAppDetailsPage',
      '/HRMSDetailsPage',
      '/InventoryBillingDetailsPage',
      '/GymAppDetailsPage',
      '/GroceryAppDetailsPage',
      '/DonationPlatformDetailsPage',
      '/FoodDeliveryDetailsPage',
      '/ExamPortalDetailsPage',
      '/MarketingToolsDetailsPage',
      '/DevOpsDetailsPage',
    ];
    for (const [file, source] of SOURCE_FILES) {
      for (const path of dead) {
        const inCode = new RegExp(`["'\`]${path}["'\`]`).test(source);
        expect(inCode, `${file} still references ${path}`).toBe(false);
      }
    }
  });

  it('links to no absolute internal URL, so no second host can be advertised', () => {
    for (const [file, source] of SOURCE_FILES) {
      for (const pattern of [/https?:\/\/www\.scssoftwares\.com/, /github\.io/]) {
        expect(pattern.test(source), `${file} contains ${pattern}`).toBe(false);
      }
    }
  });

  it('hotlinks no third-party image', () => {
    for (const [file, source] of SOURCE_FILES) {
      for (const host of ['images.unsplash.com', 'encrypted-tbn0.gstatic.com', 'media.licdn.com', 'static.wixstatic.com', 'istockphoto.com', 'blog.elxoinc.com']) {
        expect(source.includes(host), `${file} hotlinks ${host}`).toBe(false);
      }
    }
  });

  it('renders no anchor or Link with an undefined destination', () => {
    for (const [file, source] of SOURCE_FILES) {
      expect(source.includes('href={link}'), `${file} has an href bound to an undefined prop`).toBe(false);
      expect(/href=\{undefined\}|to=\{undefined\}/.test(source), file).toBe(false);
    }
  });
});
