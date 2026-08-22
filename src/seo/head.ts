/**
 * One head-tag model, two consumers.
 *
 * `buildHeadTags()` turns a registry entry into an ordered, de-duplicated list
 * of head tags. `serializeHeadTags()` renders that list into the HTML the
 * prerender step injects at build time; `applyHeadTags()` writes the same list
 * into a live `document` on client-side navigation.
 *
 * Both paths share the list, so the tags a crawler sees before JavaScript runs
 * and the tags a visitor's browser ends up with cannot drift apart.
 *
 * Duplicate prevention is structural: every tag has a unique `selector`, and
 * `applyHeadTags` updates the element that selector already matches — including
 * the tags baked into `index.html` — instead of appending a second one.
 */

import type { RouteSeo } from './registry';
import { SITE_NAME } from './site';

export type HeadTag =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; content: string; selector: string }
  | { kind: 'link'; rel: string; href: string; selector: string }
  | { kind: 'jsonld'; id: string; json: string; selector: string };

/** Attribute marking every tag this module owns, so cleanup is unambiguous. */
export const MANAGED_ATTR = 'data-scs-seo';

function meta(attr: 'name' | 'property', key: string, content: string): HeadTag {
  return { kind: 'meta', attr, key, content, selector: `meta[${attr}="${key}"]` };
}

function link(rel: string, href: string): HeadTag {
  return { kind: 'link', rel, href, selector: `link[rel="${rel}"]` };
}

/**
 * The full managed head for one route.
 *
 * `canonicalOverride` lets a dynamic route (a consultation room) self-canonicalise
 * on the URL actually being viewed rather than on its pattern.
 */
export function buildHeadTags(route: RouteSeo, canonicalOverride?: string | null): HeadTag[] {
  const canonical = canonicalOverride === undefined ? route.canonical : canonicalOverride;
  const tags: HeadTag[] = [
    { kind: 'title', text: route.title },
    meta('name', 'description', route.description),
    meta('name', 'robots', route.robots),
    meta('name', 'googlebot', route.robots),
    meta('name', 'author', SITE_NAME),
    // A route with no canonical emits neither tag: one 404.html answers many
    // URLs, so any single canonical or og:url on it would be wrong.
    ...(canonical ? [link('canonical', canonical), meta('property', 'og:url', canonical)] : []),

    meta('property', 'og:title', route.og.title),
    meta('property', 'og:description', route.og.description),
    meta('property', 'og:type', route.og.type),
    meta('property', 'og:site_name', route.og.siteName),
    meta('property', 'og:locale', route.og.locale),
    meta('property', 'og:image', route.og.image),
    meta('property', 'og:image:alt', route.og.imageAlt),

    meta('name', 'twitter:card', route.twitter.card),
    meta('name', 'twitter:title', route.twitter.title),
    meta('name', 'twitter:description', route.twitter.description),
    meta('name', 'twitter:image', route.twitter.image),
    meta('name', 'twitter:image:alt', route.twitter.imageAlt),
    meta('name', 'twitter:site', route.twitter.site),
    meta('name', 'twitter:creator', route.twitter.creator),
  ];

  route.jsonLd.forEach((node, index) => {
    const id = `${String((node as { '@type'?: string })['@type'] ?? 'node').toLowerCase()}-${index}`;
    tags.push({
      kind: 'jsonld',
      id,
      json: JSON.stringify(node),
      selector: `script[type="application/ld+json"][${MANAGED_ATTR}="${id}"]`,
    });
  });

  return tags;
}

/** Stable identity for a tag, used to prove the list holds no duplicates. */
export function tagKey(tag: HeadTag): string {
  return tag.kind === 'title' ? 'title' : tag.selector;
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON-LD payloads must not be able to close their own <script> element. */
export function escapeJsonLd(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Render the managed head as HTML for build-time injection. */
export function serializeHeadTags(tags: HeadTag[]): string {
  return tags
    .map((tag) => {
      switch (tag.kind) {
        case 'title':
          return `<title>${escapeHtmlText(tag.text)}</title>`;
        case 'meta':
          return `<meta ${tag.attr}="${tag.key}" content="${escapeHtmlAttribute(tag.content)}" ${MANAGED_ATTR}="${tag.key}" />`;
        case 'link':
          return `<link rel="${tag.rel}" href="${escapeHtmlAttribute(tag.href)}" ${MANAGED_ATTR}="${tag.rel}" />`;
        case 'jsonld':
          return `<script type="application/ld+json" ${MANAGED_ATTR}="${tag.id}">${escapeJsonLd(tag.json)}</script>`;
      }
    })
    .join('\n    ');
}

// ---------------------------------------------------------------------------
// Client application
// ---------------------------------------------------------------------------

/**
 * The slice of the DOM this module touches, narrowed to an interface so the
 * behaviour is unit-testable in the project's `node` test environment without
 * pulling in jsdom (the same approach `components/admin/adminSeo.ts` uses).
 */
export interface HeadElementLike {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  removeAttribute?(name: string): void;
  remove(): void;
  textContent: string | null;
}

export interface HeadDocumentLike {
  title: string;
  head: { appendChild(node: HeadElementLike): void };
  querySelector(selector: string): HeadElementLike | null;
  querySelectorAll(selector: string): ArrayLike<HeadElementLike>;
  createElement(tag: string): HeadElementLike;
}

/**
 * Write `tags` into `doc` so that afterwards exactly one element exists per
 * managed key. Existing matching elements — including the static ones shipped
 * in `index.html` and the ones the prerender step injected — are updated in
 * place; managed elements that the new route does not want are removed.
 */
export function applyHeadTags(doc: HeadDocumentLike, tags: HeadTag[]): void {
  const wanted = new Set(tags.map(tagKey));

  for (const tag of tags) {
    if (tag.kind === 'title') {
      doc.title = tag.text;
      continue;
    }

    // Collapse any pre-existing duplicates down to the first match.
    const matches = doc.querySelectorAll(tag.selector);
    for (let i = 1; i < matches.length; i += 1) matches[i].remove();

    const element = matches[0] ?? doc.createElement(tag.kind === 'jsonld' ? 'script' : tag.kind);
    const isNew = !matches[0];

    switch (tag.kind) {
      case 'meta':
        element.setAttribute(tag.attr, tag.key);
        element.setAttribute('content', tag.content);
        element.setAttribute(MANAGED_ATTR, tag.key);
        break;
      case 'link':
        element.setAttribute('rel', tag.rel);
        element.setAttribute('href', tag.href);
        element.setAttribute(MANAGED_ATTR, tag.rel);
        break;
      case 'jsonld':
        element.setAttribute('type', 'application/ld+json');
        element.setAttribute(MANAGED_ATTR, tag.id);
        element.textContent = tag.json;
        break;
    }

    if (isNew) doc.head.appendChild(element);
  }

  // Drop managed tags left over from the previous route (e.g. the homepage's
  // Organization/WebSite JSON-LD after navigating to a service page).
  const managed = doc.querySelectorAll(`[${MANAGED_ATTR}]`);
  for (let i = 0; i < managed.length; i += 1) {
    const element = managed[i];
    const key = element.getAttribute(MANAGED_ATTR);
    if (!key) continue;
    const selectors = [
      `meta[name="${key}"]`,
      `meta[property="${key}"]`,
      `link[rel="${key}"]`,
      `script[type="application/ld+json"][${MANAGED_ATTR}="${key}"]`,
    ];
    if (!selectors.some((selector) => wanted.has(selector))) element.remove();
  }
}
