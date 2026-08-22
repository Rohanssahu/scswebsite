# Case Studies — Owner Evidence Required

**Status: no case studies are published, and none can be written from anything
currently in this repository.**

The content model exists (`src/content/caseStudies/types.ts`), two drafts exist
(`src/content/caseStudies/drafts.ts`), and a build gate
(`src/content/caseStudies/caseStudies.test.ts`) prevents either from being
published until the evidence below arrives.

---

## Why there is a gate rather than a page

Every fact that turns a project description into a case study — a client, a
result, a date, a screenshot, a live URL — has to come from the owner, with the
client's permission. None of it is in the codebase.

That gap is normally filled dishonestly. "A leading UK fintech saw a 40% uplift
in conversions" is easy to write, reads well, and nobody checks. It is also
fabricated, and once an AI assistant cites it, the fabrication has been
laundered into an answer that a real person may act on.

So the drafts are **structurally** unpublishable rather than merely marked
`noindex`:

- No route imports `drafts.ts`, so no HTML file is emitted for them.
- Nothing is emitted, so nothing can be crawled, indexed, linked or cited.
- `caseStudies.test.ts` fails the build if any source file outside
  `src/content/caseStudies/` ever imports the drafts.
- `assertPublishable()` refuses a study that is marked published while evidence
  is outstanding, that has no client name or approved anonymised description,
  that has no publication date, that quotes a metric with no measurement basis
  and no confirming source, or that links to no service page.

This is a stronger guarantee than a `noindex` page, which still ships, is still
fetched, and still depends on a crawler honouring a directive.

## A case-studies hub will not be created until there are two complete studies

`CASE_STUDY_HUB_THRESHOLD = 2`. A hub listing one study is a worse page than the
study itself; a hub listing none is an empty section crawled as thin content —
exactly what `/BlogPage` was before it was replaced.

---

## Draft 1 — `/case-studies/roomji-room-and-flat-booking-app`

RoomJi already has a product page at `/ProductDetailsPage`. Turning it into a
case study needs:

| # | Evidence | Why it is needed |
|---|---|---|
| 1 | **Written confirmation that the project may be described publicly**, even anonymised | Some contracts forbid it outright. An assumption is not consent. |
| 2 | **Written confirmation that the client may be named**, or an approved anonymised description | "A UK-based clinic group" is fine *if it is true and approved*. "A leading European retailer", invented to sound impressive, is a fabrication with or without a name. |
| 3 | **A public URL that proves the product exists** — App Store listing, Play Store listing, or the live site | Without it there is no way for a reader, a search engine or an assistant to verify that anything was built. |
| 4 | **At least one screenshot the client agrees may be published**, with customer data removed | |
| 5 | **The real start and end dates** — only if the study mentions duration at all | |
| 6 | **What SCS Softwares actually built, and what it did not** | `/about` is careful to say "contributed to or delivered". A case study must keep that distinction, not blur it. |
| 7 | **The real technology stack** | Confirmed against the repository or by the owner, not assumed from the product type. |
| 8 | **Real problems encountered during delivery** | A study with no challenges is an advertisement, and reads as one. |
| 9 | *(Optional)* **A confirmed metric** — the figure, how it was measured, over what period, and who confirmed it in writing | All four, or the outcome does not go on the page. |
| 10 | *(Optional)* **A testimonial** — the quote, the name and role of the person, and their agreement to be quoted | |

## Draft 2 — `/case-studies/ai-voice-consultation-agent`

The best-evidenced study available, because the subject is our own product: the
voice and video consultation agent is in this repository and runs in production
on this site.

| # | Evidence | Why it is needed |
|---|---|---|
| 1 | **Explicit labelling as an SCS Softwares internal product**, in the first sentence | It must never be presented as client work. This is the one thing that would turn a legitimate study into a false claim. |
| 2 | **Screenshots approved for publication**, with no real consultation content | |
| 3 | **Confirmation of the current stack** | It changes; publishing a stale stack is a small lie that compounds. |
| 4 | **The real build timeline**, if duration is mentioned | |
| 5 | *(Optional)* **Any usage figure** — with its measurement basis and period | Without a basis it is not a result. |

---

## What must never be invented, for any study

Client identity · testimonial · KPI · revenue · user count · conversion
improvement · app-store ranking · project duration · project budget · team size
on the project · a named technology not actually used · a challenge that did not
occur · a date.

If a fact is not available, the correct action is to **omit the sentence**, not
to soften it. "Significant improvement" and "substantial growth" are the same
fabrication as "40%", with the number removed so it cannot be checked.

## How to complete a study once evidence arrives

1. Fill the draft's fields in `src/content/caseStudies/drafts.ts`, replacing
   every `PLACEHOLDER`.
2. Empty its `missingEvidence` array — only for evidence actually received.
3. Set `status: 'published'` and a real `datePublished`.
4. Run `npx vitest run src/content/caseStudies/`. If it still fails, it will say
   exactly what is missing.
5. Only when **two** studies pass: create the hub and the routes, register them
   in `src/seo/registry.ts`, add them to `scripts/verify-dist.mjs`, and rebuild.
