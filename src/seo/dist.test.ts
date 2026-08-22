import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexableRoutes, prerenderRoutes, ROUTE_SEO } from './registry';
import { SITE_ORIGIN } from './site';
import { AI_SERVICE_CONTENT, SERVICE_CONTENT, hubBreadcrumb, serviceBreadcrumb } from '@/content/services';

/**
 * Assertions about the deployable artifact.
 *
 * These read `dist/`, so they only run after a build. `npm run verify:dist` is
 * the hard gate that must pass before deploying — it repeats these checks and
 * adds the live static-server pass. Skipping here keeps `npm test` usable on a
 * clean checkout instead of failing on a missing directory.
 */
const DIST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../dist');
const built = existsSync(path.join(DIST, 'index.html'));

/** GitHub Pages resolution: exact file, then `.html`, then `/index.html`. */
function resolveDist(urlPath: string): string | null {
  const trimmed = urlPath.replace(/^\/+/, '');
  const candidates = trimmed === '' ? ['index.html'] : [trimmed, `${trimmed}.html`, `${trimmed}/index.html`];
  for (const candidate of candidates) {
    const full = path.join(DIST, candidate);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

const read = (urlPath: string) => {
  const file = resolveDist(urlPath);
  if (!file) throw new Error(`no built file for ${urlPath}`);
  return readFileSync(file, 'utf8');
};

const metaContent = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:name|property)="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="([^"]*)"`))?.[1] ??
  null;

const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;

describe.skipIf(!built)('prerender output', () => {
  it('emits a physical HTML file for every route marked prerender', () => {
    for (const route of prerenderRoutes()) {
      expect(resolveDist(route.canonicalPath), `${route.canonicalPath} was not prerendered`).not.toBeNull();
    }
  });

  it('serves each public route from both the extension and the directory form', () => {
    for (const route of prerenderRoutes()) {
      if (route.canonicalPath === '/') continue;
      const clean = route.canonicalPath.replace(/^\//, '');
      expect(existsSync(path.join(DIST, `${clean}.html`)), `${clean}.html`).toBe(true);
      expect(existsSync(path.join(DIST, clean, 'index.html')), `${clean}/index.html`).toBe(true);
    }
  });

  it('ships the registry title, description, robots and canonical before any JavaScript', () => {
    for (const route of prerenderRoutes()) {
      const html = read(route.canonicalPath);
      expect(titleOf(html), route.canonicalPath).toBe(route.title.replace(/&/g, '&amp;'));
      expect(metaContent(html, 'description'), route.canonicalPath).toBe(route.description);
      expect(metaContent(html, 'robots'), route.canonicalPath).toBe(route.robots);
      expect(canonicalOf(html), route.canonicalPath).toBe(route.canonical);
    }
  });

  it('ships real page copy, not an empty SPA shell, on every indexable route', () => {
    for (const route of indexableRoutes()) {
      const html = read(route.canonicalPath);
      const body = html.split('<div id="root">')[1]?.split('<script type="module"')[0] ?? '';
      const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      expect(text.split(' ').length, `${route.canonicalPath} has too little prerendered copy`).toBeGreaterThan(120);
      expect(html, `${route.canonicalPath} has no <h1>`).toMatch(/<h1[\s>]/);
      expect(html, `${route.canonicalPath} has no main landmark`).toContain('id="main-content"');
    }
  });

  it('never ships prerendered copy hidden behind an entry animation', () => {
    for (const route of indexableRoutes()) {
      expect(read(route.canonicalPath), route.canonicalPath).not.toContain('opacity:0');
    }
  });

  it('emits exactly one of each metadata tag per document', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.html')) files.push(full);
      }
    };
    walk(DIST);
    expect(files.length).toBeGreaterThan(20);

    for (const file of files) {
      const html = readFileSync(file, 'utf8');
      expect(html.match(/<title>/g) ?? [], file).toHaveLength(1);
      const keys = [
        ...[...html.matchAll(/<meta (?:name|property)="([^"]+)"/g)].map((m) => m[1]),
        ...[...html.matchAll(/<link rel="(canonical)"/g)].map((m) => m[1]),
      ];
      const counts = new Map<string, number>();
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
      for (const [key, count] of counts) expect(count, `${file}: ${key}`).toBe(1);
    }
  });

  it('references no legacy or preview host anywhere in the output', () => {
    for (const route of prerenderRoutes()) {
      const html = read(route.canonicalPath);
      expect(html).not.toContain('www.scssoftwares.com');
      expect(html).not.toContain('github.io');
    }
  });

  it('turns each migrated gig path into a noindex canonical-forwarding stub', () => {
    const migrations: [string, string][] = [
      ['/gig/web-development', '/services/web-application-development'],
      ['/gig/mobile-development', '/services/mobile-app-development'],
      ['/gig/ui-ux-design', '/services/ui-ux-design'],
      ['/gig/cloud-solutions', '/services/cloud-solutions'],
      ['/gig/devops-services', '/services/devops-engineering'],
      ['/gig/digital-marketing', '/services/digital-marketing'],
    ];
    for (const [from, to] of migrations) {
      const html = read(from);
      expect(html, from).toContain('http-equiv="refresh"');
      expect(html, from).toContain(`content="0; url=${to}"`);
      expect(canonicalOf(html), from).toBe(`${SITE_ORIGIN}${to}`);
      expect(metaContent(html, 'robots'), from).toBe('noindex,follow');
      // The replacement is a real prerendered page, not another stub.
      expect(resolveDist(to), to).not.toBeNull();
    }
  });

  it('ships a visible breadcrumb and matching JSON-LD on every canonical service page', () => {
    for (const service of SERVICE_CONTENT) {
      const html = read(service.path);
      expect(html, service.path).toContain('aria-label="Breadcrumb"');

      const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
        JSON.parse(m[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&')),
      );
      const types = blocks.map((node) => node['@type']);
      expect(types, service.path).toContain('Service');
      expect(types, service.path).toContain('BreadcrumbList');

      const serviceNode = blocks.find((node) => node['@type'] === 'Service');
      expect(serviceNode.url, service.path).toBe(canonicalOf(html));
      expect(serviceNode.name, service.path).toBe(service.serviceName);

      const crumbNode = blocks.find((node) => node['@type'] === 'BreadcrumbList');
      const crumbs = serviceBreadcrumb(service);
      expect(crumbNode.itemListElement, service.path).toHaveLength(crumbs.length);
      // Every crumb name is on the page a visitor sees, not only in the markup.
      // The rendered HTML entity-encodes "&", so decode before comparing.
      const visible = html.replace(/&amp;/g, '&');
      for (const crumb of crumbs) expect(visible, `${service.path}: ${crumb.name}`).toContain(crumb.name);
      expect(crumbNode.itemListElement.at(-1).item, service.path).toBe(canonicalOf(html));
    }
  });

  it('renders the FAQ answers into the HTML, not behind JavaScript', () => {
    for (const service of SERVICE_CONTENT) {
      const html = read(service.path);
      for (const faq of service.faqs) {
        expect(html, `${service.path}: ${faq.question}`).toContain(faq.question.replace(/&/g, '&amp;'));
      }
    }
  });

  it('ships the services hub with its own breadcrumb, trail markup and links', () => {
    const html = read('/services');
    expect(html).toContain('aria-label="Breadcrumb"');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&')),
    );
    expect(blocks.map((node) => node['@type'])).toEqual(['BreadcrumbList']);
    const crumbs = hubBreadcrumb();
    expect(blocks[0].itemListElement).toHaveLength(crumbs.length);
    expect(blocks[0].itemListElement.at(-1).item).toBe(canonicalOf(html));
    // Every service page is reachable in one click from the hub.
    for (const service of SERVICE_CONTENT) {
      expect(html, `hub does not link to ${service.path}`).toContain(`href="${service.path}"`);
    }
    for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
      expect(html, `hub has no link to ${target}`).toContain(`href="${target}"`);
    }
  });

  it('routes every prerendered service breadcrumb through the hub', () => {
    for (const service of SERVICE_CONTENT) {
      const html = read(service.path);
      const crumbs = serviceBreadcrumb(service);
      expect(crumbs.map((crumb) => crumb.name), service.path).toEqual(['Home', 'Services', service.navLabel]);
      // The middle crumb is a real link on the page, not just a name in the markup.
      expect(html, `${service.path} does not link to the hub`).toContain('href="/services"');
    }
  });

  it('ships the AI-specific sections on every AI page', () => {
    for (const service of AI_SERVICE_CONTENT) {
      const html = read(service.path);
      const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      expect(text, `${service.path} use cases`).toContain(service.useCases!.heading);
      expect(text, `${service.path} integration`).toContain(service.integration!.heading);
      expect(text, `${service.path} limitations`).toContain(service.limitations!.heading);
      expect(text, `${service.path} oversight`).toContain(service.limitations!.oversight.title);
    }
  });

  it('links every canonical service page to the estimate, call and contact pages', () => {
    for (const service of SERVICE_CONTENT) {
      const html = read(service.path);
      for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
        expect(html, `${service.path} -> ${target}`).toContain(`href="${target}"`);
      }
    }
  });

  it('turns the legacy consultation path into a canonical-forwarding stub', () => {
    const html = read('/consultation-form');
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('content="0; url=/schedule-call"');
    expect(canonicalOf(html)).toBe(`${SITE_ORIGIN}/schedule-call`);
    expect(metaContent(html, 'robots')).toBe('noindex,follow');
  });
});

describe.skipIf(!built)('404 SPA fallback', () => {
  const html = () => readFileSync(path.join(DIST, '404.html'), 'utf8');

  it('exists and boots the application bundle', () => {
    expect(existsSync(path.join(DIST, '404.html'))).toBe(true);
    expect(html()).toContain('<script type="module"');
    expect(html()).toContain('<div id="root">');
  });

  it('is noindex,nofollow and advertises no canonical', () => {
    expect(metaContent(html(), 'robots')).toBe('noindex,nofollow');
    expect(canonicalOf(html())).toBeNull();
    expect(metaContent(html(), 'og:url')).toBeNull();
    expect(titleOf(html())).toBe(ROUTE_SEO['*'].title);
  });

  it('is the only thing serving the dynamic routes — none of them is prerendered', () => {
    for (const pattern of ['/ai-consultation/ABC123', '/admin/leads/42']) {
      expect(resolveDist(pattern), `${pattern} must not have a physical file`).toBeNull();
    }
  });
});

describe.skipIf(!built)('sitemap', () => {
  const xml = () => readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = () => [...xml().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('lists exactly the indexable routes', () => {
    expect(locs().sort()).toEqual(indexableRoutes().map((route) => route.canonical).sort());
  });

  it('lists only URLs that answer with a real prerendered file', () => {
    for (const loc of locs()) {
      const urlPath = loc.slice(SITE_ORIGIN.length) || '/';
      expect(resolveDist(urlPath), loc).not.toBeNull();
      expect(metaContent(read(urlPath), 'robots'), loc).toBe('index,follow');
    }
  });

  it('lists no noindex, private, session or redirect URL', () => {
    for (const excluded of ['/admin', '/ai-consultation', '/project-analysis/result', '/ApplicationForm', '/BlogPage', '/consultation-form', '/gig/']) {
      expect(locs().some((loc) => loc.includes(excluded)), excluded).toBe(false);
    }
  });

  it('is well-formed and single-origin', () => {
    expect(xml()).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml()).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    for (const loc of locs()) expect(loc.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
  });
});

describe.skipIf(!built)('CNAME preservation', () => {
  it('keeps dist/CNAME with exactly the apex domain', () => {
    const cnamePath = path.join(DIST, 'CNAME');
    expect(existsSync(cnamePath)).toBe(true);
    expect(readFileSync(cnamePath, 'utf8').trim()).toBe('scssoftwares.com');
  });

  it('keeps the source of truth in public/ so every build re-emits it', () => {
    const source = path.resolve(DIST, '../public/CNAME');
    expect(existsSync(source)).toBe(true);
    expect(readFileSync(source, 'utf8').trim()).toBe('scssoftwares.com');
  });

  it('declares the sitemap in robots.txt and blocks only the private areas', () => {
    const robots = readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /ai-consultation/');
    // Left crawlable on purpose so their noindex meta tag can be read.
    expect(robots).not.toContain('Disallow: /project-analysis/result');
    expect(robots).not.toContain('Disallow: /ApplicationForm');
  });
});
