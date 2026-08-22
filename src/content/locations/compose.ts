/**
 * Joins a lazily loaded `LocationBody` back onto its manifest entry.
 *
 * The route chunk carries one country's copy; the manifest is already in
 * memory. This is the only place the two halves are put together.
 */

import { LOCATION_META_BY_PATH } from './manifest';
import type { LocationBody, LocationContent } from './types';

export function locationContent(body: LocationBody): LocationContent {
  const meta = LOCATION_META_BY_PATH[body.path];
  if (!meta) {
    // A body with no manifest entry would render a market page the registry,
    // the sitemap and the navigation know nothing about. Fail loudly.
    throw new Error(`No location manifest entry for "${body.path}".`);
  }
  return { ...meta, ...body };
}
