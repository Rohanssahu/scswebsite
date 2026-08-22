# Phase 3A regional pages — content notes (developer-facing)

Not shipped to the browser. This file records where the few factual claims on
the regional pages come from, and what we deliberately do not claim.

## Claims made, and their basis

| Claim | Where | Basis |
| --- | --- | --- |
| SCS Softwares operates from Indore, Madhya Pradesh, India | all four pages | The company's own registered address, already published on `/contact` and in the footer, and encoded once in `src/seo/site.ts` (`CONTACT`). |
| Founded 2018 | not repeated on these pages | `FOUNDING_YEAR` in `src/seo/site.ts`, shown on `/about`. Left off the regional pages so a years-in-business claim cannot creep in. |
| IST is 5:30 ahead of UTC | implied by every offset below | IANA time zone database, zone `Asia/Kolkata` (`+05:30`, no daylight saving). |
| IST is 9h30–10h30 ahead of US Eastern | `/locations/united-states` | IANA zone `America/New_York`: `-05:00` standard, `-04:00` during daylight saving. 10:30 and 9:30 respectively. |
| IST is 12h30–13h30 ahead of US Pacific | `/locations/united-states` | IANA zone `America/Los_Angeles`: `-08:00` / `-07:00`. |
| IST is 4h30–5h30 ahead of the UK | `/locations/united-kingdom` | IANA zone `Europe/London`: `+00:00` standard, `+01:00` during British Summer Time. |
| IST is 1h30 ahead of Gulf Standard Time | `/locations/united-arab-emirates` | IANA zone `Asia/Dubai`: `+04:00`, no daylight saving. |
| Indian and UAE working weeks differ at the weekend | `/locations/united-arab-emirates` | Stated as a scheduling fact to agree at kick-off, not as a specific calendar claim. No named working days are asserted. |

Time-zone offsets are the only quantitative statements on these pages. They are
properties of the tz database rather than claims about SCS, and they are written
in words rather than figures so they cannot be mistaken for a service level.

## Regulatory and legal language

No page names a statute, framework or regulator as something SCS complies with.
The pattern used throughout is: *requirements are confirmed during discovery and
we build to what your own advisers specify.*

Where a framework is named at all it is inside an explicit denial — for example
"we hold no such certification and do not claim compliance with either
framework" on the US page's HIPAA/SOC 2 question, and "we do not describe our
service as UK GDPR compliant" on the UK page. That wording is deliberate:
compliance for these frameworks is a property of the client's processing and of
an assessment we cannot perform, so asserting it would be false rather than
merely optimistic.

If a future phase wants to reference a primary source visibly, use the
regulator's own text — e.g. the UK Information Commissioner's Office for UK data
protection, or the relevant UAE federal legislation portal — and keep the
sentence descriptive. Do not paraphrase a law into an obligation, and do not
imply that building to a control set produces a compliance status.

## Deliberately absent

- Market size, demand, growth or spend figures for any country.
- Client counts, project counts, retention or satisfaction figures.
- Rankings, awards, "top vendor" or "leading" language.
- Any office, entity, branch, address, telephone number or employee outside India.
- Any certification, accreditation, framework place or government approval.
- Any fixed overlap-hours figure. The overlap is agreed per engagement, and the
  pages say so; `scripts/verify-dist.mjs` fails the build on a guaranteed-coverage
  claim.
- Named local partners, resellers or representatives.
- Arabic-language authoring capability. The UAE page scopes Arabic *interface
  engineering* (right-to-left layout, typography, bidirectional text) and states
  that the wording is supplied or approved by the client.

## Where the guardrails live

- `src/pages/locations/locationPages.test.tsx` — per-page structure, honesty
  patterns, required disclosures, and the duplicate-content scans.
- `scripts/verify-dist.mjs` (`checkLocationPages`) — the same honesty scan
  against the built HTML, served through the static server.
