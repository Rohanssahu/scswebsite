import { describe, expect, it } from 'vitest';
import {
  MANAGED_ATTR,
  applyHeadTags,
  buildHeadTags,
  escapeJsonLd,
  serializeHeadTags,
  tagKey,
  type HeadDocumentLike,
  type HeadElementLike,
  type HeadTag,
} from './head';
import { ALL_ROUTES, ROUTE_SEO } from './registry';

// ---------------------------------------------------------------------------
// A minimal document stand-in, so head behaviour is testable in the project's
// `node` test environment without a jsdom dependency — the same approach
// `src/components/admin/adminSeo.ts` already uses.
// ---------------------------------------------------------------------------

class FakeElement implements HeadElementLike {
  tag: string;
  attributes = new Map<string, string>();
  textContent: string | null = null;
  removed = false;
  constructor(tag: string) {
    this.tag = tag;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  remove() {
    this.removed = true;
  }
}

class FakeDocument implements HeadDocumentLike {
  title = 'initial title';
  elements: FakeElement[] = [];
  head = {
    appendChild: (node: HeadElementLike) => {
      this.elements.push(node as FakeElement);
    },
  };
  createElement(tag: string) {
    return new FakeElement(tag);
  }
  /** Supports exactly the selector shapes `head.ts` builds. */
  private match(selector: string) {
    const tagMatch = /^([a-z]+)/.exec(selector);
    const tag = tagMatch ? tagMatch[1] : '';
    const attributes = [...selector.matchAll(/\[([^\]=]+)="([^"]+)"\]/g)].map((m) => [m[1], m[2]] as const);
    return this.elements.filter(
      (element) =>
        !element.removed &&
        element.tag === tag &&
        attributes.every(([name, value]) => element.getAttribute(name) === value),
    );
  }
  querySelector(selector: string) {
    return this.match(selector)[0] ?? null;
  }
  querySelectorAll(selector: string) {
    if (/^\[([^\]=]+)="?/.test(selector) || selector.startsWith('[')) {
      const name = /^\[([^\]=]+)\]$/.exec(selector)?.[1];
      if (name) return this.elements.filter((element) => !element.removed && element.getAttribute(name) !== null);
    }
    return this.match(selector);
  }
  live() {
    return this.elements.filter((element) => !element.removed);
  }
  countOf(selector: string) {
    return this.match(selector).length;
  }
}

function seed(doc: FakeDocument, tags: { tag: string; attrs: Record<string, string> }[]) {
  for (const { tag, attrs } of tags) {
    const element = new FakeElement(tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    doc.elements.push(element);
  }
}

describe('head tag construction', () => {
  it('produces no duplicate keys for any route', () => {
    for (const route of ALL_ROUTES) {
      const keys = buildHeadTags(route).map(tagKey);
      expect(new Set(keys).size, route.routePattern).toBe(keys.length);
    }
  });

  it('emits exactly one title, description, robots and canonical per public route', () => {
    const tags = buildHeadTags(ROUTE_SEO['/about']);
    const count = (predicate: (tag: HeadTag) => boolean) => tags.filter(predicate).length;
    expect(count((tag) => tag.kind === 'title')).toBe(1);
    expect(count((tag) => tag.kind === 'meta' && tag.key === 'description')).toBe(1);
    expect(count((tag) => tag.kind === 'meta' && tag.key === 'robots')).toBe(1);
    expect(count((tag) => tag.kind === 'link' && tag.rel === 'canonical')).toBe(1);
  });

  it('omits canonical and og:url when the route has none', () => {
    const tags = buildHeadTags(ROUTE_SEO['*']);
    expect(tags.some((tag) => tag.kind === 'link' && tag.rel === 'canonical')).toBe(false);
    expect(tags.some((tag) => tag.kind === 'meta' && tag.key === 'og:url')).toBe(false);
    expect(tags.some((tag) => tag.kind === 'meta' && tag.key === 'robots')).toBe(true);
  });

  it('honours an explicit canonical override', () => {
    const tags = buildHeadTags(ROUTE_SEO['/about'], 'https://scssoftwares.com/elsewhere');
    const canonical = tags.find((tag) => tag.kind === 'link');
    expect(canonical && canonical.kind === 'link' && canonical.href).toBe('https://scssoftwares.com/elsewhere');
  });

  it('carries one JSON-LD tag per structured-data node', () => {
    expect(buildHeadTags(ROUTE_SEO['/']).filter((tag) => tag.kind === 'jsonld')).toHaveLength(2);
    expect(buildHeadTags(ROUTE_SEO['/gig/ui-ux-design']).filter((tag) => tag.kind === 'jsonld')).toHaveLength(1);
    // A canonical service page carries both its Service and its BreadcrumbList.
    expect(
      buildHeadTags(ROUTE_SEO['/services/custom-software-development']).filter((tag) => tag.kind === 'jsonld'),
    ).toHaveLength(2);
    expect(buildHeadTags(ROUTE_SEO['/careers']).filter((tag) => tag.kind === 'jsonld')).toHaveLength(0);
  });
});

describe('serialization', () => {
  it('escapes quotes and angle brackets in attribute values', () => {
    const html = serializeHeadTags([
      { kind: 'meta', attr: 'name', key: 'description', content: 'a "b" <c> & d', selector: 'meta[name="description"]' },
    ]);
    expect(html).toContain('content="a &quot;b&quot; &lt;c&gt; &amp; d"');
    expect(html).not.toContain('content="a "b"');
  });

  it('prevents a JSON-LD payload from closing its own script element', () => {
    const escaped = escapeJsonLd(JSON.stringify({ x: '</script><script>alert(1)</script>' }));
    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('\\u003c');
    expect(JSON.parse(escaped.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&')).x).toBe(
      '</script><script>alert(1)</script>',
    );
  });

  it('marks every managed tag so the client can find and update it', () => {
    const html = serializeHeadTags(buildHeadTags(ROUTE_SEO['/contact']));
    const managed = html.match(new RegExp(MANAGED_ATTR, 'g')) ?? [];
    // One per tag except <title>, which is addressed by document.title.
    expect(managed.length).toBe(buildHeadTags(ROUTE_SEO['/contact']).length - 1);
  });
});

describe('duplicate tag prevention', () => {
  it('updates the tags already present in index.html instead of appending copies', () => {
    const doc = new FakeDocument();
    seed(doc, [
      { tag: 'meta', attrs: { name: 'description', content: 'stale homepage description' } },
      { tag: 'meta', attrs: { name: 'robots', content: 'index,follow' } },
      { tag: 'link', attrs: { rel: 'canonical', href: 'https://scssoftwares.com/' } },
    ]);

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/about']));

    expect(doc.countOf('meta[name="description"]')).toBe(1);
    expect(doc.countOf('meta[name="robots"]')).toBe(1);
    expect(doc.countOf('link[rel="canonical"]')).toBe(1);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://scssoftwares.com/about');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      ROUTE_SEO['/about'].description,
    );
    expect(doc.title).toBe(ROUTE_SEO['/about'].title);
  });

  it('collapses pre-existing duplicates down to one element', () => {
    const doc = new FakeDocument();
    seed(doc, [
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex,nofollow' } },
      { tag: 'meta', attrs: { name: 'robots', content: 'index,follow' } },
      { tag: 'meta', attrs: { name: 'robots', content: 'all' } },
    ]);

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/contact']));

    expect(doc.countOf('meta[name="robots"]')).toBe(1);
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow');
  });

  it('stays at one tag per key across repeated navigation', () => {
    const doc = new FakeDocument();
    for (const path of ['/', '/about', '/contact', '/gig/web-development', '/about', '/']) {
      applyHeadTags(doc, buildHeadTags(ROUTE_SEO[path]));
      for (const selector of ['meta[name="description"]', 'meta[name="robots"]', 'meta[property="og:url"]', 'link[rel="canonical"]']) {
        expect(doc.countOf(selector), `${path} ${selector}`).toBe(1);
      }
    }
    expect(doc.title).toBe(ROUTE_SEO['/'].title);
  });

  it('removes the homepage JSON-LD when navigating to a page that has none', () => {
    const doc = new FakeDocument();
    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/']));
    expect(doc.querySelectorAll('script[type="application/ld+json"]').length).toBe(2);

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/careers']));
    expect(doc.querySelectorAll('script[type="application/ld+json"]').length).toBe(0);

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/gig/cloud-solutions']));
    const nodes = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(nodes.length).toBe(1);
    expect(JSON.parse(nodes[0].textContent ?? '{}')['@type']).toBe('Service');
  });

  it('drops the canonical when moving from a public page to an unknown route', () => {
    const doc = new FakeDocument();
    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/about']));
    expect(doc.countOf('link[rel="canonical"]')).toBe(1);

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['*']));
    expect(doc.countOf('link[rel="canonical"]')).toBe(0);
    expect(doc.countOf('meta[property="og:url"]')).toBe(0);
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
  });

  it('restores index,follow after leaving the admin dashboard', () => {
    const doc = new FakeDocument();
    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/admin']));
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');

    applyHeadTags(doc, buildHeadTags(ROUTE_SEO['/']));
    expect(doc.countOf('meta[name="robots"]')).toBe(1);
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow');
  });
});
