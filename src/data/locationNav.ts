/**
 * The one locations menu, shared by the header, the mobile drawer, the footer,
 * the homepage and the About page, so no surface can link to a market page that
 * does not exist.
 *
 * The hub is the primary gateway. The header carries only the hub link, to keep
 * the desktop bar uncrowded; the drawer, the footer and the homepage list the
 * individual markets underneath it.
 *
 * Nine markets since Phase 3C, which is why those three surfaces stopped being
 * flat lists: the footer lays them out as a column grid, the mobile drawer
 * groups them inside a collapsible block, and the desktop bar still shows only
 * `/locations`. Nothing here needs to change when a tenth market is added —
 * every list is derived from the manifest.
 *
 * It reads the metadata manifest, so the navigation is synchronous and free of
 * regional page copy even though those pages are now loaded as route chunks.
 */

import { LOCATIONS_HUB_PATH, LOCATION_META, locationsHubMeta } from '@/content/locations';

export interface LocationNavItem {
  label: string;
  path: string;
}

/** The hub that lists every market. */
export const LOCATIONS_HUB = { label: locationsHubMeta.navLabel, path: LOCATIONS_HUB_PATH } as const;

/** One entry per market with a live page. Derived, never hand-maintained. */
export const LOCATION_NAV: LocationNavItem[] = LOCATION_META.map((location) => ({
  label: location.navLabel,
  path: location.path,
}));

/** True on the hub or any market page, for nav active states. */
export const isLocationPath = (pathname: string): boolean =>
  pathname === LOCATIONS_HUB_PATH || pathname.startsWith(`${LOCATIONS_HUB_PATH}/`);
