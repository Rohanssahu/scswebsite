/**
 * Every composed article. Build-time and test consumers only — importing this
 * pulls both article bodies into the bundle, which is exactly what the route
 * chunks exist to avoid. Pages import their own body module.
 */

import { INSIGHT_META } from './manifest';
import { estimatingAnAiAppProject } from './estimatingAnAiAppProject';
import { aiVoiceAgentProductionChecklist } from './aiVoiceAgentProductionChecklist';
import type { InsightContent } from './types';

export const INSIGHT_CONTENT: InsightContent[] = [
  estimatingAnAiAppProject,
  aiVoiceAgentProductionChecklist,
];

/** Every article in the manifest has a body, and vice versa. */
if (INSIGHT_CONTENT.length !== INSIGHT_META.length) {
  throw new Error('INSIGHT_META and INSIGHT_CONTENT have drifted apart.');
}

export { estimatingAnAiAppProject, aiVoiceAgentProductionChecklist };
