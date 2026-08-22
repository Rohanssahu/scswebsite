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
        '/gig/cloud-solutions',
        '/gig/devops-services',
        '/gig/digital-marketing',
        '/gig/mobile-development',
        '/gig/ui-ux-design',
        '/gig/web-development',
        '/products',
        '/project-analysis',
        '/schedule-call',
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

  it('puts a Service node on each of the six real service pages', () => {
    const servicePages = ALL_ROUTES.filter((route) => route.canonicalPath.startsWith('/gig/'));
    expect(servicePages).toHaveLength(6);
    for (const route of servicePages) {
      expect(route.jsonLd.map((node) => node['@type'])).toEqual(['Service']);
      expect(route.jsonLd[0].url).toBe(route.canonical);
    }
  });

  it('emits no BreadcrumbList, because no page renders a visible breadcrumb trail', () => {
    for (const route of ALL_ROUTES) {
      expect(route.jsonLd.map((node) => node['@type'])).not.toContain('BreadcrumbList');
    }
  });

  it('contains no rating, review, award or headcount claim', () => {
    const serialized = JSON.stringify(ALL_ROUTES.map((route) => route.jsonLd));
    for (const forbidden of ['aggregateRating', 'AggregateRating', 'review', 'Review', 'award', 'numberOfEmployees', 'hasCredential']) {
      expect(serialized).not.toContain(forbidden);
    }
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
