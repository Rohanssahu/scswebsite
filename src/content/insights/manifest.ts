/**
 * The insights manifest: metadata for every published article, and for the hub.
 *
 * Two articles today. That is deliberate — see `docs/seo/EDITORIAL_PLAN.md`,
 * which lists twelve prioritised topics and marks ten of them as "owner input
 * required". Only the two below can be written from first-hand experience of
 * systems in this repository, so only the two below exist. Publishing the other
 * ten as generic advice would add ten thin pages and subtract from these.
 */

import type { InsightMeta } from './types';

export const insightsHubMeta = {
  path: '/insights',
  navLabel: 'Insights',
  metaTitle: 'Engineering Insights on AI, Estimation & Delivery | SCS Softwares',
  metaDescription:
    'Long-form notes from the SCS Softwares team on estimating AI projects and putting AI voice agents into production — written from systems we built and run ourselves.',
  shareTitle: 'Insights — SCS Softwares',
} as const;

export const INSIGHTS_HUB_PATH = insightsHubMeta.path;

export const INSIGHT_META: InsightMeta[] = [
  {
    path: '/insights/how-to-estimate-an-ai-app-project',
    navLabel: 'How to estimate an AI app project',
    metaTitle: 'How to Estimate an AI App Project (Without Guessing) | SCS Softwares',
    metaDescription:
      'Why AI features break normal software estimates, which parts are genuinely predictable, and how to put a defensible range on a project before you commit.',
    shareTitle: 'How to Estimate an AI App Project',
    datePublished: '2026-08-23',
    dateModified: '2026-08-23',
    author: 'rohan-sahu',
    priority: 0.7,
  },
  {
    path: '/insights/ai-voice-agent-production-checklist',
    navLabel: 'Production checklist for an AI voice agent',
    metaTitle: 'AI Voice Agent Production Checklist | SCS Softwares',
    metaDescription:
      'The failure modes that only appear once a voice agent takes real calls — latency budget, barge-in, consent, fallback, monitoring — and what to have in place before launch.',
    shareTitle: 'AI Voice Agent Production Checklist',
    datePublished: '2026-08-23',
    dateModified: '2026-08-23',
    author: 'rohan-sahu',
    priority: 0.7,
  },
];

export const INSIGHT_META_BY_PATH: Record<string, InsightMeta> = Object.fromEntries(
  INSIGHT_META.map((insight) => [insight.path, insight]),
);
