# Owner Evidence Still Required

Everything below is blocked on information only the owner can supply. None of it
can be inferred, researched or reasonably guessed, and each item is something
the site would genuinely benefit from — which is exactly why the temptation to
invent it has to be named.

Ordered by value per unit of effort.

---

## 1. Rohan Sahu's personal LinkedIn URL — *highest value, lowest effort*

**Blocks:** `Person.sameAs` on the founder node.

**Why it matters more than it looks.** The founder `Person` node currently has a
name, a job title, an image and a `worksFor` link, and no external anchor at
all. `sameAs` is the property that lets a search engine or an assistant decide
that the "Rohan Sahu" on this site is the same Rohan Sahu it has seen elsewhere.
Without it, the entity is unresolvable — which is the core difficulty behind the
"Rohan Sahu / SCS Softwares founder" queries in the brief.

**What is needed:** the URL. Nothing else.

**How to apply it:** add it to `FOUNDER.sameAs` in `src/seo/site.ts`. The
`Person` node picks it up automatically; the field is already conditional.
Add a GitHub profile URL the same way if one exists.

**What must not happen:** the company LinkedIn page
(`linkedin.com/company/105694530`) is already in `Organization.sameAs`. It is
**not** a `sameAs` for a person and must never be used as one.

## 2. Client permission for one case study

**Blocks:** the entire `/case-studies` section, and every "proof" claim.

See `CASE_STUDY_EVIDENCE_REQUIRED.md` for the itemised list. The single most
valuable item is **one client who agrees to be named**, because one verifiable
study is worth more than ten anonymous ones.

## 3. App Store / Play Store / live deployment URLs

**Blocks:** any `WorkExample` or `SoftwareApplication` markup, and the ability
of `/products` to prove that any of the sixteen product concepts exists as a
shipped product.

**Why it matters:** `/products` currently describes what can be built. A store
link changes it from a claim into a demonstration, and store listings are
independently crawlable third-party corroboration.

**What is needed:** for each shipped product — the store or site URL, whether
SCS Softwares may link to it publicly, and whether it was built for a client or
is our own.

## 4. Genuine client reviews on a third-party platform

**Blocks:** every rating and review signal. `aggregateRating` and `review` are
forbidden throughout the codebase and enforced by tests.

**Why it must be third-party:** a rating a company publishes about itself is not
evidence. Google, Clutch and GoodFirms reviews are written by the client, on the
platform, and cannot be edited by us — which is what makes them worth anything.

**What must not happen:** never write, script, incentivise or "help draft" a
review. Ask, link, and let the client write it.

## 5. Confirmation of the `www` DNS record

**Blocks:** nothing today, but it is a live risk.

The codebase folds `www.scssoftwares.com` onto the apex origin and the build
fails if any `www` URL appears in `dist`. That handles our own links. It does
**not** control what happens when someone types `www.scssoftwares.com` into a
browser — that depends on a CNAME record at the DNS provider.

**What is needed:** confirm `www.scssoftwares.com` has a CNAME to the GitHub
Pages host, so it resolves and redirects rather than failing.

## 6. Team member roles and consent

**Blocks:** any `Person` markup for the three non-founder team members on
`/about`.

Their names and photographs are already published, and their roles come from the
translation files. No `Person` node is emitted for any of them, and none should
be without the owner confirming each person's exact title **and** that they
consent to being marked up as an identifiable entity.

## 7. Anything that would justify a credential claim

**Blocks:** `hasCredential`, `award`, `alumniOf`, and any certification or
compliance claim.

Currently: none exists, none is claimed, and the honesty scan in
`scripts/verify-dist.mjs` fails the build if one appears. If a real
certification is ever obtained, supply the issuing body, the certificate
identifier and the expiry date — all three, or it does not go on the site.

---

## What was deliberately left undone rather than guessed

| Item | Why |
|---|---|
| Case studies | No client evidence. Drafts exist and are structurally unpublishable. |
| `Person.sameAs` | No verified personal profile URL. |
| Testimonials | None exist. |
| Any metric, KPI or percentage | None verified. The article tests fail the build on any percentage figure. |
| Country × service pages | No Search Console query data, and no jurisdictional expertise to claim. See `COUNTRY_SERVICE_OPPORTUNITY.md`. |
| Ten of the twelve planned articles | Cannot be written from first-hand experience. See `EDITORIAL_PLAN.md`. |
| `llms.txt` | No documented supported consumer. See `AI_CRAWLER_POLICY.md`. |
| Deletion of the unused `public/images/inside.jpeg` (111 KB) | Nothing references it, but it may be linked externally. Owner's call. |
