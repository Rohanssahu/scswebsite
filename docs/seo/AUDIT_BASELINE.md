# SEO & AI Search Visibility — Baseline Audit

Date of audit: 2026-08-22
Host: https://scssoftwares.com (GitHub Pages, apex domain, `public/CNAME`)
Build: `npm run build` = `vite build` + `scripts/prerender.mjs`
Baseline test state at audit time: **50 test files, 1135 tests, all passing**.
Baseline sitemap: **36 URLs**, every one 200 and self-canonical.

This document records the state **before** the changes in this pass. It is
evidence, not marketing: every "issue" below was observed in `dist/` or in the
source, and every "no issue" line means a check was run and passed.

---

## 0. How the site is built (relevant to every finding)

- `src/seo/registry.ts` is the single typed route registry. Title, description,
  robots directive, canonical, indexability, prerender flag, sitemap priority
  and JSON-LD for **every** route are declared there once.
- `scripts/prerender.mjs` server-renders each `prerender: true` route to a
  physical HTML file (both `/x.html` and `/x/index.html`, so GitHub Pages
  answers 200 for both URL forms), writes `404.html` as the SPA fallback for
  dynamic routes, and generates `sitemap.xml` from
  `indexable ∩ successfully-prerendered`.
- `scripts/verify-dist.mjs` is an 11-section post-build gate (broken links,
  missing assets, duplicate metadata, secrets, host discipline, live static
  server check, service pages, location pages, site-wide honesty scan,
  prerender completeness, bundle budget).

**Consequence:** the usual React/Vite SEO failure modes (client-only `<head>`,
SPA 404s, sitemap drift, canonical drift) are structurally prevented here. The
findings below are therefore about *content reach* and *entity depth*, not about
crawlability basics.

---

## Matrix 1 — URL inventory

Word counts are of the **prerendered** body text (what a crawler sees with
JavaScript disabled). "Out" = unique internal links in the document. "In" =
number of prerendered documents linking to this URL.

### Indexable (36 — all in sitemap, all `index,follow`, all self-canonical, all exactly one `<h1>`)

| URL | Type | Words | Out | In | JSON-LD | Issue |
|---|---|---|---|---|---|---|
| `/` | Home | 947 | 35 | 38 | Organization + WebSite | Organization node carries no service catalogue or areaServed |
| `/about` | Company/founder | 1053 | 35 | 38 | Person | `Person.sameAs` empty (no verified personal profile supplied) |
| `/contact` | Contact | 310 | 35 | 38 | ContactPage | — |
| `/products` | Product list | 592 | 36 | 38 | — | 15 of 16 product cards have no detail page (deliberate, links to `/contact`) |
| `/ProductDetailsPage` | Product detail | 249 | 35 | 1 | — | **Thin (249 w) + only 1 inbound link + non-descriptive URL** |
| `/project-analysis` | Tool/conversion | 255 | 35 | 38 | — | **Thin (255 w) for a priority-0.9 page** |
| `/schedule-call` | Tool/conversion | 562 | 35 | 39 | — | — |
| `/careers` | Careers | 701 | 36 | 38 | — | — |
| `/services` | Hub | 888 | 35 | 38 | BreadcrumbList | — |
| `/services/custom-software-development` | Service | 2166 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/mobile-app-development` | Service | 2164 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/services/web-application-development` | Service | 2019 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/services/saas-development` | Service | 2047 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/software-modernization` | Service | 2139 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/ai-development` | Service (AI hub) | 3092 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/machine-learning-development` | Service | 2913 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/ai-voice-agent-development` | Service | 3025 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/ai-video-consultation-agents` | Service | 2935 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/conversational-ai-development` | Service | 2750 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/ai-automation-integration` | Service | 2801 | 35 | 38 | Service + BreadcrumbList | **No in-content market links** |
| `/services/ui-ux-design` | Service | 2840 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/services/cloud-solutions` | Service | 2843 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/services/devops-engineering` | Service | 2853 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/services/digital-marketing` | Service | 3008 | 35 | 39 | Service + BreadcrumbList | **No in-content market links** |
| `/locations` | Hub | 1375 | 35 | 38 | BreadcrumbList | — |
| `/locations/united-states` | Market | 3141 | 35 | 38 | Service (areaServed Country) + BreadcrumbList | — |
| `/locations/united-kingdom` | Market | 3063 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/united-arab-emirates` | Market | 3081 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/canada` | Market | 3549 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/australia` | Market | 3510 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/singapore` | Market | 3412 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/germany` | Market | 4066 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/netherlands` | Market | 4031 | 35 | 38 | Service + BreadcrumbList | — |
| `/locations/turkey` | Market | 4153 | 35 | 38 | Service + BreadcrumbList | — |
| `/PrivacyPolicy` | Legal | 239 | 35 | 38 | — | Thin but legitimate; priority 0.3 |
| `/TermsAndConditions` | Legal | 257 | 35 | 38 | — | Thin but legitimate; priority 0.3 |

### Non-indexable (correctly excluded from the sitemap)

| URL | Robots | Indexability class | Correct? |
|---|---|---|---|
| `/BlogPage` | `noindex,follow` | `noindex-utility` | Yes — empty placeholder, kept out of the index so it cannot be crawled as thin content |
| `/ApplicationForm` | `noindex,nofollow` | `noindex-private` | Yes |
| `/project-analysis/result` | `noindex,nofollow` | `noindex-session` | Yes — session-scoped |
| `/consultation-form` | `noindex,follow` → `/schedule-call` | `redirect` | Yes |
| `/gig/mobile-development` … `/gig/digital-marketing` (6) | `noindex,follow` → `/services/*` | `redirect` | Yes — 200 forwarding stubs, canonical points at destination |
| `/ai-consultation/:meetingReference` | `noindex,nofollow`, **no canonical** | `noindex-session` | Yes — per-visitor meeting reference |
| `/admin`, `/admin/login`, `/admin/leads/:id` | `noindex,nofollow`, no canonical | `noindex-private` | Yes |
| `*` (404.html) | `noindex,nofollow`, no canonical | `not-found` | Yes — one file answers many URLs, so any canonical would be false |

**Titles and descriptions:** unique across all 36 indexable URLs (verified by
`registry.test.ts` and `verify-dist.mjs` section 3). **Headings:** exactly one
`<h1>` per indexable prerendered document (verified by `verify-dist.mjs`
section 6). **Redirects:** no HTTP redirects exist — GitHub Pages serves both
`/x` and `/x/`, and both files carry the same single canonical, so there is no
duplicate URL to consolidate.

### URL-inventory findings

1. **F1 — Services carry no *in-content* market links.** Each of the nine market
   pages links to eight service pages from within its body copy (72 contextual
   links). No service page links to a market page from its body at all.

   To be precise about what was and was not already there: the footer and the
   mobile drawer list all nine markets on **every** page, so a link existed —
   but it was site-wide boilerplate, identical on `/careers` and on
   `/services/ai-voice-agent-development`. Measured in `dist`, a service page
   carried exactly one href per market, all of it chrome. There was no
   contextual link, no sentence explaining how that service works across a
   timezone gap, and — the substantive gap — **no India-delivery disclosure on
   any service page**, even though those pages are what an international buyer
   is most likely to land on first.
2. **F2 — Internal linking is almost entirely navigational chrome.** The uniform
   "35 out / 38 in" across nearly every page is header + footer, which is why
   the inbound counts are near-identical for a 4,153-word market page and a
   239-word legal page. Contextual body links exist only on the location pages
   and in the service pages' "related services" cards.
3. **F3 — `/ProductDetailsPage`** is 249 words, has one inbound link, and its URL
   is a component name rather than a product name.
4. **F4 — `/project-analysis`** is a priority-0.9 conversion page with 255 words
   of prerendered copy.
5. **F5 — No page states when it was last materially updated.**

---

## Matrix 2 — AI crawler inventory

`public/robots.txt` at audit time contained exactly one group:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /ai-consultation/

Sitemap: https://scssoftwares.com/sitemap.xml
```

Because no crawler is named individually, **every crawler below inherits the
`*` group**: allowed everywhere except `/admin*` and `/ai-consultation/*`.

Verified against current official documentation on 2026-08-22 (sources at the
end of this section). Search access and training access are separate choices and
are recorded separately.

| Crawler | Operator | Purpose | Rule that applies today | Status | Required correction |
|---|---|---|---|---|---|
| `Googlebot` | Google | Search indexing (also feeds AI Overviews / AI Mode) | `*` → Allow | **Allowed** | None — must stay allowed |
| `Google-Extended` | Google | Gemini model **training** + grounding. Does **not** affect Google Search inclusion or ranking | `*` → Allow | Allowed (training permitted) | None. Documented as a separately flippable training choice |
| `Bingbot` | Microsoft | Search indexing (feeds Bing + Copilot) | `*` → Allow | **Allowed** | None — must stay allowed |
| `OAI-SearchBot` | OpenAI | **Search** — surfaces sites in ChatGPT search results | `*` → Allow | **Allowed** | None — must stay allowed and must never be caught by a future blanket AI block |
| `GPTBot` | OpenAI | Model **training** | `*` → Allow | Allowed (training permitted) | None. Separately flippable |
| `ChatGPT-User` | OpenAI | User-initiated fetch (a person asked ChatGPT to open a page). OpenAI states robots.txt rules may not apply to user-initiated actions | `*` → Allow | Allowed | None |
| `OAI-AdsBot` | OpenAI | Ad-safety validation. Not search, not training | `*` → Allow | Allowed | None (no ads are run; harmless) |
| `ClaudeBot` | Anthropic | Model **training** | `*` → Allow | Allowed (training permitted) | None. Separately flippable |
| `Claude-SearchBot` | Anthropic | **Search** — improves Claude search result quality | `*` → Allow | **Allowed** | None — must stay allowed |
| `Claude-User` | Anthropic | User-initiated fetch when a Claude user asks about a page | `*` → Allow | Allowed | None |
| `PerplexityBot` | Perplexity | **Search** indexing for Perplexity results. Explicitly not used for foundation-model training | `*` → Allow | **Allowed** | None — must stay allowed |
| `Perplexity-User` | Perplexity | User-initiated fetch. Perplexity states it generally ignores robots.txt for these | `*` → Allow | Allowed | None |

**Assessment: no crawler is misconfigured today.** OAI-SearchBot,
Claude-SearchBot, PerplexityBot, Googlebot and Bingbot are all reachable, and
the two disallowed prefixes are genuinely private (`/admin*` is a staff
dashboard; `/ai-consultation/*` URLs carry a per-visitor meeting reference).

**The actual risk is regression, not the current state.** A single well-meant
future edit — "block the AI bots" — would silently remove the site from ChatGPT
search, Claude search and Perplexity while leaving the training bots' status
unchanged. Nothing in the build currently fails if that happens.

**Deliberately not done:** no `noindex` directive is placed in `robots.txt`
(it is not a robots.txt directive and would only hide the real meta tag), and
no private URL is listed there merely to satisfy a crawler.

**`llms.txt`:** not added. Google's own AI-features guidance states that no
machine-readable AI text file, markup or Markdown is needed to appear in Google
Search including its generative capabilities, and Google has said it does not
support and does not plan to support `llms.txt`. No other consumer with a
documented, supported reader has been identified, and an unread file is a
maintenance liability that can drift out of sync with the site. It will be
reconsidered only when a specific supported consumer is demonstrated.

Sources consulted: OpenAI crawler docs (`developers.openai.com/api/docs/bots`),
Anthropic crawler support article (`support.claude.com`, article 8896518),
Perplexity crawler docs (`docs.perplexity.ai/guides/bots`), Google crawler docs
(`developers.google.com/search/docs/crawling-indexing/google-common-crawlers`).

---

## Matrix 3 — Entity consistency

Source of truth is `src/seo/site.ts`. Every row was checked in three places:
visible prerendered copy, `<head>` metadata, and JSON-LD.

| Attribute | Source of truth | Visible content | Metadata | JSON-LD | Consistent? |
|---|---|---|---|---|---|
| Company name | `SITE_NAME = 'SCS Softwares'` | "SCS Softwares" everywhere | `og:site_name`, `author` | `Organization.name`, `legalName` | ✅ |
| Canonical domain | `SITE_ORIGIN = 'https://scssoftwares.com'` | n/a | canonical + `og:url` on all 36 | `Organization.url`, all `Service.url`, all breadcrumb `item` | ✅ — `verify-dist.mjs` fails the build on any `www.`, `github.io` or `localhost` URL in `dist` |
| Founder | `FOUNDER.name = 'Rohan Sahu'` | `/about` H2, photo, story | `/about` `<title>` | `Person.name` @ `…/about#founder`; `Organization.founder` → that `@id`; `Person.worksFor` → Organization `@id` | ✅ bidirectional |
| Job title | `FOUNDER.jobTitle = 'Founder & CEO'` | `/about` | — | `Person.jobTitle` | ✅ |
| Founding year | `FOUNDING_YEAR = 2022` | `/about` story + track-record tile + homepage pointer | `/about` description | `Organization.foundingDate = "2022"` | ✅ |
| Founding location | Indore, Madhya Pradesh, India | `/about`, `/locations` hub | — | `Organization.foundingLocation` (Place + PostalAddress, `addressCountry: IN`) | ✅ |
| Address | `CONTACT` — 9th Floor, Shekhar Central, Palasia Square, Indore, MP 452001, IN | Footer + `/contact` | — | `Organization.address` | ✅ one company, one address |
| Telephone | `+917828690192` | Footer + `/contact` | `/contact` description | `Organization.telephone`, `contactPoint`, `ContactPage.mainEntity` | ✅ |
| Email | `info@scssoftwares.com` | Footer + `/contact` | `/contact` description | `Organization.email`, `contactPoint` | ✅ |
| Logo | `/images/logo.png` (500×500) | Header + footer | — | `Organization.logo` (ImageObject) | ✅ |
| Founder image | `/images/rohan-sahu-founder-scs-softwares.jpg` (768×768) | `/about` founder card | — | `Person.image` | ✅ |
| Share image | `/images/og-cover.png` (1200×630) | — | `og:image`, `twitter:image` on all routes | `Organization.image` | ✅ real 1200×630 file, matches the declared `summary_large_image` card |
| Social profiles | `SOCIAL_PROFILES` — Facebook, LinkedIn company 105694530, Instagram | Footer links | — | `Organization.sameAs` | ✅ only profiles that are actually linked |
| Founder profiles | `FOUNDER.sameAs = []` | none | — | `Person.sameAs` **omitted** | ✅ correct — no personal profile URL has been supplied, and the company LinkedIn is not a `sameAs` for a person |

### Entity findings

6. **F6 — The Organization node does not say what the company does, in
   machine-readable form.** It has `description` (prose) but no catalogue of the
   fifteen services that each have a real page, and no `areaServed` for the nine
   markets that each have a real page. An assistant resolving "which company
   does AI voice agents and serves the UK" has to infer this from prose.
7. **F7 — `Person.sameAs` is empty.** Correct given the evidence, but it is the
   single biggest entity-disambiguation gap for "Rohan Sahu / SCS Softwares
   founder". **Owner evidence required.**
8. **F8 — No `Article`/author model exists**, so there is no way for future
   expert content to be attributed to the founder Person entity.

---

## Matrix 4 — Evidence inventory

| # | Claim | Where it appears | Supporting evidence | Safe to publish? | Safe for structured data? |
|---|---|---|---|---|---|
| 1 | Founded 2022 | `/about`, `/` | Owner-verified | ✅ Yes | ✅ Yes — `foundingDate` |
| 2 | Founded in Indore, Madhya Pradesh, India | `/about`, `/locations` | Owner-verified; matches the one office address | ✅ Yes | ✅ Yes — `foundingLocation` |
| 3 | Rohan Sahu, Founder & CEO | `/about` | Owner-verified; name, title, photo and story all render as visible text | ✅ Yes | ✅ Yes — `Person` |
| 4 | "More than eight years in software development" | `/about` | Owner-verified **personal career**, not company age. Written in words, not "8+ yrs", specifically so it cannot be misread as trading history | ✅ Yes, with the existing wording | ❌ No — no schema.org property expresses this without implying a credential |
| 5 | "Over four years working directly with freelance and international clients" | `/about` | Owner-verified personal record | ✅ Yes | ❌ No |
| 6 | "50+ clients" | `/about` track record | Owner-verified count | ✅ Yes | ❌ No — there is no truthful schema property for it; `numberOfEmployees`/rating substitutes would be fabrication |
| 7 | "150+ mobile, web and AI/ML projects **contributed to or delivered**" | `/about` | Owner-verified; wording is exact because not all were independently owned SCS products | ✅ Yes, only with this wording | ❌ No |
| 8 | Address, phone, email | Footer, `/contact` | Present in the repository, rendered visibly | ✅ Yes | ✅ Yes |
| 9 | Facebook / LinkedIn company / Instagram profiles | Footer | Real linked profiles | ✅ Yes | ✅ Yes — `Organization.sameAs` |
| 10 | Fifteen services | `/services/*` | Each has a full written page | ✅ Yes | ✅ Yes — `Service` per page; a catalogue on the Organization is supportable |
| 11 | Nine markets served remotely | `/locations/*` | Each has a full written page and an India-delivery disclosure | ✅ Yes | ✅ Yes — `Service.areaServed: Country` only. **Never** `LocalBusiness`, address, phone or opening hours in a target country |
| 12 | AI voice agent capability (LiveKit STT→LLM→TTS) | `/services/ai-voice-agent-development` | **First-party**: the running Buddy agent in `agent/` and `src/services/voiceSession*` | ✅ Yes | ✅ Yes — as `Service` |
| 13 | AI video consultation agent | `/services/ai-video-consultation-agents` | **First-party**: `/schedule-call` → `/ai-consultation/:ref`, LiveKit rooms | ✅ Yes | ✅ Yes — as `Service` |
| 14 | AI project estimation | `/project-analysis` | **First-party**: `src/policy/estimationPolicy.ts`, `src/services/aiAnalysis.ts` | ✅ Yes | ✅ Yes — as `Service` |
| 15 | Provider abstraction across Gemini / OpenAI | service copy | **First-party**: `@google/genai` + provider fallback in `agent/` | ✅ Yes, described as implemented | ✅ n/a |
| 16 | Named clients | *nowhere* | **None in the repository** | ❌ No | ❌ No |
| 17 | Testimonials / quotes | *nowhere* | **None** | ❌ No | ❌ No |
| 18 | Case studies with metrics | *nowhere* | **None** | ❌ No | ❌ No |
| 19 | Ratings / reviews | *nowhere* | **None** | ❌ No | ❌ No — and `registry.test.ts` already fails the build if `aggregateRating`, `review`, `award`, `numberOfEmployees` or `hasCredential` appear in any node |
| 20 | Awards, certifications, compliance (SOC 2, ISO, GDPR-certified) | *nowhere* | **None** | ❌ No | ❌ No |
| 21 | Rohan Sahu personal LinkedIn / GitHub | *nowhere* | **None supplied** | ❌ No | ❌ No — blocks `Person.sameAs` |
| 22 | Team members Raju Burde, Sachin Basaiye, Priyanka Dalwani | `/about` team grid | Names + photos present in the repo; roles from translations | ✅ Yes (already published) | ❌ No — no `Person` node is emitted for them, and none should be without owner confirmation of title and consent |
| 23 | App-store / live deployment URLs for delivered products | *nowhere* | **None supplied** | ❌ No | ❌ No — blocks portfolio `WorkExample`/`SoftwareApplication` markup |

**Evidence conclusion:** the site's factual base is narrow but clean. Everything
publishable is already published. Every remaining authority gain — case studies,
reviews, founder profile links, app-store proof — is blocked on owner-supplied
evidence, not on code. That list is carried forward as
`docs/seo/OWNER_EVIDENCE_REQUIRED.md`.

---

## Additional audit areas

### Redirects and host variants
- No HTTP-level redirects exist (GitHub Pages static). Legacy `/gig/*` and
  `/consultation-form` answer **200** with `noindex,follow`, a canonical
  pointing at the replacement, a `<meta http-equiv="refresh">` for no-JS
  clients and a `location.replace()` for everyone else. They are excluded from
  the sitemap. This is the correct pattern for a host that cannot emit 301s.
- `www` and `http` variants: `LEGACY_ORIGINS` in `src/seo/site.ts` folds
  `https://www.`, `http://www.`, `http://` and the two `github.io` hosts onto
  the apex origin, and `verify-dist.mjs` fails the build if any of them appear
  in `dist`. GitHub Pages itself serves the apex over HTTPS with HSTS.
  **Owner action:** confirm the `www` CNAME is present at the DNS provider so
  `www.scssoftwares.com` resolves and redirects rather than failing.
- `dist/CNAME` = `scssoftwares.com`, asserted by both `prerender.mjs` and
  `verify-dist.mjs`.

### GitHub Pages deep-route behaviour
Every prerendered route emits **two** files (`about.html` and
`about/index.html`), so `/about` and `/about/` both answer 200 with the same
single canonical. Dynamic routes fall through to `404.html`, which GitHub Pages
serves *at the requested URL* with status 404 and `noindex,nofollow` — verified
in `verify-dist.mjs` for `/ai-consultation/ABC123`, `/admin`, `/admin/leads/42`
and an unknown path.

### Core Web Vitals risks
| Area | Observation |
|---|---|
| Main JS bundle | 1.43 MB raw / **411 KB gzipped**. Under the repo's existing evidence-based budget, but large. Service and location copy is already code-split per route; `recharts`, `livekit-client` and the admin screens are lazy. |
| CSS | 108 KB raw / 18 KB gzipped. Fine. |
| Fonts | Inter loaded from Google Fonts with `preconnect` to both hosts and `display=swap`. Nine weights (300–900) are requested — more than the site uses. |
| LCP image | No `<img>` above the fold on most routes (heroes are gradient/SVG). `/about` hero is text. |
| **`/images/rohansahu.jpg`** | **1.78 MB, 1024×1024, rendered at 112×112 CSS px on `/about`.** Largest single asset on the site by 13×. **F9.** |
| `/images/logo.png` | 120 KB, 500×500, rendered at 40×40 (header) and 32×32 (footer). Present on every page. **F10.** |
| `/images/inside.jpeg` | 111 KB, referenced by nothing. Dead weight in `dist`. **F11.** |
| Layout shift | Every `<img>` in the prerendered output carries explicit `width`/`height`. No CLS source found. |
| Lazy loading | Correct: below-the-fold images are `loading="lazy"`; the header logo is not. |
| Hydration | Prerendered HTML is the real page — `verify-dist.mjs` section 10 fails the build if any generated document is a Suspense fallback or empty shell. |
| Reduced motion | `Reveal` and the animation utilities respect `prefers-reduced-motion` (Tailwind `motion-reduce` + the component's own guard). |

### Accessibility
- `<main id="main-content">` landmark asserted on every indexable page.
- Skip-to-content link present and keyboard-reachable, first in the DOM.
- FAQs use native `<details>`/`<summary>` — answers are in the prerendered HTML,
  work with no JavaScript, keyboard-operable for free.
- Every `<img>` has `alt`; decorative SVGs carry `aria-hidden="true"`.
- Heading order: one `<h1>`, then `<h2>` section headings, `<h3>` within cards.
  No level is skipped on the pages inspected.
- `focus-visible:ring` on every interactive element.

### Analytics
- One GA4 property (`G-RMGB9J9TT5`), loaded once in `index.html` with
  `send_page_view: false`; `RouteAnalytics.tsx` sends exactly one `page_view`
  per route navigation. No double counting.
- `src/utils/analytics.ts` is the single access point. `normalizeRoute()` strips
  query and fragment and collapses `/ai-consultation/:reference` and
  `/admin/leads/:id`; `/admin*` reports nothing at all.
- `conversionAnalytics.ts` and `consultationAnalytics.ts` accept only a name from
  a closed list plus one enum value — there is no parameter through which a
  name, email, phone, transcript, requirement text, token or meeting reference
  could pass.
- **F12 — no traffic-source classification.** Nothing recognises
  `utm_source=chatgpt.com`, and no referrer is bucketed, so there is currently
  no way to see whether AI assistants are sending visitors at all.

### Case studies / portfolio / testimonials
`/products` lists sixteen product concepts; one (`RoomJi`) has a detail page.
There are **no** case studies, testimonials, client names, KPIs or app-store
links anywhere in the repository. The service content type's doc comment and
`servicePages.test.tsx` actively forbid inventing them.

### Production vs source consistency
`src/seo/indexHtml.test.ts` asserts the static `<head>` in `index.html` matches
the registry's `/` entry exactly. `src/seo/dist.test.ts` (427 lines) asserts the
built output matches the registry. No drift found.

---

## Findings summary

| # | Finding | Phase | Fixable in code? |
|---|---|---|---|
| F1 | Service pages link to no market page (one-way country cluster) | 4, 6 | ✅ |
| F2 | Contextual internal linking is thin outside location pages | 4, 6 | ✅ |
| F3 | `/ProductDetailsPage` thin (249 w), 1 inbound, non-descriptive URL | 4 | ⚠️ partial |
| F4 | `/project-analysis` thin (255 w) at priority 0.9 | 4 | ⚠️ partial |
| F5 | No page declares when it was last materially updated | 4 | ✅ |
| F6 | Organization node has no service catalogue and no `areaServed` | 3 | ✅ |
| F7 | `Person.sameAs` empty | 3, 8 | ❌ owner evidence |
| F8 | No author/Article model for future expert content | 8, 9 | ✅ |
| F9 | `rohansahu.jpg` 1.78 MB served for a 112×112 avatar | 10 | ✅ |
| F10 | `logo.png` 120 KB / 500×500 for a 40×40 render, on every page | 10 | ✅ |
| F11 | `inside.jpeg` 111 KB unreferenced | 10 | ✅ |
| F12 | No AI-referral or traffic-source measurement | 11 | ✅ |
| F13 | No build gate protects search-crawler access from a future robots.txt edit | 2, 13 | ✅ |
| F14 | No case studies exist; none can be written from repository evidence | 7 | ❌ owner evidence |
