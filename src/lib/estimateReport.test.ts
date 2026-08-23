import { describe, expect, it } from 'vitest';
import { sampleAnalysis } from '@/data/basicEstimate';
import { decorateGuideEstimate } from '@/data/guideEstimate';
import { REPORT_BRAND } from './printReport';
import { buildEstimateReport } from './estimateReport';

const guideEstimate = () =>
  decorateGuideEstimate(sampleAnalysis(), 'new', {
    idea: 'A tutor marketplace',
    audience: 'Students and tutors',
    features: ['User profiles', 'Booking / scheduling'],
    platform: 'Web only',
    budget: '$1,000',
  });

const titles = (doc: ReturnType<typeof buildEstimateReport>) => doc.sections.map((s) => s.title);

describe('buildEstimateReport', () => {
  it('is always a watermarked, company-labelled free report', () => {
    const doc = buildEstimateReport(sampleAnalysis());
    expect(doc.watermark).toBe(true);
    expect(doc.fileName).toContain(REPORT_BRAND);
    expect(doc.closingNote).toContain(REPORT_BRAND);
    expect(doc.pageLabel(2, 5)).toContain('2');
  });

  it('quotes the figures from the result, never its own arithmetic', () => {
    const estimate = guideEstimate();
    const doc = buildEstimateReport(estimate);
    const stats = doc.stats.map((s) => s.value).join(' | ');
    expect(stats).toContain(String(estimate.totalHours));
    expect(stats).toContain(String(estimate.totalCost));
    const team = doc.sections.flatMap((s) => s.blocks).find((b) => b.type === 'table');
    expect(team?.type === 'table' && team.rows).toHaveLength(estimate.team.length);
    expect(team?.type === 'table' && team.total?.join(' ')).toContain(String(estimate.totalHours));
  });

  it('carries the conversational sections when Buddy produced the estimate', () => {
    const doc = buildEstimateReport(guideEstimate());
    const heads = titles(doc).join(' | ');
    expect(heads).toContain('Requirement summary');
    expect(heads).toContain('Recommended service & technology');
    expect(heads).toContain('Pros');
    expect(heads).toContain('Alternatives');
  });

  it('works from a plain dashboard result, dropping the chat-only sections', () => {
    const heads = titles(buildEstimateReport(sampleAnalysis())).join(' | ');
    expect(heads).toContain('Your budget and what it covers');
    expect(heads).toContain('Team & hours');
    expect(heads).not.toContain('Recommended service & technology');
  });

  it('never emits a section with no content', () => {
    const doc = buildEstimateReport(guideEstimate());
    doc.sections.forEach((section) => {
      expect(section.blocks.length).toBeGreaterThan(0);
      section.blocks.forEach((block) => {
        const count = block.type === 'table' ? block.rows.length : block.type === 'note' ? 1 : block.items.length;
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  it('labels how the estimate was produced', () => {
    const basic = buildEstimateReport(sampleAnalysis()).meta.map((m) => m.value).join(' | ');
    expect(basic).toContain('Basic estimate');
    const ai = buildEstimateReport({ ...sampleAnalysis(), source: 'ai' }).meta.map((m) => m.value).join(' | ');
    expect(ai).toContain('AI analysis');
  });
});
