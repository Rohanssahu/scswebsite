// Deterministic demo estimate engine for the SCS Virtual Guide.
// Builds on the existing demoAnalysis rules and adds guide-specific extras:
// recommended service, suggested tech, pros/cons/risks and alternatives.
// Dummy data only — no real code analysis happens anywhere in this module.

import {
  buildDemoAnalysis,
  estimatedWeeks,
  totalCost,
  totalHours,
  WEEKLY_CAPACITY_HOURS,
} from '@/data/demoAnalysis';
import { AnswerMap, ProjectMode } from '@/types/projectAnalysis';
import { GuideEstimate } from '@/types/virtualGuide';

/** Configurable weekly team capacity (working hours per week). */
export const GUIDE_WEEKLY_CAPACITY_HOURS = WEEKLY_CAPACITY_HOURS;

/** Capacity used for the "faster alternative" comparison. */
const BOOSTED_WEEKLY_CAPACITY_HOURS = 60;

export const ESTIMATE_DISCLAIMER =
  'This is a preliminary demo estimate. Final scope, cost and timeline will be confirmed after an SCS Softwares review.';

/** Simulated progress labels shown before the result. Clearly a demo. */
export const DEMO_ANALYSIS_STEPS = [
  'Understanding requirements',
  'Selecting suitable services',
  'Identifying required skills',
  'Estimating development hours',
  'Calculating preliminary budget',
  'Preparing recommendations',
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
  const shared = [
    'Transparent hourly pricing — you approve every hour',
    'Full source-code ownership from day one',
    'One team covers design, development and QA',
  ];
  return mode === 'new'
    ? [...shared, 'MVP-first scoping gets you to launch faster']
    : [...shared, 'Audit-first approach — no new code on shaky foundations'];
}

function deriveCons(mode: ProjectMode, answers: AnswerMap): string[] {
  const cons = [
    'Third-party costs (hosting, payment gateways, app stores) are separate',
    'Final quote still needs a scoping call — this is a demo figure',
  ];
  if (mode === 'new' && asText(answers.platform).includes('Mobile')) {
    cons.push('App-store review adds 1–2 weeks after development finishes');
  }
  if (mode === 'existing') {
    cons.push('Unknown code quality can shift effort once the audit runs');
  }
  return cons;
}

function deriveRisks(mode: ProjectMode, answers: AnswerMap): string[] {
  const risks: string[] = [];
  const budget = asText(answers.budget);
  if (!budget || budget === 'Not sure yet' || budget === '(skipped)') {
    risks.push('Budget range undefined — scope may need trimming after the review call');
  }
  const timeline = asText(answers.timeline) + asText(answers.urgency);
  if (/ASAP|Critical/i.test(timeline)) {
    risks.push('Tight timeline — parallel workstreams raise coordination overhead');
  }
  if (asArray(answers.modules).includes('Online payments') || asArray(answers.newFeatures).includes('Payments')) {
    risks.push('Payment integration adds gateway KYC, webhooks and compliance work');
  }
  if (mode === 'existing' && asArray(answers.technologies).includes('Not sure')) {
    risks.push('Unconfirmed technology stack — the audit may adjust the estimate');
  }
  if (risks.length === 0) {
    risks.push('Low risk profile — main variable is feedback turnaround during development');
  }
  return risks;
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
    cheaperAlternative: `MVP-first build: launch with only the top 3 features first — roughly $${mvpCost.toLocaleString()} instead of $${cost.toLocaleString()}, then extend after real user feedback.`,
    fasterAlternative: `Boosted team: raise weekly capacity from ${GUIDE_WEEKLY_CAPACITY_HOURS}h to ${BOOSTED_WEEKLY_CAPACITY_HOURS}h with an extra developer — about ${boostedWeeks} week${boostedWeeks > 1 ? 's' : ''} instead of ${weeks}, at the same total hours.`,
    recommendedNextStep: /ASAP|Critical/i.test(urgency)
      ? 'Book a review call this week so the team can start with the urgent items.'
      : 'Schedule a free review call — an SCS consultant confirms scope, final cost and start date.',
    totalHours: hours,
    totalCost: cost,
    estimatedWeeks: weeks,
  };
}
