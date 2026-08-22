/**
 * The analytics privacy gate, checked at the source level.
 *
 * `analytics.test.ts` and `trafficSource.test.ts` prove the current functions
 * cannot leak anything. This file guards the property they rely on: that the
 * *only* way to send an event is through one of the three allowlist wrappers,
 * and that no module anywhere in `src/` reaches past them to `window.gtag` or
 * `dataLayer` directly.
 *
 * That is the shape a leak would actually take. Nobody adds `email` to
 * `logEvent`'s signature — someone adds a one-line `gtag('event', ...)` next to
 * a form submit handler because it is quicker, and passes the form values.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONVERSION_EVENTS, CONVERSION_KINDS } from './conversionAnalytics';
import { CONSULTATION_EVENTS } from './consultationAnalytics';
import { LANDING_GROUPS, TRAFFIC_SOURCES } from './trafficSource';
import { normalizeRoute } from './analytics';

const SRC = new URL('../', import.meta.url).pathname;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC);
const relative = (file: string) => file.slice(SRC.length);

describe('there is exactly one way out to the tag', () => {
  it('lets only utils/analytics.ts touch window.gtag or dataLayer', () => {
    const offenders = FILES.filter((file) => {
      if (relative(file) === 'utils/analytics.ts') return false;
      const source = readFileSync(file, 'utf8');
      return /\bwindow\s*\.\s*gtag\b|\bdataLayer\b|\bgtag\s*\(/.test(source);
    }).map(relative);
    expect(offenders).toEqual([]);
  });

  it('imports react-ga4 nowhere', () => {
    // It was removed because it silently buffered every event; a stray import
    // would reintroduce a second, unmanaged path to the tag.
    const offenders = FILES.filter((file) => /from ['"]react-ga4['"]/.test(readFileSync(file, 'utf8'))).map(relative);
    expect(offenders).toEqual([]);
  });

  it('calls logEvent only from the allowlist wrappers', () => {
    const allowed = new Set([
      'utils/analytics.ts',
      'utils/conversionAnalytics.ts',
      'utils/consultationAnalytics.ts',
      'utils/acquisitionAnalytics.ts',
    ]);
    const offenders = FILES.filter((file) => {
      if (allowed.has(relative(file))) return false;
      return /\blogEvent\s*\(/.test(readFileSync(file, 'utf8'));
    }).map(relative);
    expect(offenders).toEqual([]);
  });
});

describe('every reportable value comes from a closed list', () => {
  it('keeps conversion events and kinds as literal unions', () => {
    for (const value of [...CONVERSION_EVENTS, ...CONVERSION_KINDS, ...CONSULTATION_EVENTS]) {
      expect(typeof value).toBe('string');
      // No enum member may look like an address, a number or a token.
      expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('keeps traffic sources and landing groups as short slugs', () => {
    for (const value of [...TRAFFIC_SOURCES, ...LANDING_GROUPS]) {
      expect(value).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(value.length).toBeLessThan(24);
    }
  });

  it('covers the conversions the measurement plan names', () => {
    // If one of these is removed, the reporting in
    // docs/seo/AI_VISIBILITY_MEASUREMENT.md silently stops working.
    expect(CONVERSION_EVENTS).toContain('contact_submitted');
    expect(CONVERSION_EVENTS).toContain('project_analysis_completed');
    expect(CONVERSION_EVENTS).toContain('human_review_requested');
    expect(CONVERSION_EVENTS).toContain('requirement_submitted');
    expect(CONSULTATION_EVENTS).toContain('consultation_schedule_started');
    expect(CONSULTATION_EVENTS).toContain('consultation_completed');
  });
});

describe('no route reported to analytics can carry an identifier', () => {
  it.each([
    ['/ai-consultation/MEET-9F3A-2B71', '/ai-consultation/:reference'],
    ['/admin/leads/4821', '/admin/leads/:id'],
    ['/contact?email=rohan%40example.com', '/contact'],
    ['/contact#token=abc123', '/contact'],
    ['/project-analysis/result?ref=MEET-9F3A', '/project-analysis/result'],
  ])('collapses %s to %s', (input, expected) => {
    expect(normalizeRoute(input)).toBe(expected);
  });

  it('never returns a route containing an @, a long digit run or a token prefix', () => {
    const hostile = [
      '/contact?email=rohan@example.com',
      '/ai-consultation/eyJhbGciOiJIUzI1NiJ9',
      '/admin/leads/00000000-0000-0000-0000-000000000000',
      '/schedule-call?phone=+917828690192',
      '/x?sk-proj-abcdef',
    ];
    for (const path of hostile) {
      const route = normalizeRoute(path);
      expect(route, path).not.toMatch(/@|sk-|eyJ|\+\d{6,}/);
    }
  });
});
