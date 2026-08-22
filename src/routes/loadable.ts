import { createElement, type ComponentType } from 'react';

/**
 * A route component that is fetched on demand, with an explicit preload step.
 *
 * This is a deliberately small replacement for `React.lazy` in one place where
 * `React.lazy` cannot be used: the build-time prerender.
 *
 * `renderToString` is synchronous. `React.lazy` decides whether a module is
 * available only while React is rendering it, and on the first attempt it
 * always suspends — even if the underlying dynamic import has already resolved.
 * The prerenderer would therefore emit a Suspense fallback instead of the page,
 * which is exactly the failure this phase exists to avoid.
 *
 * `loadable()` keeps the resolved module in a module-level cache that the
 * caller can fill *before* rendering. Once `preload()` has resolved, the
 * component renders synchronously, so:
 *
 *   - `scripts/prerender.mjs` awaits `preloadRoute(url)` and then gets complete
 *     HTML out of `renderToString`;
 *   - `src/main.tsx` awaits the same call before mounting, so the browser never
 *     replaces prerendered copy with a loading state on the first paint;
 *   - a client-side navigation to a page whose chunk has not been fetched yet
 *     suspends normally and shows the route fallback for as long as the
 *     download takes.
 *
 * A module that fails to load surfaces as a thrown error rather than a silent
 * blank page: during the build that fails the route (and therefore the build),
 * and in the browser it reaches the nearest error boundary.
 *
 * The component is built with `createElement` rather than JSX so this module can
 * stay a plain `.ts` file — it exports a factory, not a component, and mixing
 * the two in one file breaks React Fast Refresh.
 */
export interface LoadableRoute {
  /** Renders the page. Synchronous once `preload()` has resolved. */
  Component: ComponentType;
  /** Fetches the chunk. Never rejects; a failure is raised at render time. */
  preload: () => Promise<void>;
  /** True once the chunk is in memory and the component renders synchronously. */
  isLoaded: () => boolean;
}

type ModuleLoader = () => Promise<{ default: ComponentType }>;

export function loadable(load: ModuleLoader): LoadableRoute {
  let status: 'idle' | 'pending' | 'loaded' | 'failed' = 'idle';
  let Loaded: ComponentType | null = null;
  let pending: Promise<void> | null = null;
  let failure: Error | null = null;

  const preload = (): Promise<void> => {
    if (status === 'loaded' || status === 'failed') return Promise.resolve();
    if (!pending) {
      status = 'pending';
      pending = load().then(
        (module) => {
          Loaded = module.default;
          status = 'loaded';
        },
        (error: unknown) => {
          failure = error instanceof Error ? error : new Error(String(error));
          status = 'failed';
        },
      );
    }
    return pending;
  };

  const Component: ComponentType = () => {
    if (status === 'loaded' && Loaded) return createElement(Loaded);
    if (status === 'failed') throw failure ?? new Error('Route chunk failed to load.');
    // Suspend: React shows the route fallback and re-renders when this settles.
    throw preload();
  };

  return { Component, preload, isLoaded: () => status === 'loaded' };
}
