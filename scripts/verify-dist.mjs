#!/usr/bin/env node
/**
 * Post-build gate for `dist/`.
 *
 * Runs the static scans, the live static-server checks and the page-contract
 * checks below, and exits non-zero on any failure:
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
 *   8. location-page check     — the /locations hub and every regional page:
 *                                physical HTML with real copy, unique metadata,
 *                                self-canonical, index,follow, sitemap
 *                                membership, a visible breadcrumb, matching
 *                                Service (areaServed Country) and
 *                                BreadcrumbList JSON-LD, links to the real
 *                                global service pages, the three CTAs — plus a
 *                                fabricated-location scan that fails the build
 *                                on any local office / entity / registration /
 *                                phone / certification / guaranteed-coverage
 *                                claim in any of the nine markets, and requires
 *                                the India + remote + no-local-office
 *                                disclosure as visible copy
 *   9. site-wide honesty scan  — the same unsupported-claim discipline applied
 *                                to every public indexable page (homepage,
 *                                About, Contact, both hubs, service pages,
 *                                country pages), while still allowing an
 *                                explicit denial such as "we do not guarantee
 *                                rankings"
 *  10. prerender completeness  — the /services and /locations pages are
 *                                route-level chunks now, so every generated
 *                                document is checked for a complete page rather
 *                                than a Suspense fallback or an empty shell
 *  11. bundle budget           — an evidence-based ceiling on the main bundle
 *                                and on total JavaScript, plus proof that the
 *                                homepage does not request the service or
 *                                regional content chunks
 *
 * Sections 7 and 8 share the page-contract helpers in `assertPageContract` —
 * the two used to carry near-identical copies of the metadata, breadcrumb,
 * JSON-LD, CTA and sitemap assertions.
 *
 * Usage: node scripts/verify-dist.mjs
 */

import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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

// --- document readers, shared by every page-level scan ---------------------

const metaOf = (html, key) =>
  html.match(new RegExp(`<meta (?:name|property)="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="([^"]*)"`))?.[1] ?? '';
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
const robotsOf = (html) => html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? '';

/**
 * The markup a crawler reads before any JavaScript runs: everything the
 * prerenderer injected into `#root`, with the module script and after excluded.
 */
function prerenderedBody(html) {
  const body = html.split('<div id="root">')[1]?.split('<script type="module"')[0] ?? '';
  const text = decodeEntities(body.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return { body, text, words: text === '' ? 0 : text.split(' ').length };
}

/** All visible text in the document, entity-decoded — used for crumb checks. */
const visibleText = (html) => decodeEntities(html.replace(/<[^>]+>/g, ' '));

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

/** A negation close in front of a phrase turns a claim into a disclaimer. */
const DENIAL_WORDS = /\b(?:no|not|never|cannot|can't|without|nor|neither|nothing|none|do not|does not|will not|hold no|have no|make no|claim no|offer no|give no)\b/i;

/** The sentence a match sits inside, so a question can be told from a claim. */
function sentenceAround(text, index) {
  const start = Math.max(
    text.lastIndexOf('.', index),
    text.lastIndexOf('?', index),
    text.lastIndexOf('!', index),
  );
  const rest = text.slice(index);
  const endOffset = rest.search(/[.?!]/);
  return text.slice(start + 1, endOffset === -1 ? undefined : index + endOffset + 1).trim();
}

/** True when `text` denies, rather than asserts, the phrase found at `index`. */
function isDenied(text, index) {
  return DENIAL_WORDS.test(text.slice(Math.max(0, index - 140), index));
}

/** The three conversion destinations every content page has to offer. */
const REQUIRED_CTAS = ['/project-analysis', '/schedule-call', '/contact'];

/** Open Graph and Twitter keys a share card needs to render correctly. */
const REQUIRED_SHARE_KEYS = [
  'og:title',
  'og:description',
  'og:url',
  'og:image',
  'twitter:card',
  'twitter:title',
  'twitter:description',
];

/**
 * The contract every prerendered content page satisfies, in one place.
 *
 * `checkServicePages` and `checkLocationPages` previously each carried their own
 * copy of these assertions, which is how they drifted (the service pages never
 * checked `og:image`, the location pages never checked the hub back-link). The
 * differences that are real — how much copy a hub carries versus a page, which
 * JSON-LD node types belong on it — stay as options.
 *
 * Returns the parsed document so the caller can make its own extra assertions.
 */
function assertPageContract(scan, urlPath, html, options) {
  const { minimumWords, sitemapLocs, titles, descriptions, expectSelfCanonical = true } = options;
  const { text: bodyText, words } = prerenderedBody(html);

  // --- physical HTML with meaningful copy before JavaScript -----------------
  if (words < minimumWords) fail(scan, `${urlPath}: only ${words} words of prerendered copy`);

  // --- exactly one H1 -------------------------------------------------------
  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) fail(scan, `${urlPath}: ${h1s.length} <h1> elements`);

  // --- unique metadata, self-canonical, indexable ---------------------------
  const title = titleOf(html);
  const description = metaOf(html, 'description');
  const canonical = canonicalOf(html);
  const robots = robotsOf(html);
  if (titles.has(title)) fail(scan, `${urlPath}: title duplicates ${titles.get(title)}`);
  titles.set(title, urlPath);
  if (descriptions.has(description)) {
    fail(scan, `${urlPath}: description duplicates ${descriptions.get(description)}`);
  }
  descriptions.set(description, urlPath);
  if (expectSelfCanonical && canonical !== `${ORIGIN}${urlPath}`) {
    fail(scan, `${urlPath}: canonical is "${canonical}"`);
  }
  if (robots !== 'index,follow') fail(scan, `${urlPath}: robots="${robots}"`);
  for (const key of REQUIRED_SHARE_KEYS) {
    if (!new RegExp(`<meta (?:name|property)="${key}" content="[^"]+"`).test(html)) {
      fail(scan, `${urlPath}: missing ${key}`);
    }
  }
  // No hreflang anywhere: the regional pages are separate service pages, not
  // translations of one localized page, and nothing else is localized either.
  if (/rel="alternate"[^>]*hreflang=/.test(html)) {
    fail(scan, `${urlPath}: carries an hreflang alternate`);
  }

  // --- sitemap membership ---------------------------------------------------
  if (!sitemapLocs.includes(`${ORIGIN}${urlPath}`)) {
    fail(scan, `${urlPath} is missing from sitemap.xml`);
  }

  // --- visible breadcrumb ---------------------------------------------------
  if (!html.includes('aria-label="Breadcrumb"')) fail(scan, `${urlPath}: no visible breadcrumb`);
  if (!html.includes('aria-current="page"')) fail(scan, `${urlPath}: breadcrumb marks no current page`);

  // --- the three required calls to action -----------------------------------
  for (const target of REQUIRED_CTAS) {
    if (!html.includes(`href="${target}"`)) fail(scan, `${urlPath}: no link to ${target}`);
  }

  return { bodyText, words, title, description, canonical, robots };
}

/**
 * The BreadcrumbList contract: the right depth, the right trail, ending on the
 * page's own canonical, and every crumb name readable on the page itself.
 */
function assertBreadcrumbJsonLd(urlPath, html, breadcrumb, { expectedDepth, expectedNames, canonical }) {
  if (!breadcrumb) {
    fail('structured-data', `${urlPath}: no BreadcrumbList JSON-LD`);
    return;
  }
  const items = breadcrumb.itemListElement ?? [];
  if (expectedDepth !== undefined && items.length !== expectedDepth) {
    fail('structured-data', `${urlPath}: BreadcrumbList has ${items.length} item(s), expected ${expectedDepth}`);
  } else if (expectedDepth === undefined && items.length < 2) {
    fail('structured-data', `${urlPath}: BreadcrumbList has ${items.length} item(s)`);
  }
  (expectedNames ?? []).forEach((name, index) => {
    if (items[index]?.name !== name) {
      fail('structured-data', `${urlPath}: crumb ${index + 1} is "${items[index]?.name}", expected "${name}"`);
    }
  });
  if (items.at(-1)?.item !== canonical) {
    fail('structured-data', `${urlPath}: BreadcrumbList does not end on the canonical URL`);
  }
  const visible = visibleText(html);
  for (const item of items) {
    if (!visible.includes(item.name)) {
      fail('structured-data', `${urlPath}: breadcrumb "${item.name}" is not visible on the page`);
    }
  }
}

/** Word bigrams, for the duplicate-content measure. */
const bigrams = (text) => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i < words.length - 1; i += 1) set.add(`${words[i]} ${words[i + 1]}`);
  return set;
};

/** Jaccard overlap of two texts' bigrams: 0 = nothing shared, 1 = identical. */
function similarity(a, b) {
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return shared / (left.size + right.size - shared);
}

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

/** Run `body` against a freshly served copy of dist, then close the server. */
async function withServer(body) {
  const server = await startServer();
  try {
    return await body(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

async function serveAndCheck() {
  await withServer(async (base) => {
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
      if (!metaOf(html, 'description')) fail('static-server', `GET ${url}: no meta description`);
      if (!robotsOf(html)) fail('static-server', `GET ${url}: no meta robots`);
      // The landmark is required on any page a crawler may index. The
      // session-scoped result page prerenders to its Suspense fallback (its
      // content depends on the visitor's own stored analysis), and a redirect
      // stub has no page body at all.
      const indexable = robotsOf(html) === 'index,follow';
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
      if (robotsOf(html) !== 'noindex,nofollow') {
        fail('spa-fallback', `GET ${url}: robots="${robotsOf(html)}"`);
      }
      if (!html.includes('<script type="module"')) {
        fail('spa-fallback', `GET ${url}: fallback does not load the app bundle`);
      }
    }
    notes.push('verified the SPA fallback for 4 dynamic/unknown paths');
  });
}

// ---------------------------------------------------------------------------
// the two content sections
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

const LOCATIONS_HUB_PATH = '/locations';

/** Exactly the markets that have a written page. */
const LOCATION_PATHS = [
  '/locations/united-states',
  '/locations/united-kingdom',
  '/locations/united-arab-emirates',
  '/locations/canada',
  '/locations/australia',
  '/locations/singapore',
  '/locations/germany',
  '/locations/netherlands',
  '/locations/turkey',
];

/**
 * There is no unwritten-market list any more.
 *
 * Phase 3B carried one naming Germany, the Netherlands and Turkey, and Phase 3C
 * gave all three a page, which emptied it. Rather than leave an empty constant
 * behind, the check that used to read it was replaced by the derived one in
 * `checkLocationPages`: every `/locations/*` href in the whole build must be
 * either the hub or one of `LOCATION_PATHS`. That catches a link to a market
 * that does not exist without anyone having to maintain a list of the ones that
 * do not.
 */

const INSIGHTS_HUB_PATH = '/insights';

/**
 * Exactly the articles that are published. Two, and that is deliberate — see
 * `docs/seo/EDITORIAL_PLAN.md`. An article may only ship when SCS Softwares has
 * first-hand experience of what it describes, so this list grows slowly on
 * purpose and a long list here would itself be the warning sign.
 */
const INSIGHT_PATHS = [
  '/insights/how-to-estimate-an-ai-app-project',
  '/insights/ai-voice-agent-production-checklist',
];

/** The global service pages every regional page has to link to. */
const REQUIRED_SERVICE_LINKS = [
  '/services/custom-software-development',
  '/services/mobile-app-development',
  '/services/web-application-development',
  '/services/saas-development',
  '/services/ai-development',
  '/services/ai-voice-agent-development',
  '/services/ai-video-consultation-agents',
  '/services/ai-automation-integration',
];

// ---------------------------------------------------------------------------
// 7: the service pages, served through the static server
// ---------------------------------------------------------------------------

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

async function checkServicePages(sitemapLocs) {
  await withServer(async (base) => {
    const titles = new Map();
    const descriptions = new Map();

    for (const urlPath of [SERVICES_HUB_PATH, ...SERVICE_PATHS]) {
      const isHub = urlPath === SERVICES_HUB_PATH;
      const response = await fetch(`${base}${urlPath}`);
      const html = await response.text();
      if (response.status !== 200) {
        fail('service-pages', `GET ${urlPath} -> ${response.status}`);
        continue;
      }

      // The shared contract: copy, one H1, unique metadata, self-canonical,
      // index,follow, share cards, sitemap membership, breadcrumb, three CTAs.
      // The hub is an index page, so it carries less copy than a service page.
      const { bodyText, canonical } = assertPageContract('service-pages', urlPath, html, {
        minimumWords: isHub ? 400 : 800,
        sitemapLocs,
        titles,
        descriptions,
      });

      // --- no fabricated claims --------------------------------------------
      for (const [pattern, label] of FABRICATION_PATTERNS) {
        const hit = bodyText.match(pattern);
        if (!hit) continue;
        // A disclaimer may use the word; a claim may not. Require a negation
        // close in front of it.
        if (!isDenied(bodyText, bodyText.indexOf(hit[0]))) {
          fail('fabricated-claims', `${urlPath}: ${label} — "${hit[0]}"`);
        }
      }
      for (const pattern of REQUIRED_DISCLAIMERS[urlPath] ?? []) {
        if (!pattern.test(bodyText)) fail('fabricated-claims', `${urlPath}: missing disclaimer ${pattern}`);
      }

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
      assertBreadcrumbJsonLd(urlPath, html, breadcrumb, {
        expectedNames: isHub ? ['Home', 'Services'] : ['Home', 'Services'],
        canonical,
      });

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
      if (robotsOf(html) !== 'noindex,follow') fail('legacy-forwards', `${from}: robots="${robotsOf(html)}"`);
      if (canonicalOf(html) !== `${ORIGIN}${to}`) fail('legacy-forwards', `${from}: canonical is "${canonicalOf(html)}"`);
      if (!html.includes(`content="0; url=${to}"`)) fail('legacy-forwards', `${from}: no meta refresh to ${to}`);
      if (!html.includes('window.location.replace')) fail('legacy-forwards', `${from}: no script redirect`);
      if (sitemapLocs.includes(`${ORIGIN}${from}`)) fail('legacy-forwards', `${from} is still in the sitemap`);
      // The destination must be a real page, not another stub.
      if (!resolveDistPath(to)) fail('legacy-forwards', `${from} forwards to ${to}, which has no file in dist`);
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
  });
}

// ---------------------------------------------------------------------------
// 8: the regional pages, served through the static server
// ---------------------------------------------------------------------------

/**
 * Claims that are a lie on a regional page in any context whatsoever. No
 * negation rescues these — the phrasing itself is the problem.
 *
 * Extended in Phase 3B to Canada, Australia and Singapore, and in Phase 3C to
 * Germany, the Netherlands and Turkey: German, Dutch and Turkish offices, teams,
 * staff and entities, the +49, +31 and +90 dialling codes, the European- and
 * EU-office phrasing that two EU market pages invite, the local commercial
 * registers, and the GDPR / KVKK / TÜV credentials that would be the obvious
 * thing to fabricate on those three pages.
 *
 * Bare "GDPR compliant" and "KVKK compliant" are deliberately not here: all
 * three new pages carry a buyer question that uses the phrase and then answers
 * it honestly, and the question exemption in `scanFabricatedLocation` covers
 * that. What is banned is asserting it, or claiming a certification, an approval
 * or a guarantee under any of those names.
 */
const FABRICATED_LOCATION_PATTERNS = [
  [/\bour (?:US|USA|U\.S\.|UK|U\.K\.|UAE|American|British|Emirati|Canadian|Australian|Singapore|Singaporean|German|Germany|Dutch|Netherlands|Turkish|Turkey) (?:office|team|staff|branch|headquarters|entity|employees|developers)\b/i, 'a local office, team or entity'],
  [/\boffices? in (?:the )?(?:USA|US|UK|UAE|United States|United Kingdom|United Arab Emirates|Canada|Australia|Singapore|Germany|Netherlands|Turkey|Dubai|Abu Dhabi|Sharjah|London|New York|Toronto|Vancouver|Montreal|Sydney|Melbourne|Brisbane|Perth|Berlin|Munich|Hamburg|Frankfurt|Cologne|Amsterdam|Rotterdam|The Hague|Utrecht|Eindhoven|Istanbul|Ankara|Izmir)\b/i, 'a foreign office'],
  [/\b(?:based|headquartered|located|registered|incorporated) in (?:the )?(?:USA|US|UK|UAE|United States|United Kingdom|United Arab Emirates|Canada|Australia|Singapore|Germany|Netherlands|Turkey|Dubai|Abu Dhabi|London|New York|Toronto|Vancouver|Sydney|Melbourne|Perth|Berlin|Munich|Frankfurt|Amsterdam|Rotterdam|Istanbul|Ankara)\b/i, 'a foreign base'],
  [/\+1[\s-]?\(?\d{3}/, 'a North American telephone number'],
  [/\+44[\s-]?\d{2}/, 'a UK telephone number'],
  [/\+971[\s-]?\d/, 'a UAE telephone number'],
  [/\+61[\s-]?\d/, 'an Australian telephone number'],
  [/\+65[\s-]?\d/, 'a Singapore telephone number'],
  [/\+49[\s-]?\d/, 'a German telephone number'],
  [/\+31[\s-]?\d/, 'a Netherlands telephone number'],
  [/\+90[\s-]?\d/, 'a Turkish telephone number'],
  [/\bfully (?:compliant|certified|secure|GDPR)\b/i, 'an absolute compliance claim'],
  [/\bwe are (?:GDPR|UK GDPR|HIPAA|SOC ?2|PIPEDA|PDPA|KVKK|DSGVO|BDSG|AVG|UAVG) compliant\b/i, 'a compliance claim'],
  [/\b(?:PIPEDA|PDPA|Privacy Act|Australian Privacy Principles)[- ]?(?:certified|compliant|accredited|approved)\b/i, 'a named privacy-framework certification'],
  [/\b(?:GDPR|KVKK|DSGVO|BDSG|AVG|UAVG)[- ]?(?:certified|accredited|approved|registered)\b/i, 'a data-protection certification'],
  [/\bguaranteed (?:GDPR|KVKK|DSGVO|BDSG|AVG|UAVG)\b/i, 'a guaranteed data-protection outcome'],
  [/\bT(?:Ü|U)V[- ]?(?:certified|approved|tested|audited)\b/i, 'a TÜV certification'],
  [/\bour (?:European|EU|DACH|Benelux) (?:office|entity|branch|team|presence|subsidiary)\b/i, 'a European presence'],
  [/\b(?:German|Dutch|Turkish|Netherlands)[- ]registered\b/i, 'a local company registration'],
  [/\bhandelsregister\b/i, 'a German commercial-register entry'],
  [/\bkvk[- ]?(?:number|nummer|registered)\b/i, 'a Dutch commercial-register entry'],
  [/\bmersis\b/i, 'a Turkish trade-register entry'],
  [/\bgovernment[- ](?:approved|certified|licensed)\b/i, 'a government approval'],
  [/\blocal government (?:approval|approved|endorsement)\b/i, 'a local government approval'],
  [/\bguaranteed (?:compliance|coverage|availability|overlap|uptime|results?|timezone|time[- ]zone)\b/i, 'a guaranteed outcome or coverage'],
  [/\b24\/7 (?:support|coverage|availability)\b/i, 'round-the-clock coverage'],
  [/\baround[- ]the[- ]clock (?:support|coverage|availability)\b/i, 'round-the-clock coverage'],
  [/\balways available\b/i, 'continuous availability'],
  [/\baward[- ]winning\b/i, 'an award'],
  [/\bindustry[- ]leading\b/i, 'an industry-leading claim'],
  [/\bnumber one\b/i, 'a number-one claim'],
  [/\bno\.? ?1\b/i, 'a number-one claim'],
  [/\b\d{2,}\+? (?:happy )?(?:clients|customers|projects)\b/i, 'a client or project count'],
  [/\b\d+% (?:satisfaction|success|accuracy|uptime|growth)\b/i, 'a performance percentage'],
  [/\b\d+\+ years\b/i, 'a years-in-business claim'],
  [/\bmarket (?:is|was) (?:worth|valued)\b/i, 'a market-size statistic'],
  [/\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY) \d{5}(?:-\d{4})?\b/, 'a US postal address'],
  [/\b(?:E|EC|N|NW|SE|SW|W|WC|B|M|LS|G|EH|CF|BS|L)\d{1,2}[A-Z]? ?\d[A-Z]{2}\b/, 'a UK postcode'],
  [/\bP\.? ?O\.? Box\b/i, 'a PO box'],
  [/\b(?:Suite|Ste\.|Street|Avenue|Boulevard|Sheikh Zayed Road)\b[^.]{0,60}\b(?:USA|UK|UAE|United States|United Kingdom|United Arab Emirates|Canada|Australia|Singapore|Dubai|Abu Dhabi|London|New York|Toronto|Sydney)\b/i, 'a street address in a target country'],
  [/\bfastest[- ]growing\b/i, 'a growth ranking'],
];

/**
 * Phrases allowed only inside a denial, or inside a question the page then
 * answers. The required disclosure has to be able to say "we do not maintain a
 * local office"; a claim may not say "our local office".
 */
const DENIAL_ONLY_PATTERNS = [
  [/\blocal offices?\b/i, 'a local office'],
  [/\blocal team\b/i, 'a local team'],
  [/\blocal branch\b/i, 'a local branch'],
  // Phase 3C. Two of the three new markets are in the EU, which makes
  // "European office" and "EU entity" the phrases most likely to be written
  // carelessly — and both pages need to be able to deny them out loud.
  [/\bT(?:Ü|U)V\b/, 'a TÜV credential'],
  [/\b(?:Turkish|German|Dutch) (?:bank|banks|payment institution|payment provider) (?:relationship|agreement|partnership|licence|license)\b/i, 'a local banking relationship'],
  [/\blocal (?:employees|staff)\b/i, 'local employees'],
  [/\blocal (?:phone|telephone)\b/i, 'a local phone number'],
  [/\blocal (?:entity|registration|licence|license)\b/i, 'a local entity or registration'],
  [/\blocally registered\b/i, 'local registration'],
  [/\blocally based\b/i, 'a local presence'],
  [/\bregistered (?:entity|company|branch)\b/i, 'a registered foreign entity'],
  [/\bgovernment (?:approval|panel|framework) \b/i, 'a government approval'],
  [/\bguarantee[a-z]*\b/i, 'a guarantee'],
  [/\bcompliant\b/i, 'a compliance claim'],
  [/\bcertif(?:ied|ication)\b/i, 'a certification'],
  [/\baccredit(?:ed|ation)\b/i, 'an accreditation'],
  [/\btrade licen[cs]e\b/i, 'a trade licence'],
  [/\b(?:HIPAA|SOC ?2|PCI ?DSS|ISO ?\d{4,}|Cyber Essentials)[- ]?(?:certified|compliant|accredited)\b/i, 'a named-framework certification'],
];

/**
 * Phrases whose denial has to sit in the *same sentence*, not merely somewhere
 * in the preceding 140 characters.
 *
 * The wider window is right for most of `DENIAL_ONLY_PATTERNS`: a disclosure
 * block often denies several things across consecutive sentences. But on a
 * rendered page the FAQ answers run into one another, so a denial ending one
 * answer ("…no European office and no EU entity") sits inside the window of a
 * claim opening the next — and "Our Dutch-speaking team handles this directly"
 * would pass the scan. These three claims are the ones where that matters:
 * each is easy to write by accident and impossible to substantiate. All three
 * are denied inside a single sentence in the real copy.
 */
const SAME_SENTENCE_DENIAL_PATTERNS = [
  [/\b(?:German|Dutch|Turkish)[- ]speaking (?:team|staff|developers?|engineers?|colleagues?|consultants?|support)\b/i, 'staff who speak the local language'],
  [/\b(?:our|existing|previous|past|several|many|numerous|\d+\+?) (?:German|Dutch|Turkish) (?:clients|customers|references|partners|partnerships|resellers)\b/i, 'local clients or partners'],
  [/\b(?:European|EU) (?:office|entity|branch|presence|subsidiary|company)\b/i, 'a European presence'],
];

/** The text from the start of the current sentence up to `index`. */
function sentencePrefix(text, index) {
  const start = Math.max(
    text.lastIndexOf('.', index),
    text.lastIndexOf('?', index),
    text.lastIndexOf('!', index),
    text.lastIndexOf(';', index),
  );
  return text.slice(start + 1, index);
}

/**
 * Text every regional page must contain as visible copy: SCS operates from
 * Indore, India; services are delivered remotely; no local office is
 * represented in that market.
 */
const REQUIRED_LOCATION_DISCLOSURES = [
  [/(?:operates|works|working) from Indore|based in Indore|from Indore, (?:Madhya Pradesh, )?India|from one office in Indore/i, 'operates from Indore, India'],
  [/delivered remotely|delivery is remote|remote(?:ly)? from (?:that office|there|India)|serves .{0,60} remotely/i, 'delivery is remote'],
  [/no local office|do not maintain a local office|have no premises|there is no local office/i, 'no local office in this market'],
];

function scanFabricatedLocation(urlPath, bodyText) {
  for (const [pattern, label] of FABRICATED_LOCATION_PATTERNS) {
    const hit = bodyText.match(pattern);
    if (hit) fail('fabricated-location', `${urlPath}: ${label} — "${hit[0]}"`);
  }
  for (const [pattern, label] of DENIAL_ONLY_PATTERNS) {
    const global = new RegExp(pattern.source, 'gi');
    for (const match of bodyText.matchAll(global)) {
      const index = match.index ?? 0;
      // A question asserts nothing — the answer beneath it is what must be honest.
      if (sentenceAround(bodyText, index).endsWith('?')) continue;
      if (!isDenied(bodyText, index)) {
        const before = bodyText.slice(Math.max(0, index - 140), index);
        fail('fabricated-location', `${urlPath}: ${label} with no denial in front — "…${before.slice(-60)}${match[0]}"`);
      }
    }
  }
  for (const [pattern, label] of SAME_SENTENCE_DENIAL_PATTERNS) {
    const global = new RegExp(pattern.source, 'gi');
    for (const match of bodyText.matchAll(global)) {
      const index = match.index ?? 0;
      if (sentenceAround(bodyText, index).endsWith('?')) continue;
      const prefix = sentencePrefix(bodyText, index);
      if (!DENIAL_WORDS.test(prefix)) {
        fail(
          'fabricated-location',
          `${urlPath}: ${label} with no denial in the same sentence — "${prefix.slice(-80)}${match[0]}"`,
        );
      }
    }
  }
}

async function checkLocationPages(sitemapLocs) {
  await withServer(async (base) => {
    const titles = new Map();
    const descriptions = new Map();
    const bodies = new Map();

    for (const urlPath of [LOCATIONS_HUB_PATH, ...LOCATION_PATHS]) {
      const isHub = urlPath === LOCATIONS_HUB_PATH;
      const response = await fetch(`${base}${urlPath}`);
      const html = await response.text();
      if (response.status !== 200) {
        fail('location-pages', `GET ${urlPath} -> ${response.status}`);
        continue;
      }

      const { bodyText, canonical } = assertPageContract('location-pages', urlPath, html, {
        minimumWords: isHub ? 500 : 1200,
        sitemapLocs,
        titles,
        descriptions,
      });
      bodies.set(urlPath, bodyText);

      // --- structured data --------------------------------------------------
      const blocks = jsonLdBlocks(html);
      const types = blocks.map((node) => node['@type']);
      const serviceNode = blocks.find((node) => node['@type'] === 'Service');
      const breadcrumb = blocks.find((node) => node['@type'] === 'BreadcrumbList');
      if (isHub) {
        if (types.join(',') !== 'BreadcrumbList') {
          fail('structured-data', `${urlPath}: hub markup is [${types.join(', ')}] — expected BreadcrumbList only`);
        }
      } else {
        if (types.join(',') !== 'Service,BreadcrumbList') {
          fail('structured-data', `${urlPath}: markup is [${types.join(', ')}] — expected Service then BreadcrumbList`);
        }
        if (!serviceNode) {
          fail('structured-data', `${urlPath}: no Service JSON-LD`);
        } else {
          if (serviceNode.url !== canonical) fail('structured-data', `${urlPath}: Service.url is "${serviceNode.url}"`);
          if (serviceNode.areaServed?.['@type'] !== 'Country') {
            fail('structured-data', `${urlPath}: areaServed is not a schema.org Country`);
          }
          // The country the markup claims to serve must be the one the page is
          // about, spelled the way schema.org expects.
          const expectedCountry = {
            '/locations/united-states': 'United States',
            '/locations/united-kingdom': 'United Kingdom',
            '/locations/united-arab-emirates': 'United Arab Emirates',
            '/locations/canada': 'Canada',
            '/locations/australia': 'Australia',
            '/locations/singapore': 'Singapore',
            '/locations/germany': 'Germany',
            '/locations/netherlands': 'Netherlands',
            '/locations/turkey': 'Turkey',
          }[urlPath];
          if (serviceNode.areaServed?.name !== expectedCountry) {
            fail('structured-data', `${urlPath}: areaServed.name is "${serviceNode.areaServed?.name}", expected "${expectedCountry}"`);
          }
          if (serviceNode.provider?.['@id'] !== `${ORIGIN}/#organization`) {
            fail('structured-data', `${urlPath}: Service.provider does not reference the India-based Organization`);
          }
        }
      }
      // No location claim of any kind may appear in the markup on these pages.
      const serialized = JSON.stringify(blocks);
      for (const forbidden of [
        'LocalBusiness',
        'PostalAddress',
        'GeoCoordinates',
        'telephone',
        'openingHours',
        'OpeningHoursSpecification',
        'aggregateRating',
        'FAQPage',
        '"review"',
        'branchOf',
      ]) {
        if (serialized.includes(forbidden)) {
          fail('structured-data', `${urlPath}: markup contains ${forbidden}`);
        }
      }
      assertBreadcrumbJsonLd(urlPath, html, breadcrumb, {
        expectedDepth: isHub ? 2 : 3,
        expectedNames: isHub ? ['Home', 'Locations'] : ['Home', 'Locations'],
        canonical,
      });
      if (breadcrumb && (breadcrumb.itemListElement ?? [])[1]?.item !== `${ORIGIN}${LOCATIONS_HUB_PATH}`) {
        fail('structured-data', `${urlPath}: middle crumb does not point at the locations hub`);
      }

      // --- fabricated-location scan ----------------------------------------
      scanFabricatedLocation(urlPath, bodyText);

      // --- the required disclosure, as visible copy -------------------------
      for (const [pattern, what] of REQUIRED_LOCATION_DISCLOSURES) {
        if (!pattern.test(bodyText)) fail('location-honesty', `${urlPath}: does not disclose ${what}`);
      }
      if (!/Indore/.test(bodyText)) fail('location-honesty', `${urlPath}: never names Indore`);
      // The disclosure must not be hidden text.
      for (const match of html.matchAll(/class="[^"]*sr-only[^"]*"[^>]*>([^<]*)</g)) {
        if (/Indore|remote|office/i.test(match[1])) {
          fail('location-honesty', `${urlPath}: disclosure copy hidden in a screen-reader-only block`);
        }
      }
      for (const hidden of ['display:none', 'visibility:hidden', 'font-size:0', 'text-indent:-']) {
        const index = html.indexOf(hidden);
        if (index === -1) continue;
        const around = decodeEntities(html.slice(index, index + 800).replace(/<[^>]+>/g, ' '));
        if (/Indore|remote|no local office/i.test(around)) {
          fail('location-honesty', `${urlPath}: disclosure copy sits inside a "${hidden}" block`);
        }
      }

      // --- linkage ----------------------------------------------------------
      if (isHub) {
        for (const locationPath of LOCATION_PATHS) {
          if (!html.includes(`href="${locationPath}"`)) fail('location-pages', `${urlPath}: no link to ${locationPath}`);
        }
      } else {
        if (!html.includes(`href="${LOCATIONS_HUB_PATH}"`)) {
          fail('location-pages', `${urlPath}: no link back to the locations hub`);
        }
        for (const servicePath of REQUIRED_SERVICE_LINKS) {
          if (!html.includes(`href="${servicePath}"`)) {
            fail('location-pages', `${urlPath}: no link to the global page ${servicePath}`);
          }
          if (!resolveDistPath(servicePath)) {
            fail('location-pages', `${urlPath}: links to ${servicePath}, which has no file in dist`);
          }
        }
        // Every other live market, and nothing else. A page linking to itself
        // is not checked here — the header's market list legitimately includes
        // the current page; `locationPages.test.tsx` asserts that a country's
        // own `otherMarkets` never contains itself.
        const linkedMarkets = [...html.matchAll(/href="(\/locations\/[^"]+)"/g)].map((match) => match[1]);
        for (const linked of new Set(linkedMarkets)) {
          if (!LOCATION_PATHS.includes(linked)) {
            fail('location-pages', `${urlPath}: links to unwritten market ${linked}`);
          }
        }
        for (const other of LOCATION_PATHS.filter((market) => market !== urlPath)) {
          if (!html.includes(`href="${other}"`)) {
            fail('location-pages', `${urlPath}: does not cross-link the active market ${other}`);
          }
        }
      }
    }

    // --- nothing in the whole build links to a market page we never wrote ---
    // One derived check rather than a hard-coded list of absent countries: any
    // /locations URL that is neither the hub nor a live market fails the build,
    // whether it is a market with no page, a stale slug or a city page.
    const htmlFiles = await walk(DIST, (file) => file.endsWith('.html'));
    for (const file of htmlFiles) {
      const html = await fs.readFile(file, 'utf8');
      const name = rel(file).replace(/\\/g, '/');
      for (const match of html.matchAll(/href="(\/locations[^"]*)"/g)) {
        const target = match[1];
        if (target !== LOCATIONS_HUB_PATH && !LOCATION_PATHS.includes(target)) {
          fail('location-links', `${name}: links to unknown locations URL ${target}`);
        }
      }
    }

    // --- the hub is reachable from the site chrome and key pages ------------
    for (const entry of ['/', '/about', '/services', '/contact']) {
      const response = await fetch(`${base}${entry}`);
      const html = await response.text();
      if (!html.includes(`href="${LOCATIONS_HUB_PATH}"`)) {
        fail('location-links', `${entry}: no link to the locations hub`);
      }
    }
    // The homepage international-delivery section lists every active market.
    const home = await (await fetch(`${base}/`)).text();
    for (const market of LOCATION_PATHS) {
      if (!home.includes(`href="${market}"`)) {
        fail('location-links', `/: homepage international-delivery section omits ${market}`);
      }
    }

    // --- duplicate-content scan across all nine market pages ---------------
    // Two passes, as required: the rendered body as-is, and again with every
    // country name, region name and time-zone label replaced by a placeholder.
    // The second pass is what a find-and-replace clone fails: its raw texts
    // differ only by the country name, so neutralising it makes two pages
    // identical.
    const neutralise = (text) =>
      text
        .replace(
          /United Arab Emirates|United States|United Kingdom|the Netherlands|Netherlands|Emirates|Emirati|American|British|Canadian|Australian|Singaporean|Germany|German|Dutch|Turkey|Turkish|Canada|Australia|Singapore|USA|UAE|UK|US\b|EU\b|DACH|Benelux|Austria|Switzerland|Belgium/g,
          'COUNTRY',
        )
        .replace(
          /Central European Summer Time|Central European Time|Gulf Standard Time|Singapore Standard Time|Indian Standard Time|US Eastern|US Pacific|British Summer Time|New South Wales|Victoria|South Australia|Tasmania|Queensland|Northern Territory|Western Australia|CEST|CET|UTC/g,
          'ZONE',
        )
        .replace(
          /Dubai|Abu Dhabi|Sharjah|London|New York|Toronto|Vancouver|Sydney|Melbourne|Perth|Berlin|Munich|Hamburg|Frankfurt|Cologne|Amsterdam|Rotterdam|The Hague|Utrecht|Eindhoven|Istanbul|Ankara|Izmir/g,
          'CITY',
        );

    // The rendered bodies include the shared header, footer, CTA labels and
    // layout copy, so these ceilings are looser than the content-object test in
    // locationPages.test.tsx. A country-name substitution scores near 1.0 on
    // the neutralised pass.
    const RAW_CEILING = 0.4;
    const NEUTRAL_CEILING = 0.45;
    let worstRaw = 0;
    let worstNeutral = 0;
    for (let i = 0; i < LOCATION_PATHS.length; i += 1) {
      for (let j = i + 1; j < LOCATION_PATHS.length; j += 1) {
        const a = LOCATION_PATHS[i];
        const b = LOCATION_PATHS[j];
        const rawScore = similarity(bodies.get(a) ?? '', bodies.get(b) ?? '');
        const neutralScore = similarity(neutralise(bodies.get(a) ?? ''), neutralise(bodies.get(b) ?? ''));
        worstRaw = Math.max(worstRaw, rawScore);
        worstNeutral = Math.max(worstNeutral, neutralScore);
        if (rawScore > RAW_CEILING) {
          fail('duplicate-content', `${a} and ${b} are ${(rawScore * 100).toFixed(1)}% similar`);
        }
        if (neutralScore > NEUTRAL_CEILING) {
          fail(
            'duplicate-content',
            `${a} and ${b} are ${(neutralScore * 100).toFixed(1)}% similar once the country names are removed — this reads as a find-and-replace clone`,
          );
        }
      }
    }
    notes.push(
      `duplicate-content across ${LOCATION_PATHS.length} markets (${(LOCATION_PATHS.length * (LOCATION_PATHS.length - 1)) / 2} pairs): ` +
        `worst raw ${(worstRaw * 100).toFixed(1)}% (ceiling ${RAW_CEILING * 100}%), ` +
        `worst country-neutralised ${(worstNeutral * 100).toFixed(1)}% (ceiling ${NEUTRAL_CEILING * 100}%)`,
    );

    notes.push(`verified the locations hub, ${LOCATION_PATHS.length} regional pages and the fabricated-location scan`);
  });
}

// ---------------------------------------------------------------------------
// 9: site-wide honesty scan
// ---------------------------------------------------------------------------

/**
 * The unsupported positive claims no public page may make.
 *
 * Each is exempt when the page denies it — "we do not guarantee rankings" and
 * "we hold no certification" are the honest sentences this project relies on,
 * and flagging them would push the copy towards saying nothing at all. The
 * exemption is a negation within 140 characters in front of the match, or a
 * match inside a question the page then answers.
 */
/**
 * The client and project figures the owner has verified, in the exact phrasing
 * the site is allowed to use. Mirrors `VERIFIED_COUNT_CLAIMS` in
 * `src/content/founder.ts` — this file is plain JavaScript and cannot import
 * the TypeScript module, so the two are kept in step by the assertion in
 * `src/pages/about.test.tsx`.
 *
 * Only `/about` may state them, because that is the page that says where they
 * come from. Any other figure, and these figures anywhere else, still fail.
 */
const VERIFIED_COUNT_CLAIMS = ['50+ clients', '150+ projects', '50 clients', '150 projects'];
const VERIFIED_COUNT_PATHS = ['/about'];

const UNSUPPORTED_CLAIM_PATTERNS = [
  [/\bleading (?:software|AI|IT|digital|design|cloud|DevOps|marketing|development|technology) (?:company|agency|provider|partner|firm|studio)\b/i, 'a "leading company" claim'],
  [/\bindustry[- ]leading\b/i, 'an industry-leading claim'],
  [/\bmarket leader\b/i, 'a market-leader claim'],
  [/\bbest (?:software|AI|IT|digital|design|cloud|DevOps|marketing|development) (?:company|agency|team|partner|firm|studio)\b/i, 'a "best company" claim'],
  [/\bbest[- ]in[- ]class\b/i, 'a best-in-class claim'],
  [/\bnumber one\b/i, 'a number-one claim'],
  [/\bno\.? ?1\b/i, 'a number-one claim'],
  [/#1\b/, 'a number-one claim'],
  [/\baward[- ]winning\b/i, 'an award'],
  [/\bcertified partner\b/i, 'a certified-partner claim'],
  [/\b(?:AWS|Azure|Google Cloud|Google|Meta|Facebook|Microsoft) (?:certified|partner)\b/i, 'a platform partnership claim'],
  [/\bISO ?\d{4,}[- ]?(?:certified|certification)\b/i, 'an ISO certification'],
  [/\bguaranteed (?:results?|rankings?|leads?|traffic|revenue|conversions?|delivery|uptime|compliance|coverage|availability)\b/i, 'a guaranteed outcome'],
  [/\bwe guarantee\b/i, 'a guarantee'],
  [/\boffices? in (?:the )?(?:USA|US|UK|UAE|United States|United Kingdom|United Arab Emirates|Canada|Australia|Germany|Netherlands|Singapore|Turkey|Dubai|London|New York|Toronto|Sydney)\b/i, 'a foreign office'],
  [/\bour (?:US|USA|UK|UAE|American|British|Emirati|Canadian|Australian|Singapore|Singaporean|German|Dutch|Turkish) (?:office|team|staff|branch|headquarters|entity)\b/i, 'a foreign local team'],
  [/\b\d{2,}\+? (?:happy )?(?:clients|customers|projects|users)\b/i, 'a fabricated client or project count', 'count'],
  [/\b\d+% (?:satisfaction|success|accuracy|uptime|growth|retention)\b/i, 'a performance percentage'],
  [/\b\d+\+ years\b/i, 'a years-in-business claim'],
  [/\btrusted by \d/i, 'a trusted-by count'],
];

/**
 * Every public, indexable page the scan covers: the homepage, About, Contact,
 * both hubs, every service page and every country page. Phase 3B widened this
 * from the country pages alone.
 */
const HONESTY_SCAN_PATHS = [
  '/',
  '/about',
  '/contact',
  '/products',
  '/careers',
  '/project-analysis',
  '/schedule-call',
  SERVICES_HUB_PATH,
  ...SERVICE_PATHS,
  LOCATIONS_HUB_PATH,
  ...LOCATION_PATHS,
  INSIGHTS_HUB_PATH,
  ...INSIGHT_PATHS,
];

async function checkSiteHonesty() {
  await withServer(async (base) => {
    let scanned = 0;
    for (const urlPath of HONESTY_SCAN_PATHS) {
      const response = await fetch(`${base}${urlPath}`);
      if (response.status !== 200) {
        fail('site-honesty', `GET ${urlPath} -> ${response.status}`);
        continue;
      }
      const html = await response.text();
      const { text } = prerenderedBody(html);
      scanned += 1;
      for (const [pattern, label, kind] of UNSUPPORTED_CLAIM_PATTERNS) {
        const global = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
        for (const match of text.matchAll(global)) {
          const index = match.index ?? 0;
          // A question is the buyer's words, not a claim: "Are you certified?"
          // is answered honestly underneath.
          if (sentenceAround(text, index).endsWith('?')) continue;
          if (isDenied(text, index)) continue;
          // The two owner-verified figures, on the one page that sources them.
          if (
            kind === 'count' &&
            VERIFIED_COUNT_PATHS.includes(urlPath) &&
            VERIFIED_COUNT_CLAIMS.includes(match[0].toLowerCase())
          ) {
            continue;
          }
          const before = text.slice(Math.max(0, index - 90), index);
          fail('site-honesty', `${urlPath}: ${label} — "…${before.slice(-60)}${match[0]}"`);
        }
      }
    }
    notes.push(`honesty-scanned ${scanned} public pages for unsupported claims`);
  });
}

// ---------------------------------------------------------------------------
// 10: prerender completeness for the code-split routes
// ---------------------------------------------------------------------------

/**
 * The `/services/*` and `/locations/*` pages are route-level chunks now, loaded
 * with a dynamic import. That is only acceptable because the prerenderer awaits
 * the chunk before rendering, so every generated document still carries the
 * whole page.
 *
 * This scan is what proves it. If the preload step were ever removed, or a new
 * split route added without wiring it up, the affected documents would contain
 * the route fallback (`data-route-fallback`, from
 * `src/routes/RouteFallback.tsx`) instead of the page — and this fails the
 * build.
 */
async function checkPrerenderCompleteness() {
  // No generated document anywhere may contain the loading fallback.
  const htmlFiles = await walk(DIST, (file) => file.endsWith('.html'));
  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8');
    if (html.includes('data-route-fallback')) {
      fail('lazy-routes', `${rel(file)}: prerendered a Suspense fallback instead of the page`);
    }
  }

  // And every split route must carry a complete page before JavaScript: body
  // copy, one H1, a breadcrumb, JSON-LD, metadata and the three CTAs.
  const splitRoutes = [
    SERVICES_HUB_PATH,
    ...SERVICE_PATHS,
    LOCATIONS_HUB_PATH,
    ...LOCATION_PATHS,
    INSIGHTS_HUB_PATH,
    ...INSIGHT_PATHS,
  ];
  for (const urlPath of splitRoutes) {
    const file = resolveDistPath(urlPath);
    if (!file) {
      fail('lazy-routes', `${urlPath}: no prerendered file — the route chunk never resolved`);
      continue;
    }
    const html = await fs.readFile(file, 'utf8');
    const { body, words } = prerenderedBody(html);
    const isHub =
      urlPath === SERVICES_HUB_PATH || urlPath === LOCATIONS_HUB_PATH || urlPath === INSIGHTS_HUB_PATH;
    // The insights hub is a short index page by design — it lists two articles
    // and states the publishing rule. The articles themselves are long-form.
    const minimumWords = urlPath === INSIGHTS_HUB_PATH ? 150 : isHub ? 400 : 800;
    if (words < minimumWords) {
      fail('lazy-routes', `${urlPath}: incomplete lazy route — only ${words} words inside #root`);
    }
    if (!/<h1[\s>]/.test(body)) fail('lazy-routes', `${urlPath}: no <h1> inside the prerendered #root`);
    if (!body.includes('id="main-content"')) fail('lazy-routes', `${urlPath}: no main landmark inside #root`);
    if (!body.includes('aria-label="Breadcrumb"')) fail('lazy-routes', `${urlPath}: no breadcrumb inside #root`);
    if (jsonLdBlocks(html).length === 0) fail('lazy-routes', `${urlPath}: no JSON-LD in the prerendered head`);
    if (!titleOf(html) || !metaOf(html, 'description') || !canonicalOf(html)) {
      fail('lazy-routes', `${urlPath}: incomplete metadata on a lazily loaded route`);
    }
    for (const cta of REQUIRED_CTAS) {
      if (!body.includes(`href="${cta}"`)) fail('lazy-routes', `${urlPath}: no ${cta} link inside #root`);
    }
  }
  notes.push(`lazy-route completeness verified for ${splitRoutes.length} code-split routes`);
}

// ---------------------------------------------------------------------------
// 11: bundle budget
// ---------------------------------------------------------------------------

/**
 * Evidence-based ceilings, measured on the Phase 3B build that introduced
 * route-level splitting of `/services/*` and `/locations/*`:
 *
 *   main bundle   1,430,439 bytes raw / 413,572 bytes gzip
 *   all JavaScript 2,992,874 bytes raw / 879,159 bytes gzip
 *
 * (Before the split the main bundle was 1,789,870 raw / 512,680 gzip, with the
 * service and regional copy inside it.)
 *
 * Re-measured on the Phase 3C build, which added Germany, the Netherlands and
 * Turkey:
 *
 *   main bundle   1,433,376 bytes raw / 414,192 bytes gzip
 *   all JavaScript 3,077,771 bytes raw / 909,016 bytes gzip
 *
 * The main bundle moved by 2,937 raw / 620 gzip — three manifest entries and
 * three lines in the split table, which is all a new market is allowed to cost
 * the first paint. Its ceilings are therefore unchanged and still have ~40 KB of
 * headroom.
 *
 * The total moved by 84,897 raw / 29,857 gzip, and the three unavoidable route
 * chunks account for nearly all of it:
 *
 *   Germany      25,907 raw /  9,120 gzip
 *   Netherlands  25,166 raw /  9,303 gzip
 *   Turkey       26,159 raw /  9,461 gzip
 *   ------------------------------------
 *   subtotal     77,232 raw / 27,884 gzip
 *
 * The remainder is the main-bundle delta above plus the shared `LocationPage`
 * chunk growing by one optional section and the six earlier country chunks each
 * gaining three cross-market cards. The total gzip ceiling had to move because
 * of this; the raw one is raised in step so the two stay proportionate.
 *
 * The ceilings below add a 3% tolerance for deterministic build variation —
 * a dependency patch release, a minifier version, a slightly different hash
 * length. It is deliberately small: 3% of the main bundle is ~43 KB raw, far
 * less than any one service or country page's copy, so re-inlining even a
 * single content module would still fail.
 *
 * Raise a ceiling only together with a measurement, in the same change that
 * makes the code bigger.
 *
 * Re-measured for the offline connection notice (the right-edge drawer, the
 * connection monitor behind it and the route error boundary that catches a
 * chunk which cannot be downloaded). Two builds of the same tree, one without
 * the feature and one with it:
 *
 *   before  main 1,470,527 raw / 426,257 gzip   total 3,182,128 raw / 943,755 gzip
 *   after   main 1,489,728 raw / 431,247 gzip   total 3,200,531 raw / 948,689 gzip
 *   delta        +19,201 raw /  +4,990 gzip           +18,403 raw /  +4,934 gzip
 *
 * All of it lands in the main bundle on purpose, and none of it can be split
 * out: a visitor whose internet just died cannot download the chunk that would
 * have told them their internet died. The three locale blocks are part of the
 * cost — the notice speaks English, Arabic and Urdu like the rest of the site.
 *
 * Note the "before" column: the main gzip and both totals were already over
 * these ceilings before this change, so an earlier change grew the bundle
 * without re-measuring. The numbers below are measured off the "after" build
 * with the usual ~3% tolerance, which re-bases all four consistently.
 */
const BUNDLE_BUDGET = {
  mainRaw: 1_534_000,
  mainGzip: 444_000,
  totalRaw: 3_296_000,
  // Raised from 936_000 with the shared estimation policy: the budget-aware
  // scope engine, its client-facing wording and the report/proposal/admin
  // panels that render it. Measured immediately after that change:
  // 3_160_447 B raw / 936_899 B gzip across 50 chunks. Raised again with the
  // offline connection notice measured above.
  totalGzip: 977_000,
  /** Route chunks the split must actually produce (services + locations + hubs). */
  minimumContentChunks: 26,
};

/** Chunk names the /services and /locations routes are split into. */
const CONTENT_CHUNK_NAMES = [
  'ServicesHub', 'CustomSoftwareDevelopment', 'MobileAppDevelopment', 'WebApplicationDevelopment',
  'SaasDevelopment', 'SoftwareModernization', 'AiDevelopment', 'MachineLearningDevelopment',
  'AiVoiceAgentDevelopment', 'AiVideoConsultationAgents', 'ConversationalAiDevelopment',
  'AiAutomationIntegration', 'UiUxDesign', 'CloudSolutions', 'DevOpsEngineering', 'DigitalMarketing',
  'LocationsHub', 'UnitedStates', 'UnitedKingdom', 'UnitedArabEmirates', 'Canada', 'Australia', 'Singapore',
  'Germany', 'Netherlands', 'Turkey',
];

async function checkBundleBudget() {
  const assetsDir = path.join(DIST, 'assets');
  if (!fss.existsSync(assetsDir)) {
    fail('bundle-budget', 'dist/assets does not exist');
    return;
  }
  const files = (await fs.readdir(assetsDir)).filter((name) => name.endsWith('.js'));
  const sizes = new Map();
  let totalRaw = 0;
  let totalGzip = 0;
  for (const name of files) {
    const buffer = await fs.readFile(path.join(assetsDir, name));
    const gzip = zlib.gzipSync(buffer).length;
    sizes.set(name, { raw: buffer.length, gzip });
    totalRaw += buffer.length;
    totalGzip += gzip;
  }

  const mainName = files.find((name) => /^index-[^.]+\.js$/.test(name));
  if (!mainName) {
    fail('bundle-budget', 'could not find the main index-*.js bundle in dist/assets');
    return;
  }
  const main = sizes.get(mainName);

  if (main.raw > BUNDLE_BUDGET.mainRaw) {
    fail('bundle-budget', `main bundle is ${main.raw} bytes raw, over the ${BUNDLE_BUDGET.mainRaw} ceiling`);
  }
  if (main.gzip > BUNDLE_BUDGET.mainGzip) {
    fail('bundle-budget', `main bundle is ${main.gzip} bytes gzip, over the ${BUNDLE_BUDGET.mainGzip} ceiling`);
  }
  if (totalRaw > BUNDLE_BUDGET.totalRaw) {
    fail('bundle-budget', `total JavaScript is ${totalRaw} bytes raw, over the ${BUNDLE_BUDGET.totalRaw} ceiling`);
  }
  if (totalGzip > BUNDLE_BUDGET.totalGzip) {
    fail('bundle-budget', `total JavaScript is ${totalGzip} bytes gzip, over the ${BUNDLE_BUDGET.totalGzip} ceiling`);
  }

  // The split has to be real: one chunk per content route, actually emitted.
  const contentChunks = CONTENT_CHUNK_NAMES.filter((chunk) =>
    files.some((name) => name.startsWith(`${chunk}-`)),
  );
  const missing = CONTENT_CHUNK_NAMES.filter((chunk) => !contentChunks.includes(chunk));
  if (missing.length > 0) {
    fail('bundle-budget', `no route chunk emitted for: ${missing.join(', ')} — the split has been undone`);
  }
  if (contentChunks.length < BUNDLE_BUDGET.minimumContentChunks) {
    fail(
      'bundle-budget',
      `only ${contentChunks.length} content route chunks, expected at least ${BUNDLE_BUDGET.minimumContentChunks}`,
    );
  }

  // The saving must be real rather than moved: the homepage document must not
  // reference, preload or otherwise pull any content chunk. If it did, every
  // visitor would still download the whole of the service and regional copy.
  const homepage = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  for (const chunk of CONTENT_CHUNK_NAMES) {
    const emitted = files.find((name) => name.startsWith(`${chunk}-`));
    if (emitted && homepage.includes(emitted)) {
      fail('bundle-budget', `the homepage document references the ${chunk} route chunk`);
    }
  }
  // And the shared page layouts, which only these routes use.
  for (const shared of ['ServicePage', 'LocationPage']) {
    const emitted = files.find((name) => name.startsWith(`${shared}-`));
    if (!emitted) {
      fail('bundle-budget', `${shared} was inlined instead of shared between the route chunks`);
    } else if (homepage.includes(emitted)) {
      fail('bundle-budget', `the homepage document references the ${shared} chunk`);
    }
  }
  // Nothing else may be modulepreloaded into the homepage either: Vite emits
  // those links only for static imports of the entry, so a content chunk
  // appearing here would mean the dynamic import had been turned back into a
  // static one.
  const preloads = [...homepage.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of preloads) {
    if (CONTENT_CHUNK_NAMES.some((chunk) => href.includes(`/${chunk}-`))) {
      fail('bundle-budget', `the homepage modulepreloads ${href}`);
    }
  }

  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  notes.push(
    `main bundle ${main.raw} B raw (${kb(main.raw)}) / ${main.gzip} B gzip (${kb(main.gzip)}) ` +
      `— ceilings ${BUNDLE_BUDGET.mainRaw} / ${BUNDLE_BUDGET.mainGzip}`,
  );
  notes.push(
    `${files.length} JS chunks, ${contentChunks.length} of them content routes; total ${totalRaw} B raw / ${totalGzip} B gzip`,
  );
}

// ---------------------------------------------------------------------------
// 12: the insights section — authorship must be a fact, not a signal
// ---------------------------------------------------------------------------

/**
 * An `Article.author` is a claim that a named person wrote the thing. Adding a
 * founder byline to content he did not write is the exact move that makes
 * "E-E-A-T optimisation" dishonest, and it is invisible in every other check in
 * this file: the page renders, the markup validates, the tests pass.
 *
 * So this section asserts the three halves of that claim agree — the visible
 * byline names Rohan Sahu, the `Article.author` resolves to the same `Person`
 * `@id` that `/about` defines, and that `@id` is a real fragment on a real
 * page — plus the article-specific honesty rules: no invented client, metric,
 * timeline or budget, and a stated basis for why the piece can be written.
 */

const FOUNDER_PERSON_ID = `${ORIGIN}/about#founder`;

/** Shapes an article must never contain. Checked against the rendered text. */
const FABRICATED_EVIDENCE_PATTERNS = [
  [/\bone of our clients?\b/i, 'an unnamed client anecdote'],
  [/\ba client (?:of ours )?(?:told|asked|reported|saw|achieved)\b/i, 'a client anecdote'],
  [/\bwe (?:increased|improved|reduced|cut|grew|boosted) [^.]{0,40}\bby \d/i, 'an unverified result metric'],
  [/\b\d+(?:\.\d+)?\s?% (?:increase|improvement|uplift|reduction|faster|cheaper)\b/i, 'an unverified percentage claim'],
  [/\bsaved (?:them|the client|our client)\b/i, 'an unverified saving claim'],
  [/\bin (?:just )?\d+ weeks? we\b/i, 'an unverified delivery timeline'],
  [/\bcase stud(?:y|ies) (?:show|shows|showed)\b/i, 'a case study that does not exist'],
  [/\bour (?:award|awards|certification|certifications)\b/i, 'an award or certification'],
  [/\bwe guarantee\b/i, 'a guarantee'],
  [/\bwill rank\b/i, 'a ranking promise'],
];

async function checkInsightPages(sitemapLocs) {
  await withServer(async (base) => {
    // The hub first: it must link to every article and to nothing else.
    const hubResponse = await fetch(`${base}${INSIGHTS_HUB_PATH}`);
    const hubHtml = await hubResponse.text();
    if (hubResponse.status !== 200) {
      fail('insights', `GET ${INSIGHTS_HUB_PATH} -> ${hubResponse.status}`);
      return;
    }
    for (const articlePath of INSIGHT_PATHS) {
      if (!hubHtml.includes(`href="${articlePath}"`)) {
        fail('insights', `${INSIGHTS_HUB_PATH} does not link to ${articlePath}`);
      }
    }
    const known = new Set([INSIGHTS_HUB_PATH, ...INSIGHT_PATHS]);
    for (const file of await walk(DIST, (f) => f.endsWith('.html'))) {
      const html = await fs.readFile(file, 'utf8');
      for (const match of html.matchAll(/href="(\/insights[^"#?]*)"/g)) {
        if (!known.has(match[1])) {
          fail('insights', `${rel(file)} links to ${match[1]}, which is not a published article`);
        }
      }
    }

    for (const urlPath of INSIGHT_PATHS) {
      const response = await fetch(`${base}${urlPath}`);
      const html = await response.text();
      if (response.status !== 200) {
        fail('insights', `GET ${urlPath} -> ${response.status}`);
        continue;
      }
      const { body, text } = prerenderedBody(html);
      const canonical = `${ORIGIN}${urlPath}`;

      if (!sitemapLocs.includes(canonical)) fail('insights', `${urlPath} is missing from the sitemap`);
      if (robotsOf(html) !== 'index,follow') fail('insights', `${urlPath}: robots="${robotsOf(html)}"`);
      if (canonicalOf(html) !== canonical) fail('insights', `${urlPath}: canonical "${canonicalOf(html)}"`);
      if (metaOf(html, 'og:type') !== 'article' && metaOf(html, 'property:og:type') !== 'article') {
        // og:type is a property-attribute tag; read it directly.
        if (!/property="og:type" content="article"/.test(html)) {
          fail('insights', `${urlPath}: og:type is not "article"`);
        }
      }

      // --- the authorship claim, in all three places -----------------------
      const nodes = jsonLdBlocks(html);
      const article = nodes.find((node) => node['@type'] === 'Article');
      if (!article) {
        fail('insights', `${urlPath}: no Article JSON-LD`);
      } else {
        const author = article.author;
        const authorId = author && typeof author === 'object' ? author['@id'] : null;
        if (authorId !== FOUNDER_PERSON_ID) {
          fail('insights', `${urlPath}: Article.author is "${authorId}", not the founder Person node`);
        }
        if (!article.datePublished || !article.dateModified) {
          fail('insights', `${urlPath}: Article is missing datePublished or dateModified`);
        }
        for (const forbidden of ['aggregateRating', 'review', 'award', 'speakable']) {
          if (forbidden in article) fail('insights', `${urlPath}: Article carries a ${forbidden} node`);
        }
      }
      if (!text.includes('Rohan Sahu')) {
        fail('insights', `${urlPath}: no visible byline naming the author the markup claims`);
      }
      if (!body.includes('href="/about#founder"')) {
        fail('insights', `${urlPath}: the byline does not link to the page that defines the Person node`);
      }
      if (!/What this is based on/i.test(text)) {
        fail('insights', `${urlPath}: does not state what first-hand experience it is written from`);
      }

      // --- the visible dates must be the ones in the markup ----------------
      // A dateModified that only exists in JSON-LD is a freshness signal the
      // reader cannot see, which is the definition of marking up something the
      // page does not say. Both dates have to appear in a real <time> element.
      //
      // The attribute is matched case-insensitively: React SSR emits the JSX
      // prop name (`dateTime`), and HTML attribute names are case-insensitive,
      // so that is what a browser and a parser both read as `datetime`.
      if (article) {
        const renderedDates = new Set(
          [...body.matchAll(/<time[^>]*\sdatetime="([^"]+)"/gi)].map((match) => match[1]),
        );
        for (const field of ['datePublished', 'dateModified']) {
          const iso = String(article[field] ?? '');
          // dateModified is only rendered when it differs from datePublished —
          // an "Updated" line repeating the publication date is noise.
          if (field === 'dateModified' && iso === String(article.datePublished)) continue;
          if (iso && !renderedDates.has(iso)) {
            fail('insights', `${urlPath}: ${field} ${iso} is not rendered as a visible <time>`);
          }
        }
      }

      // --- no invented evidence -------------------------------------------
      for (const [pattern, label] of FABRICATED_EVIDENCE_PATTERNS) {
        const global = new RegExp(pattern.source, 'gi');
        for (const match of text.matchAll(global)) {
          const index = match.index ?? 0;
          if (sentenceAround(text, index).endsWith('?')) continue;
          if (isDenied(text, index)) continue;
          fail('insights', `${urlPath}: ${label} — "…${match[0]}"`);
        }
      }
    }

    notes.push(`verified the insights hub, ${INSIGHT_PATHS.length} articles and the authorship claim`);
  });
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
  await checkLocationPages(sitemapLocs);
  await checkInsightPages(sitemapLocs);
  await checkSiteHonesty();
  await checkPrerenderCompleteness();
  await checkBundleBudget();

  for (const note of notes) console.log(`  · ${note}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    '\n✓ dist verified: links, assets, metadata, secrets, hosts, sitemap, CNAME, live routes, service pages, legacy forwards, regional pages, location honesty, insight articles, authorship, site-wide honesty, lazy-route completeness, bundle budget.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
