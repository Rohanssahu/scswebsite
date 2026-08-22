/**
 * The AI-referral classifier, and the gate that keeps it from leaking anything.
 *
 * The second describe block is the one that matters most: it drives real
 * referrer URLs and query strings carrying emails, phone numbers, tokens and
 * meeting references through the classifier, and asserts that what comes out is
 * always a bare enum member. That is what makes "no PII in analytics" a
 * property of the code rather than a promise in a comment.
 */

import { describe, expect, it } from 'vitest';
import {
  LANDING_GROUPS,
  TRAFFIC_SOURCES,
  classifyTrafficSource,
  isAiSource,
  landingGroupFor,
} from './trafficSource';
import { acquisitionFor } from './acquisitionAnalytics';

describe('classifyTrafficSource — AI assistants', () => {
  it.each([
    ['https://chatgpt.com/', 'chatgpt'],
    ['https://chat.openai.com/c/abc', 'chatgpt'],
    ['https://www.perplexity.ai/search/xyz', 'perplexity'],
    ['https://claude.ai/chat/1234', 'claude'],
    ['https://gemini.google.com/app', 'gemini'],
    ['https://bard.google.com/', 'gemini'],
    ['https://copilot.microsoft.com/', 'copilot'],
    ['https://www.bing.com/chat?q=test', 'copilot'],
    ['https://you.com/search', 'ai-other'],
    ['https://poe.com/', 'ai-other'],
  ])('reads %s as %s', (referrer, expected) => {
    expect(classifyTrafficSource(referrer, '')).toBe(expected);
  });

  it('recognises utm_source=chatgpt.com when the referrer is stripped', () => {
    // The case the whole module exists for: ChatGPT appends this to links it
    // renders, and several assistants strip the referrer entirely. Without the
    // UTM check this visit would be indistinguishable from someone typing the
    // URL, and would be recorded as `direct`.
    expect(classifyTrafficSource('', '?utm_source=chatgpt.com')).toBe('chatgpt');
    expect(classifyTrafficSource('', 'utm_source=chatgpt.com&utm_medium=referral')).toBe('chatgpt');
  });

  it('lets a UTM marker override a referrer', () => {
    expect(classifyTrafficSource('https://t.co/abc', '?utm_source=perplexity')).toBe('perplexity');
  });

  it('marks the AI buckets and only those', () => {
    const ai = TRAFFIC_SOURCES.filter(isAiSource);
    expect(ai).toEqual(['chatgpt', 'perplexity', 'claude', 'gemini', 'copilot', 'ai-other']);
  });
});

describe('classifyTrafficSource — search, social, direct', () => {
  it.each([
    ['https://www.google.com/search?q=x', 'google-search'],
    ['https://www.google.co.uk/', 'google-search'],
    ['https://www.bing.com/search?q=x', 'bing-search'],
    ['https://duckduckgo.com/?q=x', 'other-search'],
    ['https://search.brave.com/search', 'other-search'],
    ['https://www.linkedin.com/feed/', 'social'],
    ['https://l.facebook.com/', 'social'],
    ['https://news.ycombinator.com/item', 'referral'],
    ['', 'direct'],
    ['not a url', 'direct'],
  ])('reads %s as %s', (referrer, expected) => {
    expect(classifyTrafficSource(referrer, '')).toBe(expected);
  });

  it('treats same-site referrers as internal, not as a new acquisition', () => {
    expect(classifyTrafficSource('https://scssoftwares.com/services', '')).toBe('internal');
    expect(classifyTrafficSource('https://www.scssoftwares.com/about', '')).toBe('internal');
    expect(acquisitionFor('https://scssoftwares.com/services', '', '/contact')).toBeNull();
  });

  it('does not mistake Google AI Overview clicks for a separate source', () => {
    // Stated as a test so nobody later "fixes" this into a fake `google-ai`
    // bucket: an AI Overview click sends the same referrer as a blue link.
    // There is no evidence in the browser that separates them.
    expect(classifyTrafficSource('https://www.google.com/', '')).toBe('google-search');
  });
});

describe('landingGroupFor', () => {
  it.each([
    ['/', 'home'],
    ['/services', 'services-hub'],
    ['/services/ai-voice-agent-development', 'service'],
    ['/locations', 'locations-hub'],
    ['/locations/united-kingdom', 'market'],
    ['/locations/united-kingdom/', 'market'],
    ['/about', 'about'],
    ['/contact', 'contact'],
    ['/project-analysis', 'project-analysis'],
    ['/project-analysis/result', 'project-analysis'],
    ['/schedule-call', 'schedule-call'],
    ['/careers', 'other'],
  ])('groups %s as %s', (path, expected) => {
    expect(landingGroupFor(path)).toBe(expected);
  });
});

describe('nothing identifying can leave the module', () => {
  // Every value here is something that must never reach GA4. They are fed in as
  // referrers and as query strings, and the output is checked to be a bare enum
  // member — not merely "does not contain the secret", but "is one of twelve
  // known words".
  const POISON = [
    'rohan@example.com',
    '+917828690192',
    'Rohan Sahu',
    'eyJhbGciOiJIUzI1NiJ9.secret.token',
    'MEET-9F3A-2B71',
    'sk-proj-abcdefghijklmnop',
    'lead_id=4821',
    'requirements=we need a booking app for 40 clinics',
  ];

  it.each(POISON)('returns a plain enum for a referrer carrying %s', (poison) => {
    const source = classifyTrafficSource(`https://chatgpt.com/c/${encodeURIComponent(poison)}`, '');
    expect(TRAFFIC_SOURCES).toContain(source);
    expect(source).toBe('chatgpt');
  });

  it.each(POISON)('returns a plain enum for a query string carrying %s', (poison) => {
    const search = `?utm_source=chatgpt.com&email=${encodeURIComponent(poison)}&token=${encodeURIComponent(poison)}`;
    const source = classifyTrafficSource('', search);
    expect(TRAFFIC_SOURCES).toContain(source);
  });

  it('never returns anything outside the two enums, for any input', () => {
    const referrers = [
      ...POISON.map((p) => `https://example.com/?q=${encodeURIComponent(p)}`),
      'https://scssoftwares.com/ai-consultation/MEET-9F3A-2B71',
      'javascript:alert(1)',
      'https://',
      '//evil.example.com',
    ];
    for (const referrer of referrers) {
      for (const search of ['', '?utm_source=' + encodeURIComponent(POISON[0])]) {
        expect(TRAFFIC_SOURCES).toContain(classifyTrafficSource(referrer, search));
      }
    }
  });

  it('builds a label that is exactly two enum members joined by a pipe', () => {
    const report = acquisitionFor(
      'https://chatgpt.com/c/rohan%40example.com',
      '?utm_source=chatgpt.com&email=rohan%40example.com',
      '/services/ai-voice-agent-development',
    );
    expect(report).not.toBeNull();
    const label = `${report!.source}|${report!.landing}`;
    expect(label).toBe('chatgpt|service');
    const [source, landing] = label.split('|');
    expect(TRAFFIC_SOURCES).toContain(source);
    expect(LANDING_GROUPS).toContain(landing);
    expect(label).not.toMatch(/@|\+\d|eyJ|sk-|MEET-/);
  });
});
