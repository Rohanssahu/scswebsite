// Deterministic demo estimate engine for Buddy — Your SCS Guide.
// Builds on the existing demoAnalysis rules and adds guide-specific extras:
// recommended service, suggested tech, pros/cons/risks and alternatives.
// All human-readable content is emitted as i18n keys (with params), so the
// estimate re-renders correctly whenever the visitor changes language.
// Dummy data only — no real code analysis happens anywhere in this module.

import {
  buildDemoAnalysis,
  estimatedWeeks,
  totalCost,
  totalHours,
  WEEKLY_CAPACITY_HOURS,
} from '@/data/demoAnalysis';
import { AnswerMap, ProjectMode } from '@/types/projectAnalysis';
import { GuideEstimate, LocalizedText } from '@/types/virtualGuide';

/** Configurable weekly team capacity (working hours per week). */
export const GUIDE_WEEKLY_CAPACITY_HOURS = WEEKLY_CAPACITY_HOURS;

/** Capacity used for the "faster alternative" comparison. */
const BOOSTED_WEEKLY_CAPACITY_HOURS = 60;

/** i18n key of the estimate disclaimer shown with every result. */
export const ESTIMATE_DISCLAIMER_KEY = 'guide.estimate.disclaimer';

/** Simulated progress labels (i18n keys) shown before the result. */
export const DEMO_ANALYSIS_STEP_KEYS = [
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
    return {
      service: 'Web + Mobile Product Development',
      tech: ['React', 'React Native', 'Node.js', 'PostgreSQL'],
    };
  }
  return { service: 'Web Development', tech: ['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'] };
}

function derivePros(mode: ProjectMode): string[] {
  const shared = ['guide.estimate.prosList.hourly', 'guide.estimate.prosList.ownership', 'guide.estimate.prosList.one-team'];
  return mode === 'new' ? [...shared, 'guide.estimate.prosList.mvp'] : [...shared, 'guide.estimate.prosList.audit'];
}

function deriveCons(mode: ProjectMode, answers: AnswerMap): string[] {
  const cons = ['guide.estimate.consList.third-party', 'guide.estimate.consList.final-quote'];
  if (mode === 'new' && asText(answers.platform).includes('Mobile')) {
    cons.push('guide.estimate.consList.app-store');
  }
  if (mode === 'existing') {
    cons.push('guide.estimate.consList.unknown-code');
  }
  return cons;
}

function deriveRisks(mode: ProjectMode, answers: AnswerMap): string[] {
  const risks: string[] = [];
  const budget = asText(answers.budget);
  if (!budget || budget === 'Not sure yet' || budget === '(skipped)') {
    risks.push('guide.estimate.risksList.budget');
  }
  const timeline = asText(answers.timeline) + asText(answers.urgency);
  if (/ASAP|Critical/i.test(timeline)) {
    risks.push('guide.estimate.risksList.timeline');
  }
  if (asArray(answers.modules).includes('Online payments') || asArray(answers.newFeatures).includes('Payments')) {
    risks.push('guide.estimate.risksList.payments');
  }
  if (mode === 'existing' && asArray(answers.technologies).includes('Not sure')) {
    risks.push('guide.estimate.risksList.stack');
  }
  if (risks.length === 0) {
    risks.push('guide.estimate.risksList.low');
  }
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
 * Build the full guide estimate. Totals are calculated programmatically from
 * the role table (hours × hourly rate) — never hard-coded.
 */
export function buildGuideEstimate(mode: ProjectMode, answers: AnswerMap): GuideEstimate {
  const base = buildDemoAnalysis(mode, answers);
  const hours = totalHours(base.team);
  const cost = totalCost(base.team);
  const weeks = estimatedWeeks(base.team, GUIDE_WEEKLY_CAPACITY_HOURS);
  const boostedWeeks = estimatedWeeks(base.team, BOOSTED_WEEKLY_CAPACITY_HOURS);
  const { service, tech } = deriveService(mode, answers);

  const mvpCost = Math.round(cost * 0.65);
  const urgency = asText(answers.urgency) + asText(answers.timeline);

  return {
    ...base,
    recommendedService: service,
    suggestedTech: tech,
    pros: derivePros(mode),
    cons: deriveCons(mode, answers),
    risks: deriveRisks(mode, answers),
    summaryItems: buildSummaryItems(mode, answers),
    cheaperAlternative: { key: 'guide.estimate.cheaper', params: { mvpCost, cost } },
    fasterAlternative: {
      key: 'guide.estimate.faster',
      params: {
        base: GUIDE_WEEKLY_CAPACITY_HOURS,
        boosted: BOOSTED_WEEKLY_CAPACITY_HOURS,
        boostedWeeks,
        weeks,
      },
    },
    recommendedNextStep: {
      key: /ASAP|Critical/i.test(urgency) ? 'guide.estimate.nextUrgent' : 'guide.estimate.nextNormal',
    },
    totalHours: hours,
    totalCost: cost,
    estimatedWeeks: weeks,
  };
}
