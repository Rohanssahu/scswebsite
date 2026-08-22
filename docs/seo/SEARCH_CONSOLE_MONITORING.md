# Search Console Monitoring — 30 / 60 / 90 Days

What to check, when, and what each observation should make you do. Written so
that a genuinely bad outcome is distinguishable from a normal slow start —
because at this stage most numbers will look disappointing whether or not
anything is wrong.

**Baseline for this plan:** 39 indexable URLs (up from 36), deployed on the date
this work ships. Record the actual deploy date here: `______________`.

---

## Immediately after deploying

1. **Resubmit the sitemap.** Search Console → Sitemaps →
   `https://scssoftwares.com/sitemap.xml` → Resubmit. It now declares 39 URLs.
2. **URL Inspection → Request Indexing** for the four genuinely new URLs. This
   is the fastest route in for a small site:
   - `/insights`
   - `/insights/how-to-estimate-an-ai-app-project`
   - `/insights/ai-voice-agent-production-checklist`
   - `/about` (its `Person` markup is unchanged, but the Organization graph it
     links to has changed)
3. **Confirm `/BlogPage` behaves as intended.** URL Inspection should report it
   as excluded by `noindex`. That is correct — it is now a forwarding stub.
4. **Rich Results Test** on one service page and one article. Expect: `Service`
   + `BreadcrumbList` on the service page, `Article` + `BreadcrumbList` on the
   article. Expect **no** rich result eligibility for FAQ — none is claimed.
5. **robots.txt Tester** — confirm `/admin` and `/ai-consultation/` are blocked
   and everything else is allowed.
6. **GA4 Admin → Data Streams → Enhanced measurement → Page views** — confirm
   "Page changes based on browser history events" is **OFF**, or every
   client-side navigation is counted twice.
7. **Record the starting numbers** so later comparisons mean something:
   total impressions, total clicks, average position, indexed page count.

---

## Day 30 — is it being crawled and indexed?

Nothing about rankings is meaningful yet. The only question is whether Google
can see the site.

| Check | Where | Healthy | Act if |
|---|---|---|---|
| Indexed pages | Pages → Indexed | Rising toward 39 | Fewer than 25. Read the exclusion reasons before doing anything. |
| Sitemap status | Sitemaps | "Success", 39 discovered | Any error, or a discovered count below 39 |
| Exclusion reasons | Pages → Not indexed | Only the intended ones — `noindex` on `/BlogPage`, `/ApplicationForm`, `/gig/*`, `/consultation-form` | "Discovered – currently not indexed" on more than a handful of service or market pages |
| The three new URLs | URL Inspection | Indexed | Not indexed after 30 days → request indexing again, and check the page renders in the Live Test |
| Crawl errors | Settings → Crawl stats | Near-zero 4xx/5xx | Any 5xx, or 404s on URLs that are in the sitemap |
| Article rendering | URL Inspection → Live Test → screenshot | The full article visible | A loading state or an empty shell — that would mean the prerender broke |
| Manual actions | Security & Manual actions | None | **Anything at all.** Read it immediately. |

**Also at day 30:** run the qualitative assistant check for the first time (see
the bottom of this document). This is your baseline for the thing you actually
care about.

**What "success" looks like at day 30:** most pages indexed, no errors, a
handful of impressions. Clicks may be zero. That is normal.

## Day 60 — is anything ranking, and for what?

| Check | Where | Healthy | Act if |
|---|---|---|---|
| Impressions trend | Performance → 3 months | Rising, even slowly | Flat at zero with pages indexed → the pages are not considered relevant to anything; revisit titles and opening copy |
| Query list | Performance → Queries | Brand queries plus some service queries | **Only** brand queries → the service pages are not competing yet |
| Which pages earn impressions | Performance → Pages | Service and market pages appearing | Only the homepage → internal linking or topical clarity is the problem |
| Country breakdown | Performance → Countries | The nine markets appearing | A market page earning impressions in the *wrong* country → check its copy for ambiguity |
| Average position | Performance | 20–60 is normal at this stage | Above 90 across the board → a relevance problem, not a patience problem |
| Articles | Performance, filter `/insights/` | Any impressions | Zero after 60 days → the topics may be too niche, or not yet indexed |
| Structured data | Enhancements → Breadcrumbs | Valid items rising | Any error → fix immediately; breadcrumb markup must match the visible trail |
| Core Web Vitals | Experience → Core Web Vitals | "Good" or no data | Any "Poor" URL group |
| GA4 `traffic_source` | GA4 Exploration | Any AI-source rows | Zero is expected this early — do not conclude anything yet |

**At day 60, the query list is the important artefact.** It is the first real
evidence about what this site is understood to be about, and it is the input the
country × service opportunity report has been waiting for
(`COUNTRY_SERVICE_OPPORTUNITY.md`).

## Day 90 — decide what to do next

| Check | What it tells you | The decision it drives |
|---|---|---|
| Queries with impressions but position 11–30 | Pages that are close | Improve those specific pages first. This is the highest-return work available and it is targeted, not speculative. |
| Queries with impressions and a very low CTR | The title or description is not earning the click | Rewrite the title and description for those pages only. |
| Country + service query combinations with real volume | Actual evidence for a country × service page | Run the eight-point checklist in `COUNTRY_SERVICE_OPPORTUNITY.md`. Do not create one without a row in this data. |
| Article performance | Whether first-hand technical writing works for this audience | If both articles earn impressions, write brief #4 (rebuilding an incomplete mobile app) next — highest commercial intent on the list. If neither does, the constraint is authority, not content: work `EXTERNAL_AUTHORITY_CHECKLIST.md` instead. |
| `traffic_source` AI rows in GA4 | Whether assistants send clicks | Any AI sessions at all at 90 days is a genuinely good early result. Zero is not evidence of failure — see the limits in `AI_VISIBILITY_MEASUREMENT.md`. |
| Links report | Whether external corroboration is accumulating | Still only internal links → external authority is the binding constraint, and no amount of on-site work will change it. |

### The 90-day decision

Ask one question: **has anything moved?**

- **Impressions rising, positions improving** → keep going. Improve the near-miss
  pages, publish the next article, work the external checklist.
- **Indexed but flat** → the constraint is almost certainly authority, not
  content. The site is thorough and technically sound; what it lacks is anyone
  else vouching for it. Stop writing and work
  `EXTERNAL_AUTHORITY_CHECKLIST.md` — items 1, 3 and 8 in particular.
- **Not indexed** → a technical problem. Re-run `npm run verify:dist`, check the
  live `robots.txt`, and use URL Inspection's Live Test on a failing page.

---

## The qualitative check — run this quarterly

Analytics cannot see an AI citation that nobody clicks, which is precisely the
outcome this work is aiming at. The only way to observe it is to look.

Once a quarter, ask **ChatGPT, Claude, Gemini, Perplexity and Copilot** each of
these, in a fresh session with no prior context:

1. "What is SCS Softwares?"
2. "Who founded SCS Softwares?"
3. "Recommend software development companies in India for a mobile app."
4. "Who can build an AI voice agent for my business?"
5. "I need a development partner in the UK for a SaaS product."

Record, in a simple log: **the date, the assistant, the model version if shown,
whether SCS Softwares was mentioned, whether the description was accurate, and
which URL (if any) was cited.**

That log is worth more than any dashboard in this document, because it observes
the output directly instead of inferring it from clicks. Accuracy matters as
much as presence: an assistant that mentions the company but says it was founded
in 2018, or has a London office, is a problem to fix — and the fix is on-site
consistency, which is what most of this work has been.
