/**
 * The lightweight service barrel.
 *
 * Everything exported here is small enough to sit in the main JavaScript
 * bundle: the metadata manifest, the breadcrumb builders and the types. The
 * `/services` hub copy lives in `./hub.ts` and each page's body copy in its own
 * module, both of which are loaded as route-level chunks.
 *
 * Nothing in this file may import a body module or the hub copy — that is what
 * keeps 320 KB of service prose out of the app shell. `./all.ts` composes the
 * full objects for tests and other build-time consumers.
 */

export {
  AI_PILLAR_SERVICE_META,
  AI_SERVICE_META,
  DELIVERY_SERVICE_META,
  GROWTH_SERVICE_META,
  PILLAR_SERVICE_META,
  SERVICES_HUB_PATH,
  SERVICE_META,
  SERVICE_META_BY_PATH,
  SOFTWARE_SERVICE_META,
  SUPPORT_SERVICE_META,
  servicesHubMeta,
} from './manifest';
export { serviceContent } from './compose';
export type {
  CapabilityGroup,
  EngagementOption,
  FaqItem,
  ProblemBlock,
  ProcessStep,
  RelatedLink,
  ServiceBody,
  ServiceContent,
  ServiceGroup,
  ServiceIconKey,
  ServiceMeta,
  ServiceSectionHeader,
} from './types';

import { SERVICES_HUB_PATH, servicesHubMeta } from './manifest';
import type { ServiceMeta } from './types';

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail for a service page, and the source of its
 * BreadcrumbList JSON-LD: `Home › Services › Service Name`. Both the trail and
 * the markup are built from this one function, so they cannot describe
 * different paths.
 *
 * It takes only the metadata half, so the SEO registry can build every trail
 * without loading a line of page copy.
 */
export function serviceBreadcrumb(service: Pick<ServiceMeta, 'navLabel' | 'path'>): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: servicesHubMeta.navLabel, path: SERVICES_HUB_PATH },
    { name: service.navLabel, path: service.path },
  ];
}

/** The hub's own trail: `Home › Services`. */
export function hubBreadcrumb(): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: servicesHubMeta.navLabel, path: SERVICES_HUB_PATH },
  ];
}
