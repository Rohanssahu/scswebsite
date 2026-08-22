/**
 * The only thing a visitor can see while a route chunk is in flight.
 *
 * It carries `data-route-fallback` so the build can prove it never reaches a
 * prerendered document: `scripts/verify-dist.mjs` and `lazyRoutes.test.tsx`
 * both fail if this attribute appears in any generated HTML file.
 *
 * In practice it is only ever rendered during an in-app navigation to a page
 * whose chunk has not been downloaded yet — the prerenderer and `main.tsx` both
 * preload the current route before rendering.
 */
const RouteFallback = () => (
  <div
    data-route-fallback="true"
    className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700"
  >
    <span className="text-sm">Loading…</span>
  </div>
);

export default RouteFallback;
