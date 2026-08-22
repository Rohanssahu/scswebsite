// Contract for the GA4 layer: what it sends, and what it can never send.
//
// The test environment is node, so there is no window and no gtag unless a
// test installs one. That is itself half the contract — the prerender and the
// unit suite both import these modules, and neither may emit a hit.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isTrackedRoute, logEvent, logPageView, normalizeRoute } from '@/utils/analytics';
import { CONVERSION_EVENTS, CONVERSION_KINDS, trackConversion } from '@/utils/conversionAnalytics';
import { CONSULTATION_EVENTS, trackConsultation } from '@/utils/consultationAnalytics';
import { SITE_ORIGIN } from '@/seo/site';

type Hit = [string, ...unknown[]];

let hits: Hit[];

/** Install a fake tag, the way index.html installs the real one. */
function installTag(): void {
  hits = [];
  (globalThis as { window?: unknown }).window = {
    gtag: (...args: Hit) => {
      hits.push(args);
    },
  };
  (globalThis as { document?: unknown }).document = { title: 'A Page Title' };
}

function removeTag(): void {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
}

beforeEach(installTag);
afterEach(removeTag);

describe('route normalization', () => {
  it('leaves an ordinary public path alone', () => {
    for (const path of ['/', '/about', '/services', '/services/ai-development', '/locations/turkey']) {
      expect(normalizeRoute(path)).toBe(path);
    }
  });

  it('drops the query string and the fragment, either of which can carry a token', () => {
    expect(normalizeRoute('/contact?utm_source=x&token=SECRETVALUE')).toBe('/contact');
    expect(normalizeRoute('/schedule-call#book')).toBe('/schedule-call');
    expect(normalizeRoute('/about?a=1#b')).toBe('/about');
  });

  it('normalizes a trailing slash without collapsing the root', () => {
    expect(normalizeRoute('/locations/')).toBe('/locations');
    expect(normalizeRoute('/')).toBe('/');
  });

  it('replaces a meeting reference with its parameter name', () => {
    expect(normalizeRoute('/ai-consultation/MTG-9f3a2b7c')).toBe('/ai-consultation/:reference');
    expect(normalizeRoute('/ai-consultation/MTG-9f3a2b7c/')).toBe('/ai-consultation/:reference');
  });

  it('replaces a lead id with its parameter name', () => {
    expect(normalizeRoute('/admin/leads/8241')).toBe('/admin/leads/:id');
  });

  it('reports no page view for any admin route', () => {
    for (const path of ['/admin', '/admin/', '/admin/login', '/admin/leads/8241']) {
      expect(isTrackedRoute(path), path).toBe(false);
    }
    for (const path of ['/', '/about', '/ai-consultation/MTG-1']) {
      expect(isTrackedRoute(path), path).toBe(true);
    }
  });
});

describe('page views', () => {
  it('sends exactly one page_view per call, rebuilt from the production origin', () => {
    logPageView('/locations/singapore');
    expect(hits).toHaveLength(1);
    const [command, name, params] = hits[0] as [string, string, Record<string, unknown>];
    expect([command, name]).toEqual(['event', 'page_view']);
    expect(params.page_path).toBe('/locations/singapore');
    expect(params.page_location).toBe(`${SITE_ORIGIN}/locations/singapore`);
    expect(params.page_title).toBe('A Page Title');
  });

  it('never lets a query parameter reach page_location', () => {
    logPageView('/contact?token=SECRETVALUE&email=someone%40example.com');
    const params = (hits[0] as [string, string, Record<string, unknown>])[2];
    expect(JSON.stringify(params)).not.toContain('SECRETVALUE');
    expect(JSON.stringify(params)).not.toContain('example.com');
    expect(params.page_location).toBe(`${SITE_ORIGIN}/contact`);
  });

  it('sends the redacted path and no title for a route that names a booking', () => {
    logPageView('/ai-consultation/MTG-9f3a2b7c');
    const params = (hits[0] as [string, string, Record<string, unknown>])[2];
    expect(params.page_path).toBe('/ai-consultation/:reference');
    // The document title on a meeting screen can name the person it belongs to.
    expect(params).not.toHaveProperty('page_title');
    expect(JSON.stringify(params)).not.toContain('9f3a2b7c');
  });

  it('sends nothing at all for an admin route', () => {
    logPageView('/admin/leads/8241');
    logPageView('/admin');
    expect(hits).toHaveLength(0);
  });

  it('sends nothing when no tag is installed, which is the prerender and test case', () => {
    removeTag();
    expect(() => {
      logPageView('/about');
      logEvent({ category: 'Conversion', action: 'contact_submitted' });
      trackConversion('contact_submitted');
      trackConsultation('consultation_scheduled');
    }).not.toThrow();
    installTag();
  });
});

describe('conversion and consultation events', () => {
  it('sends a conversion as a plain event with a coarse label', () => {
    trackConversion('project_analysis_completed', 'ai');
    expect(hits).toHaveLength(1);
    const [command, name, params] = hits[0] as [string, string, Record<string, unknown>];
    expect([command, name]).toEqual(['event', 'project_analysis_completed']);
    expect(params).toEqual({ event_category: 'Conversion', event_label: 'ai' });
  });

  it('covers the conversions the launch checklist requires', () => {
    // Consultation scheduling and completion live in the consultation allowlist;
    // the other three live here. Between them, all five are reportable.
    expect(CONVERSION_EVENTS).toContain('contact_submitted');
    expect(CONVERSION_EVENTS).toContain('requirement_submitted');
    expect(CONVERSION_EVENTS).toContain('project_analysis_completed');
    expect(CONSULTATION_EVENTS).toContain('consultation_scheduled');
    expect(CONSULTATION_EVENTS).toContain('consultation_completed');
  });

  it('drops an event name or a kind that is not on the allowlist', () => {
    trackConversion('lead_email_captured' as never);
    expect(hits).toHaveLength(0);
    trackConversion('contact_submitted', 'rohan@example.com' as never);
    const params = (hits[0] as [string, string, Record<string, unknown>])[2];
    expect(params).toEqual({ event_category: 'Conversion' });
  });

  it('accepts only enum values as a kind, so free text has no route through', () => {
    for (const kind of CONVERSION_KINDS) expect(kind).toMatch(/^[a-z]+$/);
  });

  it('delivers a consultation event now that the tag is reached directly', () => {
    // Regression guard: react-ga4 queued these until an initialize() that never
    // ran, so every one of them was silently discarded before Phase 4.
    trackConsultation('consultation_completed');
    expect(hits).toHaveLength(1);
    expect((hits[0] as [string, string])[1]).toBe('consultation_completed');
  });

  it('reduces consultation props to an enum label and a bounded integer', () => {
    trackConsultation('proposal_presented', { count: 9999, kind: 'scheduled' });
    const params = (hits[0] as [string, string, Record<string, unknown>])[2];
    expect(params.event_label).toBe('scheduled');
    expect(params.value).toBe(100);
  });
});

describe('the page-view source is single', () => {
  const indexHtml = readFileSync('index.html', 'utf8');
  const appTsx = readFileSync('src/App.tsx', 'utf8');
  const routeAnalytics = readFileSync('src/components/RouteAnalytics.tsx', 'utf8');

  it('loads exactly one gtag script and configures exactly one measurement id', () => {
    expect(indexHtml.match(/googletagmanager\.com\/gtag\/js/g)).toHaveLength(1);
    expect(indexHtml.match(/gtag\('config'/g)).toHaveLength(1);
  });

  it('stops the tag from sending a page view of its own', () => {
    // Without this, every landing page is counted twice: once by the tag and
    // once by RouteAnalytics on its first render.
    expect(indexHtml).toMatch(/gtag\('config',\s*'G-[A-Z0-9]+',\s*\{\s*send_page_view:\s*false\s*\}\)/);
  });

  it('mounts the route listener inside the router, and nowhere else', () => {
    expect(appTsx).toContain('<RouteAnalytics />');
    expect(appTsx.match(/<RouteAnalytics \/>/g)).toHaveLength(1);
    // SiteRoutes is what the prerenderer mounts; analytics must not be in it.
    const siteRoutes = appTsx.slice(appTsx.indexOf('export const SiteRoutes'), appTsx.indexOf('const App = ()'));
    expect(siteRoutes).not.toContain('RouteAnalytics');
  });

  it('keys the listener on pathname alone and ignores a repeated path', () => {
    // A hash or query change is not a navigation, and StrictMode runs effects
    // twice — both would otherwise produce a second page view.
    expect(routeAnalytics).toContain('}, [pathname]);');
    expect(routeAnalytics).toContain('if (lastReported.current === pathname) return;');
  });

  it('leaves no second tracker in the codebase', () => {
    // react-ga4 is what used to initialize a second stream. Nothing imports it.
    for (const file of ['src/utils/analytics.ts', 'src/utils/conversionAnalytics.ts', 'src/utils/consultationAnalytics.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/^\s*import .*react-ga4/m);
    }
  });
});
