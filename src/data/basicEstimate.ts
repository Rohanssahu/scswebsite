// =============================================================================
// Basic (non-AI) estimate engine.
//
// This is the EXPLICITLY LABELLED fallback described in the estimation policy:
// when the Gemini analysis is unavailable, the visitor still gets a usable,
// honest figure — but it is never presented as AI-generated. Callers set
// `source: 'basic'` and the UI says so.
//
// It uses the SAME shared commercial policy as the server path
// (src/policy/estimationPolicy.ts), so the rate, the capacity, the budget-fit
// arithmetic and the three budget options are identical. The only difference is
// who classified the scope: here it is a small deterministic keyword mapping
// instead of Gemini.
// =============================================================================

import {
  buildBudgetPlan,
  buildEstimateSnapshot,
  describeBudgetPlan,
  distributeHoursAcrossRoles,
  parseSelectedBudgetUsd,
  STANDARD_HOURLY_RATE_USD,
  totalCostOfRoles,
  totalHoursOfRoles,
  WEEKLY_CAPACITY_HOURS,
  weeksForHours,
  type RoleAllocation,
  type ScopeComplexity,
  type ScopeItemInput,
  type ScopeTier,
} from '@/policy/estimationPolicy';
import { AnalysisResult, AnswerMap, DetectedIssue, ProjectMode, RoleEstimate } from '@/types/projectAnalysis';

export { WEEKLY_CAPACITY_HOURS };

export const BASIC_ESTIMATE_DISCLAIMER =
  'Preliminary estimate — subject to human technical review. Final scope, cost and timeline are confirmed after a review call with SCS Softwares.';

/** Shown instead of an AI badge whenever the Gemini analysis did not run. */
export const AI_UNAVAILABLE_NOTICE =
  'AI analysis is temporarily unavailable, so this is a basic estimate calculated from your answers — not an AI-generated analysis.';

// --- report helpers (used by every surface that renders a role table) --------

export function totalHours(team: readonly RoleEstimate[]): number {
  return totalHoursOfRoles(team as readonly RoleAllocation[]);
}

export function totalCost(team: readonly RoleEstimate[]): number {
  return totalCostOfRoles(team as readonly RoleAllocation[]);
}

export function estimatedWeeks(team: readonly RoleEstimate[], weeklyCapacity = WEEKLY_CAPACITY_HOURS): number {
  const hours = totalHours(team);
  return weeklyCapacity === WEEKLY_CAPACITY_HOURS
    ? weeksForHours(hours)
    : Math.max(hours > 0 ? 1 : 0, Math.ceil(hours / Math.max(1, weeklyCapacity)));
}

// --- deterministic scope classification --------------------------------------

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

const COMPLEX_HINTS = /payment|checkout|billing|subscription|mobile|app store|play store|analytics|dashboard|api|integration|chat|messaging|ai|machine learning|marketplace|booking/i;
const STANDARD_HINTS = /admin|notification|search|filter|upload|profile|report|auth|login|account|map|location|deploy|go live|redesign|performance|security/i;

function complexityFor(label: string): ScopeComplexity {
  if (COMPLEX_HINTS.test(label)) return 'complex';
  if (STANDARD_HINTS.test(label)) return 'standard';
  return 'simple';
}

/** Requested items that are enhancements rather than launch-critical work. */
const OPTIONAL_HINTS = /mobile app version|publish on app store|play store|redesign|new ui|performance improvements|reports \/ analytics|analytics dashboard/i;

const NOISE = /^(none of these|no new features|not sure)/i;

function scopeItem(label: string, tier: ScopeTier): ScopeItemInput {
  return { label, tier, complexity: complexityFor(label) };
}

/**
 * Turn questionnaire answers into tiered scope items. Explicitly requested
 * modules and anything needed to actually ship are essential; requested
 * features are important; enhancements are optional. Nothing is invented.
 */
export function classifyAnswers(mode: ProjectMode, answers: AnswerMap): ScopeItemInput[] {
  const items: ScopeItemInput[] = [];
  const push = (label: string, tier: ScopeTier) => {
    const clean = label.trim();
    if (!clean || NOISE.test(clean)) return;
    if (items.some((i) => i.label.toLowerCase() === clean.toLowerCase())) return;
    items.push(scopeItem(clean, tier));
  };

  if (mode === 'new') {
    push('Core application build', 'essential');
    for (const module of asArray(answers.modules)) push(module, 'essential');
    for (const feature of asArray(answers.features)) {
      push(feature, OPTIONAL_HINTS.test(feature) ? 'optional' : 'important');
    }
    const platform = asText(answers.platform);
    if (/mobile/i.test(platform)) push('Mobile app build', platform === 'Mobile only' ? 'essential' : 'optional');
    push('Production deployment & go-live', 'essential');
  } else {
    if (asText(answers.broken).trim()) push('Fix reported broken functionality', 'essential');
    push('Code audit & stabilisation', 'essential');
    for (const feature of asArray(answers.newFeatures)) {
      if (/security|bug fix|deployment|go live/i.test(feature)) push(feature, 'essential');
      else if (OPTIONAL_HINTS.test(feature)) push(feature, 'optional');
      else push(feature, 'important');
    }
    push('Regression testing & handover', 'essential');
  }

  return items;
}

function rolesFor(mode: ProjectMode, answers: AnswerMap): string[] {
  const roles = ['Requirement Analyst', 'UI/UX Designer', 'Frontend Developer', 'Backend Developer', 'QA Tester'];
  if (/mobile/i.test(asText(answers.platform) + asText(answers.projectType))) roles.push('Mobile Developer');
  if (mode === 'existing') roles.push('Code Auditor / Tech Lead');
  return roles;
}

// --- narrative ---------------------------------------------------------------

function buildHealthScore(mode: ProjectMode, answers: AnswerMap): number {
  if (mode === 'new') {
    let score = 62;
    if (asText(answers.idea).length > 40) score += 10;
    if (asText(answers.audience).length > 5) score += 8;
    if (asArray(answers.features).length >= 3) score += 8;
    if (asText(answers.timeline)) score += 4;
    return Math.min(score, 94);
  }
  let score = 78;
  score -= Math.min(24, Math.ceil(asText(answers.broken).length / 20));
  if (asText(answers.working).length > 30) score += 6;
  if (asArray(answers.newFeatures).some((f) => f.startsWith('No new features'))) score += 4;
  return Math.max(34, Math.min(score, 90));
}

function buildIssues(mode: ProjectMode, answers: AnswerMap, deferredCount: number): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  if (deferredCount > 0) {
    issues.push({
      title: 'Part of the requested scope is deferred',
      severity: 'medium',
      summary: `${deferredCount} requirement${deferredCount === 1 ? '' : 's'} fall outside the selected budget.`,
      detail:
        'The deferred items are listed in full alongside the estimate. They can be scheduled after launch, or included in the first release with a revised budget.',
    });
  }
  if (mode === 'new') {
    issues.push({
      title: 'Scope not yet locked',
      severity: 'medium',
      summary: 'The feature list is still broad for a first release.',
      detail:
        'We recommend confirming the smallest production-usable release first, then iterating. This shortens time-to-launch and keeps the first invoice predictable.',
    });
    if (!asText(answers.budget) || asText(answers.budget) === 'Not sure yet') {
      issues.push({
        title: 'Budget range undefined',
        severity: 'low',
        summary: 'No budget range was provided.',
        detail:
          'A budget lets us build the strongest production-usable scope inside it. Without one, this estimate prices the full scope you described.',
      });
    }
    if (asArray(answers.modules).includes('Online payments')) {
      issues.push({
        title: 'Payment compliance requirements',
        severity: 'medium',
        summary: 'Payments require gateway setup and compliance checks.',
        detail:
          'A payment gateway adds KYC, webhook and refund-flow work. Those hours are part of the payments scope item, not an extra charge later.',
      });
    }
    return issues;
  }
  issues.push({
    title: 'Reported broken functionality',
    severity: 'high',
    summary: asText(answers.broken) ? asText(answers.broken).slice(0, 90) : 'Parts of the project are incomplete.',
    detail:
      'The first phase reproduces and fixes the reported failures, with regression tests so they stay fixed.',
  });
  issues.push({
    title: 'Unknown code health',
    severity: 'medium',
    summary: 'The codebase has not been audited yet.',
    detail:
      'A short code audit (included in the essential scope) checks dependency versions, security basics and architecture before new features are added.',
  });
  if (asArray(answers.technologies).includes('Not sure')) {
    issues.push({
      title: 'Technology stack unconfirmed',
      severity: 'low',
      summary: 'The current stack could not be identified from your answers.',
      detail: 'Sharing repository access or a live URL during the review call lets us confirm the stack and refine the estimate.',
    });
  }
  return issues;
}

const SCS_BENEFITS = [
  `Transparent hourly pricing at up to $${STANDARD_HOURLY_RATE_USD} per hour — you approve every hour before work starts`,
  'Dedicated project manager and weekly demo calls',
  'NDA and full source-code ownership from day one',
  'Post-launch support window included in every engagement',
];

// --- the engine --------------------------------------------------------------

/**
 * Build a complete, budget-aware basic estimate. Callers MUST label the result
 * as a basic (non-AI) estimate — `source` is set to 'basic' here so it cannot
 * be mistaken for Gemini output.
 */
export function buildBasicEstimate(mode: ProjectMode, answers: AnswerMap, revision = 1): AnalysisResult {
  const scopeItems = classifyAnswers(mode, answers);
  const plan = buildBudgetPlan({
    selectedBudgetUsd: parseSelectedBudgetUsd(answers.budget),
    scopeItems,
    revision,
  });
  const team = distributeHoursAcrossRoles(rolesFor(mode, answers), plan.base.hours);
  const healthScore = buildHealthScore(mode, answers);
  const narrative = describeBudgetPlan(plan);

  const requirementSummary =
    mode === 'new'
      ? [
          `Goal: ${asText(answers.idea) || 'New software product (details to be refined)'}`,
          `Audience: ${asText(answers.audience) || 'To be defined'}`,
          `Platform: ${asText(answers.platform) || 'Web only'}`,
          `Key features: ${asArray(answers.features).join(', ') || 'To be defined on the review call'}`,
          `Modules: ${asArray(answers.modules).join(', ') || 'None specified'}`,
          `Timeline preference: ${asText(answers.timeline) || 'Flexible'}`,
        ]
      : [
          `Project type: ${asText(answers.projectType) || 'Web application'}`,
          `Stack: ${asArray(answers.technologies).join(', ') || 'To be confirmed'}`,
          `Requested additions: ${asArray(answers.newFeatures).join(', ') || 'Fixes only'}`,
          `Reference: ${asText(answers.projectLink) || 'No URL/repository provided'}`,
          `Urgency: ${asText(answers.urgency) || 'Normal'}`,
        ];

  const currentlyWorking =
    mode === 'existing'
      ? asText(answers.working)
        ? asText(answers.working)
            .split(/[,.\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 5)
        : ['To be confirmed during the code audit']
      : ['New build — nothing exists yet; this section tracks progress once development starts'];

  const weeks = plan.base.weeks;
  const milestones =
    mode === 'new'
      ? [
          { title: 'Discovery & UI design', week: 'Week 1', deliverables: ['Final requirement document', 'Wireframes & UI screens'] },
          {
            title: 'Core development',
            week: weeks > 2 ? `Weeks 2–${weeks}` : 'Week 2',
            deliverables: ['Included scope built', 'Weekly demo builds', 'Internal QA'],
          },
          { title: 'Testing & launch', week: `Week ${Math.max(weeks, 1) + 1}`, deliverables: ['Bug fixing & polish', 'Deployment & handover'] },
        ]
      : [
          { title: 'Audit & stabilise', week: 'Week 1', deliverables: ['Code audit report', 'Critical bug fixes'] },
          {
            title: 'Fixes & included features',
            week: weeks > 2 ? `Weeks 2–${weeks}` : 'Week 2',
            deliverables: ['Remaining fixes', 'Included scope', 'Regression testing'],
          },
          { title: 'Hardening & handover', week: `Week ${Math.max(weeks, 1) + 1}`, deliverables: ['Performance pass', 'Documentation & handover'] },
        ];

  return {
    mode,
    healthScore,
    riskLevel: healthScore >= 70 ? 'Low' : healthScore >= 50 ? 'Medium' : 'High',
    requirementSummary,
    currentlyWorking,
    problemsDetected: buildIssues(mode, answers, plan.base.deferredScope.length),
    missingFeatures: plan.scope.map((i) => i.label),
    recommendedSolution:
      mode === 'new'
        ? [
            'Start with the smallest production-usable release inside your budget',
            `Build for ${asText(answers.platform) || 'web'} first with a scalable architecture`,
            'Weekly demo builds so you see progress every week',
            'Launch, measure real usage, then schedule the deferred scope',
          ]
        : [
            'Begin with a short code audit to confirm the stack and risks',
            'Fix critical broken flows before adding anything new',
            'Add the included features behind a regression-test safety net',
            'Finish with a performance and security hardening pass',
          ],
    team,
    weeklyCapacityHours: WEEKLY_CAPACITY_HOURS,
    hourlyRateUsd: STANDARD_HOURLY_RATE_USD,
    assumptions: plan.assumptions,
    milestones,
    benefits: SCS_BENEFITS,
    nextSteps: [
      'Request a human review of this preliminary estimate',
      'Share any documents, designs or repository access you have',
      'Receive a confirmed quote and sprint plan after the review call',
    ],
    budgetPlan: plan,
    planNarrative: narrative.lines,
    estimateSnapshot: buildEstimateSnapshot(plan, { provider: 'basic-engine', model: null }),
    generatedAt: new Date().toISOString(),
    source: 'basic',
  };
}

/** Fallback result shown when the result page is opened without a submission. */
export function sampleAnalysis(): AnalysisResult {
  return buildBasicEstimate('new', {
    idea: 'A tutor marketplace where students can discover and book local tutors online',
    audience: 'Students and independent tutors',
    features: ['User profiles', 'Search & filters', 'Booking / scheduling'],
    platform: 'Web only',
    modules: ['User login / accounts', 'Online payments'],
    timeline: '1–3 months',
    budget: '$1,000 – $5,000',
  });
}
