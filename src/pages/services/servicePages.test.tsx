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
import {
  AI_PILLAR_SERVICE,
  AI_SERVICE_CONTENT,
  PILLAR_SERVICE,
  SERVICE_CONTENT,
  SERVICES_HUB_PATH,
  SOFTWARE_SERVICE_CONTENT,
  serviceBreadcrumb,
} from '@/content/services';
import type { ServiceContent } from '@/content/services';

const render = (content: ServiceContent) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <ServicePage content={content} />
    </MemoryRouter>,
  );

/** Rendered once each — these pages are large, and every test reads the same HTML. */
const RENDERED = SERVICE_CONTENT.map((content) => [content, render(content)] as const);

const decodeEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

describe('service page structure', () => {
  it('covers exactly the software and AI service URLs', () => {
    expect(SOFTWARE_SERVICE_CONTENT.map((service) => service.path)).toEqual([
      '/services/custom-software-development',
      '/services/mobile-app-development',
      '/services/web-application-development',
      '/services/saas-development',
      '/services/software-modernization',
    ]);
    expect(AI_SERVICE_CONTENT.map((service) => service.path)).toEqual([
      '/services/ai-development',
      '/services/machine-learning-development',
      '/services/ai-voice-agent-development',
      '/services/ai-video-consultation-agents',
      '/services/conversational-ai-development',
      '/services/ai-automation-integration',
    ]);
    expect(SERVICE_CONTENT).toHaveLength(11);
  });

  it('assigns every page to the group its menu and hub listing use', () => {
    for (const service of SOFTWARE_SERVICE_CONTENT) expect(service.group, service.path).toBe('software');
    for (const service of AI_SERVICE_CONTENT) expect(service.group, service.path).toBe('ai');
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

  it('breadcrumbs read Home / Services / Service Name on every page', () => {
    for (const content of SERVICE_CONTENT) {
      const crumbs = serviceBreadcrumb(content);
      expect(crumbs, content.path).toHaveLength(3);
      expect(crumbs[0]).toEqual({ name: 'Home', path: '/' });
      expect(crumbs[1]).toEqual({ name: 'Services', path: SERVICES_HUB_PATH });
      expect(crumbs[2]).toEqual({ name: content.navLabel, path: content.path });
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

  it('cross-links the service pages without ever linking to itself', () => {
    const known = new Map(SERVICE_CONTENT.map((service) => [service.path, service]));
    for (const [content, html] of RENDERED) {
      expect(content.related, content.path).toHaveLength(6);
      for (const related of content.related) {
        expect(related.path, `${content.path} -> ${related.path}`).not.toBe(content.path);
        const target = known.get(related.path);
        expect(target, `${content.path} links to unknown service ${related.path}`).toBeDefined();
        expect(related.label, related.path).toBe(target?.navLabel);
        expect(html, `${content.path} does not render its ${related.path} link`).toContain(`href="${related.path}"`);
      }
    }
  });

  it('links the software pillar to every other software page', () => {
    const paths = PILLAR_SERVICE.related.map((related) => related.path);
    for (const service of SOFTWARE_SERVICE_CONTENT) {
      if (service.path === PILLAR_SERVICE.path) continue;
      expect(paths, `software pillar does not link to ${service.path}`).toContain(service.path);
    }
  });

  it('links the AI pillar to all five specialist AI pages', () => {
    const paths = AI_PILLAR_SERVICE.related.map((related) => related.path);
    for (const service of AI_SERVICE_CONTENT) {
      if (service.path === AI_PILLAR_SERVICE.path) continue;
      expect(paths, `AI pillar does not link to ${service.path}`).toContain(service.path);
    }
  });

  it('links every specialist AI page back to the AI pillar', () => {
    for (const service of AI_SERVICE_CONTENT) {
      if (service.path === AI_PILLAR_SERVICE.path) continue;
      const paths = service.related.map((related) => related.path);
      expect(paths, `${service.path} does not link back to the AI pillar`).toContain(AI_PILLAR_SERVICE.path);
    }
  });

  it('links every AI page to at least one software-development page', () => {
    const softwarePaths = new Set(SOFTWARE_SERVICE_CONTENT.map((service) => service.path));
    for (const service of AI_SERVICE_CONTENT) {
      const hit = service.related.some((related) => softwarePaths.has(related.path));
      expect(hit, `${service.path} links to no software page`).toBe(true);
    }
  });

  it('links every software page to at least one AI page', () => {
    const aiPaths = new Set(AI_SERVICE_CONTENT.map((service) => service.path));
    for (const service of SOFTWARE_SERVICE_CONTENT) {
      const hit = service.related.some((related) => aiPaths.has(related.path));
      expect(hit, `${service.path} links to no AI page`).toBe(true);
    }
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

// ---------------------------------------------------------------------------
// Phase 2B: the AI pages carry three sections the software pages do not, and
// they make a set of claims we have promised never to make.
// ---------------------------------------------------------------------------

describe('AI service pages', () => {
  const AI_RENDERED = RENDERED.filter(([content]) => content.group === 'ai');

  it('renders use cases, integration approach, limitations and human oversight', () => {
    for (const [content, html] of AI_RENDERED) {
      expect(content.useCases, `${content.path} has no use cases`).toBeDefined();
      expect(content.integration, `${content.path} has no integration section`).toBeDefined();
      expect(content.limitations, `${content.path} has no limitations section`).toBeDefined();

      const text = stripTags(html);
      expect(text, content.path).toContain(content.useCases!.heading);
      expect(text, content.path).toContain(content.integration!.heading);
      expect(text, content.path).toContain(content.limitations!.heading);
      expect(text, content.path).toContain(content.limitations!.oversight.title);
      expect(text, content.path).toContain(content.limitations!.note);
      for (const item of content.useCases!.items) expect(text, `${content.path}: ${item.title}`).toContain(item.title);
      for (const point of content.integration!.points) {
        expect(text, `${content.path}: ${point.slice(0, 40)}`).toContain(point);
      }
      for (const point of content.limitations!.oversight.points) {
        expect(text, `${content.path}: ${point.slice(0, 40)}`).toContain(point);
      }
    }
  });

  it('states that model output is not guaranteed to be correct', () => {
    for (const [content] of AI_RENDERED) {
      const limits = JSON.stringify(content.limitations);
      expect(
        /wrong|imperfect|not eliminate|bounded|cap(?:ped)?|depends on|do not promise|will not promise|does not/i.test(limits),
        `${content.path} states no honest limitation on output quality`,
      ).toBe(true);
    }
  });

  it('promises no accuracy figure, deflection rate or business outcome', () => {
    const forbidden: [RegExp, string][] = [
      [/\b\d{2,3}(?:\.\d+)?% (?:accuracy|accurate|precision|recall|uptime|deflection)/i, 'an accuracy or deflection percentage'],
      [/\bhuman[- ]level\b/i, 'a human-level claim'],
      [/\b(?:eliminates?|removes?) (?:all )?(?:errors|mistakes|hallucinations)\b/i, 'an error-elimination claim'],
      [/\bnever (?:wrong|makes mistakes|hallucinates)\b/i, 'an infallibility claim'],
      [/\b(?:cut|reduce|save)s? (?:costs? )?by \d+%/i, 'a quantified saving claim'],
      [/\bbest AI (?:development )?(?:company|agency|team)\b/i, 'a best-company claim'],
      [/\b(?:fully|completely) autonomous\b/i, 'a full-autonomy claim'],
    ];
    for (const [content] of AI_RENDERED) {
      const serialized = JSON.stringify(content);
      for (const [pattern, label] of forbidden) {
        const hit = serialized.match(pattern);
        expect(hit?.[0], `${content.path} claims ${label}: "${hit?.[0]}"`).toBeUndefined();
      }
    }
  });

  it('exposes no provider name, model name, prompt or credential', () => {
    // Naming the provider or model would date the page and hand an attacker a
    // starting point; the prompts and keys must obviously never appear.
    const leaks = [
      /\bOpenAI\b/i, /\bGPT-?\d/i, /\bGemini\b/i, /\bClaude\b/i, /\bAnthropic\b/i, /\bLlama\b/i,
      /\bMistral\b/i, /\bWhisper\b/i, /\bLiveKit\b/i, /\bSupabase\b/i, /\bDeepgram\b/i, /\bElevenLabs\b/i,
      /\bsystem prompt is\b/i, /\bapi[_ -]?key\b/i, /\bservice[_ -]?role\b/i, /\bsk-[A-Za-z0-9]/,
    ];
    for (const [content] of AI_RENDERED) {
      const serialized = JSON.stringify(content);
      for (const pattern of leaks) {
        const hit = serialized.match(pattern);
        expect(hit?.[0], `${content.path} exposes "${hit?.[0]}"`).toBeUndefined();
      }
    }
  });
});

describe('voice and video agent claims stay inside what is implemented', () => {
  const voice = AI_SERVICE_CONTENT.find((s) => s.path === '/services/ai-voice-agent-development')!;
  const video = AI_SERVICE_CONTENT.find((s) => s.path === '/services/ai-video-consultation-agents')!;

  /** Every "we can call phones" phrasing we must never ship without telephony. */
  const TELEPHONY_CLAIMS = [
    /\b(?:makes?|make|making|places?|handles?|answers?) (?:outbound |inbound )?(?:phone )?calls\b/i,
    /\bphone (?:calling|number|line|system)\b/i,
    /\bcall (?:centre|center)\b/i,
    /\b(?:PSTN|SIP|Twilio)\b/i,
    /\bdial(?:s|ling|ing)? out\b/i,
  ];

  it('never claims telephony on the voice page', () => {
    // The page may discuss telephony only to rule it out, so each hit must sit
    // inside a sentence that denies it.
    const sentences = JSON.stringify(voice).split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      for (const pattern of TELEPHONY_CLAIMS) {
        if (!pattern.test(sentence)) continue;
        expect(
          /\b(?:no|not|never|cannot|do not|does not|without|separate|would|if)\b/i.test(sentence),
          `voice page appears to claim telephony: "${sentence.slice(0, 140)}"`,
        ).toBe(true);
      }
    }
  });

  it('says plainly that the voice agent does not do phone calls', () => {
    const serialized = JSON.stringify(voice).toLowerCase();
    expect(serialized).toContain('we do not offer telephone calling');
    expect(serialized).toContain('browser');
  });

  it('scopes multilingual voice as custom work rather than a universal feature', () => {
    expect(JSON.stringify(voice)).toMatch(/custom scope/i);
  });

  it('distinguishes a voice agent from an IVR', () => {
    const faq = voice.faqs.find((item) => /IVR|phone menu/i.test(item.question));
    expect(faq, 'the voice page has no IVR comparison FAQ').toBeDefined();
    expect(faq!.answer).toMatch(/tree|menu/i);
  });

  it('never presents the video consultant as a human or as photorealistic video', () => {
    const serialized = JSON.stringify(video);
    expect(serialized).toMatch(/not a human employee/i);
    expect(serialized).toMatch(/animated,? not photorealistic|animated avatar/i);
    for (const pattern of [/\bhuman consultant\b/i, /\breal person\b(?![^.]*\bno\b)/i, /\bphotorealistic (?:video|human)\b(?![^.]*\bnot\b)/i]) {
      const hit = serialized.match(pattern);
      if (hit) {
        const index = serialized.indexOf(hit[0]);
        const context = serialized.slice(Math.max(0, index - 120), index + hit[0].length + 60);
        expect(
          /\b(?:no|not|never|is not|rather than|instead of)\b/i.test(context),
          `video page may imply a human: "${context}"`,
        ).toBe(true);
      }
    }
  });

  it('claims no meeting-platform integration or dial-in on the video page', () => {
    const sentences = JSON.stringify(video).split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      // 'Teams' only as the product name — the bare word is far too common.
      if (!/\b(?:Zoom|Google Meet|Microsoft Teams|dial-in|dial in)\b/i.test(sentence)) continue;
      expect(
        /\b(?:no|not|never|cannot|unless|separate|would|do not|does not)\b/i.test(sentence),
        `video page may claim a platform integration: "${sentence.slice(0, 140)}"`,
      ).toBe(true);
    }
  });

  it('labels estimates as preliminary and never binding', () => {
    const serialized = JSON.stringify(video);
    expect(serialized).toMatch(/preliminary/i);
    expect(serialized).toMatch(/not (?:a )?quotation|not binding|never binding|not legally binding/i);
  });

  it('keeps sales commitments with a person', () => {
    const serialized = JSON.stringify(video);
    expect(serialized).toMatch(/does not (?:close|negotiate)|not close sales|human review/i);
  });

  it('captures transcripts only with consent on both pages', () => {
    for (const page of [voice, video]) {
      expect(JSON.stringify(page), page.path).toMatch(/consent/i);
    }
  });
});

describe('machine learning page stays distinct from generative AI', () => {
  const ml = AI_SERVICE_CONTENT.find((s) => s.path === '/services/machine-learning-development')!;

  it('explains that feasibility depends on data availability and quality', () => {
    const serialized = JSON.stringify(ml);
    expect(serialized).toMatch(/data (?:availability|assessment|quality)/i);
    expect(serialized).toMatch(/bounded by the data available/i);
  });

  it('promises no accuracy figure or business outcome', () => {
    const limits = JSON.stringify(ml.limitations);
    expect(limits).toMatch(/do not quote an accuracy figure|not quote an accuracy/i);
    expect(limits).toMatch(/do not promise a business outcome/i);
  });

  it('says explicitly that it is not the same as generative AI', () => {
    const faq = ml.faqs.find((item) => /ChatGPT|generative/i.test(item.question + item.answer));
    expect(faq, 'the ML page never distinguishes itself from generative AI').toBeDefined();
  });
});

describe('automation page describes integrations as custom work', () => {
  const automation = AI_SERVICE_CONTENT.find((s) => s.path === '/services/ai-automation-integration')!;

  it('never advertises ready-made connectors', () => {
    const serialized = JSON.stringify(automation);
    expect(serialized).toMatch(/custom (?:work|integration)/i);
    // Any mention of a ready-made connector must be a denial.
    for (const sentence of serialized.split(/(?<=[.!?])\s+/)) {
      if (!/\b(?:ready-made|out-of-the-box|pre-?built) connectors?\b/i.test(sentence)) continue;
      expect(
        /\b(?:no|not|never|do not|does not|rather than)\b/i.test(sentence),
        `automation page may claim ready-made connectors: "${sentence.slice(0, 140)}"`,
      ).toBe(true);
    }
  });

  it('keeps a human at the approval point', () => {
    const serialized = JSON.stringify(automation);
    expect(serialized).toMatch(/approval checkpoint/i);
    expect(serialized).toMatch(/audit trail/i);
    expect(automation.limitations!.oversight.points.length).toBeGreaterThanOrEqual(3);
  });
});
