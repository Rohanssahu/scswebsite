#!/usr/bin/env node
/**
 * Build-time prerender for GitHub Pages.
 *
 * Runs after `vite build` (see the `build` script) and, for every route the SEO
 * registry marks `prerender: true`:
 *
 *   1. server-renders the real React page,
 *   2. injects it into the built `dist/index.html` shell,
 *   3. replaces the shell's generated `<head>` block with that route's tags,
 *   4. writes the result to disk as a physical HTML file.
 *
 * It then writes the SPA fallback (`dist/404.html`) for the dynamic routes, and
 * `dist/sitemap.xml` from the routes that are indexable AND actually rendered.
 *
 * Why two files per route: GitHub Pages resolves `/about` from `about.html` and
 * `/about/` from `about/index.html`. Emitting both means the URL in the sitemap
 * answers 200 either way instead of relying on a 301 between the two forms.
 * Both copies carry the same single canonical, so there is no duplicate URL to
 * consolidate.
 */

import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const HEAD_START = '<!-- SEO_HEAD:START';
const HEAD_END = '<!-- SEO_HEAD:END -->';
const APP_MARKER = '<!--app-html-->';

/**
 * A few modules read `localStorage` while a component is constructing (the
 * project-analysis draft store is the main one). Node has no such global, so a
 * throwaway in-memory implementation is installed for the render.
 *
 * Deliberately narrow: `window` and `document` stay undefined, which is what
 * the app's own `typeof window === 'undefined'` guards check for.
 */
function installStorageShim() {
  const make = () => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
      setItem: (k, v) => void map.set(String(k), String(v)),
      removeItem: (k) => void map.delete(String(k)),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
    };
  };
  for (const name of ['localStorage', 'sessionStorage']) {
    if (typeof globalThis[name] === 'undefined') {
      Object.defineProperty(globalThis, name, { value: make(), configurable: true });
    }
  }
}

/** `/` -> ['index.html']; `/about` -> ['about.html', 'about/index.html'] */
function outputPathsFor(canonicalPath) {
  if (canonicalPath === '/') return ['index.html'];
  const clean = canonicalPath.replace(/^\/+/, '');
  return [`${clean}.html`, path.posix.join(clean, 'index.html')];
}

function applyTemplate(template, { head, html }) {
  const start = template.indexOf(HEAD_START);
  const end = template.indexOf(HEAD_END);
  if (start === -1 || end === -1) {
    throw new Error('index.html is missing the SEO_HEAD markers — cannot inject per-route metadata.');
  }
  const withHead =
    template.slice(0, start) + head + template.slice(end + HEAD_END.length);
  if (!withHead.includes(APP_MARKER)) {
    throw new Error(`index.html is missing the ${APP_MARKER} marker — cannot inject page markup.`);
  }
  return withHead.replace(APP_MARKER, html);
}

async function writeHtml(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, 'utf8');
}

/**
 * A legacy path kept alive only to forward to its replacement. It answers 200
 * with a canonical pointing at the destination, a `noindex,follow` directive, a
 * meta refresh for no-JS clients and an immediate script redirect otherwise.
 */
function redirectDocument(route, head) {
  const target = route.redirectTo;
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    ${head}
  </head>
  <body>
    <p>This page has moved to <a href="${target}">${target}</a>.</p>
    <script>window.location.replace(${JSON.stringify(target)} + window.location.search + window.location.hash);</script>
  </body>
</html>
`;
}

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

function sitemapXml(routes) {
  const entries = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${route.canonical}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${route.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NS}">\n${entries}\n</urlset>\n`;
}

async function main() {
  installStorageShim();

  const template = await fs.readFile(path.join(DIST, 'index.html'), 'utf8').catch(() => {
    throw new Error('dist/index.html not found — run `vite build` before prerendering.');
  });

  const vite = await createServer({
    root: ROOT,
    logLevel: 'warn',
    appType: 'custom',
    // No HMR and no background dependency discovery: this server exists only to
    // transform modules for a handful of synchronous renders, and the esbuild
    // scan would otherwise still be running when we close it.
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
  });

  const rendered = [];
  const failed = [];

  try {
    const entry = await vite.ssrLoadModule('/src/prerender/entry-server.tsx');
    const routes = entry.prerenderRoutes();

    for (const route of routes) {
      const url = route.canonicalPath;
      try {
        const document =
          route.indexability === 'redirect'
            ? redirectDocument(route, entry.renderHead(url))
            : applyTemplate(template, entry.render(url));

        for (const outputPath of outputPathsFor(url)) {
          await writeHtml(outputPath, document);
        }
        rendered.push(route);
        console.log(`  ✓ ${url.padEnd(28)} ${outputPathsFor(url).join('  ')}`);
      } catch (error) {
        failed.push({ url, error });
        console.error(`  ✗ ${url} — ${error.message}`);
      }
    }

    // ---- SPA fallback for the dynamic and unknown routes -------------------
    // GitHub Pages serves 404.html *at the requested URL* without redirecting,
    // so `window.location.pathname` is already correct when the bundle boots and
    // React Router resolves the real route. No sessionStorage redirect dance is
    // needed. Its head is the not-found record: `noindex,nofollow`, which is
    // exactly right for unknown paths, private consultation rooms and /admin.
    const notFoundHead = entry.renderHead('/__prerender_unknown__');
    await writeHtml('404.html', applyTemplate(template, { head: notFoundHead, html: '' }));
    console.log('  ✓ 404.html (SPA fallback, noindex,nofollow)');

    // ---- sitemap: indexable AND successfully prerendered -------------------
    const renderedPaths = new Set(rendered.map((route) => route.canonicalPath));
    const sitemapRoutes = entry
      .indexableRoutes()
      .filter((route) => renderedPaths.has(route.canonicalPath));
    await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemapXml(sitemapRoutes), 'utf8');
    console.log(`  ✓ sitemap.xml (${sitemapRoutes.length} URLs)`);

    // ---- CNAME: the custom domain must survive every build ----------------
    const cnamePath = path.join(DIST, 'CNAME');
    const expected = 'scssoftwares.com';
    const actual = await fs.readFile(cnamePath, 'utf8').catch(() => null);
    if (actual === null) {
      await fs.writeFile(cnamePath, `${expected}\n`, 'utf8');
      console.log('  ✓ CNAME written (was missing from dist)');
    } else if (actual.trim() !== expected) {
      throw new Error(`dist/CNAME says "${actual.trim()}" — expected "${expected}".`);
    } else {
      console.log('  ✓ CNAME preserved');
    }
  } finally {
    await vite.close();
  }

  if (failed.length > 0) {
    console.error(`\nPrerender failed for ${failed.length} route(s):`);
    for (const { url, error } of failed) console.error(`  ${url}\n    ${error.stack ?? error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nPrerendered ${rendered.length} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
