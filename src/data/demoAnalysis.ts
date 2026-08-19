import {
  AnalysisResult,
  AnswerMap,
  DetectedIssue,
  Milestone,
  ProjectMode,
  RoleEstimate,
} from '@/types/projectAnalysis';

// Demo estimation engine. Everything below is deterministic frontend logic on
// dummy data — replace this module with real API calls later.

export const WEEKLY_CAPACITY_HOURS = 40;

export const DISCLAIMER =
  'This is a preliminary demo estimate based on the supplied information. Final scope, cost and timeline will be confirmed after an SCS Softwares review call.';

const BASE_TEAM: RoleEstimate[] = [
  { role: 'Requirement Analyst', hours: 5, hourlyRate: 5 },
  { role: 'UI/UX Designer', hours: 8, hourlyRate: 10 },
  { role: 'Frontend Developer', hours: 20, hourlyRate: 15 },
  { role: 'Backend Developer', hours: 15, hourlyRate: 20 },
  { role: 'QA Tester', hours: 5, hourlyRate: 10 },
];

export function totalHours(team: RoleEstimate[]): number {
  return team.reduce((sum, r) => sum + r.hours, 0);
}

export function totalCost(team: RoleEstimate[]): number {
  return team.reduce((sum, r) => sum + r.hours * r.hourlyRate, 0);
}

export function estimatedWeeks(team: RoleEstimate[], weeklyCapacity = WEEKLY_CAPACITY_HOURS): number {
  return Math.max(1, Math.ceil(totalHours(team) / weeklyCapacity));
}

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asText(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value.join(', ') : value;
}

function buildTeam(mode: ProjectMode, answers: AnswerMap): RoleEstimate[] {
  const team = BASE_TEAM.map((r) => ({ ...r }));
  const features = asArray(answers.features).concat(asArray(answers.newFeatures));
  const modules = asArray(answers.modules);
  const platform = asText(answers.platform) + asText(answers.projectType);

  // Scale effort with selected scope — simple deterministic heuristics.
  const featureLoad = features.filter((f) => f !== 'None of these' && !f.startsWith('No new features')).length;
  team[2].hours += featureLoad * 3; // frontend
  team[3].hours += featureLoad * 2; // backend
  team[4].hours += Math.ceil(featureLoad / 2); // QA

  if (modules.includes('Online payments') || features.includes('Payments')) {
    team[3].hours += 8;
    team[4].hours += 2;
  }
  if (modules.includes('Admin panel') || features.includes('Admin panel')) {
    team[2].hours += 6;
    team[3].hours += 4;
  }
  if (/mobile/i.test(platform)) {
    team.push({ role: 'Mobile Developer', hours: 18 + featureLoad * 2, hourlyRate: 15 });
  }
  if (mode === 'existing') {
    // Existing projects need an audit/refactor pass instead of greenfield design.
    team[0].hours += 3;
    team[1].hours = Math.max(4, team[1].hours - 4);
    team.push({ role: 'Code Auditor / Tech Lead', hours: 6, hourlyRate: 20 });
  }
  return team;
}

function buildHealthScore(mode: ProjectMode, answers: AnswerMap): number {
  if (mode === 'new') {
    // "Readiness" score for new ideas: more detail → higher score.
    let score = 62;
    if (asText(answers.idea).length > 40) score += 10;
    if (asText(answers.audience).length > 5) score += 8;
    if (asArray(answers.features).length >= 3) score += 8;
    if (asText(answers.timeline)) score += 4;
    return Math.min(score, 94);
  }
  // Existing projects: more broken surface → lower score.
  let score = 78;
  score -= Math.min(24, Math.ceil(asText(answers.broken).length / 20));
  if (asText(answers.working).length > 30) score += 6;
  if (asArray(answers.newFeatures).some((f) => f.startsWith('No new features'))) score += 4;
  return Math.max(34, Math.min(score, 90));
}

function buildIssues(mode: ProjectMode, answers: AnswerMap): DetectedIssue[] {
  if (mode === 'new') {
    const issues: DetectedIssue[] = [
      {
        title: 'Scope not yet locked',
        severity: 'medium',
        summary: 'Feature list is broad for a first release.',
        detail:
          'We recommend defining an MVP with the 3–4 highest-impact features first, then iterating. This shortens time-to-launch and reduces upfront cost.',
      },
    ];
    if (!asText(answers.budget) || asText(answers.budget) === 'Not sure yet') {
      issues.push({
        title: 'Budget range undefined',
        severity: 'low',
        summary: 'No budget range was provided.',
        detail:
          'A budget range helps us right-size the technology choices and team. We can propose options at multiple price points during the review call.',
      });
    }
    if (asArray(answers.modules).includes('Online payments')) {
      issues.push({
        title: 'Payment compliance requirements',
        severity: 'medium',
        summary: 'Payments require gateway setup and compliance checks.',
        detail:
          'Integrating a payment gateway (Razorpay, Stripe, etc.) adds KYC, webhooks and refund-flow work. We have included extra backend hours for this.',
      });
    }
    return issues;
  }

  const issues: DetectedIssue[] = [
    {
      title: 'Reported broken functionality',
      severity: 'high',
      summary: asText(answers.broken) ? asText(answers.broken).slice(0, 90) : 'Parts of the project are incomplete.',
      detail:
        'Our first sprint focuses on reproducing and fixing the reported failures, with regression tests so they stay fixed.',
    },
    {
      title: 'Unknown code health',
      severity: 'medium',
      summary: 'The codebase has not been audited yet.',
      detail:
        'A short code audit (included in this estimate) checks dependency versions, security basics and architecture before new features are added.',
    },
  ];
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

function buildMilestones(mode: ProjectMode, weeks: number): Milestone[] {
  if (mode === 'new') {
    return [
      { title: 'Discovery & UI design', week: 'Week 1', deliverables: ['Final requirement document', 'Wireframes & UI screens'] },
      {
        title: 'Core development',
        week: weeks > 2 ? `Weeks 2–${weeks}` : 'Week 2',
        deliverables: ['Core features built', 'Weekly demo builds', 'Internal QA'],
      },
      {
        title: 'Testing & launch',
        week: `Week ${weeks + 1}`,
        deliverables: ['Bug fixing & polish', 'Deployment & handover'],
      },
    ];
  }
  return [
    { title: 'Audit & stabilise', week: 'Week 1', deliverables: ['Code audit report', 'Critical bug fixes'] },
    {
      title: 'Fixes & new features',
      week: weeks > 2 ? `Weeks 2–${weeks}` : 'Week 2',
      deliverables: ['Remaining fixes', 'Requested features', 'Regression testing'],
    },
    {
      title: 'Hardening & handover',
      week: `Week ${weeks + 1}`,
      deliverables: ['Performance pass', 'Documentation & handover'],
    },
  ];
}

const SCS_BENEFITS = [
  'Transparent hourly pricing — you approve every hour before work starts',
  'Dedicated project manager and weekly demo calls',
  'NDA and full source-code ownership from day one',
  'Post-launch support window included in every engagement',
];

export function buildDemoAnalysis(mode: ProjectMode, answers: AnswerMap): AnalysisResult {
  const team = buildTeam(mode, answers);
  const weeks = estimatedWeeks(team);
  const healthScore = buildHealthScore(mode, answers);

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
        : ['To be confirmed during code audit']
      : ['New build — nothing exists yet; this section will track progress once development starts'];

  const missingFeatures =
    mode === 'new'
      ? asArray(answers.modules)
          .filter((m) => m !== 'None of these')
          .concat(asArray(answers.features).slice(0, 4))
      : asArray(answers.newFeatures).filter((f) => !f.startsWith('No new features'));

  const recommendedSolution =
    mode === 'new'
      ? [
          'Start with a focused MVP covering the highest-impact features',
          `Build for ${asText(answers.platform) || 'web'} first with a scalable architecture`,
          'Weekly demo builds so you see progress every Friday',
          'Launch, measure real usage, then plan phase 2',
        ]
      : [
          'Begin with a short code audit to confirm the stack and risks',
          'Fix critical broken flows before adding anything new',
          'Add requested features behind a regression-test safety net',
          'Finish with a performance and security hardening pass',
        ];

  const riskLevel: AnalysisResult['riskLevel'] = healthScore >= 70 ? 'Low' : healthScore >= 50 ? 'Medium' : 'High';

  return {
    mode,
    healthScore,
    riskLevel,
    requirementSummary,
    currentlyWorking,
    problemsDetected: buildIssues(mode, answers),
    missingFeatures: missingFeatures.length ? [...new Set(missingFeatures)] : ['None identified from your answers'],
    recommendedSolution,
    team,
    weeklyCapacityHours: WEEKLY_CAPACITY_HOURS,
    assumptions: [
      'Estimate assumes standard third-party services (hosting, payment gateway) are available',
      'Client provides content, branding assets and timely feedback',
      'Hours shown are demo figures; the final quote follows a scoping call',
      'One revision round per milestone is included',
    ],
    milestones: buildMilestones(mode, weeks),
    benefits: SCS_BENEFITS,
    nextSteps: [
      'Schedule a free review call with an SCS Softwares consultant',
      'Share any documents, designs or repository access you have',
      'Receive a confirmed fixed quote and sprint plan within 2 business days',
    ],
    generatedAt: new Date().toISOString(),
  };
}

/** Fallback result shown when the result page is opened without a submission. */
export function sampleAnalysis(): AnalysisResult {
  return buildDemoAnalysis('new', {
    idea: 'A tutor marketplace where students can discover and book local tutors online',
    audience: 'Students and independent tutors',
    features: ['User profiles', 'Search & filters', 'Booking / scheduling'],
    platform: 'Web only',
    modules: ['User login / accounts', 'Online payments'],
    timeline: '1–3 months',
    budget: '$1,000 – $5,000',
  });
}
