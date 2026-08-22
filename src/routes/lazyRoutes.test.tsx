// Contracts for the Phase 3B route-level code splitting.
//
// Splitting `/services/*` and `/locations/*` into route chunks is only safe if
// three things stay true, and each one is checked here:
//
//   1. the split table, the router and the SEO registry describe the same set
//      of routes — a page can never be reachable, indexed or prerendered
//      without the other two knowing about it;
//   2. a preloaded route renders to the complete page synchronously, which is
//      what lets the build-time prerenderer keep emitting full HTML from
//      `renderToString`;
//   3. an un-preloaded route renders the fallback — proving the check in (2)
//      and in `verify-dist.mjs` is actually capable of failing, rather than
//      passing because the fallback marker never appears anywhere.
//
// It also pins the rule that keeps the split working: no module the browser
// loads may import the eager `content/*/all.ts` barrels, because those pull
// every page body back into the main bundle.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Suspense, type ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ContentRoute from './ContentRoute';
import RouteFallback from './RouteFallback';
import {
  CONTENT_ROUTES,
  LOCATION_ROUTES,
  SERVICE_ROUTES,
  isRouteLoaded,
  preloadRoute,
} from './contentRoutes';
import { loadable } from './loadable';
import { ALL_ROUTES } from '@/seo/registry';
import { SERVICES_HUB_PATH, SERVICE_META } from '@/content/services';
import { LOCATIONS_HUB_PATH, LOCATION_META } from '@/content/locations';

const APP_SOURCE = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

/** Every `route="…"` ContentRoute the router mounts. */
const routerContentPaths = (): string[] =>
  [...APP_SOURCE.matchAll(/<ContentRoute route="([^"]+)"/g)].map((match) => match[1]);

const render = (path: string) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ContentRoute route={path} />
    </MemoryRouter>,
  );

describe('split content routes', () => {
  it('splits the services hub, every service page, the locations hub and every market', () => {
    expect(Object.keys(SERVICE_ROUTES).sort()).toEqual(
      [SERVICES_HUB_PATH, ...SERVICE_META.map((service) => service.path)].sort(),
    );
    expect(Object.keys(LOCATION_ROUTES).sort()).toEqual(
      [LOCATIONS_HUB_PATH, ...LOCATION_META.map((location) => location.path)].sort(),
    );
    expect(Object.keys(CONTENT_ROUTES)).toHaveLength(
      SERVICE_META.length + LOCATION_META.length + 2,
    );
  });

  it('mounts exactly those paths in the router, and no others', () => {
    expect(routerContentPaths().sort()).toEqual(Object.keys(CONTENT_ROUTES).sort());
  });

  it('keeps every split route in the SEO registry, prerendered and indexable', () => {
    const registry = new Map(ALL_ROUTES.map((route) => [route.canonicalPath, route]));
    for (const path of Object.keys(CONTENT_ROUTES)) {
      const route = registry.get(path);
      expect(route, `${path} has no SEO registry entry`).toBeDefined();
      expect(route!.prerender, `${path} is not prerendered`).toBe(true);
      expect(route!.indexability, `${path} is not indexable`).toBe('indexable');
    }
  });

  it('resolves every URL form GitHub Pages serves to the same entry', async () => {
    // The site is deployed as physical files, so a visitor can arrive on any of
    // these three. All must preload, or the prerendered page gets replaced by a
    // loading state on that visitor's first paint.
    for (const form of ['/locations/canada/', '/locations/canada.html', '/locations/canada/index.html']) {
      expect(isRouteLoaded(form), form).toBe(isRouteLoaded('/locations/canada'));
    }
    await preloadRoute('/locations/canada/');
    expect(isRouteLoaded('/locations/canada')).toBe(true);
    expect(isRouteLoaded('/locations/canada.html')).toBe(true);
    expect(isRouteLoaded('/locations/canada?utm_source=x')).toBe(true);
  });

  it('ignores a path that is not split, without throwing', async () => {
    await expect(preloadRoute('/about')).resolves.toBeUndefined();
    expect(isRouteLoaded('/about')).toBe(false);
  });
});

describe('prerender completeness', () => {
  it('renders a preloaded route to the whole page, with no Suspense fallback', async () => {
    // This is precisely what `scripts/prerender.mjs` does: preload, then render
    // synchronously. If this ever produced the fallback, every generated
    // /services and /locations HTML file would be an empty shell.
    for (const path of ['/services/saas-development', '/locations/singapore', '/locations', '/services']) {
      await preloadRoute(path);
      const html = render(path);
      expect(html, `${path} rendered the loading fallback`).not.toContain('data-route-fallback');
      expect(html.match(/<h1[\s>]/g) ?? [], `${path} has no H1`).toHaveLength(1);
      expect(html, `${path} has no main landmark`).toContain('id="main-content"');
      expect(html, `${path} has no breadcrumb`).toContain('aria-label="Breadcrumb"');
      for (const cta of ['/project-analysis', '/schedule-call', '/contact']) {
        expect(html, `${path} has no link to ${cta}`).toContain(`href="${cta}"`);
      }
      const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
      expect(words, `${path} rendered only ${words} words`).toBeGreaterThan(400);
    }
  });

  it('renders the fallback when a route chunk has not arrived', () => {
    // The negative control for the assertion above and for the dist scan: a
    // route chunk that is genuinely missing produces a marked, detectable
    // fallback rather than silently empty markup. Without this, "no fallback in
    // the output" could pass simply because the marker never renders at all.
    const stalled = loadable(() => new Promise<{ default: ComponentType }>(() => {}));
    const Stalled = stalled.Component;
    const html = renderToStaticMarkup(
      <Suspense fallback={<RouteFallback />}>
        <Stalled />
      </Suspense>,
    );
    expect(html).toContain('data-route-fallback');
    expect(stalled.isLoaded()).toBe(false);
  });
});

describe('the split is not undone by an import', () => {
  const SOURCE_FILES = (() => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
      }
    };
    walk(join(process.cwd(), 'src'));
    return files.map((file) => [file.replace(`${process.cwd()}/`, ''), readFileSync(file, 'utf8')] as const);
  })();

  it('never imports the eager content barrels outside the barrels themselves', () => {
    // `content/services/all.ts` and `content/locations/all.ts` import every page
    // body. Anything the browser loads that imports them drags the whole of the
    // service and regional copy back into the main bundle, silently undoing the
    // split — so only tests may use them.
    for (const [file, source] of SOURCE_FILES) {
      if (file.endsWith('content/services/all.ts') || file.endsWith('content/locations/all.ts')) continue;
      for (const barrel of ["@/content/services/all", "@/content/locations/all", "./all"]) {
        expect(
          source.includes(`from '${barrel}'`),
          `${file} imports the eager barrel ${barrel}`,
        ).toBe(false);
      }
    }
  });

  it('keeps the SEO registry on the metadata manifests only', () => {
    const registry = readFileSync(join(process.cwd(), 'src/seo/registry.ts'), 'utf8');
    // The registry may read the manifests; importing a page body module would
    // put that page's whole copy in the main bundle for the sake of a title.
    expect(registry).toContain("from '@/content/services'");
    expect(registry).toContain("from '@/content/locations'");
    expect(registry).not.toMatch(/from '@\/content\/(services|locations)\/(?!types)/);
  });

  it('keeps the lightweight barrels free of body and hub copy', () => {
    for (const barrel of ['src/content/services/index.ts', 'src/content/locations/index.ts']) {
      const source = readFileSync(join(process.cwd(), barrel), 'utf8');
      expect(source, `${barrel} imports the hub copy`).not.toMatch(/from '\.\/hub'/);
      expect(source, `${barrel} imports the eager barrel`).not.toMatch(/from '\.\/all'/);
    }
  });
});
