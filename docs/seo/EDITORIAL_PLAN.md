# Editorial Plan — 12 Prioritised Topics

**Two published. Ten held as owner-input briefs, deliberately out of
production.**

The rule this section runs on, stated on `/insights` itself: *an article is
published only when SCS Softwares has first-hand experience of what it
describes.* Ten of the twelve below cannot currently clear that bar without
being assembled from other people's writing — which would add ten thin pages,
dilute the two that carry something original, and give an assistant nothing it
could not already find elsewhere.

Prioritised by commercial buyer intent: how close the reader is to needing to
hire someone.

---

## Published

### 1. How to estimate an AI app project without guessing — **LIVE**

- **URL:** `/insights/how-to-estimate-an-ai-app-project`
- **Target query:** "how to estimate an AI project cost", "AI app development cost", "why are AI estimates wrong"
- **Intent:** Global · **Funnel: middle→bottom** (actively scoping a build)
- **Primary service:** `/services/ai-development`
- **Buyer problem:** they have a budget conversation coming and no defensible way to size the AI part.
- **SCS evidence used:** the estimator behind `/project-analysis` — first-party.
- **Internal links:** `/services/ai-development`, `/services/machine-learning-development`, `/services/custom-software-development`, `/project-analysis`
- **CTA:** free project analysis.

### 2. Production checklist for an AI voice agent — **LIVE**

- **URL:** `/insights/ai-voice-agent-production-checklist`
- **Target query:** "AI voice agent production", "voice agent latency", "voice AI barge-in", "voice agent consent"
- **Intent:** Global · **Funnel: middle→bottom** (about to deploy, or burned once)
- **Primary service:** `/services/ai-voice-agent-development`
- **Buyer problem:** their demo works and they do not know what breaks on real calls.
- **SCS evidence used:** the LiveKit voice agent in `agent/`, running in production on this site — first-party.
- **Internal links:** `/services/ai-voice-agent-development`, `/services/ai-video-consultation-agents`, `/services/conversational-ai-development`, `/schedule-call`
- **CTA:** talk to the agent described in the article.

---

## Briefs — held pending owner input

Each is ready to write the moment the named evidence exists. None is in
production, none is routed, none is in the sitemap.

### 3. AI agent vs chatbot: which does your business actually need?

- **Target query:** "AI agent vs chatbot", "difference between AI agent and chatbot for business"
- **Intent:** Global · **Funnel: top→middle**
- **Primary service:** `/services/conversational-ai-development`
- **Buyer problem:** vendors use both words for both things; the buyer cannot tell what they are being sold.
- **Evidence needed:** a real deployment where the distinction changed the design — which one was chosen, why, and what it cost to get wrong. Without it this is a definitions post, and there are hundreds.
- **URL:** `/insights/ai-agent-vs-chatbot-for-business`
- **Links to:** `/services/conversational-ai-development`, `/services/ai-automation-integration`, `/services/ai-voice-agent-development`
- **CTA:** consultation.

### 4. Rebuilding an incomplete mobile application

- **Target query:** "developer abandoned my app", "take over unfinished app project", "rescue a failed app build"
- **Intent:** Global · **Funnel: bottom** — one of the highest commercial intents on this list
- **Primary service:** `/services/software-modernization`
- **Buyer problem:** they have paid for something half-built and do not know whether it can be salvaged.
- **Evidence needed:** the real assessment process — what is checked, in what order, and the decision rule for rebuild vs continue. This exists as practice; it needs the owner to describe it. **Highest-value brief on the list.**
- **URL:** `/insights/rebuilding-an-incomplete-mobile-app`
- **Links to:** `/services/software-modernization`, `/services/mobile-app-development`, `/project-analysis`
- **CTA:** project analysis.

### 5. Scoping an MVP to a fixed budget

- **Target query:** "MVP scope fixed budget", "what to cut from an MVP", "minimum viable product scope"
- **Intent:** Global · **Funnel: middle→bottom**
- **Primary service:** `/services/saas-development`
- **Buyer problem:** a hard number and a feature list that does not fit it.
- **Evidence needed:** the actual cut-list logic used in scoping conversations — which features go first and why. Owner input.
- **URL:** `/insights/mvp-scope-fixed-budget`
- **Links to:** `/services/saas-development`, `/services/custom-software-development`, `/project-analysis`

### 6. Adding AI to an existing mobile or web application

- **Target query:** "add AI to existing app", "integrate LLM into my application"
- **Intent:** Global · **Funnel: middle**
- **Primary service:** `/services/ai-automation-integration`
- **Buyer problem:** they have a working product and no idea where AI would sit in it.
- **Evidence needed:** a real integration, even our own, described end to end. Partially available — this is the **next most writable** brief after #4.
- **URL:** `/insights/adding-ai-to-an-existing-application`
- **Links to:** `/services/ai-automation-integration`, `/services/ai-development`, `/services/mobile-app-development`

### 7. Security and consent for voice AI

- **Target query:** "voice AI consent", "is it legal to record AI calls", "voice agent privacy"
- **Intent:** **Country-specific** — the answer genuinely differs by jurisdiction
- **Primary service:** `/services/ai-voice-agent-development`
- **Buyer problem:** they suspect there are rules and do not know which.
- **Evidence needed:** **this one carries a real risk.** We hold no legal qualification and must not give jurisdictional advice. Writable only as "the questions to put to your own counsel, and the technical controls that make each answer implementable". Needs an explicit owner decision to publish in that form.
- **URL:** `/insights/voice-ai-consent-and-security`
- **Links to:** `/services/ai-voice-agent-development`, `/locations/*`

### 8. Planning a SaaS modernization

- **Target query:** "modernize legacy SaaS", "SaaS re-platform plan"
- **Intent:** Global · **Funnel: middle**
- **Primary service:** `/services/software-modernization`
- **Evidence needed:** a real staged-migration plan from an actual engagement.
- **URL:** `/insights/planning-a-saas-modernization`

### 9. Choosing between an AI-assisted and a human development team

- **Target query:** "AI coding tools vs development agency", "can AI build my app"
- **Intent:** Global · **Funnel: top→middle**
- **Primary service:** `/services/custom-software-development`
- **Buyer problem:** they are being told an AI tool can replace a team.
- **Evidence needed:** an honest account of where we use AI assistance in delivery and where we do not. **Requires owner sign-off on disclosing internal practice** — and must not become a sales piece against a straw man.
- **URL:** `/insights/ai-assisted-vs-human-development-team`

### 10. What retrieval-augmented generation actually costs to run

- **Target query:** "RAG cost", "vector database cost for a small business"
- **Intent:** Global · **Funnel: middle**
- **Primary service:** `/services/ai-development`
- **Evidence needed:** real running-cost figures from a system we operate, with the usage volume attached. Without both numbers it is speculation.
- **URL:** `/insights/what-rag-actually-costs-to-run`

### 11. How a remote development engagement actually runs across timezones

- **Target query:** "working with an offshore development team", "remote development timezone"
- **Intent:** **Country-specific** (US, UK, Australia have the widest gaps)
- **Primary service:** `/services/custom-software-development`
- **Evidence needed:** our real meeting cadence, update format and escalation path. Owner input. Cheap to produce and would strengthen all nine market pages.
- **URL:** `/insights/remote-development-across-timezones`

### 12. What to require in a software development contract

- **Target query:** "software development contract checklist", "who owns the code"
- **Intent:** Global · **Funnel: bottom**
- **Primary service:** `/services/custom-software-development`
- **Evidence needed:** **legal-risk brief.** Writable only as "what to make sure is written down", explicitly not as legal advice. Needs owner sign-off, and probably a solicitor's read.

---

## Rules for anything added to this section

1. **First-hand experience, or it is not published.** The test is: could a
   competent writer produce this from a search of existing articles? If yes, we
   have added nothing.
2. **No invented evidence.** `insightPages.test.tsx` fails the build on a client
   anecdote, an unverified metric, a percentage figure, a superlative, a
   guarantee or a certification claim.
3. **Authorship is a fact.** `Article.author` points at the founder `Person`
   node and the page renders a visible byline. Do not attach either to something
   Rohan did not write or review.
4. **`dateModified` moves only on material change.** Bumping it for freshness is
   the same signal manipulation as everything else this codebase refuses.
5. **Every article links to the service pages it evidences**, and those pages
   should link back once there are enough articles to warrant it.
6. **No FAQPage markup.** The FAQ answers are visible; FAQ rich results are
   restricted to well-known authoritative sites, so the markup would earn
   nothing and would be one more claim to keep in sync.
