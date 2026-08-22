import { Suspense } from 'react';
import RouteFallback from './RouteFallback';
import { contentRouteFor } from './contentRoutes';

/**
 * Renders one code-split content route inside its Suspense boundary.
 *
 * The prop is `route` rather than `path` on purpose: `registry.test.ts` reads
 * every `path="…"` attribute out of `App.tsx` to check that the router and the
 * SEO registry agree on the same set of routes, and a prop of the same name
 * would give it duplicates to reconcile.
 *
 * An unregistered path throws rather than rendering nothing: a content route
 * that exists in the router but not in `contentRoutes.ts` would prerender to an
 * empty page, which is the one outcome the split must never produce.
 */
const ContentRoute = ({ route }: { route: string }) => {
  const entry = contentRouteFor(route);
  if (!entry) {
    throw new Error(`No split route registered for "${route}" — add it to routes/contentRoutes.ts.`);
  }
  const { Component } = entry;
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
};

export default ContentRoute;
