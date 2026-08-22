import { loadable, type LoadableRoute } from './loadable';

/**
 * Route-level code splitting for the three content sections: `/services/*`,
 * `/locations/*` and `/insights/*`.
 *
 * Before Phase 3B, `App.tsx` imported all twenty-three of these pages
 * statically (twenty-six after Phase 3C added Germany, the Netherlands and
 * Turkey). Each one pulls in a several-hundred-line content module, so the
 * whole of the service and regional copy — every FAQ, every process step, every
 * paragraph of prose for pages a given visitor will never open — shipped inside
 * the main JavaScript bundle and had to download before the homepage could
 * become interactive.
 *
 * Each entry below is a dynamic import, so Rollup emits one chunk per page. The
 * shared `ServicePage` / `LocationPage` layouts end up in a chunk of their own
 * that only these routes pull in, and the homepage requests none of it.
 *
 * Three things keep that from degrading the experience or the prerendered HTML:
 *
 *   1. `preloadRoute()` is awaited by the prerenderer before `renderToString`,
 *      so every generated HTML file contains the complete page rather than a
 *      Suspense fallback;
 *   2. `src/main.tsx` awaits the same call before mounting the app, so the
 *      first paint is never replaced by a loading state;
 *   3. `RouteFallback` is only ever seen during an in-app navigation to a page
 *      whose chunk has not been fetched yet.
 *
 * The paths are literal strings in one table so the SEO registry, the router
 * and this map cannot drift apart — `lazyRoutes.test.tsx` asserts the three
 * lists match exactly.
 */

/** The `/services` hub and every canonical service page. */
export const SERVICE_ROUTES: Record<string, LoadableRoute> = {
  '/services': loadable(() => import('@/pages/services/ServicesHub')),
  '/services/custom-software-development': loadable(
    () => import('@/pages/services/CustomSoftwareDevelopment'),
  ),
  '/services/mobile-app-development': loadable(() => import('@/pages/services/MobileAppDevelopment')),
  '/services/web-application-development': loadable(
    () => import('@/pages/services/WebApplicationDevelopment'),
  ),
  '/services/saas-development': loadable(() => import('@/pages/services/SaasDevelopment')),
  '/services/software-modernization': loadable(() => import('@/pages/services/SoftwareModernization')),
  '/services/ai-development': loadable(() => import('@/pages/services/AiDevelopment')),
  '/services/machine-learning-development': loadable(
    () => import('@/pages/services/MachineLearningDevelopment'),
  ),
  '/services/ai-voice-agent-development': loadable(
    () => import('@/pages/services/AiVoiceAgentDevelopment'),
  ),
  '/services/ai-video-consultation-agents': loadable(
    () => import('@/pages/services/AiVideoConsultationAgents'),
  ),
  '/services/conversational-ai-development': loadable(
    () => import('@/pages/services/ConversationalAiDevelopment'),
  ),
  '/services/ai-automation-integration': loadable(
    () => import('@/pages/services/AiAutomationIntegration'),
  ),
  '/services/ui-ux-design': loadable(() => import('@/pages/services/UiUxDesign')),
  '/services/cloud-solutions': loadable(() => import('@/pages/services/CloudSolutions')),
  '/services/devops-engineering': loadable(() => import('@/pages/services/DevOpsEngineering')),
  '/services/digital-marketing': loadable(() => import('@/pages/services/DigitalMarketing')),
};

/** The `/locations` hub and every active market page. */
export const LOCATION_ROUTES: Record<string, LoadableRoute> = {
  '/locations': loadable(() => import('@/pages/locations/LocationsHub')),
  '/locations/united-states': loadable(() => import('@/pages/locations/UnitedStates')),
  '/locations/united-kingdom': loadable(() => import('@/pages/locations/UnitedKingdom')),
  '/locations/united-arab-emirates': loadable(() => import('@/pages/locations/UnitedArabEmirates')),
  '/locations/canada': loadable(() => import('@/pages/locations/Canada')),
  '/locations/australia': loadable(() => import('@/pages/locations/Australia')),
  '/locations/singapore': loadable(() => import('@/pages/locations/Singapore')),
  '/locations/germany': loadable(() => import('@/pages/locations/Germany')),
  '/locations/netherlands': loadable(() => import('@/pages/locations/Netherlands')),
  '/locations/turkey': loadable(() => import('@/pages/locations/Turkey')),
};

/**
 * The `/insights` hub and every published article.
 *
 * Split for the same reason the other two sections are: an article is a few
 * hundred lines of prose that only its own readers need, and none of it belongs
 * in the app shell that the homepage waits on.
 */
export const INSIGHT_ROUTES: Record<string, LoadableRoute> = {
  '/insights': loadable(() => import('@/pages/insights/InsightsHub')),
  '/insights/how-to-estimate-an-ai-app-project': loadable(
    () => import('@/pages/insights/EstimatingAnAiAppProject'),
  ),
  '/insights/ai-voice-agent-production-checklist': loadable(
    () => import('@/pages/insights/AiVoiceAgentProductionChecklist'),
  ),
};

/** Every split content route, keyed by its canonical path. */
export const CONTENT_ROUTES: Record<string, LoadableRoute> = {
  ...SERVICE_ROUTES,
  ...LOCATION_ROUTES,
  ...INSIGHT_ROUTES,
};

/**
 * Normalize a live pathname to the key form used above.
 *
 * The `.html` forms matter because GitHub Pages serves this site as physical
 * files: `/locations/canada`, `/locations/canada/` and `/locations/canada.html`
 * all reach the same document, and the last two are what a visitor gets if they
 * paste a URL with the extension or the trailing slash. All three have to
 * preload the same chunk, or that visitor sees the prerendered page replaced by
 * a loading state.
 */
function routeKey(pathname: string): string {
  const withoutQuery = pathname.split('?')[0].split('#')[0];
  const withoutExtension = withoutQuery.replace(/(?:\/index)?\.html?$/i, '');
  const trimmed = withoutExtension.length > 1 ? withoutExtension.replace(/\/+$/, '') : withoutExtension;
  return trimmed || '/';
}

/**
 * Fetch the chunk a pathname needs, if it is one of the split routes.
 *
 * Awaited by the prerenderer before rendering and by `main.tsx` before
 * mounting. Any other path resolves immediately, so both callers can call it
 * unconditionally.
 */
export async function preloadRoute(pathname: string): Promise<void> {
  await CONTENT_ROUTES[routeKey(pathname)]?.preload();
}

/** True once the chunk for this path is in memory. Used by the tests. */
export function isRouteLoaded(pathname: string): boolean {
  return CONTENT_ROUTES[routeKey(pathname)]?.isLoaded() ?? false;
}

/** The loadable entry for a split path, or undefined if it is not split. */
export function contentRouteFor(pathname: string): LoadableRoute | undefined {
  return CONTENT_ROUTES[routeKey(pathname)];
}
