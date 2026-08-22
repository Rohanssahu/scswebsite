/**
 * The one locations menu, shared by the header, the mobile drawer, the footer,
 * the homepage and the About page, so no surface can link to a market page that
 * does not exist.
 *
 * The hub is the primary gateway. The header carries only the hub link, to keep
 * the desktop bar uncrowded; the drawer, the footer and the homepage list the
 * individual markets underneath it.
 */

import { LOCATION_CONTENT, LOCATIONS_HUB_PATH, locationsHub } from '@/content/locations';

export interface LocationNavItem {
  label: string;
  path: string;
}

/** The hub that lists every market. */
export const LOCATIONS_HUB = { label: locationsHub.navLabel, path: LOCATIONS_HUB_PATH } as const;

/** One entry per market with a live page. Derived, never hand-maintained. */
export const LOCATION_NAV: LocationNavItem[] = LOCATION_CONTENT.map((location) => ({
  label: location.navLabel,
  path: location.path,
}));

/** True on the hub or any market page, for nav active states. */
export const isLocationPath = (pathname: string): boolean =>
  pathname === LOCATIONS_HUB_PATH || pathname.startsWith(`${LOCATIONS_HUB_PATH}/`);
