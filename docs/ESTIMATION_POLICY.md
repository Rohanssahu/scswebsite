# Commercial estimation policy

One file decides every client-facing number on this site:

```
src/policy/estimationPolicy.ts                  <- canonical
supabase/functions/_shared/estimationPolicy.ts  <- mirror (Deno Edge Functions)
agent/src/estimationPolicy.ts                   <- mirror (Node agent worker)
```

The three runtimes cannot share an npm package, so the file is mirrored
**byte-for-byte** and `src/policy/policyMirrors.test.ts` fails the suite if they
diverge. It has no imports and uses no runtime-specific API, which is what makes
that safe. **Never edit a mirror** — edit the canonical file, re-copy, run the
tests.

## The constants

| Constant | Value |
| --- | --- |
| `STANDARD_HOURLY_RATE_USD` | 5 |
| `WEEKLY_CAPACITY_HOURS` | 40 |
| `WEEKLY_COST_USD` | 200 |
| `MONTHLY_COST_MIN_USD` / `MONTHLY_COST_MAX_USD` | 800 / 1000 |
| `OPTIONAL_UPGRADE_MIN_PERCENT` / `MAX_PERCENT` | 20 / 30 |
| `PRELIMINARY_COVERAGE_MIN_PERCENT` / `MAX_PERCENT` | 70 / 80 |

There is deliberately **no environment variable** for any of them. A rate is a
business decision that belongs in version control next to the tests that hold it,
not in a deploy config where it can drift per environment.

## The formulas

```
availableHours   = floor(clientBudgetUsd / 5)
hoursFor(item)   = SCOPE_COMPLEXITY_HOURS[item.complexity]   // simple 6 / standard 16 / complex 40
costForHours(h)  = h * 5
weeksForHours(h) = h <= 0 ? 0 : max(1, ceil(h / 40))
hourCeiling(b,p) = floor(floor(b * (100 + p) / 100) / 5)      // p = 0 | 20 | 30
budgetFitPercent = round(baseHours / totalRequestedHours * 100)
```

Scope is fitted by walking the tier-prioritised list (`essential` →
`important` → `optional`) once, taking each item that still fits under the
ceiling. `unclear` items are listed and never costed.

## What the model may and may not do

Gemini **classifies**: which requirements exist, which delivery tier each
belongs to, how complex each one is, which roles the project needs, and the
narrative prose. It never produces an hour, a rate, a price, a duration or a
percentage — the analyze schema has no numeric field except an advisory health
score, so there is nothing for it to inflate. Application code does all the
arithmetic and generates the client-facing sentences.

## Where it is enforced

| Layer | Enforcement |
| --- | --- |
| `supabase/functions/ai-estimate` | Gemini classifies; the policy computes. Rate/capacity are set, not read from the response. |
| `src/data/basicEstimate.ts` | The labelled non-AI fallback uses the same policy. `source: 'basic'`, never `'ai'`. |
| `agent/src/estimate.ts` | Voice + consultation estimates. Role hours are distributed from the plan total so the table sums to the quote. |
| `supabase/functions/submit-lead` / `voice-lead` / `consultation-agent` | Re-derive the plan from the payload: rate pinned, tier costs recomputed from hours, base ≤ budget, tiers ≤ +20% / +30%. A plan that fails is dropped, not stored. |
| Browser | `isValidBudgetPlan` / `parseBudgetPlanView` re-check the same guarantees before rendering. |

## Honesty rules that are code, not prose

- No client-facing calculation may use a rate above `$5/hour`.
- The budget-fit option can never cost more than the client's own budget.
- Deferred scope is always returned alongside included scope.
- The literal "70–80%" sentence is emitted only when
  `mayUseSeventyToEightyWording` is true — i.e. the calculation genuinely lands
  in that band.
- An optional tier is offered only when it adds requirements **and** either
  builds on a base that already covers the core launch scope or itself reaches
  it. A bigger number on a still-unusable release is not an upgrade.
- Every plan carries `humanReviewRequired: true`.
- On a Gemini failure the flow shows "AI analysis is temporarily unavailable"
  and an explicitly labelled basic estimate. It never presents local output as
  an AI analysis.

## Changing a rate

1. Edit `src/policy/estimationPolicy.ts` and bump `ESTIMATION_POLICY_VERSION`.
2. `cp src/policy/estimationPolicy.ts supabase/functions/_shared/estimationPolicy.ts`
3. `cp src/policy/estimationPolicy.ts agent/src/estimationPolicy.ts`
4. Update `agent/knowledge/scs-knowledge.json` (its figures are pinned with
   `z.literal`, so the worker refuses to start if they disagree).
5. `npm test` — the mirror, policy, cross-flow and knowledge tests all guard it.

Stored historical estimates are **never** recalculated. Each one carries the
`estimate_version` it was computed under; a new policy version only affects new
estimates.
