/**
 * The lightweight insights barrel — metadata, breadcrumbs and types only.
 *
 * Nothing here may import an article body: that is what keeps the prose out of
 * the app shell. `./all.ts` composes the full objects for tests and build-time
 * consumers.
 */

export { INSIGHTS_HUB_PATH, INSIGHT_META, INSIGHT_META_BY_PATH, insightsHubMeta } from './manifest';
export { insightContent } from './compose';
export type { InsightBody, InsightContent, InsightFaq, InsightLink, InsightMeta, InsightSection } from './types';

import { INSIGHTS_HUB_PATH, insightsHubMeta } from './manifest';
import type { InsightMeta } from './types';

export interface Crumb {
  name: string;
  path: string;
}

/** `Home › Insights › Article` — the visible trail and the BreadcrumbList. */
export function insightBreadcrumb(insight: Pick<InsightMeta, 'navLabel' | 'path'>): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: insightsHubMeta.navLabel, path: INSIGHTS_HUB_PATH },
    { name: insight.navLabel, path: insight.path },
  ];
}

/** The hub's own trail: `Home › Insights`. */
export function insightsHubBreadcrumb(): Crumb[] {
  return [
    { name: 'Home', path: '/' },
    { name: insightsHubMeta.navLabel, path: INSIGHTS_HUB_PATH },
  ];
}
