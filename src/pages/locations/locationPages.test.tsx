// Markup, honesty and uniqueness contracts for the Phase 3A regional pages.
//
// The project's test environment is node (no jsdom, no testing-library), so —
// like servicePages.test.tsx — these render to static markup and assert on the
// HTML. Three things are being defended here:
//
//   1. structure: one H1, a visible breadcrumb, every required section, the
//      three conversion CTAs and links to the real global service pages;
//   2. honesty: SCS is in Indore, delivery is remote, no local office/entity/
//      staff/phone/certification/guarantee is claimed anywhere;
//   3. uniqueness: the three country pages share a React layout but no copy.
//      A page produced by find-and-replacing the country name fails here.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n/config';
import LocationPage from '@/components/locations/LocationPage';
import LocationsHub from './LocationsHub';
import {
  LOCATION_CONTENT,
  LOCATIONS_HUB_PATH,
  REQUIRED_SERVICE_LINKS,
  locationBreadcrumb,
  locationsHub,
  locationsHubBreadcrumb,
} from '@/content/locations';
import type { LocationContent } from '@/content/locations';
import { SERVICE_CONTENT_BY_PATH } from '@/content/services';

const render = (content: LocationContent) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <LocationPage content={content} />
    </MemoryRouter>,
  );

const decodeEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/** Rendered once each — these pages are large and every test reads the same HTML. */
const RENDERED = LOCATION_CONTENT.map((content) => [content, render(content)] as const);

const HUB_HTML = renderToStaticMarkup(
  <MemoryRouter>
    <LocationsHub />
  </MemoryRouter>,
);
const HUB_TEXT = stripTags(HUB_HTML);

/** Every string leaf in a content object, in document order. */
function stringLeaves(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) stringLeaves(child, out);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) stringLeaves(value, out);
  }
  return out;
}

/**
 * Every heading, paragraph and bullet a country page writes for itself.
 *
 * The path, labels of linked service pages and the other-market labels are
 * excluded: those are shared identifiers by design (a service is called the
 * same thing on every page that links to it), and counting them as duplicated
 * copy would punish correct cross-linking.
 */
function ownCopy(content: LocationContent): string[] {
  const shared = new Set<string>([
    content.path,
    ...content.services.items.flatMap((item) => [item.path, item.label]),
    ...content.otherMarkets.flatMap((market) => [market.path, market.label]),
    content.countryName,
    content.navLabel,
  ]);
  return stringLeaves(content).filter((value) => !shared.has(value));
}

/** Word bigrams, for the body-similarity measure. */
function bigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i < words.length - 1; i += 1) set.add(`${words[i]} ${words[i + 1]}`);
  return set;
}

/** Jaccard overlap of two texts' word bigrams: 0 = nothing shared, 1 = identical. */
function similarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const gram of left) if (right.has(gram)) shared += 1;
  return shared / (left.size + right.size - shared);
}

// ---------------------------------------------------------------------------
// 1. Structure
// ---------------------------------------------------------------------------

describe('regional page structure', () => {
  it('covers exactly the three active markets, at flat /locations/ URLs', () => {
    expect(LOCATION_CONTENT.map((location) => location.path)).toEqual([
      '/locations/united-states',
      '/locations/united-kingdom',
      '/locations/united-arab-emirates',
    ]);
    for (const location of LOCATION_CONTENT) {
      expect(location.path.startsWith(`${LOCATIONS_HUB_PATH}/`), location.path).toBe(true);
      expect(location.path.split('/'), location.path).toHaveLength(3);
    }
  });

  it('renders exactly one H1, carrying the page heading', () => {
    for (const [content, html] of RENDERED) {
      expect(html.match(/<h1[\s>]/g) ?? [], content.path).toHaveLength(1);
      expect(stripTags(html), content.path).toContain(content.h1);
    }
  });

  it('renders the main landmark and the Home / Locations / Country breadcrumb', () => {
    for (const [content, html] of RENDERED) {
      expect(html, content.path).toContain('id="main-content"');
      expect(html, content.path).toContain('aria-label="Breadcrumb"');
      expect(html, content.path).toContain('aria-current="page"');
      const crumbs = locationBreadcrumb(content);
      expect(crumbs.map((crumb) => crumb.name), content.path).toEqual(['Home', 'Locations', content.navLabel]);
      for (const crumb of crumbs) expect(stripTags(html), `${content.path}: ${crumb.name}`).toContain(crumb.name);
      expect(html, `${content.path} does not link to the locations hub`).toContain(`href="${LOCATIONS_HUB_PATH}"`);
    }
  });

  it('renders every required section', () => {
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      const required = [
        content.valueProp,
        content.disclosure.title,
        content.disclosure.body,
        content.concerns.heading,
        content.services.heading,
        content.projectTypes.heading,
        content.collaboration.heading,
        content.communication.heading,
        content.communication.note,
        content.security.heading,
        content.security.note,
        content.oversight.title,
        content.oversight.body,
        content.engagement.heading,
        content.cta.title,
        'Other markets',
      ];
      for (const fragment of required) {
        expect(text, `${content.path} is missing: ${fragment.slice(0, 50)}`).toContain(fragment.replace(/\s+/g, ' '));
      }
    }
  });

  it('renders the intro, hero highlights and disclosure bullets in the markup', () => {
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      expect(content.intro.length, content.path).toBeGreaterThanOrEqual(3);
      for (const paragraph of content.intro) expect(text, content.path).toContain(paragraph);
      expect(content.heroHighlights.length, content.path).toBeGreaterThanOrEqual(3);
      for (const highlight of content.heroHighlights) expect(text, content.path).toContain(highlight);
      expect(content.disclosure.points.length, content.path).toBeGreaterThanOrEqual(4);
      for (const point of content.disclosure.points) expect(text, content.path).toContain(point);
    }
  });

  it('covers buyer concerns, project types and a five-stage collaboration process', () => {
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      expect(content.concerns.items.length, content.path).toBeGreaterThanOrEqual(5);
      expect(content.projectTypes.items.length, content.path).toBeGreaterThanOrEqual(5);
      expect(content.collaboration.steps, content.path).toHaveLength(5);
      for (const item of [...content.concerns.items, ...content.projectTypes.items]) {
        expect(text, `${content.path}: ${item.title}`).toContain(item.title);
        expect(text, `${content.path}: ${item.body.slice(0, 40)}`).toContain(item.body);
      }
      for (const step of content.collaboration.steps) {
        expect(text, `${content.path}: ${step.title}`).toContain(step.title);
        for (const point of step.points) expect(text, `${content.path}: ${point}`).toContain(point);
      }
    }
  });

  it('shows the FAQ questions and answers without JavaScript', () => {
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

  it('links every country page to at least the six required global service pages', () => {
    for (const [content, html] of RENDERED) {
      const linked = content.services.items.map((item) => item.path);
      for (const required of REQUIRED_SERVICE_LINKS) {
        expect(linked, `${content.path} does not link to ${required}`).toContain(required);
        expect(html, `${content.path} does not render its ${required} link`).toContain(`href="${required}"`);
      }
    }
  });

  it('points every service link at a real global service page, with its real name', () => {
    for (const content of LOCATION_CONTENT) {
      for (const item of content.services.items) {
        const service = SERVICE_CONTENT_BY_PATH[item.path];
        expect(service, `${content.path} links to unknown service ${item.path}`).toBeDefined();
        expect(item.label, item.path).toBe(service.navLabel);
        expect(item.blurb.length, item.path).toBeGreaterThan(60);
      }
    }
  });

  it('cross-links only the other two live markets, never itself or a country with no page', () => {
    const live = new Set(LOCATION_CONTENT.map((location) => location.path));
    for (const [content, html] of RENDERED) {
      expect(content.otherMarkets, content.path).toHaveLength(2);
      for (const market of content.otherMarkets) {
        expect(market.path, `${content.path} links to itself`).not.toBe(content.path);
        expect(live.has(market.path), `${content.path} links to non-existent market ${market.path}`).toBe(true);
        expect(html, `${content.path} does not render its ${market.path} link`).toContain(`href="${market.path}"`);
      }
      // No page may link to a market we have not written.
      for (const absent of [
        '/locations/canada',
        '/locations/australia',
        '/locations/germany',
        '/locations/netherlands',
        '/locations/singapore',
        '/locations/turkey',
      ]) {
        expect(html.includes(`href="${absent}"`), `${content.path} links to ${absent}`).toBe(false);
      }
    }
  });

  it('uses no flag, skyline, stock photo or externally hotlinked image', () => {
    const banned = [
      'images.unsplash.com',
      'istockphoto.com',
      'shutterstock',
      'pexels.com',
      'gstatic.com',
      'cloudinary.com',
      'flagcdn',
      'flagsapi',
      'skyline',
      '🇺🇸',
      '🇬🇧',
      '🇦🇪',
    ];
    for (const [content, html] of RENDERED.concat([[LOCATION_CONTENT[0], HUB_HTML]])) {
      for (const needle of banned) {
        expect(html.includes(needle), `${content.path} references ${needle}`).toBe(false);
      }
      for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
        expect(match[1].startsWith('/'), `${content.path}: ${match[1]}`).toBe(true);
      }
    }
  });

  it('hides no prerendered copy behind an entry animation', () => {
    for (const [content, html] of RENDERED) {
      expect(html, content.path).not.toContain('opacity:0');
    }
    expect(HUB_HTML).not.toContain('opacity:0');
  });

  it('carries substantial body copy on every market page', () => {
    for (const [content, html] of RENDERED) {
      const words = stripTags(html).trim().split(/\s+/).length;
      expect(words, `${content.path} has only ${words} words`).toBeGreaterThan(1100);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Location honesty
// ---------------------------------------------------------------------------

/**
 * Phrases that are only ever a lie on these pages, in any context.
 */
const NEVER: [RegExp, string][] = [
  [/\bour (?:US|USA|U\.S\.|UK|U\.K\.|UAE|American|British|Emirati) (?:office|team|staff|branch|headquarters)\b/i, 'a local office or team'],
  [/\boffices? in (?:the )?(?:USA|US|UK|UAE|United States|United Kingdom|United Arab Emirates|Dubai|Abu Dhabi|Sharjah|London|New York)\b/i, 'a foreign office'],
  [/\b(?:based|headquartered|located|registered) in (?:the )?(?:USA|US|UK|UAE|United States|United Kingdom|United Arab Emirates|Dubai|Abu Dhabi|London|New York)\b/i, 'a foreign base'],
  [/\+1[\s-]?\(?\d{3}/, 'a US telephone number'],
  [/\+44[\s-]?\d{2}/, 'a UK telephone number'],
  [/\+971[\s-]?\d/, 'a UAE telephone number'],
  [/\bfully (?:compliant|certified|secure|GDPR)\b/i, 'an absolute compliance claim'],
  [/\bwe are (?:GDPR|UK GDPR|HIPAA|SOC ?2) compliant\b/i, 'a compliance claim'],
  [/\bgovernment[- ](?:approved|certified|licensed)\b/i, 'a government approval'],
  [/\b24\/7 (?:support|coverage|availability)\b/i, 'round-the-clock coverage'],
  [/\baround[- ]the[- ]clock (?:support|coverage|availability)\b/i, 'round-the-clock coverage'],
  [/\baward[- ]winning\b/i, 'an award'],
  [/\bindustry[- ]leading\b/i, 'an industry-leading claim'],
  [/\bleading (?:software|AI|IT|digital|development) (?:company|partner|provider|agency)\b/i, 'a "leading" claim'],
  [/\bnumber one\b/i, 'a number-one claim'],
  [/\bno\.? ?1\b/i, 'a number-one claim'],
  [/\b\d{2,}\+? (?:happy )?(?:clients|customers|projects)\b/i, 'a client or project count'],
  [/\b\d+% (?:satisfaction|success|accuracy|uptime|growth)\b/i, 'a performance percentage'],
  [/\b\d+\+ years\b/i, 'a years-in-business claim'],
  [/\bmarket (?:is|was) (?:worth|valued)\b/i, 'a market-size statistic'],
  [/\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY) \d{5}(?:-\d{4})?\b/, 'a US postal address'],
  [/\b(?:E|EC|N|NW|SE|SW|W|WC|B|M|LS|G|EH|CF|BS|L)\d{1,2}[A-Z]? ?\d[A-Z]{2}\b/, 'a UK postcode'],
  [/\bP\.? ?O\.? Box\b/i, 'a PO box'],
  [/\b(?:Suite|Ste\.|Street|Avenue|Boulevard|Sheikh Zayed Road)\b[^.]{0,60}\b(?:USA|UK|UAE|United States|United Kingdom|United Arab Emirates|Dubai|Abu Dhabi|London|New York)\b/i, 'a street address in a target country'],
  [/\btrade licen[cs]e\b(?![^.]*\bno\b)/i, 'a trade licence — only allowed inside a denial'],
];

/**
 * Words that may appear only inside an explicit denial. A required disclosure
 * has to be able to say "we do not maintain a local office"; a claim may not
 * say "our local office". A negation must sit within 140 characters in front.
 */
const ONLY_WHEN_DENIED: [RegExp, string][] = [
  [/\blocal offices?\b/i, 'a local office'],
  [/\blocal team\b/i, 'a local team'],
  [/\blocal (?:employees|staff)\b/i, 'local employees'],
  [/\blocal (?:phone|telephone)\b/i, 'a local phone number'],
  [/\blocally registered\b/i, 'local registration'],
  [/\bregistered (?:entity|company|branch)\b/i, 'a registered foreign entity'],
  [/\bguarantee[a-z]*\b/i, 'a guarantee'],
  [/\bcompliant\b/i, 'a compliance claim'],
  [/\bcertif(?:ied|ication)\b/i, 'a certification'],
  [/\b(?:HIPAA|SOC ?2|PCI ?DSS|ISO ?\d{4,}|Cyber Essentials)[- ]?(?:certified|compliant|accredited)\b/i, 'a named-framework certification'],
];

const DENIAL = /\b(?:no|not|never|cannot|can't|without|nor|neither|nothing|none|do not|does not|will not|hold no|have no|make no|claim no)\b/i;

/** The sentence a match sits inside, so a question can be told from a claim. */
function sentenceAround(text: string, index: number): string {
  const start = Math.max(
    text.lastIndexOf('.', index),
    text.lastIndexOf('?', index),
    text.lastIndexOf('!', index),
    text.lastIndexOf('\n', index),
  );
  const rest = text.slice(index);
  const endOffset = rest.search(/[.?!\n]/);
  return text.slice(start + 1, endOffset === -1 ? undefined : index + endOffset + 1).trim();
}

function assertHonest(label: string, text: string): void {
  for (const [pattern, description] of NEVER) {
    const hit = text.match(pattern);
    expect(hit?.[0], `${label} claims ${description}: "${hit?.[0]}"`).toBeUndefined();
  }
  for (const [pattern, description] of ONLY_WHEN_DENIED) {
    const global = new RegExp(pattern.source, 'gi');
    for (const match of text.matchAll(global)) {
      const index = match.index ?? 0;
      const sentence = sentenceAround(text, index);
      // A question asserts nothing: "Are you SOC 2 compliant?" is the buyer's
      // words, and the answer beneath it is what has to be honest.
      if (sentence.endsWith('?')) continue;
      const context = text.slice(Math.max(0, index - 140), index);
      expect(
        DENIAL.test(context),
        `${label} states ${description} without a denial in front: "…${context.slice(-70)}${match[0]}"`,
      ).toBe(true);
    }
  }
}

describe('regional page copy is honest about location', () => {
  it('discloses India delivery, remote delivery and the absence of a local office', () => {
    const required: [RegExp, string][] = [
      [/(?:operates|works|working) from Indore|based in Indore|from Indore, (?:Madhya Pradesh, )?India/i, 'Indore, India'],
      [/delivered remotely|delivery is remote|remote(?:ly)? from (?:that office|India)|serves .* remotely/i, 'remote delivery'],
      [/no local office|do not maintain a local office|have no premises|there is no local office/i, 'no local office'],
    ];
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      for (const [pattern, what] of required) {
        expect(pattern.test(text), `${content.path} does not disclose ${what}`).toBe(true);
      }
      // The country name must appear beside the India disclosure, so the
      // statement is unambiguous about which market has no presence.
      expect(text, content.path).toContain('Indore');
    }
  });

  it('makes the disclosure visible body copy, not hidden SEO text', () => {
    for (const [content, html] of RENDERED) {
      // The disclosure block is inside <main>, before any collapsible section,
      // and carries no hiding technique.
      const main = html.split('id="main-content"')[1] ?? '';
      expect(main, content.path).toContain(content.disclosure.body);
      const disclosureIndex = main.indexOf(content.disclosure.body);
      // Nothing between the enclosing block and the text may hide it. Decorative
      // aria-hidden wrappers elsewhere in the hero are fine; a hiding *style* or
      // a screen-reader-only class around the disclosure itself is not.
      const before = main.slice(Math.max(0, disclosureIndex - 300), disclosureIndex);
      for (const hiding of ['display:none', 'display: none', 'visibility:hidden', 'sr-only', 'height:0', 'text-indent:-', 'clip:rect', 'font-size:0']) {
        expect(before.includes(hiding), `${content.path} hides its disclosure with ${hiding}`).toBe(false);
      }
      // And no screen-reader-only block anywhere on the page carries the disclosure.
      for (const match of html.matchAll(/class="[^"]*sr-only[^"]*"[^>]*>([^<]*)</g)) {
        expect(/Indore|remote|office/i.test(match[1]), `${content.path} hides disclosure copy in an sr-only block`).toBe(false);
      }
      // It is also above the FAQ block, so a visitor meets it before the fold-outs.
      expect(disclosureIndex, content.path).toBeLessThan(main.indexOf('<details'));
    }
  });

  it('makes no forbidden location, certification or performance claim', () => {
    for (const [content, html] of RENDERED) assertHonest(content.path, stripTags(html));
    assertHonest(LOCATIONS_HUB_PATH, HUB_TEXT);
  });

  it('applies the same scan to the raw content objects, not only the rendered page', () => {
    for (const content of LOCATION_CONTENT) assertHonest(`${content.path} (content)`, ownCopy(content).join(' \n '));
    assertHonest('/locations (content)', stringLeaves(locationsHub).join(' \n '));
  });

  it('never promises fixed timezone coverage', () => {
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      for (const pattern of [
        /guaranteed (?:overlap|coverage|availability|hours)/i,
        /\b(?:full|complete|continuous) (?:US|UK|UAE) (?:business )?hours coverage\b/i,
        /\balways available\b/i,
      ]) {
        expect(pattern.test(text), `${content.path} promises coverage: ${pattern}`).toBe(false);
      }
      // And it must say the overlap is agreed rather than fixed.
      expect(/agree(?:d)? (?:a |one )?(?:recurring )?(?:overlap|meeting|window|slot)|agreed (?:with you|per engagement|in the engagement)/i.test(text), `${content.path} does not say the overlap is agreed`).toBe(true);
    }
  });

  it('cites no market statistic, ranking or demand figure', () => {
    for (const content of LOCATION_CONTENT) {
      const text = ownCopy(content).join(' ');
      for (const pattern of [/\$\d/, /\b\d+(?:\.\d+)? ?(?:billion|million|trillion)\b/i, /\bfastest[- ]growing\b/i, /\btop[- ]?\d+\b/i, /\branked\b/i, /\bmarket share\b/i]) {
        expect(pattern.test(text), `${content.path} cites a statistic: ${pattern}`).toBe(false);
      }
    }
  });

  it('offers no legal, tax or regulatory advice', () => {
    for (const content of LOCATION_CONTENT) {
      const text = ownCopy(content).join(' ');
      expect(/\bwe advise\b|\blegal advice\b(?![^.]*\bno\b)/i.test(text) && !/no legal|not.*legal advice|give no legal|do not offer legal/i.test(text), content.path).toBe(false);
      // Each page states the boundary explicitly.
      expect(/legal|tax|regulat/i.test(text), `${content.path} never addresses the advice boundary`).toBe(true);
    }
  });

  it('keeps human review over AI output on every market page', () => {
    for (const content of LOCATION_CONTENT) {
      expect(content.oversight.points.length, content.path).toBeGreaterThanOrEqual(4);
      const text = stringLeaves(content.oversight).join(' ');
      expect(/person|human|review|approv/i.test(text), content.path).toBe(true);
    }
  });

  it('avoids keyword-stuffed regional phrases', () => {
    const stuffing = [
      /software development company (?:in (?:the )?)?(?:USA|US|UK|UAE)/gi,
      /mobile app development company/gi,
      /AI development company/gi,
      /best software development/gi,
    ];
    for (const [content, html] of RENDERED) {
      const text = stripTags(html);
      for (const pattern of stuffing) {
        const hits = text.match(pattern) ?? [];
        expect(hits.length, `${content.path} repeats "${hits[0]}" ${hits.length} times`).toBe(0);
      }
    }
  });

  it('does not over-repeat the country name or its abbreviation', () => {
    for (const [content, html] of RENDERED) {
      const words = stripTags(html).trim().split(/\s+/).length;
      const abbreviations: Record<string, RegExp> = {
        '/locations/united-states': /\b(?:United States|USA|US)\b/g,
        '/locations/united-kingdom': /\b(?:United Kingdom|UK)\b/g,
        '/locations/united-arab-emirates': /\b(?:United Arab Emirates|UAE)\b/g,
      };
      const hits = (stripTags(html).match(abbreviations[content.path]) ?? []).length;
      // A regional page should name its market often enough to be about it, and
      // rarely enough not to read as keyword filler. ~1-3% of the body.
      expect(hits, `${content.path} names its market only ${hits} times`).toBeGreaterThan(8);
      expect(hits / words, `${content.path} names its market ${hits} times in ${words} words`).toBeLessThan(0.03);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Uniqueness — the anti-template guard
// ---------------------------------------------------------------------------

describe('regional page copy is unique per country', () => {
  it('gives every page its own title, description, H1 and positioning line', () => {
    for (const field of ['metaTitle', 'metaDescription', 'h1', 'valueProp', 'serviceName', 'serviceType'] as const) {
      const values = LOCATION_CONTENT.map((location) => location[field]);
      expect(new Set(values).size, `duplicate ${field}`).toBe(values.length);
    }
  });

  it('keeps titles and descriptions inside search-result limits', () => {
    for (const location of LOCATION_CONTENT) {
      expect(location.metaTitle.length, `${location.path} title`).toBeLessThanOrEqual(75);
      expect(location.metaDescription.length, `${location.path} description`).toBeGreaterThan(80);
      expect(location.metaDescription.length, `${location.path} description`).toBeLessThanOrEqual(190);
    }
  });

  it('shares no country intro paragraph between two pages', () => {
    const seen = new Map<string, string>();
    for (const location of LOCATION_CONTENT) {
      for (const paragraph of location.intro) {
        const previous = seen.get(paragraph);
        expect(previous, `intro paragraph shared by ${previous} and ${location.path}`).toBeUndefined();
        seen.set(paragraph, location.path);
      }
    }
  });

  it('shares no section heading, section intro or disclosure line between two pages', () => {
    const seen = new Map<string, string>();
    for (const location of LOCATION_CONTENT) {
      const headings = [
        location.concerns.heading,
        location.concerns.intro,
        location.services.heading,
        location.services.intro,
        location.projectTypes.heading,
        location.projectTypes.intro,
        location.collaboration.heading,
        location.collaboration.intro,
        location.communication.heading,
        location.communication.intro,
        location.security.heading,
        location.security.intro,
        location.engagement.heading,
        location.engagement.intro,
        location.disclosure.title,
        location.disclosure.body,
        location.oversight.title,
        location.oversight.body,
        location.cta.title,
        location.cta.body,
        ...location.disclosure.points,
      ];
      for (const value of headings) {
        const previous = seen.get(value);
        expect(previous, `"${value.slice(0, 60)}…" appears on both ${previous} and ${location.path}`).toBeUndefined();
        seen.set(value, location.path);
      }
    }
  });

  it('shares no FAQ question or answer between two pages', () => {
    const questions = new Map<string, string>();
    const answers = new Map<string, string>();
    for (const location of LOCATION_CONTENT) {
      for (const faq of location.faqs) {
        expect(questions.get(faq.question), `FAQ question duplicated on ${location.path}`).toBeUndefined();
        questions.set(faq.question, location.path);
        expect(answers.get(faq.answer), `FAQ answer duplicated on ${location.path}`).toBeUndefined();
        answers.set(faq.answer, location.path);
      }
    }
  });

  it('shares no buyer-concern or project-type statement between two pages', () => {
    const seen = new Map<string, string>();
    for (const location of LOCATION_CONTENT) {
      for (const item of [...location.concerns.items, ...location.projectTypes.items]) {
        for (const value of [item.title, item.body]) {
          const previous = seen.get(value);
          expect(previous, `"${value.slice(0, 50)}…" appears on both ${previous} and ${location.path}`).toBeUndefined();
          seen.set(value, location.path);
        }
      }
    }
  });

  it('shares no regional collaboration, communication or security copy between two pages', () => {
    const seen = new Map<string, string>();
    for (const location of LOCATION_CONTENT) {
      const values = [
        ...location.collaboration.steps.flatMap((step) => [step.title, step.body, ...step.points]),
        ...location.communication.points,
        location.communication.note,
        ...location.security.points,
        location.security.note,
        ...location.oversight.points,
        ...location.heroHighlights,
        ...location.engagement.options.flatMap((option) => [option.name, option.body, option.bestFor]),
        ...location.services.items.map((item) => item.blurb),
        ...location.otherMarkets.map((market) => market.blurb),
      ];
      for (const value of values) {
        const previous = seen.get(value);
        expect(previous, `"${value.slice(0, 50)}…" appears on both ${previous} and ${location.path}`).toBeUndefined();
        seen.set(value, location.path);
      }
    }
  });

  it('keeps page-body similarity below the template threshold', () => {
    // Bigram Jaccard over each page's own copy (shared service names and paths
    // excluded). Two pages generated by swapping a country name would score
    // near 1.0; independently written pages on the same subject land well under
    // 0.2 — 0.30 leaves headroom without letting a template through.
    for (let i = 0; i < LOCATION_CONTENT.length; i += 1) {
      for (let j = i + 1; j < LOCATION_CONTENT.length; j += 1) {
        const a = LOCATION_CONTENT[i];
        const b = LOCATION_CONTENT[j];
        const score = similarity(ownCopy(a).join(' '), ownCopy(b).join(' '));
        expect(score, `${a.path} and ${b.path} are ${(score * 100).toFixed(1)}% similar`).toBeLessThan(0.3);
      }
    }
  });

  it('is not a country-name substitution of another page', () => {
    // Replace each page's own market names with a placeholder and compare. A
    // find-and-replace template scores ~1.0 here even when the raw texts differ.
    const neutralise = (content: LocationContent): string =>
      ownCopy(content)
        .join(' ')
        .replace(/United Arab Emirates|United States|United Kingdom|Emirates|Emirati|American|British|USA|UAE|UK|US\b/g, 'COUNTRY')
        .replace(/Gulf Standard Time|US Eastern|US Pacific|British Summer Time/g, 'ZONE')
        .replace(/Dubai|Abu Dhabi|Sharjah|London|New York/g, 'CITY');
    for (let i = 0; i < LOCATION_CONTENT.length; i += 1) {
      for (let j = i + 1; j < LOCATION_CONTENT.length; j += 1) {
        const a = LOCATION_CONTENT[i];
        const b = LOCATION_CONTENT[j];
        const score = similarity(neutralise(a), neutralise(b));
        expect(score, `${a.path} reads as ${b.path} with the country swapped (${(score * 100).toFixed(1)}%)`).toBeLessThan(0.35);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. The hub
// ---------------------------------------------------------------------------

describe('locations hub', () => {
  it('lives at /locations and is named Locations', () => {
    expect(LOCATIONS_HUB_PATH).toBe('/locations');
    expect(locationsHub.navLabel).toBe('Locations');
  });

  it('renders one H1, the main landmark and its own Home / Locations trail', () => {
    expect(HUB_HTML.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(HUB_HTML).toContain('id="main-content"');
    expect(HUB_HTML).toContain('aria-label="Breadcrumb"');
    expect(HUB_HTML).toContain('aria-current="page"');
    expect(locationsHubBreadcrumb().map((crumb) => crumb.name)).toEqual(['Home', 'Locations']);
    expect(HUB_TEXT).toContain(locationsHub.h1);
  });

  it('states the six truths about a remote international engagement', () => {
    const required = [
      /based in Indore|operates from Indore|team is in Indore/i,
      /delivered remotely|delivery is remote/i,
      /agreed overlap|overlap.*agreed|working[- ]hour overlap/i,
      /demonstrations and approvals|approvals happen online|online/i,
      /contract|invoicing/i,
      /data[- ]location|data location|hosting/i,
      /availability, not presence|service availability|not a physical location|no local office/i,
    ];
    for (const pattern of required) {
      expect(pattern.test(HUB_TEXT), `hub does not state: ${pattern}`).toBe(true);
    }
    expect(locationsHub.howRemoteWorks.points.length).toBeGreaterThanOrEqual(6);
  });

  it('links to exactly the three active markets and names each of them', () => {
    for (const location of LOCATION_CONTENT) {
      expect(HUB_HTML, `hub does not link to ${location.path}`).toContain(`href="${location.path}"`);
      expect(HUB_TEXT, `hub does not name ${location.navLabel}`).toContain(location.navLabel);
    }
    const marketLinks = [...HUB_HTML.matchAll(/href="(\/locations\/[^"]+)"/g)].map((match) => match[1]);
    expect(new Set(marketLinks)).toEqual(new Set(LOCATION_CONTENT.map((location) => location.path)));
  });

  it('mentions the future markets as plain text and links to none of them', () => {
    for (const country of ['Canada', 'Australia', 'Germany', 'Netherlands', 'Singapore', 'Turkey']) {
      expect(HUB_TEXT, `hub does not mention ${country}`).toContain(country);
    }
    for (const slug of ['canada', 'australia', 'germany', 'netherlands', 'singapore', 'turkey']) {
      expect(HUB_HTML.includes(`href="/locations/${slug}"`), `hub links to /locations/${slug}`).toBe(false);
    }
  });

  it('writes its own market blurbs rather than reusing the country pages', () => {
    const blurbs = new Set<string>();
    for (const market of locationsHub.markets) {
      const location = LOCATION_CONTENT.find((item) => item.path === market.path);
      expect(location, `hub lists unknown market ${market.path}`).toBeDefined();
      expect(market.blurb.length, market.path).toBeGreaterThan(60);
      expect(market.blurb, market.path).not.toBe(location!.valueProp);
      expect(blurbs.has(market.blurb), `duplicate hub blurb on ${market.path}`).toBe(false);
      blurbs.add(market.blurb);
    }
  });

  it('carries all three conversion CTAs and substantial copy', () => {
    for (const target of ['/project-analysis', '/schedule-call', '/contact']) {
      expect(HUB_HTML, `hub has no link to ${target}`).toContain(`href="${target}"`);
    }
    expect(HUB_TEXT.trim().split(/\s+/).length).toBeGreaterThan(500);
  });

  it('shares no copy with any of the country pages', () => {
    const hubStrings = new Set(stringLeaves(locationsHub).filter((value) => value.length > 40));
    for (const location of LOCATION_CONTENT) {
      for (const value of ownCopy(location)) {
        if (value.length <= 40) continue;
        expect(hubStrings.has(value), `"${value.slice(0, 50)}…" appears on the hub and ${location.path}`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Arabic and Urdu keep working on English-only pages
// ---------------------------------------------------------------------------

describe('Arabic and Urdu render these English pages without leaking keys', () => {
  it.each(['ar', 'ur'])('renders the hub and a market page under %s', async (language) => {
    const previous = i18n.language;
    try {
      await i18n.changeLanguage(language);
      const hub = renderToStaticMarkup(
        <MemoryRouter>
          <LocationsHub />
        </MemoryRouter>,
      );
      expect(hub).toContain(locationsHub.h1);
      expect(hub).not.toContain('nav.locations');
      expect(hub).not.toContain('nav.markets');
      expect(hub).not.toContain('services.names.');

      const market = render(LOCATION_CONTENT[0]);
      expect(market).toContain(LOCATION_CONTENT[0].h1);
      expect(market).not.toContain('nav.locations');
      expect(market).not.toContain('services.names.');
    } finally {
      await i18n.changeLanguage(previous);
    }
  });
});
