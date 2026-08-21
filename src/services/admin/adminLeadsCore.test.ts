import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGE_SIZE,
  DEFAULT_LEAD_FILTERS,
  LEAD_STATUS_OPTIONS,
  NOTE_MAX_LENGTH,
  PRELIMINARY_ESTIMATE_DISCLAIMER,
  adminQueryKeys,
  buildSearchExpression,
  canEditNote,
  dateRangeSince,
  fieldLabel,
  formatCostRange,
  formatDate,
  formatDateTime,
  formatRange,
  jsonNumber,
  jsonString,
  jsonStringList,
  leadSourceLabel,
  leadStatusLabel,
  leadTypeLabel,
  pageRange,
  projectTypeLabel,
  rangeSummary,
  resolveProjectMode,
  safeExternalUrl,
  sanitizeSearchTerm,
  statusNeedsConfirmation,
  telLink,
  toFieldRows,
  totalPages,
  validateNote,
  whatsAppLink,
} from './adminLeadsCore';
import type { AdminLeadRow, AdminNoteRow } from './adminTypes';

const leadRow = (overrides: Partial<AdminLeadRow> = {}): AdminLeadRow =>
  ({
    id: 'a',
    reference_code: 'SCS-4F7K2P9Q',
    lead_type: 'project_requirement',
    source: '/project-analysis',
    name: 'Asha Rao',
    email: 'asha@example.test',
    phone: '+91 98765 43210',
    company: 'Rao Labs',
    country: 'India',
    preferred_contact_method: 'whatsapp',
    preferred_language: 'en',
    service: 'Web development',
    project_mode: 'new',
    status: 'new',
    human_review_requested: false,
    created_at: '2026-08-21T14:05:00.000Z',
    updated_at: '2026-08-21T14:05:00.000Z',
    requirement_mode: null,
    meeting_reference: null,
    meeting_status: null,
    review_status: null,
    estimate_kind: null,
    estimate_currency: null,
    estimate_hours_min: null,
    estimate_hours_max: null,
    estimate_cost_min: null,
    estimate_cost_max: null,
    ...overrides,
  }) as AdminLeadRow;

describe('safe column mapping', () => {
  it('labels the four real lead_type values from the database check constraint', () => {
    expect(leadTypeLabel('contact')).toBe('Contact form');
    expect(leadTypeLabel('consultation')).toBe('Consultation');
    expect(leadTypeLabel('project_requirement')).toBe('Project analysis');
    expect(leadTypeLabel('human_review')).toBe('Human review');
    // an unknown value is shown as-is, never silently remapped
    expect(leadTypeLabel('something_new')).toBe('something_new');
    expect(leadTypeLabel(null)).toBe('Unknown');
  });

  it('shows AI consultation only when a meeting reference actually exists', () => {
    expect(leadSourceLabel(leadRow())).toBe('Project analysis');
    expect(leadSourceLabel(leadRow({ meeting_reference: 'SCSM-ABCDEFGHJK' }))).toBe(
      'AI consultation',
    );
  });

  it('offers exactly the six dashboard statuses and labels legacy values honestly', () => {
    expect(LEAD_STATUS_OPTIONS).toEqual([
      'new',
      'contacted',
      'qualified',
      'proposal_sent',
      'hired',
      'closed',
    ]);
    expect(leadStatusLabel('proposal_sent')).toBe('Proposal sent');
    expect(leadStatusLabel('in_review')).toBe('In review');
    expect(leadStatusLabel('spam')).toBe('Spam');
  });

  it('confirms only the terminal status moves', () => {
    expect(statusNeedsConfirmation('hired')).toBe(true);
    expect(statusNeedsConfirmation('closed')).toBe(true);
    expect(statusNeedsConfirmation('contacted')).toBe(false);
    expect(statusNeedsConfirmation('qualified')).toBe(false);
  });

  it('falls back to the requirement mode when the lead has none', () => {
    expect(resolveProjectMode(leadRow({ project_mode: null, requirement_mode: 'existing' }))).toBe(
      'existing',
    );
    expect(projectTypeLabel(null)).toBe('—');
    expect(projectTypeLabel('new')).toBe('New project');
    expect(projectTypeLabel('existing')).toBe('Existing project');
  });
});

describe('estimate formatting', () => {
  it('renders a range, a single figure, or nothing at all', () => {
    expect(formatCostRange(12000, 18000, 'USD')).toBe('$12,000 – $18,000');
    expect(formatCostRange(9000, 9000, 'USD')).toBe('$9,000');
    expect(formatRange(320, 420, 'hours')).toBe('320 – 420 hours');
  });

  it('returns null instead of a misleading zero when there is no estimate', () => {
    expect(formatCostRange(null, null)).toBeNull();
    expect(formatCostRange(1000, null)).toBeNull();
    expect(formatRange(undefined, 10, 'weeks')).toBeNull();
  });

  it('keeps the preliminary wording explicit', () => {
    expect(PRELIMINARY_ESTIMATE_DISCLAIMER).toContain('Preliminary estimate');
    expect(PRELIMINARY_ESTIMATE_DISCLAIMER).toContain('Not a final quotation');
  });

  it('formats dates without depending on the runner locale', () => {
    expect(formatDate('2026-08-21T14:05:00.000Z')).toBe('21 Aug 2026');
    expect(formatDateTime('2026-08-21T14:05:00.000Z')).toBe('21 Aug 2026, 14:05 UTC');
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});

describe('safe external links', () => {
  it('accepts only absolute https URLs', () => {
    expect(safeExternalUrl('https://github.com/acme/repo')).toBe('https://github.com/acme/repo');
    expect(safeExternalUrl('  https://figma.com/file/abc  ')).toBe('https://figma.com/file/abc');
  });

  it('rejects every other scheme and shape', () => {
    for (const hostile of [
      'http://insecure.example',
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'vbscript:msgbox(1)',
      '//evil.example',
      '/relative/path',
      'github.com/acme/repo',
      'https://localhost/secret',
      '',
      null,
      undefined,
      `https://example.com/${'x'.repeat(3000)}`,
    ]) {
      expect(safeExternalUrl(hostile as string), String(hostile)).toBeNull();
    }
  });

  it('builds WhatsApp and tel links only from a normalizable phone number', () => {
    expect(whatsAppLink('+91 98765 43210')).toBe('https://wa.me/919876543210');
    expect(telLink('+91 98765 43210')).toBe('tel:+919876543210');
    expect(whatsAppLink('not a phone')).toBeNull();
    expect(whatsAppLink(null)).toBeNull();
    expect(telLink('12')).toBeNull();
  });
});

describe('search, filters and pagination', () => {
  it('strips characters that would break out of a PostgREST or() group', () => {
    expect(sanitizeSearchTerm('  SCS-4F7K,2P9Q  ')).toBe('SCS-4F7K2P9Q');
    expect(sanitizeSearchTerm('a*b%c(d)e\\f"g\'h')).toBe('abcdefgh');
    expect(sanitizeSearchTerm('x'.repeat(200))).toHaveLength(80);
  });

  it('searches only reference code, name and email', () => {
    const expression = buildSearchExpression('asha');
    expect(expression).toBe('reference_code.ilike.%asha%,name.ilike.%asha%,email.ilike.%asha%');
    expect(expression).not.toContain('project_summary');
    expect(expression).not.toContain('metadata');
  });

  it('ignores a search term that is too short to be useful', () => {
    expect(buildSearchExpression('a')).toBeNull();
    expect(buildSearchExpression('   ')).toBeNull();
    expect(buildSearchExpression(',,,')).toBeNull();
  });

  it('always asks for one bounded page', () => {
    expect(pageRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(pageRange(3, 20)).toEqual({ from: 40, to: 59 });
    // hostile input cannot turn into "fetch everything"
    expect(pageRange(0, 0)).toEqual({ from: 0, to: 19 });
    expect(pageRange(-5, 1000)).toEqual({ from: 0, to: 99 });
    expect(DEFAULT_LEAD_FILTERS.pageSize).toBe(ADMIN_PAGE_SIZE);
  });

  it('computes page counts and the range summary', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(41, 20)).toBe(3);
    expect(rangeSummary(143, 1, 20, 20)).toBe('Showing 1–20 of 143');
    expect(rangeSummary(143, 3, 20, 20)).toBe('Showing 41–60 of 143');
    expect(rangeSummary(0, 1, 20, 0)).toBe('Showing 0 leads');
  });

  it('turns a date range into a lower bound', () => {
    const now = Date.parse('2026-08-21T00:00:00.000Z');
    expect(dateRangeSince('all', now)).toBeNull();
    expect(dateRangeSince('today', now)).toBe('2026-08-20T00:00:00.000Z');
    expect(dateRangeSince('30d', now)).toBe('2026-07-22T00:00:00.000Z');
  });

  it('produces stable query keys for identical filters', () => {
    const a = adminQueryKeys.leads({ ...DEFAULT_LEAD_FILTERS, search: ' asha ' });
    const b = adminQueryKeys.leads({ ...DEFAULT_LEAD_FILTERS, search: 'asha' });
    expect(a).toEqual(b);
    expect(adminQueryKeys.leadDetail('lead-1')).toEqual(['admin', 'lead', 'lead-1']);
    expect(adminQueryKeys.stats()).toEqual(['admin', 'stats']);
    // detail and list keys share the 'admin' prefix so one invalidation hits both
    expect(adminQueryKeys.leadDetail('lead-1')[0]).toBe(adminQueryKeys.leads(DEFAULT_LEAD_FILTERS)[0]);
  });
});

describe('client-submitted JSON rendering', () => {
  it('labels the answer keys the analysis flow and the agent actually write', () => {
    expect(fieldLabel('platform')).toBe('Platform');
    expect(fieldLabel('core_features')).toBe('Core features');
    expect(fieldLabel('main_problems')).toBe('Existing problems');
    expect(fieldLabel('preferred_technology')).toBe('Technology preference');
    // an unmapped key is de-slugged, never dropped
    expect(fieldLabel('some_new_field')).toBe('Some new field');
    expect(fieldLabel('newFeatures')).toBe('Requested features');
  });

  it('flattens strings, numbers, booleans and string arrays only', () => {
    const rows = toFieldRows({
      platform: 'Web + Mobile',
      core_features: ['Chat', 'Payments'],
      payments: true,
      expected_scale: 5000,
      nested: { not: 'rendered' },
      empty: '',
      mixed: [1, { a: 1 }, 'ok'],
    });
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    expect(byKey.platform).toBe('Web + Mobile');
    expect(byKey.core_features).toBe('Chat, Payments');
    expect(byKey.payments).toBe('Yes');
    expect(byKey.expected_scale).toBe('5000');
    expect(byKey.mixed).toBe('1, ok');
    expect(byKey).not.toHaveProperty('nested');
    expect(byKey).not.toHaveProperty('empty');
  });

  it('reads scalars out of untrusted blobs defensively', () => {
    expect(jsonNumber({ health_score: 72 }, 'health_score')).toBe(72);
    expect(jsonNumber({ health_score: '72' }, 'health_score')).toBeNull();
    expect(jsonNumber(null, 'health_score')).toBeNull();
    expect(jsonStringList({ risks: ['a', 1, 'b'] }, 'risks')).toEqual(['a', 'b']);
    expect(jsonStringList({}, 'risks')).toEqual([]);
    expect(jsonString({ source: ' ai ' }, 'source')).toBe('ai');
    expect(jsonString({ source: 4 }, 'source')).toBeNull();
  });

  it('caps how many fields are rendered', () => {
    const big = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, `v${i}`]));
    expect(toFieldRows(big)).toHaveLength(60);
  });
});

describe('internal notes', () => {
  it('rejects empty and oversized notes', () => {
    expect(validateNote('   ')).toBe('Write something before saving the note.');
    expect(validateNote('x'.repeat(NOTE_MAX_LENGTH + 1))).toContain('limited to');
    expect(validateNote('Called, asked for a proposal.')).toBeNull();
  });

  it('allows editing only your own note', () => {
    const note = { id: 'n1', lead_id: 'l1', author_id: 'user-1', note: 'x', created_at: '', updated_at: '' } as AdminNoteRow;
    expect(canEditNote(note, 'user-1')).toBe(true);
    expect(canEditNote(note, 'user-2')).toBe(false);
    expect(canEditNote(note, null)).toBe(false);
    expect(canEditNote({ ...note, author_id: null }, null)).toBe(false);
  });
});
