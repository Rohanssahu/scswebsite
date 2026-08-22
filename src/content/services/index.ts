/**
 * The five canonical service pages, in the order they appear in navigation.
 *
 * `src/seo/registry.ts`, the header, the footer, the homepage and the page
 * components all read this list, so a new service page is added in one place.
 */

import { customSoftwareDevelopment } from './customSoftwareDevelopment';
import { mobileAppDevelopment } from './mobileAppDevelopment';
import { saasDevelopment } from './saasDevelopment';
import { softwareModernization } from './softwareModernization';
import { webApplicationDevelopment } from './webApplicationDevelopment';
import type { ServiceContent } from './types';

/** The pillar page every other service page links back to. */
export const PILLAR_SERVICE = customSoftwareDevelopment;

export const SERVICE_CONTENT: ServiceContent[] = [
  customSoftwareDevelopment,
  mobileAppDevelopment,
  webApplicationDevelopment,
  saasDevelopment,
  softwareModernization,
];

export const SERVICE_CONTENT_BY_PATH: Record<string, ServiceContent> = Object.fromEntries(
  SERVICE_CONTENT.map((service) => [service.path, service]),
);

/**
 * Visible breadcrumb trail for a service page, and the source of its
 * BreadcrumbList JSON-LD. The pillar page is the parent of the other four, so
 * the trail matches the way the pages actually link to each other.
 */
export function serviceBreadcrumb(service: ServiceContent): { name: string; path: string }[] {
  const home = { name: 'Home', path: '/' };
  if (service.path === PILLAR_SERVICE.path) {
    return [home, { name: service.navLabel, path: service.path }];
  }
  return [
    home,
    { name: PILLAR_SERVICE.navLabel, path: PILLAR_SERVICE.path },
    { name: service.navLabel, path: service.path },
  ];
}

export { customSoftwareDevelopment, mobileAppDevelopment, saasDevelopment, softwareModernization, webApplicationDevelopment };
export type { ServiceContent } from './types';
