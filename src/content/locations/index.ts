/**
 * Every regional landing page, in the order navigation and the hub list them.
 *
 * `src/seo/registry.ts`, the header, the footer, the homepage, the About page,
 * the hub and the page components all read this list, so a new market is added
 * in one place and reaches every surface. Adding a country here without also
 * writing its content module is a type error, which is deliberate: the
 * navigation must never link to a market page that does not exist.
 */

import { locationsHub } from './hub';
import { unitedArabEmirates } from './unitedArabEmirates';
import { unitedKingdom } from './unitedKingdom';
import { unitedStates } from './unitedStates';
import type { LocationContent } from './types';

/** The hub every country page's breadcrumb passes through. */
export const LOCATIONS_HUB_PATH = locationsHub.path;

/** The active markets. Exactly the countries with a written page. */
export const LOCATION_CONTENT: LocationContent[] = [unitedStates, unitedKingdom, unitedArabEmirates];

export const LOCATION_CONTENT_BY_PATH: Record<string, LocationContent> = Object.fromEntries(
  LOCATION_CONTENT.map((location) => [location.path, location]),
);

/** Global service pages every country page has to link to (Phase 3A rule). */
export const REQUIRED_SERVICE_LINKS = [
  '/services/custom-software-development',
  '/services/mobile-app-development',
  '/services/web-application-development',
  '/services/ai-development',
  '/services/ai-voice-agent-development',
  '/services/ai-video-consultation-agents',
] as const;

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail for a country page, and the source of its
 * BreadcrumbList JSON-LD: `Home › Locations › Country`. Both come from this one
 * function, so the trail and the markup cannot describe different paths.
 */
export function locationBreadcrumb(location: LocationContent): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: locationsHub.navLabel, path: locationsHub.path },
    { name: location.navLabel, path: location.path },
  ];
}

/** The hub's own trail: `Home › Locations`. */
export function locationsHubBreadcrumb(): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: locationsHub.navLabel, path: locationsHub.path },
  ];
}

export { aboutRemoteDeliverySection, homeInternationalSection, locationsHub } from './hub';
export { unitedArabEmirates, unitedKingdom, unitedStates };
export type { LocationsHub, MarketEntry } from './hub';
export type {
  CollaborationStep,
  DeliveryDisclosure,
  EngagementOption,
  LocationContent,
  LocationFaq,
  LocationSectionHeader,
  OtherMarketLink,
  ServiceLink,
  TitledBlock,
} from './types';
