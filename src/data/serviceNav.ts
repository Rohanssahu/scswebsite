/**
 * The one service menu, shared by the header dropdown, the mobile drawer and
 * the footer, so no surface can drift or keep pointing at a retired URL.
 *
 * Two groups: the canonical software-development pages under `/services/*`
 * (Phase 2A), and the remaining `/gig/*` pages that have not been migrated yet
 * (UI/UX, cloud, DevOps, digital marketing).
 */

import { SERVICE_CONTENT } from '@/content/services';

export interface ServiceNavItem {
  /** Key under `services.names` in the translation files. */
  nameKey: string;
  path: string;
}

/** Canonical software-development services. */
export const CORE_SERVICE_NAV: ServiceNavItem[] = SERVICE_CONTENT.map((service) => ({
  nameKey: service.path.replace('/services/', ''),
  path: service.path,
}));

/** Service pages still living under `/gig/*`. */
export const OTHER_SERVICE_NAV: ServiceNavItem[] = [
  { nameKey: 'ui-ux-design', path: '/gig/ui-ux-design' },
  { nameKey: 'cloud-solutions', path: '/gig/cloud-solutions' },
  { nameKey: 'devops-services', path: '/gig/devops-services' },
  { nameKey: 'digital-marketing', path: '/gig/digital-marketing' },
];

export const ALL_SERVICE_NAV: ServiceNavItem[] = [...CORE_SERVICE_NAV, ...OTHER_SERVICE_NAV];

/** True on any service page, for nav active states. */
export const isServicePath = (pathname: string): boolean =>
  pathname.startsWith('/services/') || pathname.startsWith('/gig/');
