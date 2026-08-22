# Country × Service Opportunity Report

**Recommendation: create none of them yet. Two are conditionally recommended,
and both are blocked on evidence the owner has not supplied.**

The brief was explicit: do not create every country × service combination;
produce an opportunity report first; recommend a page only if it has standalone
value; and give the URL, target intent and differentiation before implementing.

9 markets × 15 services = **135 possible URLs**. This is the report.

---

## The inputs, and what is missing

| Input the brief asks for | Available? |
|---|---|
| Search Console query and impression data | **No.** Ownership is verified and the sitemap is submitted, but the site has not been indexed long enough to have query data. Without it, any claim about demand in a specific market for a specific service is invention. |
| Actual internal service strength | Yes — assessed below from what the repository can evidence. |
| Distinct search intent | Assessed below, but without query data this is judgement, not measurement. |
| Ability to provide unique content | Assessed below. This is the binding constraint. |

**The most important finding is the first row.** A country × service page's
entire justification is that a buyer in that country searches for that service
in a way the two existing pages do not answer. That is a claim about search
behaviour, and there is currently no data about search behaviour on this domain.
Creating 135 pages — or 20, or 5 — on the strength of a guess is exactly the
doorway-page pattern the brief forbids.

## Why the existing structure already covers most of this

The site is not missing country × service coverage; it covers it through two
pages that link to each other:

- Each market page (3,063–4,153 words) links to eight service pages with a
  blurb written for that market.
- Each service page now links to all nine markets with a sentence written for
  that service (added in this pass — `ServiceMarkets`).

So `/locations/united-kingdom` + `/services/mobile-app-development` already
answers "mobile app development for a UK business", from two directions, with
~5,200 words of genuinely market-specific and service-specific content between
them. A third page at `/locations/united-kingdom/mobile-app-development` would
have to say something neither says — and would compete with both.

## The service-strength assessment

What the repository can actually evidence, per service. A country × service page
is only defensible where the service is strong **and** something about the
market genuinely changes the answer.

| Service | Evidence strength | Does the country change the answer? |
|---|---|---|
| AI voice agent development | **Strong** — first-party running system | **Yes.** Call hours, accents, and consent/disclosure rules for automated calling differ substantially by country. |
| AI video consultation agents | **Strong** — first-party running system | Partly — timezone overlap matters; little else does. |
| Mobile app development | Strong | Partly — store review and test-device logistics, already covered on both pages. |
| Custom software development | Strong | Barely — the answer is the same everywhere. |
| Web application development | Strong | Barely. |
| SaaS development | Strong | Partly — billing currency and hosting region. |
| Software modernization | Strong | No. |
| Machine learning development | Moderate | **Yes**, but only where data-residency rules bite. |
| AI automation integration | Strong | No — depends on the client's tools, not their country. |
| Conversational AI development | Strong | Partly — language. |
| UI/UX, cloud, DevOps, digital marketing | Supporting services | No. |

## The two conditional recommendations

Only two combinations clear the bar of "a buyer question neither existing page
answers". **Neither is recommended for implementation now.**

### 1. `/locations/united-kingdom/ai-voice-agent-development` — *conditional*

- **Target intent:** a UK business evaluating an automated phone agent, whose
  first question is not "can you build it" but "am I allowed to run this on my
  customers, and who is responsible if it goes wrong?"
- **Differentiation:** the disclosure and consent expectations around automated
  calling in the UK, call-hour coverage from India against UK business hours,
  and what a UK buyer should require in a contract. None of this is on
  `/locations/united-kingdom` (which is service-neutral) or on
  `/services/ai-voice-agent-development` (which is country-neutral).
- **Blocked on:** *we do not have UK regulatory expertise and must not claim
  any.* The page would need either (a) owner-confirmed experience of running a
  UK voice deployment, or (b) content written so it describes questions to ask a
  UK solicitor rather than answers. Option (b) is publishable and honest, but it
  is a thinner page than either existing one, so it is not clearly worth adding.
- **Also blocked on:** Search Console evidence that UK voice-agent queries reach
  this domain at all.

### 2. `/locations/germany/ai-development` — *conditional*

- **Target intent:** a German business asking where its data goes when an
  India-based team builds an AI feature.
- **Differentiation:** hosting-region choices, what a processing arrangement
  looks like with a non-EU supplier, and what stays with the client's own
  counsel. `/locations/germany` covers data handling generically;
  `/services/ai-development` covers it without a jurisdiction.
- **Blocked on:** the same problem, more sharply. **We hold no GDPR
  certification and must not imply compliance expertise.** An honest version of
  this page mostly says "here is what we can tell you, and here is what your DPO
  must decide", which is useful but thin.
- **Also blocked on:** query data.

## Recommended sequence instead

1. **Wait for Search Console data.** Give the current 39 URLs 60–90 days. Then
   run Performance → Queries, filtered by country, and look for a market where a
   specific service query produces impressions with a poor average position.
   That is evidence.
2. **Only then**, and only for a combination that appears in that data,
   evaluate a page against the checklist below.
3. **Meanwhile, strengthen what exists.** The markets block added in this pass,
   plus articles that answer the same questions without claiming jurisdictional
   expertise, do more for the same queries at none of the risk.

## The checklist any country × service page must pass

1. Search Console shows real impressions for that country + service intent.
2. It answers a question that is on **neither** the market page **nor** the
   service page — verified by reading both, not assumed.
3. Its content is written from evidence, not from a template with the country
   name substituted.
4. It claims no local office, entity, registration, phone number, staff,
   pricing, legal expertise or regulatory compliance.
5. It uses `areaServed` honestly and emits **no** `LocalBusiness` node.
6. It passes the duplicate-content scan in `scripts/verify-dist.mjs` against
   both parents and every sibling.
7. It has unique title, description, H1, FAQs and CTA.
8. Adding it does not weaken the market page or the service page.

If a proposal cannot clear all eight, the answer is no. **135 pages that each
fail one of these is the single fastest way to turn this site into a doorway
network** — which would cost the rankings the rest of this work is trying to
earn.
