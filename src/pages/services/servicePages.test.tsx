// Markup and content contracts for the five canonical service pages.
//
// The project's test environment is node (no jsdom, no testing-library), so —
// like adminMarkup.test.tsx — these render to static markup and assert on the
// HTML. That covers the things Phase 2A has to hold: one H1, a visible
// breadcrumb, every required section, the three CTA destinations, honest
// claims, and copy that is genuinely different per page rather than one
// template with the keywords swapped.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n/config';
import ServicePage from '@/components/services/ServicePage';
import { PILLAR_SERVICE, SERVICE_CONTENT, serviceBreadcrumb } from '@/content/services';
import type { ServiceContent } from '@/content/services';

const render = (content: ServiceContent) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ServicePage content={content} />
    </MemoryRouter>,
  );

/** Rendered once each — these pages are large, and every test reads the same HTML. */
const RENDERED = SERVICE_CONTENT.map((content) => [content, render(content)] as const);

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('service page structure', () => {
  it('covers exactly the five Phase 2A URLs', () => {
    expect(SERVICE_CONTENT.map((service) => service.path)).toEqual([
      '/services/custom-software-development',
      '/services/mobile-app-development',
      '/services/web-application-development',
      '/services/saas-development',
      '/services/software-modernization',
    ]);
  });

  it('renders exactly one H1, carrying the page heading', () => {
    for (const [content, html] of RENDERED) {
      expect(html.match(/<h1[\s>]/g) ?? [], content.path).toHaveLength(1);
      expect(stripTags(html), content.path).toContain(content.h1);
    }
  });

  it('renders the main landmark and a visible breadcrumb trail', () => {
    for (const [content, html] of RENDERED) {
      expect(html, content.path).toContain('id="main-content"');
      expect(html, content.path).toContain('aria-label="Breadcrumb"');
      expect(html, content.path).toContain('aria-current="page"');
      for (const crumb of serviceBreadcrumb(content)) {
        expect(stripTags(html), `${content.path}: ${crumb.name}`).toContain(crumb.name);
      }
    }
  });

  it('breadcrumbs start at Home and end on the page itself', () => {
    for (const content of SERVICE_CONTENT) {
      const crumbs = serviceBreadcrumb(content);
      expect(crumbs[0]).toEqual({ name: 'Home', path: '/' });
      expect(crumbs.at(-1)?.path).toBe(content.path);
      // The pillar page is the parent of the other four.
      if (content.path !== PILLAR_SERVICE.path) {
        expect(crumbs).toHaveLength(3);
        expect(crumbs[1].path).toBe(PILLAR_SERVICE.path);
      } else {
        expect(crumbs).toHaveLength(2);
      }
    }
  });

  it('renders every required section', () => {
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      const required = [
        content.valueProp,
        content.problems.heading,
        content.capabilities.heading,
        content.approach.heading,
        content.process.heading,
        content.engagement.heading,
        content.security.heading,
        content.security.note,
        content.cta.title,
        'Questions we are asked most',
        'Related services',
      ];
      for (const fragment of required) {
        expect(text, `${content.path} is missing: ${fragment.slice(0, 50)}`).toContain(
          fragment.replace(/&/g, '&').replace(/\s+/g, ' '),
        );
      }
    }
  });

  it('covers discovery, architecture/UX, build, QA and launch on every page', () => {
    for (const [content, html] of RENDERED) {
      expect(content.process.steps, content.path).toHaveLength(5);
      const text = stripTags(html);
      for (const step of content.process.steps) {
        expect(text, `${content.path}: ${step.title}`).toContain(step.title);
        for (const point of step.points) expect(text, `${content.path}: ${point}`).toContain(point);
      }
    }
  });

  it('shows the FAQ questions and answers in the markup, without JavaScript', () => {
    for (const [content, html] of RENDERED) {
      expect(content.faqs.length, content.path).toBeGreaterThanOrEqual(5);
      expect(html, content.path).toContain('<details');
      const text = stripTags(html);
      for (const faq of content.faqs) {
        expect(text, `${content.path}: ${faq.question}`).toContain(faq.question);
        expect(text, `${content.path}: answer to ${faq.question}`).toContain(faq.answer.slice(0, 60));
      }
    }
  });

  it('links to the estimate, consultation and contact pages', () => {
    for (const [content, html] of RENDERED) {
      for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
        expect(html, `${content.path} -> ${target}`).toContain(`href="${target}"`);
      }
    }
  });

  it('cross-links the five pages without ever linking to itself', () => {
    const known = new Map(SERVICE_CONTENT.map((service) => [service.path, service]));
    for (const [content, html] of RENDERED) {
      expect(content.related, content.path).toHaveLength(4);
      for (const related of content.related) {
        expect(related.path, `${content.path} -> ${related.path}`).not.toBe(content.path);
        const target = known.get(related.path);
        expect(target, `${content.path} links to unknown service ${related.path}`).toBeDefined();
        expect(related.label, related.path).toBe(target?.navLabel);
        expect(html, `${content.path} does not render its ${related.path} link`).toContain(`href="${related.path}"`);
      }
    }
  });

  it('links the pillar page to all four of the others', () => {
    const paths = PILLAR_SERVICE.related.map((related) => related.path).sort();
    expect(paths).toEqual(
      SERVICE_CONTENT.filter((service) => service.path !== PILLAR_SERVICE.path)
        .map((service) => service.path)
        .sort(),
    );
  });

  it('gives no page an entry animation that would hide its copy from a crawler', () => {
    for (const [content, html] of RENDERED) {
      expect(html, content.path).not.toContain('opacity:0');
    }
  });

  it('hotlinks no external image and embeds no stock portrait', () => {
    const stockHosts = [
      'images.unsplash.com',
      'istockphoto.com',
      'shutterstock',
      'pexels.com',
      'gstatic.com',
      'media.licdn.com',
      'cloudinary.com',
    ];
    for (const [content, html] of RENDERED) {
      // Every image is a local file under public/ — no cross-origin request,
      // and no stock portrait standing in for a client or a team member.
      for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
        expect(match[1].startsWith('/'), `${content.path}: ${match[1]}`).toBe(true);
      }
      for (const host of stockHosts) {
        expect(html.includes(host), `${content.path} references ${host}`).toBe(false);
      }
    }
  });
});

describe('service page copy is honest', () => {
  const FORBIDDEN: [RegExp, string][] = [
    [/\boffices? in (?:the )?(?:USA|UK|Canada|Australia|Germany|Netherlands|Singapore|UAE|Turkey|Dubai|London|New York)\b/i, 'a foreign office'],
    [/\b(?:we are|we're) (?:the )?(?:best|number one|no\.? ?1|#1)\b/i, 'a best/number-one claim'],
    [/\baward[- ]winning\b/i, 'an award claim'],
    [/\bISO ?\d{4,}[- ]certified\b/i, 'a certification claim'],
    [/\b\d{2,}\+? (?:happy )?(?:clients|customers|projects)\b/i, 'an unverifiable project or client count'],
    [/\b\d+% (?:satisfaction|success|uptime)\b/i, 'an unverifiable percentage claim'],
    [/\b\d+\+ years\b/i, 'an unverifiable years claim'],
    [/\bunlimited scale\b/i, 'an unlimited-scale promise'],
    [/\bfully (?:secure|compliant)\b/i, 'an absolute security or compliance claim'],
    [/\btestimonial/i, 'a testimonial'],
  ];

  it('never promises a guaranteed outcome', () => {
    // The word may appear, but only inside a disclaimer ("we cannot guarantee
    // an app is unbreachable") — never as a promise.
    for (const content of SERVICE_CONTENT) {
      const serialized = JSON.stringify(content);
      for (const match of serialized.matchAll(/guarantee[a-z]*/gi)) {
        const context = serialized.slice(Math.max(0, match.index - 60), match.index);
        expect(
          /\b(?:no|not|never|cannot|can't|without|nor)\b/i.test(context),
          `${content.path} promises a guarantee: "…${context.slice(-60)}${match[0]}"`,
        ).toBe(true);
      }
    }
  });

  it('makes no forbidden marketing claim anywhere in the content', () => {
    for (const content of SERVICE_CONTENT) {
      const serialized = JSON.stringify(content);
      for (const [pattern, label] of FORBIDDEN) {
        const hit = serialized.match(pattern);
        expect(hit?.[0], `${content.path} claims ${label}: "${hit?.[0]}"`).toBeUndefined();
      }
    }
  });

  it('does not repeat target-market country names on these global pages', () => {
    const countries = /\b(USA|United States|UK|United Kingdom|Canada|Australia|Germany|Netherlands|Singapore|UAE|Dubai|Turkey)\b/gi;
    for (const content of SERVICE_CONTENT) {
      const hits = JSON.stringify(content).match(countries) ?? [];
      expect(hits, `${content.path} name-drops target markets: ${hits.join(', ')}`).toHaveLength(0);
    }
  });

  it('positions the company as India-based on the pillar page', () => {
    const serialized = JSON.stringify(SERVICE_CONTENT);
    expect(serialized).toContain('India');
    expect(serialized).toContain('Indore');
  });

  it('states the limits of the modernization and SaaS promises', () => {
    const modernization = SERVICE_CONTENT.find((s) => s.path === '/services/software-modernization');
    expect(modernization?.security.note).toMatch(/without risk/i);
    const saas = SERVICE_CONTENT.find((s) => s.path === '/services/saas-development');
    expect(saas?.security.note).toMatch(/certification/i);
    expect(saas?.security.note).toMatch(/scales without limit|without limit/i);
  });
});

describe('service page copy is unique per page', () => {
  it('gives every page its own title, description, H1 and value proposition', () => {
    for (const field of ['metaTitle', 'metaDescription', 'h1', 'valueProp'] as const) {
      const values = SERVICE_CONTENT.map((service) => service[field]);
      expect(new Set(values).size, `duplicate ${field}`).toBe(values.length);
    }
  });

  it('keeps titles and descriptions inside search-result limits', () => {
    for (const service of SERVICE_CONTENT) {
      expect(service.metaTitle.length, `${service.path} title`).toBeLessThanOrEqual(75);
      expect(service.metaDescription.length, `${service.path} description`).toBeGreaterThan(80);
      expect(service.metaDescription.length, `${service.path} description`).toBeLessThanOrEqual(190);
    }
  });

  it('shares no section heading, problem, process step or FAQ between two pages', () => {
    const seen = new Map<string, string>();
    for (const service of SERVICE_CONTENT) {
      const strings = [
        service.problems.heading,
        service.capabilities.heading,
        service.approach.heading,
        service.process.heading,
        service.engagement.heading,
        service.security.heading,
        service.cta.title,
        ...service.problems.items.map((item) => item.title),
        ...service.problems.items.map((item) => item.body),
        ...service.process.steps.map((step) => step.body),
        ...service.faqs.map((faq) => faq.question),
        ...service.faqs.map((faq) => faq.answer),
        ...service.intro,
      ];
      for (const value of strings) {
        const previous = seen.get(value);
        expect(previous, `"${value.slice(0, 60)}…" appears on both ${previous} and ${service.path}`).toBeUndefined();
        seen.set(value, service.path);
      }
    }
  });

  it('carries substantial body copy on every page', () => {
    for (const [content, html] of RENDERED) {
      const words = stripTags(html).trim().split(/\s+/).length;
      expect(words, `${content.path} has only ${words} words`).toBeGreaterThan(900);
    }
  });
});

describe('Arabic and Urdu keep working on English-only pages', () => {
  // Phase 2A ships these pages in English only. The site's fallbackLng is 'en',
  // so ar/ur must render them without throwing and without leaking raw i18n
  // keys into the markup where a translation does not exist yet.
  it.each(['ar', 'ur'])('renders the pillar page under %s with English fallback', async (language) => {
    const previous = i18n.language;
    try {
      await i18n.changeLanguage(language);
      const html = render(PILLAR_SERVICE);
      expect(html).toContain(PILLAR_SERVICE.h1);
      // Untranslated service names fall back to English rather than showing the key.
      expect(html).not.toContain('services.names.');
      expect(html).not.toContain('nav.softwareDevelopment');
      expect(html).toContain('SaaS Development');
    } finally {
      await i18n.changeLanguage(previous);
    }
  });
});
