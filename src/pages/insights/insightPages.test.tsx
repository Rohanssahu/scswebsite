// Content and markup contracts for the published articles.
//
// The section exists to be cited — by a reader, by a search engine and by an
// assistant. That only works if what it says is true, so these tests police the
// two ways an "expertise" section normally goes wrong:
//
//   1. **Fabricated evidence.** A client anecdote nobody can check, a
//      percentage improvement nobody measured, a case study that does not
//      exist. Persuasive, unverifiable, and the reason so much agency content
//      cannot be trusted.
//   2. **False authorship.** A founder byline on a piece the founder did not
//      write. Invisible to every other check — the page renders, the markup
//      validates — which is exactly why it needs a test.
//
// The rendered HTML is asserted rather than the source objects, because the
// claim is about what a reader and a crawler actually receive.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ArticlePage from '@/components/insights/ArticlePage';
import { formatArticleDate } from '@/components/insights/formatArticleDate';
import InsightsHub from '@/pages/insights/InsightsHub';
import { INSIGHT_CONTENT } from '@/content/insights/all';
import { INSIGHT_META, INSIGHTS_HUB_PATH, insightBreadcrumb } from '@/content/insights';
import type { InsightContent } from '@/content/insights';
import { SERVICE_META } from '@/content/services';
import { ALL_ROUTES, ROUTE_SEO } from '@/seo/registry';
import { FOUNDER } from '@/seo/site';
import { FOUNDER_ID } from '@/seo/jsonld';

const render = (content: InsightContent) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ArticlePage content={content} />
    </MemoryRouter>,
  );

const RENDERED = INSIGHT_CONTENT.map((content) => [content, render(content)] as const);

const decodeEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

describe('insights structure', () => {
  it('has a body for every article in the manifest and nothing else', () => {
    expect(INSIGHT_CONTENT.map((insight) => insight.path).sort()).toEqual(
      INSIGHT_META.map((insight) => insight.path).sort(),
    );
  });

  it('registers every article as an indexable route', () => {
    for (const insight of INSIGHT_META) {
      const route = ROUTE_SEO[insight.path];
      expect(route, `${insight.path} is not in the SEO registry`).toBeDefined();
      expect(route.indexability).toBe('indexable');
      expect(route.robots).toBe('index,follow');
      expect(route.canonical).toBe(`https://scssoftwares.com${insight.path}`);
      expect(route.og.type).toBe('article');
    }
  });

  it.each(RENDERED)('$0.path renders exactly one H1, and it is the article title', (content, html) => {
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s).toHaveLength(1);
    expect(stripTags(h1s[0][1])).toContain(content.h1);
  });

  it.each(RENDERED)('$0.path renders a visible breadcrumb matching the markup', (content, html) => {
    expect(html).toContain('aria-label="Breadcrumb"');
    for (const crumb of insightBreadcrumb(content)) {
      expect(stripTags(html)).toContain(crumb.name);
    }
  });

  it.each(RENDERED)('$0.path anchors every contents entry to a real section', (content, html) => {
    for (const section of content.sections) {
      expect(html, `missing anchor #${section.id}`).toContain(`href="#${section.id}"`);
      expect(html, `missing section id ${section.id}`).toContain(`id="${section.id}"`);
    }
    // Every id unique, or two anchors point at the same place.
    const ids = content.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(RENDERED)('$0.path links only to service pages that exist', (content, html) => {
    const servicePaths = new Set(SERVICE_META.map((service) => service.path));
    for (const match of html.matchAll(/href="(\/services\/[^"#?]*)"/g)) {
      expect(servicePaths, `${content.path} links to ${match[1]}`).toContain(match[1]);
    }
    expect(content.related.length).toBeGreaterThanOrEqual(2);
  });

  it('is long-form — a short article is a blog post, and we are not writing those', () => {
    for (const [content, html] of RENDERED) {
      const words = stripTags(html).split(' ').length;
      expect(words, `${content.path} is only ${words} words`).toBeGreaterThan(1500);
    }
  });
});

describe('authorship is a factual claim, not a signal', () => {
  it.each(RENDERED)('$0.path renders a visible byline naming the author', (content, html) => {
    const text = stripTags(html);
    expect(text).toContain(FOUNDER.name);
    expect(text).toContain(FOUNDER.jobTitle);
    // The byline links to the page that defines the Person node the markup
    // points at, so a reader can check the claim the same way a crawler does.
    expect(html).toContain('href="/about#founder"');
  });

  it('points every Article.author at the one founder Person node', () => {
    for (const insight of INSIGHT_META) {
      const article = ROUTE_SEO[insight.path].jsonLd.find((node) => node['@type'] === 'Article');
      expect(article, `${insight.path} has no Article node`).toBeDefined();
      expect(article!.author).toEqual({ '@id': FOUNDER_ID });
      expect(FOUNDER_ID).toBe('https://scssoftwares.com/about#founder');
    }
  });

  it('records only the founder as an author', () => {
    // One legal value. Widening this is a decision about who really writes the
    // content, not a typing change.
    for (const insight of INSIGHT_META) {
      expect(insight.author).toBe('rohan-sahu');
    }
  });

  it.each(RENDERED)('$0.path states the first-hand basis it is written from', (content, html) => {
    const text = stripTags(html);
    expect(text).toContain('What this is based on');
    expect(text).toContain(content.basis);
    expect(content.basis.length).toBeGreaterThan(80);
  });

  it('renders the same dates the markup declares', () => {
    for (const [content, html] of RENDERED) {
      const article = ROUTE_SEO[content.path].jsonLd.find((node) => node['@type'] === 'Article')!;
      expect(article.datePublished).toBe(content.datePublished);
      expect(article.dateModified).toBe(content.dateModified);
      expect(html).toContain(`dateTime="${content.datePublished}"`);
      expect(stripTags(html)).toContain(formatArticleDate(content.datePublished));
    }
  });

  it('never sets dateModified earlier than datePublished', () => {
    for (const insight of INSIGHT_META) {
      expect(insight.dateModified >= insight.datePublished, insight.path).toBe(true);
    }
  });

  it('carries no rating, review or award in the Article markup', () => {
    for (const insight of INSIGHT_META) {
      const article = ROUTE_SEO[insight.path].jsonLd.find((node) => node['@type'] === 'Article')!;
      for (const forbidden of ['aggregateRating', 'review', 'award', 'speakable', 'hasCredential']) {
        expect(article, `${insight.path} carries ${forbidden}`).not.toHaveProperty(forbidden);
      }
    }
  });
});

describe('articles invent no evidence', () => {
  const FABRICATED: [RegExp, string][] = [
    [/\bone of our clients?\b/i, 'an unnamed client anecdote'],
    [/\ba client (?:of ours )?(?:told|asked|reported|saw|achieved)\b/i, 'a client anecdote'],
    [/\bwe (?:increased|improved|reduced|cut|grew|boosted) [^.]{0,40}\bby \d/i, 'an unverified result metric'],
    [/\b\d+(?:\.\d+)?\s?% (?:increase|improvement|uplift|reduction|faster|cheaper)\b/i, 'an unverified percentage'],
    [/\bsaved (?:them|the client|our client)\b/i, 'an unverified saving'],
    [/\bcase stud(?:y|ies) (?:show|shows|showed)\b/i, 'a case study that does not exist'],
    [/\bour (?:award|certification)s?\b/i, 'an award or certification'],
    [/\bwe guarantee\b/i, 'a guarantee'],
    [/\b(?:will|guaranteed to) rank\b/i, 'a ranking promise'],
    [/\b(?:the )?(?:best|number one|#1|leading|top) (?:company|agency|team|developers?|partner)\b/i, 'a superlative'],
    [/\bISO ?\d|SOC ?2|HIPAA[- ]compliant|GDPR[- ]certified/i, 'a certification we do not hold'],
  ];

  it.each(RENDERED)('$0.path contains no fabricated evidence', (content, html) => {
    const text = stripTags(html);
    for (const [pattern, label] of FABRICATED) {
      const match = text.match(pattern);
      expect(match, `${content.path} contains ${label}: "${match?.[0]}"`).toBeNull();
    }
  });

  it.each(RENDERED)('$0.path names no client, product or project', (content, html) => {
    const text = stripTags(html);
    // We publish no client names anywhere on the site. A proper noun followed
    // by a delivery verb is the shape one would take if it slipped in.
    expect(text).not.toMatch(/\bfor (?:client )?[A-Z][a-zA-Z]+ (?:Ltd|Inc|LLC|GmbH|BV|Pvt)\b/);
    expect(text).not.toMatch(/\bwe built [A-Z][a-zA-Z]{3,}(?:'s)? (?:app|platform|product)\b/);
  });

  it('quotes no metric it has not measured, anywhere in the source objects', () => {
    for (const insight of INSIGHT_CONTENT) {
      const everything = JSON.stringify(insight);
      // Percentages are the classic invented metric. There is currently no
      // legitimate use for one in these articles; if a real, cited figure is
      // ever added, this test is where the citation requirement gets recorded.
      expect(everything, `${insight.path} contains a percentage figure`).not.toMatch(/\d+(?:\.\d+)?\s?%/);
    }
  });
});

describe('articles are distinct from each other and from the service pages', () => {
  it('gives every article its own title, description and H1', () => {
    const titles = INSIGHT_META.map((insight) => insight.metaTitle);
    const descriptions = INSIGHT_META.map((insight) => insight.metaDescription);
    const h1s = INSIGHT_CONTENT.map((insight) => insight.h1);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(h1s).size).toBe(h1s.length);
  });

  it('shares no title or description with any other indexable route', () => {
    const indexable = ALL_ROUTES.filter((route) => route.indexability === 'indexable');
    const titles = indexable.map((route) => route.title);
    const descriptions = indexable.map((route) => route.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('repeats no FAQ answer between the two articles', () => {
    const answers = INSIGHT_CONTENT.flatMap((insight) => insight.faqs.map((faq) => faq.answer));
    expect(new Set(answers).size).toBe(answers.length);
    const questions = INSIGHT_CONTENT.flatMap((insight) => insight.faqs.map((faq) => faq.question));
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('keeps meta descriptions inside search-result limits', () => {
    for (const insight of INSIGHT_META) {
      expect(insight.metaTitle.length, insight.path).toBeLessThanOrEqual(70);
      expect(insight.metaDescription.length, insight.path).toBeLessThanOrEqual(190);
    }
  });
});

describe('the insights hub', () => {
  const hubHtml = renderToStaticMarkup(
    <MemoryRouter>
      <InsightsHub />
    </MemoryRouter>,
  );

  it('links to every published article', () => {
    for (const insight of INSIGHT_META) {
      expect(hubHtml).toContain(`href="${insight.path}"`);
    }
  });

  it('links to no article that does not exist', () => {
    const known = new Set<string>([INSIGHTS_HUB_PATH, ...INSIGHT_META.map((insight) => insight.path)]);
    for (const match of hubHtml.matchAll(/href="(\/insights[^"#?]*)"/g)) {
      expect(known).toContain(match[1]);
    }
  });

  it('explains why the list is short instead of promising more posts', () => {
    // A hub that says "more coming soon" ages into an abandoned blog. Stating
    // the publishing rule is honest at two articles and still honest at twenty.
    const text = stripTags(hubHtml);
    expect(text).toMatch(/first-hand experience/i);
    expect(text).not.toMatch(/coming soon|watch this space|new posts weekly/i);
  });

  it('renders exactly one H1', () => {
    expect([...hubHtml.matchAll(/<h1[^>]*>/g)]).toHaveLength(1);
  });
});
