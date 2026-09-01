import { describe, expect, it } from 'vitest';
import { buildContactSummaryText } from './useVirtualGuide';

describe('buildContactSummaryText', () => {
  it('builds the contact-form handoff when no estimate exists', () => {
    expect(buildContactSummaryText(null)).toContain('discuss a project');
  });
});
