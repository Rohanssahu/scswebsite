// Markup contract for /about, and for the founder story in particular.
//
// The page has one job that nothing else on the site does: state, in visible
// HTML text, who founded SCS Softwares, when, where and why. These tests hold
// that copy in place — and hold the line on everything the owner did not
// verify, which is the harder half.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import About from './About';
import Index from './Index';
import { VERIFIED_COUNT_CLAIMS, founderSection, homeFounderLink } from '@/content/founder';
import { FOUNDER, FOUNDING_LOCATION, FOUNDING_YEAR } from '@/seo/site';
import { readFileSync } from 'node:fs';

const render = (element: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);

const html = render(<About />);
const homeHtml = render(<Index />);

/** Visible text, with the entities React escaped folded back. */
const textOf = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

const text = textOf(html);
const homeText = textOf(homeHtml);

/**
 * Just the page body, without the shared header and footer. The footer prints
 * the current year in its copyright line, so a year scan over the whole
 * document would always see it.
 */
const mainOnly = (markup: string) =>
  textOf(markup.slice(markup.indexOf('id="main-content"'), markup.indexOf('</main>')));

const mainText = mainOnly(html);

describe('/about page structure', () => {
  it('renders exactly one H1 and the main landmark', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toContain('id="main-content"');
  });

  it('keeps the founder heading at H2, under the page H1', () => {
    // React escapes the ampersand in "Founder & CEO" on the way out.
    const escapedHeading = founderSection.heading.replace(/&/g, '&amp;');
    expect(html).toContain(`sm:text-4xl">${escapedHeading}</h2>`);
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf(escapedHeading));
  });

  it('gives the founder section the id the Person @id points at', () => {
    expect(html).toContain(`id="${FOUNDER.sectionId}"`);
    expect(FOUNDER.sectionId).toBe('founder');
  });
});

describe('founder identity as visible text', () => {
  it('shows the visible H2 "Meet Rohan Sahu, Founder & CEO"', () => {
    expect(founderSection.heading).toBe('Meet Rohan Sahu, Founder & CEO');
    expect(text).toContain('Meet Rohan Sahu, Founder & CEO');
  });

  it('renders the name and designation as real HTML text, not only in the image', () => {
    // Strip every tag first: if the name survives, it was page text.
    expect(text).toContain('Rohan Sahu');
    expect(text).toContain('Founder & CEO');
    // And specifically as their own text nodes in the founder card.
    expect(html).toContain('>Rohan Sahu</p>');
    expect(html).toContain('>Founder &amp; CEO</p>');
  });

  it('states the company origin: founded in Indore in 2022', () => {
    expect(founderSection.origin).toBe('Founded in Indore in 2022');
    expect(text).toContain('Founded in Indore in 2022');
    expect(text).toContain(`in ${FOUNDING_LOCATION.city} in ${FOUNDING_YEAR}`);
  });

  it('names Indore, Madhya Pradesh, India as the founding location', () => {
    expect(FOUNDING_LOCATION.label).toBe('Indore, Madhya Pradesh, India');
    expect(text).toContain('Indore, Madhya Pradesh, India');
  });

  it('carries the founder image with the descriptive alt text', () => {
    expect(html).toContain(`src="${FOUNDER.imagePath}"`);
    expect(html).toContain('alt="Rohan Sahu, Founder and CEO of SCS Softwares"');
    // Intrinsic dimensions, so the card does not shift as the photo loads.
    expect(html).toContain(`width="${FOUNDER.imageWidth}"`);
    expect(html).toContain(`height="${FOUNDER.imageHeight}"`);
  });

  it('ships that image file in public/', () => {
    const file = new URL(`../../public${FOUNDER.imagePath}`, import.meta.url);
    expect(() => readFileSync(file)).not.toThrow();
    // Keep it in the same weight class as the rest of the site's photography.
    expect(readFileSync(file).byteLength).toBeLessThan(400_000);
  });

  it('links onward to Contact and to Project Analysis', () => {
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/project-analysis"');
    expect(founderSection.primaryCta.path).toBe('/project-analysis');
    expect(founderSection.secondaryCta.path).toBe('/contact');
  });
});

describe('the founding story', () => {
  it('renders all five paragraphs, verbatim', () => {
    expect(founderSection.story).toHaveLength(5);
    for (const paragraph of founderSection.story) {
      expect(text, paragraph.slice(0, 50)).toContain(paragraph);
    }
  });

  it('names the founder, the year and the city in the opening paragraph', () => {
    const opening = founderSection.story[0];
    expect(opening).toContain('Rohan Sahu');
    expect(opening).toContain('2022');
    expect(opening).toContain('Indore');
  });

  it('attributes the experience to Rohan, never to the company', () => {
    const opening = founderSection.story[0];
    expect(opening).toMatch(/Rohan Sahu, a software professional with more than eight years/);
    expect(opening).toContain('over four years of experience working directly with freelance');
  });

  it('keeps the 50+ client and 150+ project figures in one phrasing', () => {
    expect(text).toContain('more than 50 clients');
    expect(text).toContain('over 150 mobile, web and AI/ML projects');
    for (const claim of VERIFIED_COUNT_CLAIMS) expect(text, claim).toContain(claim);
    // No competing figure for either count.
    const clientCounts = new Set([...text.matchAll(/(\d+)\+? clients/g)].map((m) => m[1]));
    const projectCounts = new Set([...text.matchAll(/(\d+)\+? (?:mobile|projects)/g)].map((m) => m[1]));
    expect([...clientCounts]).toEqual(['50']);
    expect([...projectCounts]).toEqual(['150']);
  });

  it('does not claim SCS Softwares independently owns every project', () => {
    // The exact hedged wording, kept because not all 150 were our own products.
    expect(text).toContain('contributed to or delivered over 150');
    expect(text).not.toMatch(/\bwe (?:own|built and own) (?:all|every)\b/i);
    expect(text).not.toMatch(/\b150\+? (?:of our own|proprietary|in-house) products\b/i);
  });

  it('renders the three honest reasons the company was founded', () => {
    expect(text).toContain('Why SCS Softwares was founded');
    expect(founderSection.reasons.map((reason) => reason.title)).toEqual([
      'Understand the business before writing code',
      'Deliver production-ready products, not incomplete prototypes',
      'Support products after launch through long-term partnerships',
    ]);
    for (const reason of founderSection.reasons) {
      expect(text, reason.title).toContain(reason.title);
      expect(text, reason.body.slice(0, 40)).toContain(reason.body);
    }
    // A subsection of the founder story, so H3/H4 — never a second H1 or H2.
    expect(html).toContain(`sm:text-3xl">${founderSection.whyHeading}</h3>`);
    for (const reason of founderSection.reasons) {
      expect(html).toContain(`>${reason.title}</h4>`);
    }
  });
});

describe('/about claims nothing the owner did not verify', () => {
  it('never says the company itself has 8+ or 10+ years of history', () => {
    // The founder's own record is spelled out in words for exactly this reason.
    expect(text).not.toMatch(/\d+\+ years/i);
    for (const pattern of [
      /(?:company|SCS Softwares|we|our team) (?:has|have) (?:been )?(?:over |more than )?(?:8|10|eight|ten)\+? years/i,
      /(?:8|10|eight|ten)\+? years (?:of |in )?(?:business|operation|operating|trading)/i,
      /(?:since|established in|founded in) (?:201\d)/i,
      /a decade of/i,
    ]) {
      expect(text, String(pattern)).not.toMatch(pattern);
    }
    // The only year the page body states is 2022. (The footer's copyright line
    // prints the current year, which is why this reads the main content only.)
    expect([...new Set([...mainText.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => m[0]))]).toEqual(['2022']);
  });

  it('phrases the founder experience as personal, in words not "8+ years"', () => {
    expect(founderSection.credentials).toEqual([
      'More than eight years in software development',
      'Over four years working directly with freelance and international clients',
    ]);
    for (const credential of founderSection.credentials) expect(text).toContain(credential);
  });

  it('shows no unsupported social profile for the founder', () => {
    expect(FOUNDER.sameAs).toHaveLength(0);
    // The footer's company LinkedIn page is the only one on the page, and it is
    // the company's — the founder card links to no personal profile.
    const founderCard = html.slice(html.indexOf('id="founder"'), html.indexOf('Why SCS Softwares was founded'));
    for (const host of ['linkedin.com', 'twitter.com', 'x.com', 'github.com', 'instagram.com', 'facebook.com']) {
      expect(founderCard, host).not.toContain(host);
    }
  });

  it('shows no award, education, certification, rating or revenue claim', () => {
    for (const pattern of [
      /\baward[- ]winning\b/i,
      /\b(?:graduated|degree|B\.?Tech|M\.?Tech|MBA|university|college|alumni)\b/i,
      /\b(?:certified|certification|ISO ?\d)/i,
      /\b\d+(?:\.\d+)?\s*(?:\/\s*5|stars?|out of 5)\b/i,
      /\b\d+% (?:satisfaction|success|uptime|growth|retention)\b/i,
      /\b(?:revenue|turnover|valuation|funding|raised)\b/i,
      /\b(?:featured|covered) in\b/i,
      /\b(?:employees|headcount|staff of \d)\b/i,
    ]) {
      expect(text, String(pattern)).not.toMatch(pattern);
    }
  });

  it('claims no office outside Indore', () => {
    expect(text).not.toMatch(/\boffices? in (?!Indore)[A-Z]/);
    // The page states the opposite, and that sentence must survive.
    expect(text).toContain('we hold no office outside India');
  });
});

describe('internal links to the founder story', () => {
  it('links the homepage to /about with a natural, unstuffed sentence', () => {
    expect(homeHtml).toContain(`href="${homeFounderLink.path}"`);
    expect(homeText).toContain(homeFounderLink.sentence);
    expect(homeText).toContain(homeFounderLink.linkLabel);
    // The anchor text reads like a link, not like a keyword.
    expect(homeFounderLink.linkLabel).toBe('Read our story');
    expect(homeFounderLink.linkLabel.toLowerCase()).not.toContain('founder');
  });

  it('states the founding year on the homepage from the one constant', () => {
    expect(mainOnly(homeHtml)).toContain(String(FOUNDING_YEAR));
    expect(homeText).not.toContain('2018');
  });

  it('does not stuff "founder" into the homepage or the About page', () => {
    // A handful of deliberate uses on /about; a single mention on the homepage.
    expect((text.match(/founder/gi) ?? []).length).toBeLessThanOrEqual(8);
    expect((homeText.match(/founder/gi) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('reaches /about from the footer, which both pages render', () => {
    // The footer's Quick Links block carries About Us on every page.
    for (const markup of [html, homeHtml]) expect(markup).toContain('href="/about"');
  });
});

describe('the story exists in exactly one place', () => {
  it('is not duplicated per locale or per country', () => {
    // The prose lives in `@/content/founder` and nowhere else. If a translated
    // or country-specific copy is ever added, this catches the second version.
    const sample = founderSection.story[1].slice(0, 60);
    const searched = [
      '../i18n/locales/en.json',
      '../i18n/locales/ar.json',
      '../i18n/locales/ur.json',
    ];
    for (const relative of searched) {
      const contents = readFileSync(new URL(relative, import.meta.url), 'utf8');
      expect(contents, relative).not.toContain(sample);
      // And no locale may still carry the retired 2018 founding paragraph.
      expect(contents, relative).not.toContain('2018');
    }
  });

  it('keeps the honesty scan verified-count list in step with the content', () => {
    // `scripts/verify-dist.mjs` cannot import TypeScript, so it repeats these
    // two figures. This is the assertion that keeps the copies identical.
    const script = readFileSync(new URL('../../scripts/verify-dist.mjs', import.meta.url), 'utf8');
    for (const claim of VERIFIED_COUNT_CLAIMS) {
      expect(script, claim).toContain(`'${claim}'`);
    }
  });
});
