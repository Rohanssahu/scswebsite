/**
 * Case-study drafts. **Nothing here is published, and nothing here may be.**
 *
 * Each entry is the skeleton of a study we could write if the owner supplied
 * the evidence listed in `missingEvidence`. The prose fields hold only what the
 * repository can already support — the product concepts on `/products` are
 * SCS Softwares' own, so describing the *kind* of system is safe. Everything
 * that would make it a case study rather than a product description (a client,
 * a result, a date, a screenshot, a live URL) is deliberately `null`, empty, or
 * listed as missing.
 *
 * These are drafts in the strict sense: no route imports this file, so no HTML
 * is emitted, so none of it can be crawled, indexed, linked or cited. The
 * `caseStudies.test.ts` gate fails the build if that ever changes without the
 * evidence arriving first.
 *
 * See `docs/seo/CASE_STUDY_EVIDENCE_REQUIRED.md` for the owner-facing version.
 */

import type { CaseStudy } from './types';

export const CASE_STUDY_DRAFTS: CaseStudy[] = [
  {
    status: 'draft-evidence-required',
    path: '/case-studies/roomji-room-and-flat-booking-app',
    client: null,
    clientNamed: false,
    projectName: 'RoomJi',
    problem:
      'Renters searching for rooms and flats in a specific area have to work through listings that are scattered, stale and impossible to compare, while property owners have no straightforward way to reach them.',
    projectType: 'Mobile application',
    contribution: [
      'PLACEHOLDER — must state exactly what SCS Softwares built and, if the project was shared, what it did not build.',
    ],
    technology: ['PLACEHOLDER — the stack actually used, confirmed against the repository or the owner.'],
    deliveryApproach: ['PLACEHOLDER — the real discovery, milestone and review cadence for this engagement.'],
    challenges: ['PLACEHOLDER — real problems encountered. A study with no challenges is an advert.'],
    solution: ['PLACEHOLDER — what was built to address them.'],
    outcomes: [],
    serviceLinks: ['/services/mobile-app-development'],
    marketLink: null,
    projectStatus: 'PLACEHOLDER — live, in maintenance, completed and handed over, or discontinued.',
    approvedImages: [],
    datePublished: null,
    missingEvidence: [
      'client-naming-consent',
      'project-disclosure-consent',
      'public-deployment-url',
      'approved-screenshot',
      'confirmed-timeline',
    ],
  },
  {
    status: 'draft-evidence-required',
    path: '/case-studies/ai-voice-consultation-agent',
    client: null,
    clientNamed: false,
    projectName: null,
    problem:
      'Prospective clients in other timezones arrive on the site outside our working hours, and a contact form gives them nothing back until the next working day.',
    projectType: 'AI voice and video consultation agent',
    // This is the one study where the "client" could be SCS Softwares itself.
    // That is legitimate and unusually well evidenced — the system is in this
    // repository and running in production on our own site — but it must be
    // labelled as our own product throughout, never presented as client work.
    contribution: [
      'PLACEHOLDER — describe this as an SCS Softwares internal product, explicitly, in the first sentence.',
    ],
    technology: ['PLACEHOLDER — confirm the current stack before publishing; it changes.'],
    deliveryApproach: ['PLACEHOLDER — how it was built and how it is maintained.'],
    challenges: ['PLACEHOLDER — the real failure modes; the published article on this covers several.'],
    solution: ['PLACEHOLDER — what was done about each.'],
    outcomes: [],
    serviceLinks: ['/services/ai-voice-agent-development', '/services/ai-video-consultation-agents'],
    marketLink: null,
    projectStatus: 'PLACEHOLDER — confirm before publishing.',
    approvedImages: [],
    datePublished: null,
    missingEvidence: ['approved-screenshot', 'client-confirmed-metric', 'confirmed-timeline'],
  },
];
