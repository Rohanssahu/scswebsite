/**
 * The evidence gate.
 *
 * There are no published case studies. These tests exist so that stays true
 * until real evidence arrives, and so that the moment someone marks a draft as
 * published, the build tells them exactly what is still missing rather than
 * shipping a fabricated page.
 *
 * The last test is the important one: it asserts that nothing anywhere in
 * `src/` imports the drafts module. A draft that reaches a component reaches a
 * route, and a route reaches `dist`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CASE_STUDY_HUB_THRESHOLD,
  EVIDENCE_DESCRIPTIONS,
  assertPublishable,
  hubIsWarranted,
  publishableCaseStudies,
  type CaseStudy,
} from './types';
import { CASE_STUDY_DRAFTS } from './drafts';
import { ALL_ROUTES } from '@/seo/registry';

describe('the evidence gate', () => {
  it('publishes nothing today', () => {
    expect(publishableCaseStudies(CASE_STUDY_DRAFTS)).toEqual([]);
  });

  it('explains, for every draft, exactly what is missing', () => {
    for (const draft of CASE_STUDY_DRAFTS) {
      const reason = assertPublishable(draft);
      expect(reason, `${draft.path} unexpectedly passed the gate`).not.toBeNull();
      expect(draft.missingEvidence.length).toBeGreaterThan(0);
      for (const kind of draft.missingEvidence) {
        expect(EVIDENCE_DESCRIPTIONS, `no description for ${kind}`).toHaveProperty(kind);
      }
    }
  });

  it('refuses a study marked published while evidence is still outstanding', () => {
    const cheating: CaseStudy = { ...CASE_STUDY_DRAFTS[0], status: 'published', client: 'A client' };
    expect(assertPublishable(cheating)).toMatch(/still lists missing evidence/);
  });

  it('refuses a metric with no measurement basis or confirming source', () => {
    // The single most common fabrication in agency case studies: a number with
    // nothing behind it. It must not be possible to publish one.
    const study: CaseStudy = {
      ...CASE_STUDY_DRAFTS[0],
      status: 'published',
      client: 'A UK-based clinic group',
      datePublished: '2026-01-01',
      missingEvidence: [],
      outcomes: [{ description: 'More bookings', value: '40% uplift', basis: '', confirmedBy: '' }],
    };
    expect(assertPublishable(study)).toMatch(/no measurement basis or confirming source/);
  });

  it('refuses a study with no client name and no approved anonymised description', () => {
    const study: CaseStudy = { ...CASE_STUDY_DRAFTS[0], status: 'published', missingEvidence: [] };
    expect(assertPublishable(study)).toMatch(/no client name/);
  });

  it('accepts a study only once every requirement is genuinely met', () => {
    const complete: CaseStudy = {
      ...CASE_STUDY_DRAFTS[0],
      status: 'published',
      client: 'A UK-based clinic group',
      datePublished: '2026-01-01',
      missingEvidence: [],
      outcomes: [
        {
          description: 'Online bookings replaced phone bookings for most appointments',
          value: 'confirmed by the client',
          basis: 'client-reported, comparing the three months before and after launch',
          confirmedBy: 'operations manager, by email, 2026-01-04',
        },
      ],
    };
    expect(assertPublishable(complete)).toBeNull();
  });
});

describe('the case-studies hub', () => {
  it('is not warranted yet', () => {
    expect(hubIsWarranted(CASE_STUDY_DRAFTS)).toBe(false);
    expect(CASE_STUDY_HUB_THRESHOLD).toBe(2);
  });

  it('has no route, so nothing can be crawled or indexed', () => {
    for (const route of ALL_ROUTES) {
      expect(route.canonicalPath.startsWith('/case-studies')).toBe(false);
    }
  });
});

describe('drafts cannot reach production', () => {
  const SRC = new URL('../../', import.meta.url).pathname;

  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) sourceFiles(full, out);
      else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
  }

  it('is imported by nothing outside its own directory', () => {
    // A draft that reaches a component reaches a route, and a route reaches
    // dist. Keeping the import graph empty is what makes "not published"
    // structural rather than a matter of care.
    const importers = sourceFiles(SRC).filter((file) => {
      if (file.includes('/content/caseStudies/')) return false;
      return /from ['"][^'"]*caseStudies\/drafts['"]/.test(readFileSync(file, 'utf8'));
    });
    expect(importers).toEqual([]);
  });
});
