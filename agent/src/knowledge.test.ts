import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseKnowledge, renderKnowledge } from './knowledge.js';

const raw = readFileSync(join(__dirname, '..', 'knowledge', 'scs-knowledge.json'), 'utf8');

describe('SCS knowledge file', () => {
  it('parses and validates against the schema', () => {
    const k = parseKnowledge(raw);
    expect(k.company.name).toBe('SCS Softwares');
    expect(k.services.length).toBeGreaterThan(0);
    expect(k.weeklyCapacity.hoursPerWeek).toBe(40);
  });

  it('contains no unconfirmed five-hour minimum claim', () => {
    const k = parseKnowledge(raw);
    expect(k.hourlyEngagementModel.minimumEngagementHours).toBeNull();
  });

  it('lists the prohibited claims Buddy must never make', () => {
    const k = parseKnowledge(raw);
    const joined = k.prohibitedClaims.join(' ');
    expect(joined).toMatch(/final quotation/i);
    expect(joined).toMatch(/developer has been assigned/i);
    expect(joined).toMatch(/payment has been received/i);
    expect(joined).toMatch(/approved/i);
    expect(joined).toMatch(/guarantees/i);
  });

  it('renders a grounding block with all sections', () => {
    const text = renderKnowledge(parseKnowledge(raw));
    for (const section of ['SERVICES', 'ENGAGEMENT PROCESS', 'PRICING MODEL', 'HUMAN REVIEW', 'NEVER CLAIM']) {
      expect(text).toContain(section);
    }
  });

  it('rejects malformed knowledge files', () => {
    expect(() => parseKnowledge('{}')).toThrow();
    expect(() => parseKnowledge('not json')).toThrow();
  });
});
