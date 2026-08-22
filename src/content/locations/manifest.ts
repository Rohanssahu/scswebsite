/**
 * The lightweight locations manifest: metadata only, no body copy.
 *
 * Phase 3B split every regional page into two modules:
 *
 *   - this file — path, country name, labels, schema.org names, `<title>`, meta
 *     description and sitemap priority for all six active markets. It is the
 *     only locations module the main JavaScript bundle needs, so the header,
 *     the footer, the homepage, the About page and the SEO registry all read
 *     from here;
 *   - `./<country>.ts` — that market's `LocationBody`: hero, disclosure, buyer
 *     concerns, project types, collaboration, communication, security,
 *     oversight, engagement, FAQs and cross-market links. Loaded as a
 *     route-level chunk when the page is opened.
 *
 * Adding a market here without writing its body module is a type error the
 * moment anything tries to render it, and `locationPages.test.tsx` asserts the
 * two lists match exactly. That is deliberate: navigation must never link to a
 * market page that does not exist.
 */

import type { LocationMeta } from './types';

/** Metadata for the `/locations` hub itself. Body copy lives in `./hub.ts`. */
export const locationsHubMeta = {
  path: '/locations',
  navLabel: 'Locations',
  metaTitle: 'Locations We Serve | Remote Delivery from India | SCS Softwares',
  metaDescription:
    'SCS Softwares is based in Indore, India, and delivers software and AI projects remotely. See the markets we actively work with and how a remote engagement is arranged.',
  shareTitle: 'Locations — SCS Softwares',
} as const;

/** The hub every country page's breadcrumb passes through. */
export const LOCATIONS_HUB_PATH = locationsHubMeta.path;

/**
 * The active markets, in the order navigation and the hub list them. Exactly
 * the countries with a written page — Germany, the Netherlands and Turkey are
 * named on the hub as prose and are deliberately absent here, because there is
 * nothing yet to link to.
 */
export const LOCATION_META: LocationMeta[] = [
  {
    path: '/locations/united-states',
    countryName: 'United States',
    navLabel: 'United States',
    serviceName: 'Software and AI Development for United States Clients',
    serviceType: 'Remote software and AI development',
    metaTitle: 'Software Development Partner for US Businesses | SCS Softwares',
    metaDescription:
      'SCS Softwares is an India-based software and AI development partner for businesses in the United States: remote discovery, written scope, milestone demonstrations and human-reviewed AI.',
    shareTitle: 'Software & AI Development for US Businesses',
    priority: 0.8,
  },
  {
    path: '/locations/united-kingdom',
    countryName: 'United Kingdom',
    navLabel: 'United Kingdom',
    serviceName: 'Software and AI Development for United Kingdom Clients',
    serviceType: 'Remote product and AI engineering',
    metaTitle: 'Software & AI Development Partner for UK Businesses | SCS',
    metaDescription:
      'Remote software and AI development for UK businesses, delivered from Indore, India: documented requirements, staged approvals, iterative demos and a named maintenance arrangement.',
    shareTitle: 'Software & AI Development for UK Businesses',
    priority: 0.8,
  },
  {
    path: '/locations/united-arab-emirates',
    countryName: 'United Arab Emirates',
    navLabel: 'United Arab Emirates',
    serviceName: 'Software and AI Development for United Arab Emirates Clients',
    serviceType: 'Remote application and AI agent development',
    metaTitle: 'Software Development Partner for UAE Businesses | SCS',
    metaDescription:
      'India-based software and AI development for businesses in the UAE: mobile-first apps, booking and service platforms, dashboards, AI assistants, and Arabic interfaces as a scoped service.',
    shareTitle: 'Software & AI Development for UAE Businesses',
    priority: 0.8,
  },  {
    path: '/locations/canada',
    countryName: 'Canada',
    navLabel: 'Canada',
    serviceName: 'Software and AI Development for Canadian Clients',
    serviceType: 'Remote business software and AI development',
    metaTitle: 'Software & AI Development Partner for Canadian Business | SCS',
    metaDescription:
      'SCS Softwares is an India-based software and AI development partner for businesses in Canada: collaboration hours agreed per client, written acceptance criteria and milestone demos.',
    shareTitle: 'Software & AI Development for Canadian Businesses',
    priority: 0.8,
  },
  {
    path: '/locations/australia',
    countryName: 'Australia',
    navLabel: 'Australia',
    serviceName: 'Software and AI Development for Australian Clients',
    serviceType: 'Remote mobile, web and AI product delivery',
    metaTitle: 'Remote Software & AI Development for Australian Business | SCS',
    metaDescription:
      'A remote software and AI development partner for Australian businesses, delivered from India: scheduled collaboration windows, test environments, release planning and agreed support scope.',
    shareTitle: 'Software & AI Development for Australian Businesses',
    priority: 0.8,
  },
  {
    path: '/locations/singapore',
    countryName: 'Singapore',
    navLabel: 'Singapore',
    serviceName: 'Software and AI Development for Singapore Clients',
    serviceType: 'Remote platform, integration and AI development',
    metaTitle: 'Software & AI Development Partner for Singapore | SCS Softwares',
    metaDescription:
      'SCS Softwares is an India-based software and AI development partner serving businesses in Singapore: regional operations platforms, API integrations, AI assistants and documented approvals.',
    shareTitle: 'Software & AI Development for Singapore Businesses',
    priority: 0.8,
  },
];

export const LOCATION_META_BY_PATH: Record<string, LocationMeta> = Object.fromEntries(
  LOCATION_META.map((location) => [location.path, location]),
);

/**
 * Global service pages every country page has to link to. Extended in Phase 3B
 * from six to eight: SaaS development and AI automation are as common an entry
 * point in the newer markets as mobile and web work.
 */
export const REQUIRED_SERVICE_LINKS = [
  '/services/custom-software-development',
  '/services/mobile-app-development',
  '/services/web-application-development',
  '/services/saas-development',
  '/services/ai-development',
  '/services/ai-voice-agent-development',
  '/services/ai-video-consultation-agents',
  '/services/ai-automation-integration',
] as const;
