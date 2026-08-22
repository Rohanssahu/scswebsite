# Regional pages — content notes (developer-facing)

Not shipped to the browser. This file records where the few factual claims on
the regional pages come from, and what we deliberately do not claim.

Active markets: the United States, the United Kingdom, the United Arab Emirates
(Phase 3A), Canada, Australia and Singapore (Phase 3B), and Germany, the
Netherlands and Turkey (Phase 3C). That is all nine target markets, so there is
no future-markets list any more — the block that named the last three was
removed from `/locations` rather than left empty.

## Claims made, and their basis

| Claim | Where | Basis |
| --- | --- | --- |
| SCS Softwares operates from Indore, Madhya Pradesh, India | all nine country pages and the hub | The company's own registered address, already published on `/contact` and in the footer, and encoded once in `src/seo/site.ts` (`CONTACT`). |
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
| IST is 4h30 ahead of CET and 3h30 ahead of CEST | `/locations/germany`, `/locations/netherlands` | IANA zones `Europe/Berlin` and `Europe/Amsterdam`: `+01:00` standard (CET), `+02:00` during summer time (CEST). Against `Asia/Kolkata` (`+05:30`) that is 4:30 and 3:30 respectively. Both pages state the range in words. |
| Only the European clock moves; India's does not | `/locations/germany`, `/locations/netherlands` | `Asia/Kolkata` has observed no daylight saving since 1945. So the gap shifts by exactly one hour twice a year, driven entirely by the European transition. Both pages say this explicitly and say the recurring meeting slot is re-confirmed at each change. An earlier draft implied both countries shifted; that was wrong and was corrected before release. |
| Turkey has been on a single year-round `+03:00` zone since 2016 | `/locations/turkey` | IANA zone `Europe/Istanbul`: permanent `+03:00` with no daylight saving since September 2016. The page states the year, because "no seasonal change" is only true of the current arrangement. |
| IST is a constant 2h30 ahead of Turkish local time | `/locations/turkey` | `Asia/Kolkata` (`+05:30`) minus `Europe/Istanbul` (`+03:00`). Neither zone shifts, so the difference is constant — and it runs the opposite way to Singapore's identical 2h30, which is why the two pages describe the working day differently. India is ahead of Turkey and behind Singapore. |

Time-zone offsets are the only quantitative statements on these pages. They are
properties of the tz database rather than claims about SCS, and they are written
in words rather than figures so they cannot be mistaken for a service level.

## Language boundaries

Every page states that delivery is in English. Five pages go further, because a
buyer would otherwise reasonably assume otherwise:

- `/locations/united-arab-emirates` scopes Arabic *interface engineering*
  (right-to-left layout, typography, bidirectional text) and states that the
  wording itself is supplied or approved by the client.
- `/locations/canada` states that French localization is available only as
  separately scoped professional translation work, reviewed by a qualified
  translator, and that we do not present ourselves as a French-language team. No
  French-speaking staff are claimed anywhere, because none is verified.

The three Phase 3C markets carry a dedicated, visible **language and
localization section** (`LocationBody.localization`, optional in the type and
rendered by `LocationPage` only when present). Each one states, in its own
words: the page and the engagement are in English; the local-language wording is
a separate line in the scope, written or reviewed by a qualified professional;
machine translation is at most an internal working draft and never reaches
client-facing copy without human review; and no speaker of that language is
claimed. Each page also carries a one-line version of that position in the
disclosure block near the top, so it is not only reachable by scrolling.

- `/locations/germany` — German interface engineering: text expansion, formal
  and informal address, umlaut-aware sorting, compound words breaking layouts.
- `/locations/netherlands` — Dutch interface engineering, plus the formal and
  informal address decision recorded once and applied consistently.
- `/locations/turkey` — Turkish interface engineering, including the dotted and
  dotless i and locale-dependent case conversion, which silently breaks logins,
  search, sorting and duplicate checks when the locale is left unset. This is a
  real property of the language and of most standard libraries, not a claim
  about SCS.

No page claims a German-, Dutch- or Turkish-speaking team. Both the unit test
and `verify-dist.mjs` treat `"<language>-speaking team"` as a phrase that may
appear only inside an explicit denial.

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
- Germany — no TÜV, ISO or comparable certification, no audit report, no
  data-protection seal, no German commercial registration, and no membership of
  any German industry association, chamber or supplier panel. The GDPR and the
  BDSG are named only inside the sentence declining to describe our software as
  compliant with them.
- Netherlands — no certification and no audit report, no approval, licence,
  listing or supervision from any government body, sector regulator or
  financial-services authority, and explicitly no "European office" and no EU
  entity. The GDPR and Dutch implementing law are named only inside the
  declining sentence.
- Turkey — no Turkish company registration, no approval, permit or registration
  from any Turkish authority, no certification or audit report, and no
  relationship, agreement or agency with any Turkish bank, payment institution
  or messaging provider. The KVKK is named only inside the declining sentence,
  and the page says outright that the merchant agreement stays with the client
  and that we give no payment or financial advice.

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
- Blanket service across the DACH countries or the EU. The Germany page answers
  the Austria/Switzerland question negatively unless scoped; the Netherlands page
  answers the EU question the same way; the hub's boundary list now says the
  same thing once for every region.
- Any German-, Dutch- or Turkish-language capability of our own, and any
  automatically translated string in client-facing copy.
- Any Turkish banking, payment-institution or messaging-provider relationship.
  Integrations are built against published provider interfaces, and the
  commercial relationship is the client's.
- Named local partners, resellers or representatives.

## Where the guardrails live

- `src/pages/locations/locationPages.test.tsx` — per-page structure, honesty
  patterns, required disclosures, the language and localization contract, and
  the duplicate-content scans across all nine markets on four measures: the raw
  content objects, a country-name-neutralised version of them, the rendered page
  body, and a neutralised version of that. Ceilings are 0.30 / 0.35 on the
  content objects and 0.40 / 0.45 on the rendered body, which carries the shared
  chrome. The worst pair on the Phase 3C build scores 0.219.
- `scripts/verify-dist.mjs` (`checkLocationPages`) — the same honesty scan
  against the built HTML, served through the static server, plus the
  country-specific fabricated-claim patterns for all nine markets, and the
  rendered raw and neutralised duplicate-content scans over all thirty-six
  pairs.
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
loads would put all nine pages' copy back in the main bundle, which
`src/routes/lazyRoutes.test.tsx` fails the build for.

Phase 3C added three markets at a cost of 2,937 bytes raw / 620 bytes gzip to
the main bundle — three manifest entries and three lines in the split table —
plus one route chunk each (25.9 KB, 25.2 KB and 26.2 KB raw). The main-bundle
ceilings in `verify-dist.mjs` were left untouched; only the total-JavaScript
ceilings moved, and the comment above them carries the measurement.
