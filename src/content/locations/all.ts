/**
 * Every regional page, fully composed: metadata joined to body copy.
 *
 * Importing this module pulls all six country bodies (~200 KB of prose) into
 * whatever imports it. That is the right trade for tests and other build-time
 * consumers and the wrong trade for the browser, so **nothing under
 * `src/pages`, `src/components`, `src/data` or `src/seo` may import this
 * file** — they read `./manifest.ts`, and the bodies arrive as route chunks.
 *
 * `locationPages.test.tsx` enforces that rule.
 */

import { australia } from './australia';
import { canada } from './canada';
import { singapore } from './singapore';
import { unitedArabEmirates } from './unitedArabEmirates';
import { unitedKingdom } from './unitedKingdom';
import { unitedStates } from './unitedStates';
import { locationContent } from './compose';
import type { LocationBody, LocationContent } from './types';

/** Every body module, in the order the manifest and the hub list them. */
export const LOCATION_BODIES: LocationBody[] = [
  unitedStates,
  unitedKingdom,
  unitedArabEmirates,
  canada,
  australia,
  singapore,
];

/** The active markets. Exactly the countries with a written page. */
export const LOCATION_CONTENT: LocationContent[] = LOCATION_BODIES.map(locationContent);

export const LOCATION_CONTENT_BY_PATH: Record<string, LocationContent> = Object.fromEntries(
  LOCATION_CONTENT.map((location) => [location.path, location]),
);

export { australia, canada, singapore, unitedArabEmirates, unitedKingdom, unitedStates };
export { locationsHub } from './hub';
export type { LocationsHub, MarketEntry } from './hub';
