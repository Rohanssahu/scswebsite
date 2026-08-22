/**
 * The one service menu, shared by the header dropdown, the mobile drawer, the
 * footer, the homepage and the `/services` hub, so no surface can drift or
 * keep pointing at a retired URL.
 *
 * Three groups: the software-development pages, the AI pages, and the
 * supporting design, cloud, delivery and growth pages. Every entry is a
 * canonical `/services/*` URL — the old `/gig/*` paths only exist as
 * forwarding stubs now, and nothing in the navigation points at them.
 *
 * It reads the metadata manifest rather than the page content modules, so the
 * navigation stays synchronous and costs the main bundle a list of paths and
 * labels instead of every service page's prose.
 */

import {
  AI_SERVICE_META,
  DELIVERY_SERVICE_META,
  GROWTH_SERVICE_META,
  SERVICES_HUB_PATH,
  SOFTWARE_SERVICE_META,
} from '@/content/services';

export interface ServiceNavItem {
  /** Key under `services.names` in the translation files. */
  nameKey: string;
  path: string;
}

const toNavItem = (path: string): ServiceNavItem => ({
  nameKey: path.replace('/services/', ''),
  path,
});

/** The hub that lists every service. */
export const SERVICES_HUB = { nameKey: 'all-services', path: SERVICES_HUB_PATH } as const;

/** Software-development services. */
export const CORE_SERVICE_NAV: ServiceNavItem[] = SOFTWARE_SERVICE_META.map((service) => toNavItem(service.path));

/** AI services. */
export const AI_SERVICE_NAV: ServiceNavItem[] = AI_SERVICE_META.map((service) => toNavItem(service.path));

/** Design, cloud and delivery services — the ones that sit inside a build. */
export const DELIVERY_SERVICE_NAV: ServiceNavItem[] = DELIVERY_SERVICE_META.map((service) =>
  toNavItem(service.path),
);

/** Growth services, kept separate from the engineering offer. */
export const GROWTH_SERVICE_NAV: ServiceNavItem[] = GROWTH_SERVICE_META.map((service) =>
  toNavItem(service.path),
);

/** Everything under the menu's "more services" heading. */
export const OTHER_SERVICE_NAV: ServiceNavItem[] = [...DELIVERY_SERVICE_NAV, ...GROWTH_SERVICE_NAV];

export const ALL_SERVICE_NAV: ServiceNavItem[] = [...CORE_SERVICE_NAV, ...AI_SERVICE_NAV, ...OTHER_SERVICE_NAV];

/** True on the hub or any service page, for nav active states. */
export const isServicePath = (pathname: string): boolean =>
  pathname === SERVICES_HUB_PATH || pathname.startsWith('/services/');
