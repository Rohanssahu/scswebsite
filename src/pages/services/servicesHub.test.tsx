// Markup contract for the /services hub.
//
// The hub is the middle crumb in every service page's breadcrumb, so it has to
// list every service, link to each one, and carry its own visible trail.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n/config';
import ServicesHub from './ServicesHub';
import {
  AI_SERVICE_CONTENT,
  DELIVERY_SERVICE_CONTENT,
  GROWTH_SERVICE_CONTENT,
  SERVICE_CONTENT,
  SERVICES_HUB_PATH,
  SOFTWARE_SERVICE_CONTENT,
  hubBreadcrumb,
  servicesHub,
} from '@/content/services';
import { ALL_SERVICE_NAV } from '@/data/serviceNav';

const html = renderToStaticMarkup(
  <MemoryRouter>
    <ServicesHub />
  </MemoryRouter>,
);

const text = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

describe('services hub', () => {
  it('lives at /services and is named Services', () => {
    expect(SERVICES_HUB_PATH).toBe('/services');
    expect(servicesHub.navLabel).toBe('Services');
  });

  it('renders exactly one H1 and the main landmark', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain('id="main-content"');
    expect(text).toContain(servicesHub.h1);
  });

  it('renders its own visible breadcrumb: Home / Services', () => {
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('aria-current="page"');
    const crumbs = hubBreadcrumb();
    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', 'Services']);
    for (const crumb of crumbs) expect(text, crumb.name).toContain(crumb.name);
  });

  it('links to every service page, in every group', () => {
    for (const service of SERVICE_CONTENT) {
      expect(html, `hub does not link to ${service.path}`).toContain(`href="${service.path}"`);
      expect(text, `hub does not name ${service.navLabel}`).toContain(service.navLabel);
    }
    for (const item of ALL_SERVICE_NAV) {
      expect(html, `hub does not link to ${item.path}`).toContain(`href="${item.path}"`);
    }
  });

  it('lists every group in the same order as the content modules', () => {
    const group = (id: string) => servicesHub.groups.find((entry) => entry.id === id);
    expect(servicesHub.groups.map((entry) => entry.id)).toEqual(['software', 'ai', 'delivery', 'growth']);
    expect(group('software')?.entries.map((entry) => entry.path)).toEqual(
      SOFTWARE_SERVICE_CONTENT.map((service) => service.path),
    );
    expect(group('ai')?.entries.map((entry) => entry.path)).toEqual(AI_SERVICE_CONTENT.map((service) => service.path));
    expect(group('delivery')?.entries.map((entry) => entry.path)).toEqual(
      DELIVERY_SERVICE_CONTENT.map((service) => service.path),
    );
    expect(group('growth')?.entries.map((entry) => entry.path)).toEqual(
      GROWTH_SERVICE_CONTENT.map((service) => service.path),
    );
  });

  it('keeps marketing support in a group of its own, apart from the engineering pillars', () => {
    const growth = servicesHub.groups.find((entry) => entry.id === 'growth');
    expect(growth?.entries).toHaveLength(1);
    expect(growth?.entries[0].path).toBe('/services/digital-marketing');
    expect(growth?.intro).toMatch(/supporting service/i);
  });

  it('points every hub entry at a real page and writes its own blurb', () => {
    const blurbs = new Set<string>();
    for (const group of servicesHub.groups) {
      for (const entry of group.entries) {
        expect(entry.path.startsWith('/services/'), entry.path).toBe(true);
        expect(entry.blurb.length, entry.path).toBeGreaterThan(60);
        expect(blurbs.has(entry.blurb), `duplicate hub blurb on ${entry.path}`).toBe(false);
        blurbs.add(entry.blurb);
        // The hub blurb is written for the listing, not copied from the page.
        const service = SERVICE_CONTENT.find((item) => item.path === entry.path);
        if (service) expect(entry.blurb, entry.path).not.toBe(service.valueProp);
      }
    }
  });

  it('links to no retired /gig/ URL', () => {
    expect(html).not.toContain('/gig/');
  });

  it('carries all three conversion CTAs', () => {
    for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
      expect(html, `hub has no link to ${target}`).toContain(`href="${target}"`);
    }
  });

  it('ships substantial copy rather than a bare link list', () => {
    expect(text.trim().split(' ').length).toBeGreaterThan(500);
  });

  it('makes no fabricated claim', () => {
    const forbidden = [
      /\bguarantee/i,
      /\b\d{2,}\+? (?:happy )?(?:clients|customers|projects)\b/i,
      /\baward[- ]winning\b/i,
      /\b\d+% (?:satisfaction|success)/i,
      /\boffices? in (?:the )?(?:USA|UK|Canada|Australia|Germany|Netherlands|Singapore|UAE|Turkey)\b/i,
      /\bnumber one\b/i,
    ];
    for (const pattern of forbidden) expect(text, String(pattern)).not.toMatch(pattern);
  });

  it('names no target country, because this is a global page', () => {
    const countries = /\b(USA|United States|United Kingdom|Canada|Australia|Germany|Netherlands|Singapore|UAE|Dubai|Turkey)\b/gi;
    expect(JSON.stringify(servicesHub).match(countries) ?? []).toHaveLength(0);
  });

  it.each(['ar', 'ur'])('renders under %s with English fallback', async (language) => {
    const previous = i18n.language;
    try {
      await i18n.changeLanguage(language);
      const translated = renderToStaticMarkup(
        <MemoryRouter>
          <ServicesHub />
        </MemoryRouter>,
      );
      expect(translated).toContain(servicesHub.h1);
      expect(translated).not.toContain('services.names.');
      expect(translated).not.toContain('nav.allServices');
    } finally {
      await i18n.changeLanguage(previous);
    }
  });
});
