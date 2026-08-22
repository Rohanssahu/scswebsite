# Measuring AI Visibility

How to tell whether this work is doing anything — and, just as importantly, what
these numbers **cannot** tell you.

Implemented in `src/utils/trafficSource.ts` and
`src/utils/acquisitionAnalytics.ts`. Enforced by `src/utils/trafficSource.test.ts`
and `src/utils/analyticsPrivacy.test.ts`.

---

## What is measured

One extra GA4 event, at most once per session, on the first tracked page view:

```
event:          traffic_source
event_category: Acquisition
event_label:    "<source>|<landing>"     e.g. "chatgpt|service"
value:          1 if the source is an AI assistant, 0 otherwise
```

**`<source>`** — one of: `chatgpt`, `perplexity`, `claude`, `gemini`, `copilot`,
`ai-other`, `google-search`, `bing-search`, `other-search`, `social`, `referral`,
`direct`.

**`<landing>`** — one of: `home`, `service`, `services-hub`, `market`,
`locations-hub`, `about`, `contact`, `project-analysis`, `schedule-call`,
`insight`, `other`.

That is the whole payload. Both halves are validated against their lists before
the event is sent.

### How a source is decided

1. **`utm_source` first.** ChatGPT appends `utm_source=chatgpt.com` to links it
   renders. This is checked before the referrer because it is the only evidence
   that survives an assistant stripping the referrer — which several do.
2. **Then the referrer host.** `chatgpt.com`, `perplexity.ai`, `claude.ai`,
   `gemini.google.com`, `copilot.microsoft.com` and others map to their bucket.
3. **Then search, social, referral.**
4. **Otherwise `direct`.**

A same-site referrer returns `internal` and reports nothing — otherwise the real
source would be overwritten with "referral" on the second page of every visit.

### The page-view design is unchanged

`RouteAnalytics` still sends exactly one `page_view` per route navigation, and
`index.html` still runs the tag with `send_page_view: false`. The acquisition
event is a separate event, not a second page view.

---

## What is never sent

No email, telephone number, name, transcript, requirement text, access token,
meeting identifier, document content or secret can reach GA4 from this site.
This is a property of the code, not a promise:

- `logEvent` accepts a category, an action, an optional label and an optional
  number. Every caller is one of four allowlist wrappers, each of which accepts
  only members of a closed list. `analyticsPrivacy.test.ts` fails the build if
  any other file calls `logEvent`, touches `window.gtag`, or references
  `dataLayer`.
- `normalizeRoute` strips the query string and the fragment (either can carry a
  token) and collapses `/ai-consultation/:reference` and `/admin/leads/:id`.
  `/admin*` reports nothing at all.
- The referrer URL and the query string are read **inside**
  `trafficSource.ts` and never leave it. `trafficSource.test.ts` drives emails,
  phone numbers, JWTs, API keys and meeting references through the classifier
  and asserts the output is always a bare enum member.
- `page_location` is rebuilt from the production origin plus the normalized
  path, never read from `location.href`.

---

## The reports to build in GA4

All five are Explorations. None requires a custom dimension beyond the standard
`event_label`.

### 1. Is AI sending anyone at all?
Metric `Event count`, filter `event_name = traffic_source`, breakdown by
`event_label`. Read the rows whose label starts with `chatgpt`, `perplexity`,
`claude`, `gemini`, `copilot` or `ai-other`. **This is the headline number.**

### 2. Which pages do assistants send people to?
Same, but read the half after the pipe. Expect `service`, `market` and `insight`
to matter most — if `home` dominates, assistants know the brand but not the
offer.

### 3. Do AI visitors convert differently?
Compare `traffic_source` sessions against the conversion events:
`contact_submitted`, `project_analysis_completed`, `requirement_submitted`,
`human_review_requested`, `consultation_schedule_started`,
`consultation_completed`. AI referrals are typically low-volume and
high-intent — a small number converting well is a better result than a large
number bouncing.

### 4. Organic landing pages
Standard GA4: Reports → Engagement → Landing page, secondary dimension Session
source/medium. Cross-check against Search Console.

### 5. Country pages
Landing page report filtered to `/locations/`. Cross-check against Search
Console's Countries tab — a market page ranking in the wrong country is a real
signal and a common one.

---

## What this cannot tell you

Read this section before drawing any conclusion. Every limitation below is
structural, not a bug to be fixed later.

**Referrer-stripping assistants are invisible.** Several strip the referrer and
add no UTM parameter. Those visits land in `direct` and are indistinguishable
from someone typing the URL. **`direct` is therefore an undercount of AI
referrals, and always will be.** Do not report `direct` as "no source"; report
it as "unknown, including some AI".

**A citation nobody clicks produces no data whatsoever.** The most valuable
outcome of this work — an assistant naming SCS Softwares in an answer — leaves
no trace in analytics unless the reader clicks. Impressions in AI answers are
not measurable from your own site. Anyone selling you an "AI visibility score"
is modelling, not measuring.

**Google AI Overview clicks cannot be separated from ordinary Google organic.**
An AI Overview click sends the same `google.com` referrer as a blue link. There
is no evidence in the browser that distinguishes them, and there is deliberately
no `google-ai` bucket, because inventing one would produce a confident wrong
number. Search Console reports AI Overview and AI Mode impressions inside total
Search performance and does not break them out separately.

**Bing and Copilot are only partly separable.** `copilot.microsoft.com` is
distinguishable; Copilot surfaces embedded inside Bing frequently are not.

**Session-scoped, so it undercounts returning visitors.** Someone who finds the
site through ChatGPT today and returns directly next week is `chatgpt` once and
`direct` after. That is correct for attributing discovery and wrong for
attributing the conversion.

**Ad blockers and consent tooling suppress an unknown share of all of it.**

**Low volume means noise.** At this traffic level, a month with four ChatGPT
sessions and a month with one are not meaningfully different. Look at direction
over a quarter, not variation between weeks.

---

## The honest summary

This measures **clicks that arrive from an identifiable AI surface**. It does
not measure how often an assistant mentions SCS Softwares, whether it described
the company accurately, or whether it recommended a competitor instead.

The best available proxy for the thing you actually care about is manual and
qualitative: **once a quarter, ask each major assistant the queries in the
brief** — "software development companies in India", "AI voice agent
development", "who founded SCS Softwares" — and record what comes back
verbatim, with the date and the model version. That is a small manual log, and
it is worth more than any dashboard, because it observes the output directly
instead of inferring it from clicks.
