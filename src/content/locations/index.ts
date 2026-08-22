/**
 * The lightweight locations barrel.
 *
 * Everything here is small enough to live in the main JavaScript bundle: the
 * metadata manifest, the required-service-link list, the breadcrumb builders,
 * the two short site-wide blocks and the types. The `/locations` hub copy is in
 * `./hub.ts` and each market's copy in its own module — both loaded as
 * route-level chunks.
 *
 * Nothing in this file may import a country body module or the hub copy.
 * `./all.ts` composes the full objects for tests and other build-time
 * consumers.
 */

export {
  LOCATIONS_HUB_PATH,
  LOCATION_META,
  LOCATION_META_BY_PATH,
  REQUIRED_SERVICE_LINKS,
  locationsHubMeta,
} from './manifest';
export { locationContent } from './compose';
export { aboutRemoteDeliverySection, homeInternationalSection } from './siteBlocks';
export type {
  CollaborationStep,
  DeliveryDisclosure,
  EngagementOption,
  LocalizationSection,
  LocationBody,
  LocationContent,
  LocationFaq,
  LocationMeta,
  LocationSectionHeader,
  OtherMarketLink,
  ServiceLink,
  TitledBlock,
} from './types';

import { LOCATIONS_HUB_PATH, locationsHubMeta } from './manifest';
import type { LocationMeta } from './types';

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail for a country page, and the source of its
 * BreadcrumbList JSON-LD: `Home › Locations › Country`. Both come from this one
 * function, so the trail and the markup cannot describe different paths.
 *
 * It takes only the metadata half, so the SEO registry builds every trail
 * without loading a line of regional copy.
 */
export function locationBreadcrumb(location: Pick<LocationMeta, 'navLabel' | 'path'>): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: locationsHubMeta.navLabel, path: LOCATIONS_HUB_PATH },
    { name: location.navLabel, path: location.path },
  ];
}

/** The hub's own trail: `Home › Locations`. */
export function locationsHubBreadcrumb(): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: locationsHubMeta.navLabel, path: LOCATIONS_HUB_PATH },
  ];
}
