/**
 * The one service menu, shared by the header dropdown, the mobile drawer, the
 * footer, the homepage and the `/services` hub, so no surface can drift or
 * keep pointing at a retired URL.
 *
 * Three groups: the software-development pages, the AI pages, and the services
 * still living on their original `/gig/*` URLs.
 */

import { AI_SERVICE_CONTENT, SERVICES_HUB_PATH, SOFTWARE_SERVICE_CONTENT } from '@/content/services';

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
export const CORE_SERVICE_NAV: ServiceNavItem[] = SOFTWARE_SERVICE_CONTENT.map((service) => toNavItem(service.path));

/** AI services. */
export const AI_SERVICE_NAV: ServiceNavItem[] = AI_SERVICE_CONTENT.map((service) => toNavItem(service.path));

/** Service pages still living under `/gig/*`. */
export const OTHER_SERVICE_NAV: ServiceNavItem[] = [
  { nameKey: 'ui-ux-design', path: '/gig/ui-ux-design' },
  { nameKey: 'cloud-solutions', path: '/gig/cloud-solutions' },
  { nameKey: 'devops-services', path: '/gig/devops-services' },
  { nameKey: 'digital-marketing', path: '/gig/digital-marketing' },
];

export const ALL_SERVICE_NAV: ServiceNavItem[] = [...CORE_SERVICE_NAV, ...AI_SERVICE_NAV, ...OTHER_SERVICE_NAV];

/** True on the hub or any service page, for nav active states. */
export const isServicePath = (pathname: string): boolean =>
  pathname === SERVICES_HUB_PATH || pathname.startsWith('/services/') || pathname.startsWith('/gig/');
