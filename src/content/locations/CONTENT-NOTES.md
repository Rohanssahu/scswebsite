# Regional pages — content notes (developer-facing)

Not shipped to the browser. This file records where the few factual claims on
the regional pages come from, and what we deliberately do not claim.

Active markets: the United States, the United Kingdom, the United Arab Emirates
(Phase 3A), plus Canada, Australia and Singapore (Phase 3B). Germany, the
Netherlands and Turkey are named on `/locations` as prose with no link, because
there is nothing written to link to yet.

## Claims made, and their basis

| Claim | Where | Basis |
| --- | --- | --- |
| SCS Softwares operates from Indore, Madhya Pradesh, India | all six country pages and the hub | The company's own registered address, already published on `/contact` and in the footer, and encoded once in `src/seo/site.ts` (`CONTACT`). |
| Founded 2018 | not repeated on these pages | `FOUNDING_YEAR` in `src/seo/site.ts`, shown on `/about`. Left off the regional pages so a years-in-business claim cannot creep in. |
| IST is 5:30 ahead of UTC | implied by every offset below | IANA time zone database, zone `Asia/Kolkata` (`+05:30`, no daylight saving). |
| IST is 9h30–10h30 ahead of US Eastern | `/locations/united-states` | IANA zone `America/New_York`: `-05:00` standard, `-04:00` during daylight saving. 10:30 and 9:30 respectively. |
| IST is 12h30–13h30 ahead of US Pacific | `/locations/united-states` | IANA zone `America/Los_Angeles`: `-08:00` / `-07:00`. |
| IST is 4h30–5h30 ahead of the UK | `/locations/united-kingdom` | IANA zone `Europe/London`: `+00:00` standard, `+01:00` during British Summer Time. |
| IST is 1h30 ahead of Gulf Standard Time | `/locations/united-arab-emirates` | IANA zone `Asia/Dubai`: `+04:00`, no daylight saving. |
| Indian and UAE working weeks differ at the weekend | `/locations/united-arab-emirates` | Stated as a scheduling fact to agree at kick-off, not as a specific calendar claim. No named working days are asserted. |
| Canada covers six clock offsets | `/locations/canada` | Newfoundland, Atlantic, Eastern, Central, Mountain and Pacific time. IANA zones `America/St_Johns`, `America/Halifax`, `America/Toronto`, `America/Winnipeg`, `America/Edmonton`, `America/Vancouver`. |
| IST is roughly 8h–13h30 ahead of local time in Canada | `/locations/canada` | The same six zones: `-03:30`/`-02:30` through `-08:00`/`-07:00`. IST minus those gives 9:00/8:00 at the Newfoundland end and 13:30/12:30 at the Pacific end, so the true span is 8:00–13:30. Written as "roughly eight to thirteen and a half hours". |
| Australia is 2h30–5h30 *ahead* of IST | `/locations/australia` | IANA zones `Australia/Perth` (`+08:00`, no DST) through `Australia/Sydney` (`+11:00` during daylight saving). 2:30 and 5:30 respectively. |
| NSW, Victoria, South Australia, Tasmania and the ACT observe daylight saving; Queensland, the Northern Territory and Western Australia do not | `/locations/australia` | Australian state and territory daylight-saving legislation, reflected in the IANA database (`Australia/Sydney`, `Australia/Melbourne`, `Australia/Adelaide`, `Australia/Hobart` shift; `Australia/Brisbane`, `Australia/Darwin`, `Australia/Perth` do not). Stated at state level; the page makes no claim about local exceptions. |
| Singapore is 2h30 ahead of IST, with no daylight saving on either side | `/locations/singapore` | IANA zone `Asia/Singapore`: `+08:00`, no daylight saving; `Asia/Kolkata`: `+05:30`, no daylight saving. The difference is therefore constant, which is what the page says. |

Time-zone offsets are the only quantitative statements on these pages. They are
properties of the tz database rather than claims about SCS, and they are written
in words rather than figures so they cannot be mistaken for a service level.

## Language boundaries

Every page states that delivery is in English. Two pages go further, because a
buyer would otherwise reasonably assume otherwise:

- `/locations/united-arab-emirates` scopes Arabic *interface engineering*
  (right-to-left layout, typography, bidirectional text) and states that the
  wording itself is supplied or approved by the client.
- `/locations/canada` states that French localization is available only as
  separately scoped professional translation work, reviewed by a qualified
  translator, and that we do not present ourselves as a French-language team. No
  French-speaking staff are claimed anywhere, because none is verified.

## Regulatory and legal language

No page names a statute, framework or regulator as something SCS complies with.
The pattern used throughout is: *requirements are confirmed during discovery and
we build to what your own advisers specify.*

Where a framework is named at all it is inside an explicit denial — for example
"we hold no such certification and do not claim compliance with either
framework" on the US page's HIPAA/SOC 2 question, "we do not describe our
service as UK GDPR compliant" on the UK page, and on the three Phase 3B pages:

- Canada — no certification under PIPEDA or any provincial privacy statute, and
  no Canadian government contract, framework listing or public-sector approval.
- Australia — no accreditation under the Privacy Act or the Australian Privacy
  Principles, no government approval or panel listing, and no legal
  representation in Australia.
- Singapore — no PDPA certification, no assurance package, no local
  registration or business licence, and no approval from any government body or
  financial-services regulator.

That wording is deliberate: compliance for these frameworks is a property of the
client's processing and of an assessment we cannot perform, so asserting it
would be false rather than merely optimistic. Note the phrasing convention the
build enforces — the *question* on a page may say "Do you hold a PIPEDA
certification?", but the words "PIPEDA compliant" may not appear at all, in any
context, because the pattern itself reads as a claim when it is excerpted.

If a future phase wants to reference a primary source visibly, use the
regulator's own text — e.g. the UK Information Commissioner's Office, the Office
of the Privacy Commissioner of Canada, the Office of the Australian Information
Commissioner or Singapore's Personal Data Protection Commission — and keep the
sentence descriptive. Do not paraphrase a law into an obligation, and do not
imply that building to a control set produces a compliance status.

## Deliberately absent

- Market size, demand, growth or spend figures for any country.
- Client counts, project counts, retention or satisfaction figures.
- Rankings, awards, "top vendor" or "leading" language.
- Any office, entity, branch, registration, address, telephone number or
  employee outside India.
- Any certification, accreditation, framework place or government approval.
- Any fixed overlap-hours figure. The overlap is agreed per engagement, and the
  pages say so; `scripts/verify-dist.mjs` fails the build on a
  guaranteed-coverage claim.
- Coverage of every Canadian time zone, or a fixed overlap for every Australian
  region — both are explicitly declined, because holding them would be a
  staffing decision with a cost rather than a courtesy.
- Round-the-clock or "always available" support, in any market.
- Blanket service "across Asia": the Singapore page states that each market the
  system serves is named in the scope.
- Named local partners, resellers or representatives.

## Where the guardrails live

- `src/pages/locations/locationPages.test.tsx` — per-page structure, honesty
  patterns, required disclosures, and the duplicate-content scans across all
  six markets, on both the raw copy and a country-name-neutralised version of
  it.
- `scripts/verify-dist.mjs` (`checkLocationPages`) — the same honesty scan
  against the built HTML, served through the static server, plus the
  country-specific fabricated-claim patterns for all six markets.
- `scripts/verify-dist.mjs` (`checkSiteHonesty`) — the same unsupported-claim
  discipline applied to every public indexable page, not only the country ones.

## Module layout (Phase 3B)

Each market is two modules, joined on `path`:

- `manifest.ts` holds every market's `LocationMeta` — path, country name,
  labels, schema.org names, title, description, priority. Small, synchronous,
  and the only locations module in the main JavaScript bundle. The SEO registry,
  the navigation, the footer, the homepage and the About page all read it.
- `<country>.ts` holds that market's `LocationBody`: the page copy. Loaded as a
  route-level chunk when the page is opened.

`compose.ts` joins the two; `all.ts` composes every market eagerly and is for
tests and build-time consumers only — importing it from anything the browser
loads would put all six pages' copy back in the main bundle, which
`src/routes/lazyRoutes.test.tsx` fails the build for.
