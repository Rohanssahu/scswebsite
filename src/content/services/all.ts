/**
 * Every service page, fully composed: metadata joined to body copy.
 *
 * This module imports all fifteen body modules, so importing it pulls the whole
 * ~320 KB of service prose into whatever is doing the importing. That is the
 * right trade for tests and other build-time consumers, and the wrong trade for
 * the browser — so **nothing under `src/pages`, `src/components`, `src/data` or
 * `src/seo` may import this file**. They read `./manifest.ts` instead, and the
 * page bodies arrive as route-level chunks.
 *
 * `servicePages.test.tsx` enforces that rule.
 */

import { aiAutomationIntegration } from './aiAutomationIntegration';
import { aiDevelopment } from './aiDevelopment';
import { aiVideoConsultationAgents } from './aiVideoConsultationAgents';
import { aiVoiceAgentDevelopment } from './aiVoiceAgentDevelopment';
import { cloudSolutions } from './cloudSolutions';
import { conversationalAiDevelopment } from './conversationalAiDevelopment';
import { customSoftwareDevelopment } from './customSoftwareDevelopment';
import { devopsEngineering } from './devopsEngineering';
import { digitalMarketing } from './digitalMarketing';
import { machineLearningDevelopment } from './machineLearningDevelopment';
import { mobileAppDevelopment } from './mobileAppDevelopment';
import { saasDevelopment } from './saasDevelopment';
import { softwareModernization } from './softwareModernization';
import { uiUxDesign } from './uiUxDesign';
import { webApplicationDevelopment } from './webApplicationDevelopment';
import { serviceContent } from './compose';
import type { ServiceBody, ServiceContent } from './types';

/** Every body module, keyed by canonical path. */
export const SERVICE_BODY_BY_PATH: Record<string, ServiceBody> = Object.fromEntries(
  [
    customSoftwareDevelopment,
    mobileAppDevelopment,
    webApplicationDevelopment,
    saasDevelopment,
    softwareModernization,
    aiDevelopment,
    machineLearningDevelopment,
    aiVoiceAgentDevelopment,
    aiVideoConsultationAgents,
    conversationalAiDevelopment,
    aiAutomationIntegration,
    uiUxDesign,
    cloudSolutions,
    devopsEngineering,
    digitalMarketing,
  ].map((body) => [body.path, body]),
);

/** Every service page rendered by the shared ServicePage layout. */
export const SERVICE_CONTENT: ServiceContent[] = [
  customSoftwareDevelopment,
  mobileAppDevelopment,
  webApplicationDevelopment,
  saasDevelopment,
  softwareModernization,
  aiDevelopment,
  machineLearningDevelopment,
  aiVoiceAgentDevelopment,
  aiVideoConsultationAgents,
  conversationalAiDevelopment,
  aiAutomationIntegration,
  uiUxDesign,
  cloudSolutions,
  devopsEngineering,
  digitalMarketing,
].map(serviceContent);

export const SERVICE_CONTENT_BY_PATH: Record<string, ServiceContent> = Object.fromEntries(
  SERVICE_CONTENT.map((service) => [service.path, service]),
);

const inGroups = (...groups: ServiceContent['group'][]): ServiceContent[] =>
  SERVICE_CONTENT.filter((service) => groups.includes(service.group));

/** Software-development service pages (Phase 2A). */
export const SOFTWARE_SERVICE_CONTENT: ServiceContent[] = inGroups('software');
/** AI service pages (Phase 2B). */
export const AI_SERVICE_CONTENT: ServiceContent[] = inGroups('ai');
/** Design, cloud and delivery service pages (Phase 2C). */
export const DELIVERY_SERVICE_CONTENT: ServiceContent[] = inGroups('design', 'platform');
/** Growth services (Phase 2C). */
export const GROWTH_SERVICE_CONTENT: ServiceContent[] = inGroups('growth');
/** The supporting services, in the order every surface lists them. */
export const SUPPORT_SERVICE_CONTENT: ServiceContent[] = [
  ...DELIVERY_SERVICE_CONTENT,
  ...GROWTH_SERVICE_CONTENT,
];

/** The pillar page for the software-development group. */
export const PILLAR_SERVICE = SERVICE_CONTENT_BY_PATH['/services/custom-software-development'];
/** The pillar page for the AI group. */
export const AI_PILLAR_SERVICE = SERVICE_CONTENT_BY_PATH['/services/ai-development'];

export { servicesHub } from './hub';
export type { HubEntry, HubGroup, ServicesHub } from './hub';
