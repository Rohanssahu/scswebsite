import { describe, expect, it } from 'vitest';
import {
  LEGACY_ORIGINS,
  SITE_ORIGIN,
  assetUrl,
  canonicalUrl,
  normalizeCanonicalPath,
  stripKnownOrigin,
} from './site';

describe('canonical normalization', () => {
  it('keeps the root path as a single slash', () => {
    expect(normalizeCanonicalPath('/')).toBe('/');
    expect(normalizeCanonicalPath('')).toBe('/');
    expect(normalizeCanonicalPath('//')).toBe('/');
  });

  it('strips trailing slashes from everything except the root', () => {
    expect(normalizeCanonicalPath('/about/')).toBe('/about');
    expect(normalizeCanonicalPath('/about///')).toBe('/about');
    expect(normalizeCanonicalPath('/gig/web-development/')).toBe('/gig/web-development');
  });

  it('drops query strings and fragments', () => {
    expect(normalizeCanonicalPath('/project-analysis?method=manual')).toBe('/project-analysis');
    expect(normalizeCanonicalPath('/project-analysis?mode=new#top')).toBe('/project-analysis');
    expect(normalizeCanonicalPath('/#why-scs')).toBe('/');
  });

  it('collapses duplicate slashes and an explicit index.html', () => {
    expect(normalizeCanonicalPath('//about//team')).toBe('/about/team');
    expect(normalizeCanonicalPath('/about/index.html')).toBe('/about');
    expect(normalizeCanonicalPath('/index.html')).toBe('/');
  });

  it('adds the leading slash to a bare path', () => {
    expect(normalizeCanonicalPath('contact')).toBe('/contact');
  });

  it('preserves path case, because GitHub Pages paths are case sensitive', () => {
    expect(normalizeCanonicalPath('/ProductDetailsPage')).toBe('/ProductDetailsPage');
    expect(normalizeCanonicalPath('/PrivacyPolicy/')).toBe('/PrivacyPolicy');
  });

  it('folds every legacy host onto the one production origin', () => {
    for (const origin of [SITE_ORIGIN, ...LEGACY_ORIGINS]) {
      expect(normalizeCanonicalPath(`${origin}/about/`)).toBe('/about');
      expect(stripKnownOrigin(origin)).toBe('/');
    }
    expect(canonicalUrl('https://www.scssoftwares.com/contact')).toBe('https://scssoftwares.com/contact');
    expect(canonicalUrl('https://rohanssahu.github.io/scswebsite/careers')).toBe(
      'https://scssoftwares.com/careers',
    );
  });

  it('leaves genuinely external URLs alone', () => {
    const external = 'https://www.linkedin.com/company/105694530';
    expect(normalizeCanonicalPath(external)).toBe(external);
    expect(stripKnownOrigin(external)).toBe(external);
    // Protocol-relative external URLs must not be rewritten into local paths.
    expect(normalizeCanonicalPath('//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png');
  });

  it('builds absolute URLs on exactly one origin', () => {
    expect(canonicalUrl('/')).toBe('https://scssoftwares.com/');
    expect(canonicalUrl('/about')).toBe('https://scssoftwares.com/about');
    expect(canonicalUrl('about/')).toBe('https://scssoftwares.com/about');
    expect(assetUrl('images/og-cover.png')).toBe('https://scssoftwares.com/images/og-cover.png');
  });

  it('never produces a www, github.io or http URL', () => {
    for (const input of ['/', '/about', 'https://www.scssoftwares.com/x', 'http://scssoftwares.com/y']) {
      const url = canonicalUrl(input);
      expect(url.startsWith('https://scssoftwares.com')).toBe(true);
      expect(url).not.toContain('www.');
      expect(url).not.toContain('github.io');
    }
  });
});
