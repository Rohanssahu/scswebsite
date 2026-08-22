import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logPageView } from '@/utils/analytics';

/**
 * One GA4 page view per real route navigation, and never more than one.
 *
 * The gtag snippet in index.html runs with `send_page_view: false`, so the tag
 * reports nothing on its own and this component is the single source of page
 * views. Every route — including the first one rendered — is reported from
 * here, which keeps the count identical whether a visitor lands on a
 * prerendered page or navigates to it.
 *
 * Duplication is prevented on the two axes it actually happens:
 *
 *   - a re-render or a StrictMode double-effect repeats the same path, so the
 *     last reported path is held in a ref and an identical one is ignored;
 *   - a hash or query change is not a navigation, so the effect keys on
 *     `pathname` alone and an in-page anchor reports nothing.
 *
 * One owner action backs this up: GA4 Admin → Data Streams → Enhanced
 * measurement → Page views → "Page changes based on browser history events"
 * must be OFF, or the tag will add a second page view of its own on each
 * client-side navigation. See docs/PRODUCTION-LAUNCH.md.
 */
const RouteAnalytics = () => {
  const { pathname } = useLocation();
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    if (lastReported.current === pathname) return;
    lastReported.current = pathname;
    logPageView(pathname);
  }, [pathname]);

  return null;
};

export default RouteAnalytics;
