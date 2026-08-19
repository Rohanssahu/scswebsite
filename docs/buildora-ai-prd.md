# Buildora AI — Product Requirements Document

**Tagline:** Your own software company, without building one.

**Status:** Draft v1 · Pre-validation
**Last updated:** 19 August 2026

---

## 1. Product Summary

Buildora AI is a virtual software company that runs separately for each client. The client provides requirements and funds a wallet. Everything else — team composition, task breakdown, development, testing, deployment and project management — is handled by AI roles operating as a coordinated team.

Humans are an optional add-on, not the default. A client can hire a human into any role if they want extra assurance, but a project can be delivered end-to-end without one.

**Core positioning:** the inverse of a freelance marketplace. Upwork says "here are 10,000 developers, choose one." Buildora says "choose nothing, just tell us what you need."

---

## 2. Problem

A non-technical person who wants software today has three bad options:

| Option | Why it fails them |
|---|---|
| Agency | $15,000 minimum, 3-month timelines, email chains for a one-line change |
| Freelance marketplace | Client must self-manage: choose stack, vet developers, chase delivery. Most non-technical clients have been burned once already |
| AI builders (Lovable, Bolt, Replit) | Fast and cheap until you hit 70% — broken auth, failed payment integration, deploy errors. Then there is nobody to ask |

**The gap is the third one.** Start with AI, bring in a human only where you get stuck. No agency retainer required.

This is observable demand: the community forums of every AI-builder product are full of "this isn't working, can anyone help" posts. Those users are willing to pay. They have nowhere to pay.

---

## 3. Target Users

**Primary — stuck builders.** Someone who already built something with an AI tool and cannot finish it. Already convinced, has urgency, has budget awareness. Roughly 10x easier to convert than a cold start.

**Secondary — small business with a specific internal need.** Booking system, inventory tracker, ordering flow. An agency quotes $8,000; this can be done for $600.

**Tertiary — non-technical founders** validating an idea before raising money.

---

## 4. Two Entry Points

### 4.1 New Project

1. Signup
2. AI-guided requirement conversation
3. Scheduled call — AI-led by default, human co-host optional
4. Auto-generated plan: scope, budget, team composition, timeline, AI vs human split
5. Client approves and funds wallet
6. Work starts, tracked on dashboard

### 4.2 Existing Project (build this first)

1. Client uploads repo or shares a live link
2. AI analyses the codebase
3. Health report: what works, what is broken, what is missing, estimated hours remaining
4. Discussion — AI, with human optional
5. Client selects fixes or new modules
6. Work starts

**Existing Project is the stronger wedge.** That client is already convinced, has urgency, and has no alternative today. New Project clients compare, deliberate and defer.

---

## 5. AI Team Roles

| Role | Input | Output |
|---|---|---|
| Requirement Manager | Client conversation | Structured spec + open questions |
| Architect / Tech Lead | Spec | Stack, DB schema, API contracts, file ownership map |
| Frontend Developer | API contracts | UI, state, integration (owns `/app`, `/components`) |
| Backend Developer | API contracts | API, DB, business logic, auth (owns `/api`, `/db`) |
| Full-stack Developer | Spec | Alternative to FE/BE split for small tasks |
| Tester | Acceptance criteria only — **no code access** | Test suite, failure report |
| Reviewer | Code + spec | Security, edge cases, requirement coverage |
| CI/CD & Production Manager | Verified build | Deploy, env, migrations, rollback, monitoring |
| Project Manager | All role states | Progress, blockers, client-facing updates |

### Role design rules

- **Handoffs use schemas, not prose.** Missing field halts the pipeline. Prose silently loses detail; schemas raise validation errors.
- **A shared context file carries the client's original words verbatim** to every role, so detail lost in summarisation stays reachable.
- **Tester and Reviewer run on a different model** from the developer roles. Same model means same blind spots.
- **Only the Architect writes shared files** (types, schema). This makes merge conflicts structurally impossible rather than merely unlikely.

### Two execution modes

| Mode | Used for | Behaviour |
|---|---|---|
| Simple | Bug fixes, small changes, landing pages (~90% of requests) | Single full-stack agent, sequential, no orchestration overhead |
| Full | New projects, large modules (~10% of requests) | Complete role chain, parallel where file ownership allows |

A router decides the mode. This keeps small work fast and large work structured.

---

## 6. Payment Model

**Prepaid wallet with client-selected hourly rates.**

The client tops up a balance. Work is billed hourly. The client chooses the rate within a per-role band, and sees live availability at that rate.

| Role | Min | Max |
|---|---|---|
| AI agent | $1 | $5 |
| Junior developer | $6 | $25 |
| Mid developer | $12 | $45 |
| Senior developer | $25 | $90 |
| Designer | $10 | $60 |
| QA | $8 | $30 |
| Project Manager | $12 | $50 |

### Rules that make this work

- **Rate slider shows live supply:** "14 developers available at this rate, average wait 2 days." Lowering the rate updates it. The client converges on a fair rate without negotiation.
- **Rate and estimated hours are both locked** before a task starts. If the developer exceeds the estimate, that is their loss — otherwise a low rate is meaningless because hours will simply inflate.
- **Every task shows a running total estimate,** not just an hourly rate: "$8/hr × ~50 hrs = ~$400 total. Your balance is $500."
- **Funds are held, not spent.** Money releases only after verified delivery. If the client does not approve, the money is still theirs.
- **Low-balance alert at 20%,** with optional auto top-up, so work never silently stops.
- **The $100 tier is AI-only.** $100 at human rates is four hours — not enough to matter, and it produces refunds and bad reviews. AI hours are cheap enough for $100 to mean something.

---

## 7. Feature List

### Client-facing

- AI-guided requirement conversation
- Call scheduling with pre-filled agenda; AI-hosted by default, human optional
- Auto-generated project plan: scope, budget, team, timeline, AI/human split
- Task-level estimate approval (timer starts only after approval)
- Live progress with proof: preview link, commits, 60-second screen recording
- Plain-language verification checklist so non-technical clients can confirm work themselves
- Wallet: top-up, hold/release, burn rate, auto top-up
- Optional human hire, per role, mid-project
- Existing project upload → AI code analysis report
- Persistent project workspace after delivery: maintenance, new modules, add-on services
- Messages: client, AI roles and any hired humans in one thread, with AI summaries and message-to-task conversion

### Internal / admin

- Request queue and review status
- Developer availability and allocation
- Payment and hold status
- AI-generated risk alerts
- Per-task trace: which role, what input, what output, cost, pass/fail
- Revenue and margin per project

---

## 8. Non-Negotiable Requirements

These are not features. Without them the product fails regardless of how good the UI is.

**Verification gates.** A task cannot be marked done by an AI claiming it is done. Done requires: build pass, type check pass, tests pass, and a Playwright script that actually uses the feature end-to-end. The verification runner sets the status, never the agent.

**Requirement confirmation before build.** The spec goes to the client in plain language before any code is written. This single step removes roughly 40% of downstream error, because step-one mistakes are the most expensive ones.

**Mandatory open-questions field.** The Requirement Manager must emit `open_questions[]`. An empty array is not permitted at low confidence. This forces the AI to ask instead of guessing.

**Tester isolation.** Acceptance criteria only, no code access, different model. A tester that reads the code inherits the developer's assumptions and stops finding bugs.

**Invisible human gate.** Before any delivery reaches the client, one person opens the preview and confirms it works — 15 minutes, roughly 30 deliveries per person per day. The client never sees this step. It is the only thing that reliably catches an AI confidently reporting success on broken code.

**Cost cap and circuit breaker.** Max tokens per task, maximum 2 retries, halt and alert on the third. Pipeline pauses if cost exceeds 3x estimate. Without this, one overnight loop can consume a month of margin.

**Client owns the code from day one,** in their own GitHub organisation. This removes the IP question and the lock-in fear, which is the single largest trust objection from anyone previously burned on a marketplace.

**Trace ID on every task.** When a client reports a break, the trace shows which role produced it. Without this, debugging 50 concurrent projects is guesswork.

**Scope boundaries.** AI-only delivery is offered for: CRUD apps, dashboards, admin panels, internal tools, landing pages, booking systems, integrations with documented APIs, and reproducible bug fixes. Human review is **mandatory, not optional**, for: payment-critical logic, healthcare or finance compliance, complex realtime, and high-traffic scale work.

---

## 9. Technical Stack

| Layer | Choice | Notes |
|---|---|---|
| Coding agent | Claude Agent SDK (headless) for developer roles | Per-role system prompts and tool restrictions |
| Second model | OpenAI Agents SDK for Tester and Reviewer | Different model = different blind spots |
| Sandbox | E2B initially | Move to self-hosted Firecracker at scale |
| Orchestration | BullMQ + Redis initially | Temporal once roles run in parallel |
| Verification | Playwright, Vitest, `tsc --noEmit`, Semgrep, license scanner | License scanning is a real legal risk — agents pull in copyleft code |
| Git | GitHub App | Repos created in the client's org |
| Deploy | Vercel / Fly.io API | Automated preview per delivery |
| Product stack | Next.js + Supabase + Vercel for every client project | Stack uniformity is the largest cost lever — a reviewer can assess a familiar stack in 4 hours instead of 12 |
| Observability | Langfuse for token/trace cost, Sentry for runtime | Cost must be measured per project, not per token |

**Minimum viable stack:** Claude Agent SDK + E2B + BullMQ + Playwright + GitHub App + Vercel + Langfuse. Everything else comes after 10 delivered projects.

Verify current model names, pricing and SDK details at `docs.claude.com/en/api/overview` — this area changes frequently.

---

## 10. Unit Economics

Illustrative $500 project, AI-heavy:

| Line | Amount |
|---|---|
| Client pays | $500 |
| AI tokens (60 hrs × $3) | $180 billed, ~$25 actual cost |
| Human review gate (15 min) | ~$8 |
| Infrastructure and ops | ~$30 |
| **Gross margin** | **~$430 (86%)** |

The build is not the business. The same client on a $199/month maintenance retainer produces **$3,580 over 18 months** — more than seven times the initial project. Build pricing should be treated as customer acquisition; recurring workspace revenue is the actual business.

Target: 100 active workspaces × $199/month = **$19,900/month recurring** without acquiring new clients.

**Watch item:** an 8-role chain multiplies token cost. A task that costs $8 through one agent can cost $60–80 through the full chain, plus retries. Margin drops from 86% to ~70%, and below 50% if retry loops are uncapped. Cost caps are a margin control, not a nice-to-have.

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| AI reports success on broken code | Critical | Verification gates + invisible human gate + adversarial tester on a different model |
| Error compounds across the role chain | Critical | Requirement lock with client, schema handoffs, per-role output gates |
| One bad delivery destroys early reputation | High | Hold-then-release payment, smallest-deliverable-first, preview link every time |
| Non-technical client cannot verify work | High | Plain-language checklist with checkboxes, plus 60-second screen recording |
| Token cost spiral from retry loops | High | Hard token cap, max 2 retries, 3x cost circuit breaker |
| Debugging across 8 roles at 50 projects | High | Trace ID per task, admin trace viewer |
| No moat — anyone can copy this | Medium | Delivery pipeline and failure library (built over ~6 months, not copyable), workspace convenience lock-in, single-vertical depth |
| API price or model behaviour changes | Medium | Two-provider abstraction, cost measured per project, template and context caching |
| Stuck in low-value small projects | Medium | Price ladder $200 → $600 → $2,000 → $199/mo retainer, retainer opt-in on by default |
| Support volume from low tiers | Medium | AI-only support below $500, human support above; most tickets are verification failures in disguise |
| Scope creep via "small changes" | Medium | Estimate lock per task; change requests become new tasks with new estimates, agents cannot say yes |
| "AI did it" becomes a refund excuse | Medium | Sell the outcome, not the method. Refund policy written against the checklist, not against vague satisfaction |
| AI-generated code licence contamination | Medium | Automated licence scanning in the verification gate |

---

## 12. Competitive Position

| Competitor | Overlap | Gap they leave |
|---|---|---|
| Devin / Cognition | AI engineer executing full tasks | Sells to developers, not non-technical clients. No wallet, no human option, no client-facing PM |
| Lovable / Bolt / Replit Agent | Non-technical prompt-to-app | No human backup. Stuck means stuck — this is the wedge |
| Upwork / Toptal | Human talent supply | Client must choose and manage. That is the burden being removed |
| Managed dev shops | Same "we handle it" positioning | All human, expensive, not AI-first |
| **Gigster (2015–2020)** | Nearly identical model, $30M+ raised, failed to scale | Died on quality control and margins. AI improves the economics but the failure modes are the same. Worth studying |

**Uncontested pieces:** prepaid wallet with client-chosen rates, human as an optional in-team upsell, existing-broken-project analysis and repair, and client-visible AI role structure.

**Timing pressure:** the wedge is closing from four directions. Lovable and Replit are adding paid support tiers; agent tools are adding non-technical interfaces; marketplaces are adding AI. Building the full platform takes ~8 months, by which time the support gap may be filled. This argues for entering through one wedge rather than launching the full platform.

---

## 13. Build Order

### Phase 0 — Validate before building (1–2 weeks)

No platform. A single landing page:

> **"Built an app with AI and got stuck? Fixed in 48 hours."**
> Send your repo. We review it. Fixed quote. Delivered.

Manual delivery — repo by email, quote by WhatsApp, payment by Razorpay. Find 20 stuck users in the Lovable, Bolt and Cursor communities where they already post their problems daily.

**Measure:** how many pay, average hours per fix, how many return, and what they actually ask for.

**Gate:** 10 of 20 paying and 5 returning → build the platform, informed by real data. 2 of 20 → the model needs to change, and eight months were saved.

**Run in parallel:** build 5 small projects with AI only and count how many ship without manual intervention. If 4 of 5 ship clean, AI-only delivery is viable. If 2 of 5, a permanent human layer is required and the economics change. This one week produces the most important data point in the entire business.

### Phase 1 — Minimum platform (4–6 weeks)

Single full-stack agent. Verification gates. Wallet with hold/release. Invisible human gate. Existing-project upload and analysis. Client dashboard with preview links and checklist.

**No role chain yet.**

### Phase 2 — After 10 delivered projects

Add roles where the single agent measurably and repeatedly failed. Requirement Manager and Reviewer are the likely first two. A role is added when a specific failure justifies it, never pre-emptively — otherwise there are eight components to debug with no evidence about which were needed.

### Phase 3 — After 30 delivered projects

Full role chain, parallel execution with file ownership, mature failure library, retainers and workspace services, multi-model abstraction, tiered support.

---

## 14. Open Questions

1. Does AI-only output actually reach client-shippable quality? **Unanswered. Phase 0 answers it. Everything depends on this.**
2. Will clients accept prepaid hourly instead of fixed price, or does the uncertainty block conversion?
3. Is the human upsell taken often enough to matter, or does everyone stay on AI-only?
4. Which single vertical should be chosen for depth? "Software for everyone" has no moat; "booking systems for dental clinics" does.
5. What is the real refund rate at the $100–$500 tier?
6. What is actual blended cost per project once retries are included?

---

## 15. What Must Not Be Built First

Full role chain · rate sliders · services marketplace · admin analytics · credits system · light/dark theming · mobile app · white-label

None of these answer question 1 above. Startups do not fail from missing features; they fail from spending eight months on the wrong thing. Design after 20 paying clients, not before.
