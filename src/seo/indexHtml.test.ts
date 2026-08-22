import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROUTE_SEO } from './registry';
import { buildHeadTags, serializeHeadTags } from './head';

/**
 * `index.html` carries a hand-written copy of the homepage's head, because it is
 * the shell Vite builds and the dev server serves before any prerendering. This
 * suite is the guard against that copy drifting away from the registry.
 */
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const HEAD_START = '<!-- SEO_HEAD:START';
const HEAD_END = '<!-- SEO_HEAD:END -->';

function generatedBlock(): string {
  const start = INDEX_HTML.indexOf(HEAD_START);
  const end = INDEX_HTML.indexOf(HEAD_END);
  return INDEX_HTML.slice(start, end);
}

describe('index.html shell', () => {
  it('keeps the markers the prerender step replaces', () => {
    expect(INDEX_HTML).toContain(HEAD_START);
    expect(INDEX_HTML).toContain(HEAD_END);
    expect(INDEX_HTML).toContain('<div id="root"><!--app-html--></div>');
  });

  it('matches the registry homepage title, description, canonical and robots', () => {
    const home = ROUTE_SEO['/'];
    const block = generatedBlock();
    expect(block).toContain(`content="${home.description}"`);
    expect(block).toContain(`href="${home.canonical}"`);
    expect(block).toContain('content="index,follow"');
    // The title lives just above the block and is HTML-escaped.
    expect(INDEX_HTML).toContain(home.title.replace(/&/g, '&amp;'));
  });

  it('declares every managed key the registry produces for the homepage', () => {
    const keys = buildHeadTags(ROUTE_SEO['/'])
      .filter((tag) => tag.kind !== 'title' && tag.kind !== 'jsonld')
      .map((tag) => (tag.kind === 'link' ? tag.rel : tag.key));
    const block = generatedBlock();
    for (const key of keys) {
      expect(block, `index.html is missing data-scs-seo="${key}"`).toContain(`data-scs-seo="${key}"`);
    }
  });

  it('serializes cleanly, so the prerender injection cannot produce broken HTML', () => {
    const html = serializeHeadTags(buildHeadTags(ROUTE_SEO['/']));
    expect(html).toContain('<title>');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('content=""');
  });

  it('advertises no host other than the production origin', () => {
    const block = generatedBlock();
    expect(block).not.toContain('www.scssoftwares.com');
    expect(block).not.toContain('github.io');
    expect(block).not.toContain('http://scssoftwares.com');
  });

  it('no longer carries the stale hard-coded title or share-image dimensions', () => {
    expect(INDEX_HTML).not.toContain('Leading Software Development Company');
    // The old markup declared 1200x630 for a 500x500 logo.
    expect(INDEX_HTML).not.toContain('og:image:width');
  });
});
