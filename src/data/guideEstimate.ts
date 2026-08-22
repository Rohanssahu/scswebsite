// =============================================================================
// Buddy (floating chat) estimate.
//
// Buddy's chat no longer computes anything of its own. It asks the SAME server
// path the Project Analysis flow uses — the `ai-estimate` Edge Function, where
// Gemini classifies the scope and the shared estimation policy computes every
// figure — and only decorates the result with the guide-specific extras the
// chat panel renders (recommended service, suggested stack, pros/cons/risks).
//
// When the provider is unavailable, `resolveGuideEstimate` falls back to the
// explicitly labelled basic engine and says so. It never presents a local
// calculation as an AI analysis.
//
// Human-readable guide copy is emitted as i18n keys so the panel re-renders on
// a language change. The commercial wording (the budget narrative) comes from
// the policy and is English for now, by design.
// =============================================================================

import { AI_UNAVAILABLE_NOTICE, buildBasicEstimate } from '@/data/basicEstimate';
import {
  describeBudgetPlan,
  totalCostOfRoles,
  totalHoursOfRoles,
  WEEKLY_CAPACITY_HOURS,
} from '@/policy/estimationPolicy';
import { generateAiAnalysis, isAiAnalysisReady } from '@/services/aiAnalysis';
import { AnalysisResult, AnswerMap, ProjectMode } from '@/types/projectAnalysis';
import { GuideEstimate, LocalizedText } from '@/types/virtualGuide';

/** Weekly capacity Buddy quotes. Always the policy's standard capacity. */
export const GUIDE_WEEKLY_CAPACITY_HOURS = WEEKLY_CAPACITY_HOURS;

/** i18n key of the estimate disclaimer shown with every result. */
export const ESTIMATE_DISCLAIMER_KEY = 'guide.estimate.disclaimer';

/** Progress labels (i18n keys) shown while the analysis runs. */
export const ANALYSIS_STEP_KEYS = [
  'guide.analysis.steps.understanding',
  'guide.analysis.steps.services',
  'guide.analysis.steps.skills',
  'guide.analysis.steps.hours',
  'guide.analysis.steps.budget',
  'guide.analysis.steps.recommendations',
];

function asText(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function deriveService(mode: ProjectMode, answers: AnswerMap): { service: string; tech: string[] } {
  if (mode === 'existing') {
    const stack = asArray(answers.technologies).filter((t) => t !== 'Not sure');
    return {
      service: 'Project Rescue & Completion',
      tech: stack.length ? stack : ['Confirmed during the code audit'],
    };
  }
  const platform = asText(answers.platform);
  if (platform === 'Mobile only') {
    return { service: 'Mobile App Development', tech: ['React Native', 'Node.js API', 'PostgreSQL'] };
  }
  if (platform === 'Web + Mobile') {
    return { service: 'Web + Mobile Product Development', tech: ['React', 'React Native', 'Node.js', 'PostgreSQL'] };
  }
  return { service: 'Web Development', tech: ['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'] };
}

function derivePros(mode: ProjectMode): string[] {
  const shared = ['guide.estimate.prosList.hourly', 'guide.estimate.prosList.ownership', 'guide.estimate.prosList.one-team'];
  return mode === 'new' ? [...shared, 'guide.estimate.prosList.mvp'] : [...shared, 'guide.estimate.prosList.audit'];
}

function deriveCons(mode: ProjectMode, answers: AnswerMap): string[] {
  const cons = ['guide.estimate.consList.third-party', 'guide.estimate.consList.final-quote'];
  if (mode === 'new' && asText(answers.platform).includes('Mobile')) cons.push('guide.estimate.consList.app-store');
  if (mode === 'existing') cons.push('guide.estimate.consList.unknown-code');
  return cons;
}

function deriveRisks(mode: ProjectMode, answers: AnswerMap, result: AnalysisResult): string[] {
  const risks: string[] = [];
  if (!result.budgetPlan.budgetProvided) risks.push('guide.estimate.risksList.budget');
  const timeline = asText(answers.timeline) + asText(answers.urgency);
  if (/ASAP|Critical/i.test(timeline)) risks.push('guide.estimate.risksList.timeline');
  if (asArray(answers.modules).includes('Online payments') || asArray(answers.newFeatures).includes('Payments')) {
    risks.push('guide.estimate.risksList.payments');
  }
  if (mode === 'existing' && asArray(answers.technologies).includes('Not sure')) {
    risks.push('guide.estimate.risksList.stack');
  }
  if (risks.length === 0) risks.push('guide.estimate.risksList.low');
  return risks;
}

/** Language-aware requirement summary: label keys + the visitor's own answers. */
function buildSummaryItems(mode: ProjectMode, answers: AnswerMap): LocalizedText[] {
  const item = (key: string, value: string): LocalizedText => ({
    key: `guide.estimate.summaryItems.${key}`,
    params: { value },
  });
  if (mode === 'new') {
    return [
      item('goal', asText(answers.idea) || '—'),
      item('audience', asText(answers.audience) || '—'),
      item('platform', asText(answers.platform) || 'Web only'),
      item('features', asArray(answers.features).join(', ') || '—'),
      item('modules', asArray(answers.modules).join(', ') || '—'),
      item('timeline', asText(answers.timeline) || '—'),
    ];
  }
  return [
    item('projectType', asText(answers.projectType) || 'Web application'),
    item('stack', asArray(answers.technologies).join(', ') || '—'),
    item('additions', asArray(answers.newFeatures).join(', ') || '—'),
    item('reference', asText(answers.projectLink) || '—'),
    item('urgency', asText(answers.urgency) || '—'),
  ];
}

/**
 * Decorate a server (or basic) analysis with the guide-specific extras. Totals
 * are read straight off the validated result — this function performs no
 * pricing arithmetic of its own.
 */
export function decorateGuideEstimate(base: AnalysisResult, mode: ProjectMode, answers: AnswerMap): GuideEstimate {
  const { service, tech } = deriveService(mode, answers);
  const plan = base.budgetPlan;
  const urgency = asText(answers.urgency) + asText(answers.timeline);

  return {
    ...base,
    recommendedService: service,
    suggestedTech: tech,
    pros: derivePros(mode),
    cons: deriveCons(mode, answers),
    risks: deriveRisks(mode, answers, base),
    summaryItems: buildSummaryItems(mode, answers),
    // The honest "smaller first release" comparison: what the budget-fit plan
    // costs against the full requested scope. No invented discount.
    cheaperAlternative: {
      key: 'guide.estimate.cheaper',
      params: { mvpCost: plan.base.costUsd, cost: plan.totalRequestedCostUsd },
    },
    // Deferred scope as a phase two — never a higher weekly capacity, which
    // would contradict the standard 40-hour delivery week.
    phasedAlternative: {
      key: plan.base.deferredScope.length > 0 ? 'guide.estimate.phased' : 'guide.estimate.phasedNone',
      params: {
        count: plan.base.deferredScope.length,
        items: plan.base.deferredScope
          .slice(0, 4)
          .map((i) => i.label)
          .join(', '),
      },
    },
    budgetLines: base.planNarrative,
    recommendedNextStep: {
      key: /ASAP|Critical/i.test(urgency) ? 'guide.estimate.nextUrgent' : 'guide.estimate.nextNormal',
    },
    totalHours: totalHoursOfRoles(base.team),
    totalCost: totalCostOfRoles(base.team),
    estimatedWeeks: plan.base.weeks,
  };
}

export interface ResolvedGuideEstimate {
  estimate: GuideEstimate;
  /** Set when Gemini could not be reached — surfaced to the visitor verbatim. */
  unavailableNotice: string | null;
}

/**
 * Produce Buddy's estimate. Gemini first (server-side), the labelled basic
 * engine second. The caller must show `unavailableNotice` when it is set.
 */
export async function resolveGuideEstimate(
  mode: ProjectMode,
  answers: AnswerMap,
  revision = 1,
): Promise<ResolvedGuideEstimate> {
  if (isAiAnalysisReady) {
    try {
      const ai = await generateAiAnalysis(mode, answers, [], revision);
      return { estimate: decorateGuideEstimate(ai, mode, answers), unavailableNotice: null };
    } catch {
      // Fall through to the labelled basic engine below.
    }
  }
  const basic = buildBasicEstimate(mode, answers, revision);
  return {
    estimate: decorateGuideEstimate({ ...basic, aiUnavailable: isAiAnalysisReady }, mode, answers),
    unavailableNotice: isAiAnalysisReady ? AI_UNAVAILABLE_NOTICE : null,
  };
}
