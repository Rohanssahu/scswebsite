# AI Service Cluster — Overlap Analysis

**Conclusion: no new AI service pages were created. All nine proposed URLs
either duplicate an existing page or would compete with one.**

The brief asked for an AI authority cluster with a `/services/ai-development`
hub and up to nine supporting pages, "only if equivalent strong pages do not
already exist", with instructions to check keyword and intent overlap, merge
competing pages, and not generate thin pages to increase the sitemap count.

The check was run. The cluster already exists.

---

## What is already published

| URL | Words (prerendered) | Distinct buyer intent |
|---|---|---|
| `/services/ai-development` | 3,092 | "Who can build AI into my product?" — the hub |
| `/services/machine-learning-development` | 2,913 | "I need a trained model, not a prompt" |
| `/services/ai-voice-agent-development` | 3,025 | "I want an agent that answers the phone" |
| `/services/ai-video-consultation-agents` | 2,935 | "I want an agent that meets prospects" |
| `/services/conversational-ai-development` | 2,750 | "I want a text assistant for support" |
| `/services/ai-automation-integration` | 2,801 | "I want AI inside the tools I already run" |

Six pages, all substantial, all with their own problems, use cases,
capabilities, integration notes, limitations, oversight, process, engagement,
security and FAQ sections. All six are indexable, in the sitemap, and carry a
`Service` node with `provider` referencing the one Organization.

## The nine proposed URLs, assessed

| Proposed URL | Verdict | Reasoning |
|---|---|---|
| `/services/ai-development` | **Exists** | 3,092 words. This is the hub. No change needed. |
| `/services/ai-ml-development` | **Reject — duplicate** | Same intent, same queries and largely the same vocabulary as `/services/machine-learning-development`. "AI/ML development" and "machine learning development" are the same buyer typing different words. Two pages would split their own signals and each would be the other's nearest competitor. |
| `/services/generative-ai-development` | **Reject — merge into the hub** | `/services/ai-development` already covers LLM integration, generative features, retrieval and grounding. A separate generative page would have to take that content *out* of the hub to avoid duplication, leaving a weaker hub and a page that answers a narrower version of the same question. |
| `/services/ai-agent-development` | **Reject — would compete with three pages** | "AI agent" is an umbrella whose commercial intent always resolves to a channel: voice (covered), video (covered), text/support (covered) or workflow/tool-calling (covered by `/services/ai-automation-integration`). A page at this URL would have no content that is not on one of the four, and would compete with all of them. |
| `/services/voice-ai-agent-development` | **Reject — duplicate** | Word-order variant of `/services/ai-voice-agent-development`. Publishing both is a doorway pattern. |
| `/services/ai-consultation-agent` | **Reject — duplicate** | This is exactly `/services/ai-video-consultation-agents`. |
| `/services/ai-integration` | **Reject — duplicate** | This is exactly `/services/ai-automation-integration`, which already leads on integrating AI into systems a client already runs. |
| `/services/ai-powered-mobile-app-development` | **Reject — modifier page** | Splits the intent of `/services/mobile-app-development` without adding a distinct buyer question. Someone wanting AI in a mobile app is served by the mobile page (which covers AI-enabled features) plus the AI hub, linked from both. A separate page is the "service × modifier" pattern that produces near-duplicate content at scale. |
| `/services/ai-powered-web-application-development` | **Reject — modifier page** | Same reasoning against `/services/web-application-development`. |

## What was done instead

Rather than adding nine competing pages, the existing cluster was strengthened
where it was genuinely incomplete:

1. **A markets block on every service page** (`ServiceMarkets` in
   `src/content/services/types.ts`). Before this, all nine market pages linked
   *out* to eight service pages each, and no service page linked back — the
   country cluster was a one-way graph. Every AI service page now links to all
   nine markets and to `/locations`, each with a sentence written for that
   service, alongside the India-delivery disclosure.

2. **A machine-readable service catalogue on the Organization node**
   (`hasOfferCatalog` in `src/seo/jsonld.ts`), derived from `SERVICE_META`. An
   assistant resolving "which company builds AI voice agents" no longer has to
   infer the offer from a prose description — the catalogue states it, and every
   item links to the page that proves it.

3. **`Organization.areaServed`**, derived from `LOCATION_META`: India plus the
   nine markets, as `Country` nodes only. No address, no phone, no
   `LocalBusiness`.

4. **Two long-form articles** (`/insights/*`) written from first-hand experience
   of AI systems in this repository, linked into the AI service pages. Original
   technical content is what an assistant can cite; a tenth service page is not.

## If a new AI page is ever proposed

The bar it must clear, in order:

1. **A distinct buyer question.** Not a distinct keyword — a distinct question a
   real buyer asks that no existing page answers.
2. **No existing page would have to be weakened** to supply its content.
3. **Unique copy throughout**: H1, metadata, problems, use cases, capabilities,
   process, FAQs, internal links and CTA.
4. **It survives the duplicate-content scan** in `scripts/verify-dist.mjs`.
5. **It links to and is linked from** the AI hub and the markets block.

If a proposal fails any of these, the correct action is to improve the existing
page, not to add a new URL.

## Technologies described, and their evidence

The AI pages describe capabilities that exist in this repository, which is why
they are safe to publish:

| Claim | Where it is implemented |
|---|---|
| LLM integration | `agent/`, `supabase/functions/ai-estimate` |
| Provider abstraction (Gemini / OpenAI) | `@google/genai` plus provider fallback in `agent/` |
| Retrieval and grounding | `agent/src/knowledge.ts` |
| Voice STT → LLM → TTS pipeline | `agent/`, `src/services/voiceSession*`, LiveKit |
| Tool calling | `agent/src/backend.ts` (`submit_lead`) |
| Workflow automation | `supabase/functions/*` |
| Human review | `human_review_requested` conversion, admin dashboard |
| Consent and privacy handling | consent flags on transcript excerpts in `agent/src/backend.ts` |
| Monitoring and fallback | device-check and reconnect handling in `src/services/` |
| Mobile/web integration | the site itself |

No page describes a capability outside this list, and none reveals prompt text,
credentials, client data or an unreleased feature.
