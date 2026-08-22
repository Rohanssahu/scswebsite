#!/usr/bin/env node
/**
 * Post-build gate for `dist/`.
 *
 * Runs five scans and two live checks, and exits non-zero on any failure:
 *
 *   1. broken internal links   — every internal href resolves to a real file
 *   2. missing local assets    — every src/href asset exists in dist
 *   3. duplicate metadata      — one title and one tag per key, per document
 *   4. secrets                 — no service-role keys or private keys shipped
 *   5. host discipline         — no www / github.io / localhost URLs
 *   6. static-server check     — serve dist with GitHub Pages path resolution
 *                                and GET every generated route, asserting the
 *                                status, title, canonical and robots directive
 *   7. service-page check      — the /services hub and every /services/* page:
 *                                physical HTML with real copy, unique
 *                                metadata, correct canonical, sitemap
 *                                membership, a visible breadcrumb, matching
 *                                Service and BreadcrumbList JSON-LD, the three
 *                                CTAs — plus every old /gig URL still
 *                                forwarding as noindex and absent from the
 *                                sitemap
 *
 * Usage: node scripts/verify-dist.mjs
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://scssoftwares.com';

const failures = [];
const notes = [];
const fail = (scan, message) => failures.push(`[${scan}] ${message}`);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function walk(dir, filter, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(DIST, file);

/** GitHub Pages path resolution: exact file, then `.html`, then `/index.html`. */
function resolveDistPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const trimmed = clean.replace(/^\/+/, '');
  const candidates = trimmed === ''
    ? ['index.html']
    : [trimmed, `${trimmed}.html`, path.posix.join(trimmed, 'index.html')];
  for (const candidate of candidates) {
    const full = path.join(DIST, candidate);
    if (fss.existsSync(full) && fss.statSync(full).isFile()) return full;
  }
  return null;
}

/** Decode the handful of entities the renderer emits, for text comparisons. */
const decodeEntities = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

// ---------------------------------------------------------------------------
// 1-5: static scans
// ---------------------------------------------------------------------------

async function scanDocuments() {
  const htmlFiles = await walk(DIST, (f) => f.endsWith('.html'));
  if (htmlFiles.length === 0) fail('dist', 'no HTML files found — did the build run?');

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8');
    const name = rel(file);

    // --- 3. duplicate metadata ---------------------------------------------
    const titles = html.match(/<title>/g) ?? [];
    if (titles.length !== 1) fail('duplicate-metadata', `${name}: ${titles.length} <title> tags`);

    const keys = [
      ...[...html.matchAll(/<meta\s+(?:name|property)="([^"]+)"/g)].map((m) => `meta:${m[1]}`),
      ...[...html.matchAll(/<link\s+rel="(canonical)"/g)].map((m) => `link:${m[1]}`),
    ];
    const seen = new Map();
    for (const key of keys) seen.set(key, (seen.get(key) ?? 0) + 1);
    for (const [key, count] of seen) {
      if (count > 1) fail('duplicate-metadata', `${name}: ${count}x ${key}`);
    }

    // --- 5. host discipline -------------------------------------------------
    for (const pattern of [/https?:\/\/www\.scssoftwares\.com/, /github\.io/, /localhost:\d+/, /127\.0\.0\.1/]) {
      const hit = html.match(pattern);
      if (hit) fail('host-discipline', `${name}: contains ${hit[0]}`);
    }

    // --- 1. broken internal links ------------------------------------------
    for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
      let href = match[1];
      if (href.startsWith(ORIGIN)) href = href.slice(ORIGIN.length) || '/';
      if (!href.startsWith('/') || href.startsWith('//')) continue; // external / anchor
      if (!resolveDistPath(href)) fail('broken-links', `${name}: href="${match[1]}" does not resolve`);
    }

    // --- 2. missing local assets -------------------------------------------
    for (const match of html.matchAll(/\ssrc="([^"]+)"/g)) {
      const src = match[1];
      if (!src.startsWith('/') || src.startsWith('//')) continue;
      if (!resolveDistPath(src)) fail('missing-assets', `${name}: src="${src}" not found in dist`);
    }
  }
  notes.push(`scanned ${htmlFiles.length} HTML documents`);
}

async function scanSecrets() {
  const files = await walk(DIST, () => true);
  // Patterns for material that must never reach a browser bundle. The public
  // Supabase anon key and the Turnstile SITE key are expected and allowed.
  const patterns = [
    [/service_role/i, 'service_role reference'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'PEM private key'],
    [/SUPABASE_SERVICE_ROLE/i, 'service-role env name'],
    [/TURNSTILE_SECRET/i, 'Turnstile secret env name'],
    [/\bsk-[A-Za-z0-9]{20,}/, 'OpenAI-style secret key'],
    [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
    [/\bAPI[a-zA-Z0-9]{10,}\b(?=[^A-Za-z0-9])/, null], // too noisy; skipped below
    [/LIVEKIT_API_SECRET/i, 'LiveKit API secret env name'],
  ].filter(([, label]) => label);

  for (const file of files) {
    const buffer = await fs.readFile(file);
    if (buffer.includes(0)) continue; // binary asset
    const text = buffer.toString('utf8');
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) fail('secrets', `${rel(file)}: ${label}`);
    }
  }
  notes.push(`secret-scanned ${files.length} files`);
}

async function scanSitemapAndRobots() {
  const sitemapPath = path.join(DIST, 'sitemap.xml');
  if (!fss.existsSync(sitemapPath)) {
    fail('sitemap', 'dist/sitemap.xml is missing');
    return [];
  }
  const xml = await fs.readFile(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) fail('sitemap', 'sitemap contains no <loc> entries');

  for (const loc of locs) {
    if (!loc.startsWith(`${ORIGIN}/`)) fail('sitemap', `${loc} is not on ${ORIGIN}`);
    const urlPath = loc.slice(ORIGIN.length) || '/';
    const file = resolveDistPath(urlPath);
    if (!file) {
      fail('sitemap', `${loc} has no prerendered file in dist`);
      continue;
    }
    const html = await fs.readFile(file, 'utf8');
    const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1];
    if (robots !== 'index,follow') fail('sitemap', `${loc} is in the sitemap but robots="${robots}"`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical !== loc) fail('sitemap', `${loc} declares canonical "${canonical}"`);
  }

  const robotsPath = path.join(DIST, 'robots.txt');
  if (!fss.existsSync(robotsPath)) fail('robots', 'dist/robots.txt is missing');
  else {
    const robots = await fs.readFile(robotsPath, 'utf8');
    if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
      fail('robots', 'robots.txt does not declare the sitemap URL');
    }
  }

  const cnamePath = path.join(DIST, 'CNAME');
  if (!fss.existsSync(cnamePath)) fail('cname', 'dist/CNAME is missing');
  else {
    const cname = (await fs.readFile(cnamePath, 'utf8')).trim();
    if (cname !== 'scssoftwares.com') fail('cname', `dist/CNAME is "${cname}"`);
  }

  notes.push(`sitemap declares ${locs.length} URLs`);
  return locs;
}

// ---------------------------------------------------------------------------
// 6: live static server check
// ---------------------------------------------------------------------------

function startServer() {
  const server = http.createServer((req, res) => {
    const file = resolveDistPath(req.url ?? '/');
    if (file) {
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' });
      fss.createReadStream(file).pipe(res);
      return;
    }
    // GitHub Pages behaviour: serve 404.html *at the requested URL*, status 404.
    const fallback = path.join(DIST, '404.html');
    if (fss.existsSync(fallback)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fss.createReadStream(fallback).pipe(res);
      return;
    }
    res.writeHead(404).end('not found');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function serveAndCheck() {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const meta = (html, name) => html.match(new RegExp(`<meta name="${name}" content="([^"]+)"`))?.[1];

  try {
    const htmlFiles = await walk(DIST, (f) => f.endsWith('.html'));
    // Every generated document, reached through its public URL form(s).
    const urls = new Set(['/']);
    for (const file of htmlFiles) {
      const name = rel(file).replace(/\\/g, '/');
      if (name === '404.html' || name === 'scs-agent-widget.html') continue;
      if (name === 'index.html') continue;
      urls.add(`/${name.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`);
    }

    for (const url of [...urls].sort()) {
      const response = await fetch(`${base}${url}`);
      const html = await response.text();
      if (response.status !== 200) {
        fail('static-server', `GET ${url} -> ${response.status}`);
        continue;
      }
      if (!/<title>[^<]+<\/title>/.test(html)) fail('static-server', `GET ${url}: no <title>`);
      if (!meta(html, 'description')) fail('static-server', `GET ${url}: no meta description`);
      if (!meta(html, 'robots')) fail('static-server', `GET ${url}: no meta robots`);
      // The landmark is required on any page a crawler may index. The
      // session-scoped result page prerenders to its Suspense fallback (its
      // content depends on the visitor's own stored analysis), and a redirect
      // stub has no page body at all.
      const indexable = meta(html, 'robots') === 'index,follow';
      if (indexable && !html.includes('id="main-content"')) {
        fail('static-server', `GET ${url}: no <main id="main-content"> landmark`);
      }
      if (indexable && !/<h1[\s>]/.test(html)) {
        fail('static-server', `GET ${url}: no <h1> in the prerendered markup`);
      }
    }
    notes.push(`served and checked ${urls.size} routes`);

    // Dynamic routes must fall through to the noindex SPA shell, not a real page.
    for (const url of ['/ai-consultation/ABC123', '/admin', '/admin/leads/42', '/no-such-page']) {
      const response = await fetch(`${base}${url}`);
      const html = await response.text();
      if (response.status !== 404) {
        fail('spa-fallback', `GET ${url} -> ${response.status} (expected the 404.html fallback)`);
      }
      if (meta(html, 'robots') !== 'noindex,nofollow') {
        fail('spa-fallback', `GET ${url}: robots="${meta(html, 'robots')}"`);
      }
      if (!html.includes('<script type="module"')) {
        fail('spa-fallback', `GET ${url}: fallback does not load the app bundle`);
      }
    }
    notes.push('verified the SPA fallback for 4 dynamic/unknown paths');
  } finally {
    server.close();
  }
}

// ---------------------------------------------------------------------------
// 7: the Phase 2A service pages, served through the static server
// ---------------------------------------------------------------------------

/** The hub, then every canonical service URL it lists. */
const SERVICES_HUB_PATH = '/services';

const SERVICE_PATHS = [
  '/services/custom-software-development',
  '/services/mobile-app-development',
  '/services/web-application-development',
  '/services/saas-development',
  '/services/software-modernization',
  '/services/ai-development',
  '/services/machine-learning-development',
  '/services/ai-voice-agent-development',
  '/services/ai-video-consultation-agents',
  '/services/conversational-ai-development',
  '/services/ai-automation-integration',
  '/services/ui-ux-design',
  '/services/cloud-solutions',
  '/services/devops-engineering',
  '/services/digital-marketing',
];

/** Claims these pages must never make. Checked against the rendered text. */
const FABRICATION_PATTERNS = [
  [/\bguarantee(?:d|s)?\b/i, 'a guarantee'],
  [/\b\d{2,}\+? (?:happy )?(?:clients|customers|projects)\b/i, 'a client or project count'],
  [/\b\d+% (?:satisfaction|success|accuracy|uptime)\b/i, 'a performance percentage'],
  [/\baward[- ]winning\b/i, 'an award'],
  [/\bISO ?\d{4,}[- ]certified\b/i, 'a certification'],
  [/\b\d+\+ years\b/i, 'a years-in-business claim'],
  [/\boffices? in (?:the )?(?:USA|UK|Canada|Australia|Germany|Netherlands|Singapore|UAE|Turkey)\b/i, 'a foreign office'],
  [/\bbest AI (?:development )?(?:company|agency)\b/i, 'a best-company claim'],
  // Phase 2C honesty sweep: superlatives and credentials we cannot support.
  [/\bleading (?:software|AI|IT|digital|design|cloud|DevOps|marketing)\b/i, 'a "leading" claim'],
  [/\bindustry[- ]leading\b/i, 'an industry-leading claim'],
  [/\bthe best (?:software|AI|design|cloud|DevOps|marketing|development) (?:company|agency|team|partner)\b/i, 'a best-company claim'],
  [/\bbest[- ]in[- ]class\b/i, 'a best-in-class claim'],
  [/\bnumber one\b/i, 'a number-one claim'],
  [/\bno\.? ?1\b/i, 'a number-one claim'],
  [/\bcertified partner\b/i, 'a certified-partner claim'],
  [/\b(?:AWS|Azure|Google Cloud|Google|Meta|Facebook) (?:certified|partner)\b/i, 'a platform partnership claim'],
  [/\blocal offices?\b/i, 'a local office'],
  [/\bguaranteed (?:rankings?|results?|leads?|traffic|revenue|conversions?)\b/i, 'a guaranteed outcome'],
];

/** Text that appears on a page only if a disclaimer was removed. */
const REQUIRED_DISCLAIMERS = {
  '/services/ai-voice-agent-development': [/we do not offer telephone calling/i],
  '/services/ai-video-consultation-agents': [/not a human employee/i, /preliminary/i],
  '/services/machine-learning-development': [/bounded by the data available/i],
  '/services/ui-ux-design': [/do not promise a conversion/i],
  '/services/cloud-solutions': [/do not guarantee zero downtime/i, /no cloud provider partner status/i],
  '/services/devops-engineering': [/do not guarantee uninterrupted availability/i],
  '/services/digital-marketing': [
    /do not guarantee rankings, traffic, leads or revenue/i,
    /do not manage advertising accounts/i,
    /supporting service/i,
  ],
};

/** Every retired `/gig/*` URL and the canonical page that replaced it. */
const LEGACY_SERVICE_FORWARDS = [
  ['/gig/web-development', '/services/web-application-development'],
  ['/gig/mobile-development', '/services/mobile-app-development'],
  ['/gig/ui-ux-design', '/services/ui-ux-design'],
  ['/gig/cloud-solutions', '/services/cloud-solutions'],
  ['/gig/devops-services', '/services/devops-engineering'],
  ['/gig/digital-marketing', '/services/digital-marketing'],
];

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((match) => {
    const raw = match[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&');
    try {
      return [JSON.parse(raw)];
    } catch {
      fail('structured-data', `unparseable JSON-LD block: ${raw.slice(0, 80)}`);
      return [];
    }
  });
}

async function checkServicePages(sitemapLocs) {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const titles = new Map();
  const descriptions = new Map();

  try {
    for (const urlPath of [SERVICES_HUB_PATH, ...SERVICE_PATHS]) {
      const isHub = urlPath === SERVICES_HUB_PATH;
      const response = await fetch(`${base}${urlPath}`);
      const html = await response.text();
      if (response.status !== 200) {
        fail('service-pages', `GET ${urlPath} -> ${response.status}`);
        continue;
      }

      // --- physical HTML with meaningful copy before JavaScript ------------
      const body = html.split('<div id="root">')[1]?.split('<script type="module"')[0] ?? '';
      const bodyText = decodeEntities(body.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      const words = bodyText.split(' ').length;
      // The hub is an index page, so it carries less copy than a service page.
      const minimumWords = isHub ? 400 : 800;
      if (words < minimumWords) fail('service-pages', `${urlPath}: only ${words} words of prerendered copy`);

      // --- no fabricated claims --------------------------------------------
      for (const [pattern, label] of FABRICATION_PATTERNS) {
        const hit = bodyText.match(pattern);
        if (!hit) continue;
        // A disclaimer may use the word; a claim may not. Require a negation
        // close in front of it.
        const index = bodyText.indexOf(hit[0]);
        const context = bodyText.slice(Math.max(0, index - 140), index);
        if (!/\b(?:no|not|never|cannot|without|nor|do not|does not|will not)\b/i.test(context)) {
          fail('fabricated-claims', `${urlPath}: ${label} — "${hit[0]}"`);
        }
      }
      for (const pattern of REQUIRED_DISCLAIMERS[urlPath] ?? []) {
        if (!pattern.test(bodyText)) fail('fabricated-claims', `${urlPath}: missing disclaimer ${pattern}`);
      }
      const h1s = html.match(/<h1[\s>]/g) ?? [];
      if (h1s.length !== 1) fail('service-pages', `${urlPath}: ${h1s.length} <h1> elements`);

      // --- unique metadata, correct canonical, indexable -------------------
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
      const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? '';
      if (titles.has(title)) fail('service-pages', `${urlPath}: title duplicates ${titles.get(title)}`);
      titles.set(title, urlPath);
      if (descriptions.has(description)) {
        fail('service-pages', `${urlPath}: description duplicates ${descriptions.get(description)}`);
      }
      descriptions.set(description, urlPath);
      if (canonical !== `${ORIGIN}${urlPath}`) fail('service-pages', `${urlPath}: canonical is "${canonical}"`);
      if (robots !== 'index,follow') fail('service-pages', `${urlPath}: robots="${robots}"`);
      for (const key of ['og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description']) {
        if (!new RegExp(`<meta (?:name|property)="${key}" content="[^"]+"`).test(html)) {
          fail('service-pages', `${urlPath}: missing ${key}`);
        }
      }

      // --- sitemap ----------------------------------------------------------
      if (!sitemapLocs.includes(`${ORIGIN}${urlPath}`)) {
        fail('service-pages', `${urlPath} is missing from sitemap.xml`);
      }

      // --- visible breadcrumb ----------------------------------------------
      if (!html.includes('aria-label="Breadcrumb"')) fail('service-pages', `${urlPath}: no visible breadcrumb`);
      if (!html.includes('aria-current="page"')) fail('service-pages', `${urlPath}: breadcrumb marks no current page`);

      // --- Service + BreadcrumbList structured data, matching the page ------
      const blocks = jsonLdBlocks(html);
      const service = blocks.find((node) => node['@type'] === 'Service');
      const breadcrumb = blocks.find((node) => node['@type'] === 'BreadcrumbList');
      if (isHub) {
        // The hub describes no single service, so it must carry no Service node.
        if (service) fail('structured-data', `${urlPath}: hub must not carry a Service node`);
      } else if (!service) {
        fail('structured-data', `${urlPath}: no Service JSON-LD`);
      } else if (service.url !== canonical) {
        fail('structured-data', `${urlPath}: Service.url is "${service.url}"`);
      }
      if (!breadcrumb) fail('structured-data', `${urlPath}: no BreadcrumbList JSON-LD`);
      else {
        const items = breadcrumb.itemListElement ?? [];
        if (items.length < 2) fail('structured-data', `${urlPath}: BreadcrumbList has ${items.length} item(s)`);
        if (items.at(-1)?.item !== canonical) {
          fail('structured-data', `${urlPath}: BreadcrumbList does not end on the canonical URL`);
        }
        // Every crumb name must be readable on the page a visitor sees. The
        // markup carries entity-encoded text ("AI Automation &amp; ..."), so
        // decode before comparing against the JSON-LD name.
        const text = decodeEntities(html.replace(/<[^>]+>/g, ' '));
        for (const item of items) {
          if (!text.includes(item.name)) {
            fail('structured-data', `${urlPath}: breadcrumb "${item.name}" is not visible on the page`);
          }
        }
      }

      // --- the three required calls to action -------------------------------
      for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
        if (!html.includes(`href="${target}"`)) fail('service-pages', `${urlPath}: no link to ${target}`);
      }

      // --- hub linkage -------------------------------------------------------
      if (isHub) {
        for (const servicePath of SERVICE_PATHS) {
          if (!html.includes(`href="${servicePath}"`)) fail('service-pages', `${urlPath}: no link to ${servicePath}`);
        }
      } else if (!html.includes(`href="${SERVICES_HUB_PATH}"`)) {
        fail('service-pages', `${urlPath}: no link back to the services hub`);
      }
    }

    // --- old gig URLs still answer, still noindex, still forward ------------
    for (const [from, to] of LEGACY_SERVICE_FORWARDS) {
      const response = await fetch(`${base}${from}`);
      const html = await response.text();
      if (response.status !== 200) fail('legacy-forwards', `GET ${from} -> ${response.status}`);
      const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1];
      if (robots !== 'noindex,follow') fail('legacy-forwards', `${from}: robots="${robots}"`);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      if (canonical !== `${ORIGIN}${to}`) fail('legacy-forwards', `${from}: canonical is "${canonical}"`);
      if (!html.includes(`content="0; url=${to}"`)) fail('legacy-forwards', `${from}: no meta refresh to ${to}`);
      if (!html.includes('window.location.replace')) fail('legacy-forwards', `${from}: no script redirect`);
      if (sitemapLocs.includes(`${ORIGIN}${from}`)) fail('legacy-forwards', `${from} is still in the sitemap`);
      // The destination must be a real page, not another stub.
      const target = resolveDistPath(to);
      if (!target) fail('legacy-forwards', `${from} forwards to ${to}, which has no file in dist`);
    }

    // --- nothing anywhere in the build links to a retired /gig/ URL ---------
    const htmlFiles = await walk(DIST, (file) => file.endsWith('.html'));
    for (const file of htmlFiles) {
      const html = await fs.readFile(file, 'utf8');
      const name = rel(file).replace(/\\/g, '/');
      // A stub is allowed to live at /gig/… ; it just may not link to one.
      if (name.startsWith('gig/') || /^gig[^/]*\.html$/.test(name)) continue;
      for (const match of html.matchAll(/\shref="(\/gig\/[^"]*)"/g)) {
        fail('legacy-routes', `${name}: active link to retired URL ${match[1]}`);
      }
    }

    notes.push(
      `verified the services hub, ${SERVICE_PATHS.length} service pages and ${LEGACY_SERVICE_FORWARDS.length} legacy forwards`,
    );
  } finally {
    server.close();
  }
}

// ---------------------------------------------------------------------------

async function main() {
  if (!fss.existsSync(DIST)) {
    console.error('dist/ does not exist — run `npm run build` first.');
    process.exitCode = 1;
    return;
  }
  await scanDocuments();
  await scanSecrets();
  const sitemapLocs = await scanSitemapAndRobots();
  await serveAndCheck();
  await checkServicePages(sitemapLocs);

  for (const note of notes) console.log(`  · ${note}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    '\n✓ dist verified: links, assets, metadata, secrets, hosts, sitemap, CNAME, live routes, service pages, legacy forwards.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
