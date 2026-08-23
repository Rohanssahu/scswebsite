/**
 * Turns an analysis result into the downloadable project report.
 *
 * One builder serves both producers of an estimate — Buddy's chat flow (a
 * `GuideEstimate`, which carries the extra conversational wording) and the
 * analysis dashboard (a plain `AnalysisResult`) — so the PDF a visitor saves
 * from the chat is the same document, with the same figures, as the one saved
 * from the result page.
 *
 * No arithmetic happens here: every figure comes from the estimation policy via
 * the result object. Labels come from i18n, so the report is written in the
 * language the visitor is reading the site in.
 */

import { estimatedWeeks, totalCost, totalHours } from '@/data/basicEstimate';
import { ESTIMATE_DISCLAIMER_KEY } from '@/data/guideEstimate';
import i18n from '@/i18n/config';
import { formatDate, formatNumber, formatUsd, getLocaleConfig, valueKey } from '@/i18n/languageConfig';
import { STANDARD_HOURLY_RATE_USD } from '@/policy/estimationPolicy';
import { AnalysisResult } from '@/types/projectAnalysis';
import { GuideEstimate } from '@/types/virtualGuide';
import { printReport, REPORT_BRAND, ReportDocument, ReportSection } from './printReport';

const isGuideEstimate = (result: AnalysisResult | GuideEstimate): result is GuideEstimate =>
  Array.isArray((result as GuideEstimate).summaryItems);

/** Drop empty sections so the report never prints a heading with nothing under it. */
function section(title: string, ...blocks: ReportSection['blocks']): ReportSection[] {
  const kept = blocks.filter((block) => {
    if (block.type === 'table') return block.rows.length > 0;
    if (block.type === 'note') return Boolean(block.text.trim());
    if (block.type === 'pairs') return block.items.length > 0;
    return block.items.filter(Boolean).length > 0;
  });
  return kept.length ? [{ title, blocks: kept }] : [];
}

export function buildEstimateReport(result: AnalysisResult | GuideEstimate): ReportDocument {
  const lang = i18n.language || 'en';
  const { dir } = getLocaleConfig(lang);
  const guide = isGuideEstimate(result) ? result : null;
  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, { defaultValue: key, ...params });

  const hours = guide?.totalHours ?? totalHours(result.team);
  const cost = guide?.totalCost ?? totalCost(result.team);
  const weeks = guide?.estimatedWeeks ?? estimatedWeeks(result.team, result.weeklyCapacityHours);
  const usd = (value: number) => formatUsd(value, lang);
  const num = (value: number) => formatNumber(value, lang);

  const generatedAt = result.generatedAt ? new Date(result.generatedAt) : new Date();
  const generated = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;
  const isoDay = generated.toISOString().slice(0, 10);
  const plan = result.budgetPlan;

  const sections: ReportSection[] = [
    ...section(t('guide.estimate.budgetFit'), {
      type: 'paragraphs',
      items: guide?.budgetLines?.length ? guide.budgetLines : result.planNarrative,
    }),
    ...section(t('guide.estimate.requirementSummary'), {
      type: 'list',
      items: guide ? guide.summaryItems.map((item) => t(item.key, item.params)) : result.requirementSummary,
    }),
    ...(guide
      ? section(t('guide.estimate.recommendedService'), {
          type: 'paragraphs',
          items: [
            `${t(`services.names.${valueKey(guide.recommendedService)}`, { defaultValue: guide.recommendedService })} — ` +
              `${t('guide.estimate.suggestedStack')} ${guide.suggestedTech.join(', ')}.`,
          ],
        })
      : []),
    ...section(t('guide.report.solution'), { type: 'list', items: result.recommendedSolution }),
    ...section(t('guide.report.working'), { type: 'list', items: result.currentlyWorking }),
    ...section(t('guide.report.problems'), {
      type: 'list',
      items: result.problemsDetected.map(
        (issue) => `${issue.title} — ${t(`guide.report.severity.${issue.severity}`)}: ${issue.summary}`,
      ),
    }),
    ...section(t('guide.report.missing'), { type: 'list', items: result.missingFeatures }),
    ...section(t('guide.estimate.teamHours'), {
      type: 'table',
      columns: [t('guide.estimate.role'), t('guide.estimate.hours'), t('guide.estimate.rate'), t('guide.estimate.cost')],
      rows: result.team.map((role) => [
        t(`roles.${valueKey(role.role)}`, { defaultValue: role.role }),
        `${num(role.hours)}h`,
        `${usd(role.hourlyRate)}/h`,
        usd(role.hours * role.hourlyRate),
      ]),
      total: [t('guide.estimate.total'), `${num(hours)}h`, '', usd(cost)],
    }),
    ...section(t('guide.report.included'), {
      type: 'list',
      items: plan.base.includedScope.map((item) => `${item.label} (${num(item.hours)}h)`),
    }),
    ...section(t('guide.report.deferred'), {
      type: 'list',
      items: plan.base.deferredScope.map((item) => `${item.label} (${num(item.hours)}h)`),
    }),
    ...section(t('guide.report.milestones'), {
      type: 'list',
      items: result.milestones.map((m) => `${m.week} — ${m.title}: ${m.deliverables.join(', ')}`),
    }),
    ...section(t('guide.report.health'), {
      type: 'pairs',
      items: [
        { label: t('guide.report.healthScore'), value: t('guide.report.healthValue', { score: num(result.healthScore) }) },
        { label: t('guide.report.riskLevel'), value: t(`guide.report.risk.${valueKey(result.riskLevel)}`) },
      ],
    }),
    ...section(t('guide.estimate.benefits'), { type: 'list', items: result.benefits }),
    ...(guide
      ? [
          ...section(t('guide.estimate.pros'), { type: 'list', items: guide.pros.map((key) => t(key)) }),
          ...section(t('guide.estimate.cons'), { type: 'list', items: guide.cons.map((key) => t(key)) }),
          ...section(t('guide.estimate.risks'), { type: 'list', items: guide.risks.map((key) => t(key)) }),
          ...section(t('guide.estimate.alternatives'), {
            type: 'list',
            items: [
              `${t('guide.estimate.cheaperPrefix')} ${t(guide.cheaperAlternative.key, guide.cheaperAlternative.params)}`,
              `${t('guide.estimate.phasedPrefix')} ${t(guide.phasedAlternative.key, guide.phasedAlternative.params)}`,
            ],
          }),
        ]
      : []),
    ...section(t('guide.report.assumptions'), { type: 'list', items: result.assumptions }),
    ...section(t('guide.estimate.nextStep'), {
      type: 'list',
      items: guide
        ? [t(guide.recommendedNextStep.key, guide.recommendedNextStep.params), ...result.nextSteps]
        : result.nextSteps,
    }),
  ];

  return {
    title: t('guide.report.title'),
    subtitle: t(ESTIMATE_DISCLAIMER_KEY),
    fileName: t('guide.report.fileName', { brand: REPORT_BRAND, date: isoDay }),
    meta: [
      { label: t('guide.report.generated'), value: formatDate(generated, lang, { dateStyle: 'medium' }) },
      {
        label: t('guide.report.projectType'),
        value: result.mode === 'existing' ? t('guide.report.modeExisting') : t('guide.report.modeNew'),
      },
      {
        label: t('guide.report.basis'),
        value: result.source === 'ai' ? t('guide.report.basisAi') : t('guide.report.basisBasic'),
      },
      { label: t('guide.report.version'), value: plan.estimateVersion },
    ],
    stats: [
      { label: t('guide.estimate.totalHours'), value: `${num(hours)}h` },
      { label: t('guide.estimate.estimatedCost'), value: usd(cost) },
      {
        label: t('guide.estimate.capacity', { capacity: num(result.weeklyCapacityHours) }),
        value: t('guide.estimate.weeksShort', { weeks: num(weeks) }),
      },
      { label: t('guide.report.rate'), value: t('guide.report.rateValue', { rate: usd(STANDARD_HOURLY_RATE_USD) }) },
    ],
    sections,
    closingNote: `${t(ESTIMATE_DISCLAIMER_KEY)} ${t('guide.estimate.demoNote')} ${t('guide.report.watermarkNote', {
      brand: REPORT_BRAND,
    })}`,
    lang,
    dir,
    // Free report: the brand watermark and the running company label are not optional.
    watermark: true,
    pageLabel: (page, total) => t('guide.report.page', { page: num(page), total: num(total) }),
  };
}

/** Build the report for this estimate and hand it to the browser to save as PDF. */
export function downloadEstimateReport(result: AnalysisResult | GuideEstimate): boolean {
  return printReport(buildEstimateReport(result));
}
