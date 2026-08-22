/**
 * Copy for the `/locations` hub.
 *
 * The hub exists to say, once and plainly, what a regional page is and is not:
 * SCS Softwares is in Indore, India; international work is delivered remotely;
 * a country page describes where a service is available, not where we have an
 * office. Every country page then repeats that disclosure in its own words.
 *
 * Phase 3B moved the hub's own metadata into `./manifest.ts` and the homepage
 * and About blocks into `./siteBlocks.ts`, leaving this module as pure body
 * copy for the `/locations` route chunk.
 */

import { locationsHubMeta } from './manifest';

/** One active market, as listed on the hub. */
export interface MarketEntry {
  path: string;
  /** Written for the hub listing — never copied from the country page. */
  blurb: string;
  /** The one thing that is genuinely different about working with this market. */
  distinctive: string;
}

export const locationsHub = {
  ...locationsHubMeta,
  h1: 'Locations We Serve',
  valueProp:
    'One team in Indore, India, working remotely with businesses in other countries — and a plain account of what that does and does not mean.',
  intro: [
    'SCS Softwares is a software and AI development company based in Indore, Madhya Pradesh, India. Everything we build is built there. When we work with a business in another country, the engagement is remote from end to end: there is no branch, no local representative and no second office involved.',
    'The pages below exist because the practical questions differ by market. A buyer in the United States is mostly asking about accountability and time-zone distance; a buyer in the United Kingdom usually starts with documented requirements and supplier assurance; a buyer in the UAE is often launching a customer-facing app into a working day that already overlaps ours. Those are different conversations, so they get different pages.',
    'The three markets added most recently ask their own questions. Canadian enquiries usually begin with which hours we will actually be reachable and where records will be stored; Australian ones with release planning and who maintains the product after launch; Singapore ones with integrations, regional roll-out and how approvals get recorded. None of that is interchangeable, which is why each market has its own page rather than a shared template.',
    'What does not differ is the disclosure. Each of these pages describes where a service is available. None of them describes a physical location, and none of them should be read as one.',
  ],
  /** The truthful mechanics of a remote international engagement. */
  howRemoteWorks: {
    eyebrow: 'How remote delivery works',
    heading: 'What an international engagement actually involves',
    intro:
      'Six things are true of every project we run outside India. They are worth stating before you read a market page, because they are what the market pages assume.',
    points: [
      {
        title: 'The team is in Indore, India',
        body:
          'Design, engineering, testing and project management all sit in one office in Indore. Nothing is subcontracted to a third party in your country, and no local entity stands between us and you.',
      },
      {
        title: 'Delivery is remote from start to finish',
        body:
          'There is no on-site phase. Discovery, design review, build demonstrations, testing and handover all happen remotely, and the engagement is priced on that basis.',
      },
      {
        title: 'Working hours are arranged around an agreed overlap',
        body:
          'We shift part of our day to meet yours and fix a recurring window at kick-off. What that window is gets written into the engagement rather than advertised in advance, because it depends on your time zone and the people your project needs.',
      },
      {
        title: 'Communication, demonstrations and approvals happen online',
        body:
          'Scheduled video calls, a running environment you can open yourself, and written notes after each cycle. Approval is recorded in writing so it does not depend on who was on the call.',
      },
      {
        title: 'The commercial and data terms are settled first',
        body:
          'Contract, invoicing arrangement, currency, data-location requirements and the communication schedule are all agreed before development begins — not negotiated while a build is already running.',
      },
      {
        title: 'A country page is about availability, not presence',
        body:
          'Each market page below describes the services available to businesses in that country and how we run them from India. None of them claims an office, an entity, employees, an address or a telephone number in that country.',
      },
    ],
  },
  /** The six markets that have a real page today. Nothing else is linked. */
  markets: [
    {
      path: '/locations/united-states',
      blurb:
        'Remote engineering for US businesses, with an agreed overlap window, a written scope before development and a build you can click every cycle.',
      distinctive: 'The largest time-zone gap we work across, so the written trail carries more of the weight.',
    },
    {
      path: '/locations/united-kingdom',
      blurb:
        'Documented requirements, staged approvals and a maintenance arrangement agreed before launch, for UK businesses and organisations.',
      distinctive: 'Our afternoon covers the UK morning, so most decisions are made in a live conversation.',
    },
    {
      path: '/locations/united-arab-emirates',
      blurb:
        'Mobile-first products, booking and service platforms and AI assistants for UAE businesses, with Arabic interfaces scoped separately.',
      distinctive: 'Barely any clock difference, so the working days effectively coincide.',
    },
    {
      path: '/locations/canada',
      blurb:
        'Internal business platforms, customer-facing products and AI assistants for Canadian organisations, with acceptance criteria written down before a build starts.',
      distinctive: 'One country, six clock offsets — so the reachable hours are settled per client rather than assumed.',
    },
    {
      path: '/locations/australia',
      blurb:
        'Mobile and web products, booking systems and dashboards for Australian businesses, with test environments and a release plan agreed up front.',
      distinctive: 'Our day starts as the Australian afternoon runs out, so handover notes do the work a meeting cannot.',
    },
    {
      path: '/locations/singapore',
      blurb:
        'Regional operations platforms, API integrations and AI assistants for Singapore businesses, with every decision recorded in writing.',
      distinctive: 'Two and a half hours apart, which makes a genuinely shared working day the easiest one we have.',
    },
  ] satisfies MarketEntry[],
  /**
   * Markets we take enquiries from but have no page for yet. Deliberately plain
   * text with no links: a link to a page that does not exist is worse than no
   * link, and a page per country will be written when there is something
   * specific to say about it.
   */
  futureMarkets: {
    heading: 'Other countries we take enquiries from',
    body:
      'We also work with businesses in Germany, the Netherlands and Turkey. There are no dedicated pages for those markets yet — when we write one it will be because there is something specific to say about working with that country, not to fill a list. Until then, the enquiry route is the same as for anywhere else.',
    note:
      'Delivery for every country on that list is remote from Indore, India, on exactly the terms described above.',
  },
  /** What the hub will not claim, stated where a visitor can read it. */
  boundaries: {
    heading: 'What you will not find on these pages',
    points: [
      'No office, branch or co-working address in any of the countries listed.',
      'No locally registered company, and no local telephone number.',
      'No staff employed outside India.',
      'No certification, accreditation or regulatory approval claimed in any market.',
      'No legal, tax or regulatory advice — we build to what your own advisers specify.',
      'No market statistics, client counts or rankings, because we cannot evidence them.',
    ],
  },
  cta: {
    title: 'Working from another country and want to know how this would run?',
    body:
      'Get an indicative estimate from a few questions, talk it through with our AI consultation agent, or write to the team in Indore directly. The market pages cover the detail; a conversation covers your project.',
  },
} as const;

export type LocationsHub = typeof locationsHub;
