# AI Crawler Policy

Last verified against operator documentation: **2026-08-22**.
Implemented in `public/robots.txt`; enforced by `src/seo/robots.ts` and
`src/seo/robots.test.ts`.

---

## The decision, in one paragraph

Every public marketing page on scssoftwares.com is open to every crawler listed
below — search crawlers, user-initiated fetchers and model-training crawlers
alike. Two prefixes are blocked from all of them: `/admin*` (the staff
dashboard) and `/ai-consultation/*` (private rooms whose URLs carry a
per-visitor meeting reference). Nothing else is blocked, and no `noindex`
appears in `robots.txt`.

## Why search access and training access are written separately

They are different decisions with different consequences, and conflating them
is the most common way a site accidentally removes itself from AI search.

- **Search crawlers** (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`,
  plus `Googlebot` and `Bingbot`) build the index an assistant consults when it
  answers a question *now*. Blocking one means the site cannot be surfaced or
  cited in that product, at all.
- **Training crawlers** (`GPTBot`, `ClaudeBot`, `Google-Extended`) collect
  content that may inform a future model. Blocking one has no effect on whether
  the site can be found or cited today.

A team that decides "we don't want AI using our content" and adds
`User-agent: GPTBot / Disallow: /` has made a training decision. A team that
adds a blanket AI block has, usually without realising it, made a *search*
decision — and removed itself from ChatGPT search, Claude search and Perplexity
results while gaining nothing it wanted.

`robots.txt` gives each crawler exactly **one** group — the most specific one
matching its token. A named group does **not** inherit `*`. That is why every
group in the file repeats the same two `Disallow` lines, and why
`robots.test.ts` asserts them per group rather than once.

## The crawlers, verified

| Token | Operator | Purpose | Decision | Effect of blocking it |
|---|---|---|---|---|
| `Googlebot` | Google | Search indexing | **Allow** | Removed from Google Search, and therefore from AI Overviews and AI Mode, which read the Search index |
| `Bingbot` | Microsoft | Search indexing | **Allow** | Removed from Bing, and therefore from Microsoft Copilot |
| `OAI-SearchBot` | OpenAI | Surfaces sites in ChatGPT's search features | **Allow** | Removed from ChatGPT search results |
| `Claude-SearchBot` | Anthropic | Indexes content for Claude's search results | **Allow** | Removed from Claude search results |
| `PerplexityBot` | Perplexity | Indexes for Perplexity results | **Allow** | Removed from Perplexity results |
| `ChatGPT-User` | OpenAI | Fetches a page a user asked ChatGPT to open | **Allow** | A user who asks about the site gets a guess instead of the page. OpenAI states robots.txt may not apply to user-initiated actions |
| `Claude-User` | Anthropic | Fetches a page a Claude user asked about | **Allow** | As above |
| `Perplexity-User` | Perplexity | User-initiated fetch | **Allow** | As above. The operator states it generally ignores robots.txt for these |
| `GPTBot` | OpenAI | Foundation-model training | **Allow** | No effect on ChatGPT search, which uses `OAI-SearchBot` |
| `ClaudeBot` | Anthropic | Model training | **Allow** | No effect on Claude search, which uses `Claude-SearchBot` |
| `Google-Extended` | Google | Gemini training and grounding | **Allow** | **No effect on Google Search.** Google states this token does not affect inclusion and is not a ranking signal |

`OAI-AdsBot` (OpenAI ad-safety validation) is not named. It inherits the `*`
group and is allowed; no ads are run, so it is harmless either way.

## Why training access is currently allowed

The pages these crawlers read are public marketing copy describing services we
actually deliver. Nothing is confidential. Being present in training data is one
of the ways a company becomes a name an assistant recognises unprompted, which
is directly relevant to the "does anyone know SCS Softwares exists" problem.

**This is reversible at no cost to search visibility.** To revoke it: change
`Allow: /` to `Disallow: /` inside the `GPTBot`, `ClaudeBot` and
`Google-Extended` groups, and set `trainingAllowed = false` in
`src/seo/robots.ts`. Both must change together or the test fails — deliberately,
so the file and the recorded decision cannot drift.

## What is deliberately *not* done

**No `noindex` in `robots.txt`.** It is not a robots.txt directive. Using
`Disallow` as a substitute is actively harmful: a disallowed URL cannot be
fetched, so the crawler never reads the real `noindex` meta tag, and the URL can
remain indexed with no snippet instead of being dropped. This is why
`/project-analysis/result` and `/ApplicationForm` are **left crawlable** — both
carry `noindex,nofollow` in their HTML and need to be fetched for that to work.

**No private URL is listed to satisfy a crawler.** `robots.txt` is public. The
two blocked prefixes are directory-level and reveal nothing about individual
sessions.

**No `llms.txt`.** Google's AI-features guidance states that no machine-readable
AI text file, markup or Markdown is required to appear in Google Search
including its generative capabilities, and Google has said it does not support
and does not plan to support `llms.txt`. No other consumer with a documented,
supported reader has been identified. An unread file that can drift out of sync
with the site is a maintenance liability, not an optimisation. This will be
reconsidered only if a specific supported consumer is demonstrated — at which
point the file must be generated from `src/seo/registry.ts`, never hand-written.

**No crawl-delay, no IP allowlisting, no user-agent sniffing.** The site is
static files on GitHub Pages; crawl load is not a problem, and serving different
content to a crawler than to a person is cloaking.

## Sources

- OpenAI — <https://developers.openai.com/api/docs/bots>
- Anthropic — <https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler>
- Perplexity — <https://docs.perplexity.ai/guides/bots>
- Google — <https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers>

Re-verify these before any change to `public/robots.txt`. Crawler tokens are
added and renamed more often than any other part of this configuration.
