/**
 * Build-time render entry.
 *
 * `scripts/prerender.mjs` loads this module through Vite's SSR pipeline and
 * calls `render()` once per route in the SEO registry, so the deployed site
 * ships a physical HTML file per stable public route: real copy, real title,
 * real description, real canonical and real robots directive, all present
 * before a single byte of JavaScript executes.
 *
 * It mounts the same `SiteRoutes` tree the browser mounts, under StaticRouter
 * instead of BrowserRouter. Client-only chrome (toasters, the floating Buddy
 * widget, scroll controls) is intentionally left out: it touches browser APIs,
 * contributes nothing a crawler can read, and the browser adds it on hydration.
 */

import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppProviders, SiteRoutes } from '../App';
import { preloadRoute } from '../routes/contentRoutes';
import { buildHeadTags, serializeHeadTags } from '../seo/head';
import { matchRouteSeo } from '../seo/registry';

export interface RenderResult {
  /** Markup for the `#root` container. */
  html: string;
  /** Serialized `<head>` block for this route. */
  head: string;
}

/**
 * Render one route to complete markup.
 *
 * Async because the `/services/*` and `/locations/*` pages are route-level
 * chunks: `preloadRoute` resolves the module for this URL and puts it in the
 * loadable cache, after which `renderToString` — which is synchronous and
 * cannot wait for a Suspense boundary — renders the real page rather than the
 * fallback. Any other URL resolves immediately.
 *
 * A chunk that fails to load throws here, which fails that route in
 * `scripts/prerender.mjs` and therefore fails the build. That is deliberate: a
 * silently empty page is the one outcome this must never produce.
 */
export async function render(url: string): Promise<RenderResult> {
  const route = matchRouteSeo(url);
  await preloadRoute(url);
  const html = renderToString(
    <AppProviders>
      <StaticRouter location={url}>
        <SiteRoutes />
      </StaticRouter>
    </AppProviders>,
  );
  return { html, head: serializeHeadTags(buildHeadTags(route)) };
}

/** Head-only render, for pages with no app markup (404 shell, redirect stubs). */
export function renderHead(url: string): string {
  return serializeHeadTags(buildHeadTags(matchRouteSeo(url)));
}

export { ALL_ROUTES, NOT_FOUND_SEO, indexableRoutes, prerenderRoutes } from '../seo/registry';
export { SITE_ORIGIN, canonicalUrl } from '../seo/site';
