/**
 * The build gate over `public/robots.txt`.
 *
 * `public/robots.txt` is the only crawl configuration on this site that is not
 * typed, and the failure it invites is silent: a blanket "block the AI bots"
 * edit removes SCS Softwares from ChatGPT search, Claude search and Perplexity
 * while every page still renders perfectly and every other test still passes.
 *
 * These tests read the real shipped file and assert it against the typed policy
 * in `./robots.ts`, so that edit fails the build instead.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DECLARED_CRAWLERS,
  FORBIDDEN_DIRECTIVES,
  PRIVATE_PATHS,
  SEARCH_CRAWLERS,
  SITEMAP_DIRECTIVE,
  TRAINING_CRAWLERS,
  USER_INITIATED_CRAWLERS,
  grantsPublicAccess,
  groupFor,
  parseRobots,
  trainingAllowed,
} from './robots';
import { indexableRoutes } from './registry';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = path.join(ROOT, 'public/robots.txt');
const BUILT = path.join(ROOT, 'dist/robots.txt');

const text = fs.readFileSync(SOURCE, 'utf8');
const parsed = parseRobots(text);

describe('robots.txt — structure', () => {
  it('declares the sitemap on the canonical host', () => {
    expect(parsed.sitemaps).toContain('https://scssoftwares.com/sitemap.xml');
    expect(text).toContain(SITEMAP_DIRECTIVE);
  });

  it('has a `*` group that allows the public site', () => {
    const fallback = parsed.groups.find((group) => group.userAgents.includes('*'));
    expect(fallback).toBeDefined();
    expect(grantsPublicAccess(fallback)).toBe(true);
  });

  it('contains no noindex-style directive', () => {
    // robots.txt cannot express noindex. A Disallow used as a substitute hides
    // the real meta tag and can leave a URL indexed with no snippet.
    for (const forbidden of FORBIDDEN_DIRECTIVES) {
      for (const line of parsed.directiveLines) {
        expect(line.startsWith(`${forbidden}:`)).toBe(false);
      }
    }
  });

  it('blocks nothing beyond the two genuinely private prefixes', () => {
    for (const group of parsed.groups) {
      for (const disallowed of group.disallow) {
        expect(
          (PRIVATE_PATHS as readonly string[]).includes(disallowed),
          `group [${group.userAgents.join(', ')}] disallows "${disallowed}", which is not a private path`,
        ).toBe(true);
      }
    }
  });

  it('repeats every private path in every group', () => {
    // A named group does not inherit `*`. Omitting a line here would expose the
    // staff dashboard or a private consultation room to that one crawler.
    for (const group of parsed.groups) {
      for (const privatePath of PRIVATE_PATHS) {
        expect(
          group.disallow,
          `group [${group.userAgents.join(', ')}] does not disallow ${privatePath}`,
        ).toContain(privatePath);
      }
    }
  });

  it('names no crawler the policy module does not declare', () => {
    const declared = new Set(ALL_DECLARED_CRAWLERS.map((crawler) => crawler.token.toLowerCase()));
    for (const group of parsed.groups) {
      for (const agent of group.userAgents) {
        if (agent === '*') continue;
        expect(declared, `robots.txt names "${agent}" but src/seo/robots.ts does not declare it`).toContain(
          agent.toLowerCase(),
        );
      }
    }
  });
});

describe('robots.txt — search and answer-engine access', () => {
  it.each(SEARCH_CRAWLERS)('allows $token ($operator)', (crawler) => {
    const group = groupFor(parsed, crawler.token);
    expect(group, `no group matches ${crawler.token}`).toBeDefined();
    expect(
      grantsPublicAccess(group),
      `${crawler.token} is not granted public access — this removes the site from ${crawler.operator} results`,
    ).toBe(true);
  });

  it.each(USER_INITIATED_CRAWLERS)('allows $token ($operator)', (crawler) => {
    expect(grantsPublicAccess(groupFor(parsed, crawler.token))).toBe(true);
  });

  it('grants every indexable route to every search crawler', () => {
    // Nothing in the sitemap may sit behind a Disallow for a search crawler.
    for (const crawler of SEARCH_CRAWLERS) {
      const group = groupFor(parsed, crawler.token);
      for (const route of indexableRoutes()) {
        for (const disallowed of group?.disallow ?? []) {
          expect(
            route.canonicalPath.startsWith(disallowed),
            `${crawler.token} is disallowed from ${route.canonicalPath} but it is in the sitemap`,
          ).toBe(false);
        }
      }
    }
  });
});

describe('robots.txt — training access is a separate, deliberate choice', () => {
  it('matches the recorded owner decision', () => {
    for (const crawler of TRAINING_CRAWLERS) {
      const group = groupFor(parsed, crawler.token);
      expect(group, `no group matches ${crawler.token}`).toBeDefined();
      expect(
        grantsPublicAccess(group),
        `${crawler.token} access does not match trainingAllowed=${trainingAllowed}. ` +
          'Change public/robots.txt and src/seo/robots.ts together, never one alone.',
      ).toBe(trainingAllowed);
    }
  });

  it('keeps each training crawler in its own group, separate from any search crawler', () => {
    // If a training token ever shares a group with a search token, revoking
    // training would silently revoke search too.
    const searchTokens = new Set(SEARCH_CRAWLERS.map((crawler) => crawler.token.toLowerCase()));
    for (const crawler of TRAINING_CRAWLERS) {
      const group = groupFor(parsed, crawler.token);
      for (const agent of group?.userAgents ?? []) {
        expect(
          searchTokens.has(agent.toLowerCase()),
          `${crawler.token} shares a group with the search crawler ${agent}`,
        ).toBe(false);
      }
    }
  });
});

describe('robots.txt — the built copy', () => {
  it('ships to dist byte-for-byte', () => {
    if (!fs.existsSync(BUILT)) return; // dist is optional in a source-only run
    expect(fs.readFileSync(BUILT, 'utf8')).toBe(text);
  });
});
