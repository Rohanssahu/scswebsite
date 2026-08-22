/**
 * Joins a lazily loaded `ServiceBody` back onto its manifest entry.
 *
 * The route chunk carries the body; the manifest is already in memory. This is
 * the one place the two halves are put together, so nothing downstream has to
 * know the modules were ever separate.
 */

import { SERVICE_META_BY_PATH } from './manifest';
import type { ServiceBody, ServiceContent } from './types';

export function serviceContent(body: ServiceBody): ServiceContent {
  const meta = SERVICE_META_BY_PATH[body.path];
  if (!meta) {
    // A body with no manifest entry would render a page the SEO registry, the
    // sitemap and the navigation know nothing about. Fail loudly instead.
    throw new Error(`No service manifest entry for "${body.path}".`);
  }
  return { ...meta, ...body };
}
