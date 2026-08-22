import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyHeadTags, buildHeadTags, type HeadDocumentLike } from './head';
import { canonicalFor, matchRouteSeo } from './registry';

/**
 * Keeps the document head in sync with the SEO registry on client-side
 * navigation, using the same tag list the build injected into the prerendered
 * HTML. Rendered once, after the route tree, so its effect is the last word on
 * the head after any page-level head patching (e.g. the admin noindex hook).
 */
const Seo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = matchRouteSeo(pathname);
    const tags = buildHeadTags(route, canonicalFor(pathname));
    applyHeadTags(document as unknown as HeadDocumentLike, tags);
  }, [pathname]);

  return null;
};

export default Seo;
