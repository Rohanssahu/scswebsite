# External Authority — Owner Checklist

**Code cannot manufacture authority.** Everything in this pass improves how well
the site describes itself and how easily it can be read. None of it creates
external corroboration, and external corroboration is what decides whether a
search engine or an assistant treats SCS Softwares as a real company rather than
a plausible-looking website.

Every item below is done by the owner, not by a build.

---

## The details that must be identical everywhere

Copy these exactly. Inconsistency between platforms is the single most common
reason an entity fails to consolidate — a different suite number or a different
phone format reads as a different business.

| Field | Exact value |
|---|---|
| Company name | `SCS Softwares` |
| Website | `https://scssoftwares.com` (apex, HTTPS, no `www`, no trailing path) |
| Founded | `2022` |
| Address | `9th Floor, Shekhar Central, Palasia Square, Indore, MP 452001, India` |
| Email | `info@scssoftwares.com` |
| Founder | `Rohan Sahu`, `Founder & CEO` |
| Short description | India-based mobile app, web application, custom software and AI development company specializing in AI/ML, AI voice agents, AI video consultation agents and business automation. |
| Logo | `https://scssoftwares.com/images/logo.png` |

**Never vary:** the company name spelling or capitalisation, the founding year,
or the address.

---

## 1. Google Business Profile — *do this first*

- **Why:** the strongest single entity signal available, and the one most likely
  to make the company resolvable as a real organisation.
- **Evidence required:** postal verification at the Indore address, or video
  verification showing the premises and signage. Google will ask.
- **Category:** `Software company`. Add `Website designer` and
  `Software development` as secondary if offered.
- **Service area:** you may list the international markets as service areas.
  Do **not** create a second listing for any of them.
- **Landing page:** `https://scssoftwares.com`
- **Must not claim:** an office, address or phone number in any country other
  than India. Do not create listings for US, UK, UAE or any other market.
- **Then:** ask real clients for reviews. Never write, script, incentivise or
  "help draft" one.

## 2. Bing Webmaster Tools

- **Why:** Bing's index feeds Microsoft Copilot. Google Search Console does not
  cover it, so Bing-side crawl problems are currently invisible.
- **Evidence required:** domain verification (import from Search Console is the
  quickest route).
- **Do:** submit `https://scssoftwares.com/sitemap.xml`.
- **Landing page:** the sitemap.

## 3. Company LinkedIn page

- **Why:** already in `Organization.sameAs`, so it is already a declared
  identity. It needs to corroborate the same facts.
- **Evidence required:** admin access to `linkedin.com/company/105694530`.
- **Do:** make the About section, founding year, location, website and logo
  match the table above exactly. Post occasionally — an abandoned page is a
  weaker signal than an active one.
- **Must not claim:** employee counts, awards or client names that are not true.
  The site claims none of these and the two must not diverge.

## 4. Rohan Sahu's personal LinkedIn — *highest value per unit of effort*

- **Why:** it unblocks `Person.sameAs`, which is the missing anchor for the
  founder entity. Right now nothing outside this site corroborates that Rohan
  Sahu exists.
- **Evidence required:** the profile URL.
- **Do:** ensure the profile lists SCS Softwares as current employer, with the
  title `Founder & CEO` and a start year consistent with 2022; link
  `scssoftwares.com` in the profile.
- **Then:** send the URL to whoever maintains the site, to be added to
  `FOUNDER.sameAs` in `src/seo/site.ts`.
- **Must not claim:** education, certifications or awards that are not real. The
  site deliberately claims none, and a mismatch is worse than a gap.

## 5. Clutch and GoodFirms

- **Why:** the two directories buyers of development services actually consult,
  and both are crawled and cited.
- **Evidence required:** a free company profile, and — this is the hard part —
  **real clients willing to complete Clutch's verified reference interview.**
  Clutch verifies; that is what makes it worth anything.
- **Landing page:** `https://scssoftwares.com`, plus
  `https://scssoftwares.com/services` for the service list.
- **Must not claim:** a minimum project size, an hourly rate or an employee
  count that is not true. These fields are optional; leave them blank rather
  than guessing.
- **Must not do:** pay for review placement, or submit a review on a client's
  behalf. Both are detectable and both are grounds for removal.

## 6. GitHub organisation / profile

- **Why:** for a software company this is first-party technical evidence, and it
  is crawlable. It is also currently absent, which is unusual for a development
  company and noticeable.
- **Evidence required:** an organisation account, or the founder's personal
  account with a complete profile.
- **Do:** set the website field to `scssoftwares.com`; publish at least one
  genuinely useful public repository — a small library, a template, a tool the
  team actually uses.
- **Must not do:** publish client code, credentials, or a repository created
  only to look active.

## 7. App-store and deployment links

- **Why:** turns `/products` from a description into a demonstration, and
  provides third-party corroboration that products shipped.
- **Evidence required:** for each shipped product — the store or live URL,
  permission to link publicly, and whether it was client work or our own.
- **Landing page:** `/products`, and the relevant `/services/*` page.
- **Must not claim:** authorship of a product SCS Softwares only contributed to.
  `/about` is careful to say "contributed to or delivered"; keep that
  distinction.

## 8. Genuine client reviews

- **Where:** Google Business Profile, Clutch, GoodFirms — in that order.
- **Evidence required:** a real client, a real project, and an ask.
- **Do:** ask directly, at a natural moment, with a link. Accept the answer.
- **Must not do:** write, draft, edit, incentivise, buy, or gate a review behind
  anything. The site emits no `aggregateRating` or `review` markup and the build
  fails if any appears — so a fabricated review would gain nothing on-site
  anyway, and would risk the profile that carries it.

## 9. Partnerships

- **Why:** a partner listing on a vendor's own site is a strong external link
  that we do not control, which is what makes it valuable.
- **Evidence required:** an actual partnership. Candidates worth pursuing given
  what is genuinely used: LiveKit, Supabase, and cloud providers with partner
  directories.
- **Must not claim:** partner status, tier or certification not formally granted.
  "We use X" is honest; "We are an X Partner" without the agreement is not.

## 10. Podcasts, interviews, guest contributions

- **Why:** the most durable form of external authority, and the kind assistants
  surface — a named person saying something specific in a place we do not own.
- **Evidence required:** something worth saying. The two published articles are
  the pitch: the AI-estimation piece and the voice-agent checklist are both
  built on first-hand experience and both suit a podcast conversation.
- **Do:** pitch niche technical shows and communities, not general business
  podcasts. Always link to the specific article, not the homepage.
- **Must not do:** pay for a guest post placement, or accept a "sponsored
  interview" that is a paid link. Both are link schemes.

## 11. Original technical demonstrations

- **Why:** the strongest asset available, because it is genuinely differentiated
  and cannot be copied by a competitor writing blog posts.
- **What already exists:** a working AI voice agent, a video consultation agent,
  and an AI project estimator — all running in production on this site.
- **Do:** a short screen recording of the voice agent handling an interruption
  and a handover to a human would be more persuasive than any amount of copy.
  Publish it where developers are, and link back to
  `/services/ai-voice-agent-development`.
- **Must not do:** reveal prompts, credentials, client data or a capability that
  is not shipped.

---

## Never do any of these

Fake accounts · fake reviews · purchased backlinks · paid guest posts · private
blog networks · directory spam · reciprocal link schemes · fabricated
partnerships · fake local listings in target countries · review gating ·
incentivised reviews · comment-link spam · AI-generated review text.

Every one of them is detectable, and each carries a penalty larger than any
benefit it could deliver. They would also invalidate the honesty discipline the
rest of this site is built on — which is the actual asset here.

---

## Suggested order

1. Rohan's personal LinkedIn URL — one link, unblocks the founder entity.
2. Bing Webmaster Tools — 15 minutes, opens the Copilot side of measurement.
3. Google Business Profile — highest value, slowest verification, so start it early.
4. Company LinkedIn consistency pass.
5. One client review on Google.
6. Clutch profile, once a client will act as a reference.
7. GitHub presence.
8. App-store links, as products confirm.
9. One technical demonstration video.
10. Podcast and community pitches, using the two published articles.
