/**
 * Every service page, in the order it appears in navigation and on the
 * `/services` hub.
 *
 * `src/seo/registry.ts`, the header, the footer, the homepage, the hub and the
 * page components all read this list, so a new service page is added in one
 * place and reaches every surface.
 */

import { aiAutomationIntegration } from './aiAutomationIntegration';
import { aiDevelopment } from './aiDevelopment';
import { aiVideoConsultationAgents } from './aiVideoConsultationAgents';
import { aiVoiceAgentDevelopment } from './aiVoiceAgentDevelopment';
import { conversationalAiDevelopment } from './conversationalAiDevelopment';
import { customSoftwareDevelopment } from './customSoftwareDevelopment';
import { machineLearningDevelopment } from './machineLearningDevelopment';
import { mobileAppDevelopment } from './mobileAppDevelopment';
import { saasDevelopment } from './saasDevelopment';
import { servicesHub } from './hub';
import { softwareModernization } from './softwareModernization';
import { webApplicationDevelopment } from './webApplicationDevelopment';
import type { ServiceContent } from './types';

/** The hub every service page's breadcrumb passes through. */
export const SERVICES_HUB_PATH = servicesHub.path;

/** The pillar page for the software-development group. */
export const PILLAR_SERVICE = customSoftwareDevelopment;
/** The pillar page for the AI group. */
export const AI_PILLAR_SERVICE = aiDevelopment;

/** Software-development service pages (Phase 2A). */
export const SOFTWARE_SERVICE_CONTENT: ServiceContent[] = [
  customSoftwareDevelopment,
  mobileAppDevelopment,
  webApplicationDevelopment,
  saasDevelopment,
  softwareModernization,
];

/** AI service pages (Phase 2B). */
export const AI_SERVICE_CONTENT: ServiceContent[] = [
  aiDevelopment,
  machineLearningDevelopment,
  aiVoiceAgentDevelopment,
  aiVideoConsultationAgents,
  conversationalAiDevelopment,
  aiAutomationIntegration,
];

/** Every service page rendered by the shared ServicePage layout. */
export const SERVICE_CONTENT: ServiceContent[] = [...SOFTWARE_SERVICE_CONTENT, ...AI_SERVICE_CONTENT];

export const SERVICE_CONTENT_BY_PATH: Record<string, ServiceContent> = Object.fromEntries(
  SERVICE_CONTENT.map((service) => [service.path, service]),
);

export interface Crumb {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail for a service page, and the source of its
 * BreadcrumbList JSON-LD: `Home › Services › Service Name`. Both the trail and
 * the markup are built from this one function, so they cannot describe
 * different paths.
 */
export function serviceBreadcrumb(service: ServiceContent): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: servicesHub.navLabel, path: servicesHub.path },
    { name: service.navLabel, path: service.path },
  ];
}

/** The hub's own trail: `Home › Services`. */
export function hubBreadcrumb(): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: servicesHub.navLabel, path: servicesHub.path },
  ];
}

export {
  aiAutomationIntegration,
  aiDevelopment,
  aiVideoConsultationAgents,
  aiVoiceAgentDevelopment,
  conversationalAiDevelopment,
  customSoftwareDevelopment,
  machineLearningDevelopment,
  mobileAppDevelopment,
  saasDevelopment,
  servicesHub,
  softwareModernization,
  webApplicationDevelopment,
};
export type { ServiceContent } from './types';
export type { HubEntry, HubGroup } from './hub';
