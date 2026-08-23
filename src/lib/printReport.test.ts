import { describe, expect, it } from 'vitest';
import {
  documentAtoms,
  escapeHtml,
  pageHtml,
  paginate,
  REPORT_BRAND,
  REPORT_WATERMARK_TEXT,
  ReportAtom,
  ReportDocument,
  reportShellHtml,
} from './printReport';

const doc = (overrides: Partial<ReportDocument> = {}): ReportDocument => ({
  title: 'Project estimate report',
  subtitle: 'Preliminary estimate',
  fileName: 'SCS Softwares — report',
  meta: [{ label: 'Generated', value: '23 Aug 2026' }],
  stats: [{ label: 'Total hours', value: '92h' }],
  sections: [
    { title: 'Budget', blocks: [{ type: 'paragraphs', items: ['Line one', 'Line two'] }] },
    { title: 'Empty', blocks: [{ type: 'list', items: [] }] },
  ],
  closingNote: 'Not a final quotation.',
  lang: 'en',
  dir: 'ltr',
  watermark: true,
  pageLabel: (page, total) => `Page ${page} of ${total}`,
  ...overrides,
});

const fixed = (height: number, rowHeight = height): ((atom: ReportAtom) => { height: number; headHeight: number; rowHeights: number[] }) =>
  (atom) => ({
    height,
    headHeight: height,
    rowHeights: atom.kind === 'table' ? atom.rows.map(() => rowHeight) : [],
  });

describe('escapeHtml', () => {
  it('neutralises markup coming from answers or scope labels', () => {
    expect(escapeHtml('<script>"x" & \'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });
});

describe('documentAtoms', () => {
  it('renders title, meta, stats and section content', () => {
    const html = documentAtoms(doc())
      .map((a) => (a.kind === 'html' ? a.html : a.head))
      .join('');
    expect(html).toContain('Project estimate report');
    expect(html).toContain('Generated');
    expect(html).toContain('92h');
    expect(html).toContain('Line two');
    expect(html).toContain('Not a final quotation.');
  });

  it('skips a section whose every block is empty', () => {
    expect(documentAtoms(doc()).some((a) => a.kind === 'html' && a.html.includes('Empty'))).toBe(false);
  });

  it('escapes visitor-supplied text', () => {
    const atoms = documentAtoms(
      doc({ sections: [{ title: 'Scope', blocks: [{ type: 'list', items: ['<b>hack</b>'] }] }] }),
    );
    const html = atoms.map((a) => (a.kind === 'html' ? a.html : '')).join('');
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).not.toContain('<b>hack</b>');
  });

  it('keeps a section heading with the block that follows it', () => {
    const heading = documentAtoms(doc()).find((a) => a.kind === 'html' && a.html.includes('rp-h2'));
    expect(heading && heading.kind === 'html' && heading.keepWithNext).toBe(true);
  });
});

describe('paginate', () => {
  it('flows blocks into pages and never drops one', () => {
    const atoms: ReportAtom[] = Array.from({ length: 7 }, (_, i) => ({ kind: 'html', html: `<p>${i}</p>` }));
    const pages = paginate(atoms, fixed(30), 100);
    expect(pages).toHaveLength(3); // 3 + 3 + 1
    expect(pages.join('')).toBe(atoms.map((a) => (a.kind === 'html' ? a.html : '')).join(''));
  });

  it('places a block taller than a page rather than looping forever', () => {
    const pages = paginate([{ kind: 'html', html: '<p>huge</p>' }], fixed(500), 100);
    expect(pages).toEqual(['<p>huge</p>']);
  });

  it('moves a stranded heading to the page with its content', () => {
    const atoms: ReportAtom[] = [
      { kind: 'html', html: '<p>filler</p>' },
      { kind: 'html', html: '<h2>heading</h2>', keepWithNext: true },
      { kind: 'html', html: '<p>body</p>' },
    ];
    const pages = paginate(atoms, fixed(40), 100);
    expect(pages[0]).toBe('<p>filler</p>');
    expect(pages[1]).toBe('<h2>heading</h2><p>body</p>');
  });

  it('splits a long table across pages and repeats its header row', () => {
    const rows = Array.from({ length: 6 }, (_, i) => `<tbody><tr><td>${i}</td></tr></tbody>`);
    const pages = paginate([{ kind: 'table', head: '<thead><tr><th>Role</th></tr></thead>', rows }], fixed(20), 60);
    expect(pages).toHaveLength(3); // header + 2 rows per page
    pages.forEach((page) => expect(page).toContain('<thead><tr><th>Role</th></tr></thead>'));
    expect(pages.join('')).toContain('<td>5</td>');
  });

  it('always returns at least one page', () => {
    expect(paginate([], fixed(10), 100)).toEqual(['']);
  });
});

describe('page chrome', () => {
  it('stamps the company name and watermark on every page', () => {
    const d = doc();
    const pages = [1, 2, 3].map((page) => pageHtml(d, '<p>x</p>', page, 3));
    pages.forEach((page) => {
      expect(page).toContain(REPORT_BRAND);
      expect(page).toContain(REPORT_WATERMARK_TEXT);
      expect(page).toContain('scssoftwares.com');
    });
    expect(pages[1]).toContain('Page 2 of 3');
  });

  it('drops only the watermark when a document is not a free one', () => {
    const page = pageHtml(doc({ watermark: false }), '', 1, 1);
    expect(page).not.toContain('rp-watermark');
    // The running company label stays on every page regardless.
    expect(page).toContain(REPORT_BRAND);
  });

  it('carries the language and direction of the reader into the document', () => {
    const shell = reportShellHtml(doc({ lang: 'ar', dir: 'rtl' }), '');
    expect(shell).toContain('lang="ar"');
    expect(shell).toContain('dir="rtl"');
  });
});
