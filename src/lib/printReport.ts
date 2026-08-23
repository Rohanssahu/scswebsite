/**
 * Branded PDF/print renderer for every document this site hands to a visitor.
 *
 * Why it exists: browsers only reliably repeat *content* on every printed page,
 * not fixed overlays (Firefox prints `position: fixed` once) and not background
 * images (Chrome's "Background graphics" checkbox is off by default). So this
 * module lays the document out itself: it measures each block, flows the blocks
 * into fixed A4 pages, and stamps every one of those pages with the company
 * name — a running header label, a footer line, and a diagonal watermark drawn
 * as *text* so it survives both of those browser defaults.
 *
 * Every free document is watermarked. `watermark: false` exists for a future
 * paid / human-reviewed deliverable; nothing in the app passes it today.
 */

import { CONTACT, SITE_NAME, SITE_ORIGIN } from '@/seo/site';

/** The stamp that must appear on every page of every free PDF. */
export const REPORT_BRAND = SITE_NAME;
export const REPORT_WATERMARK_TEXT = `${SITE_NAME} · Preliminary`;

/** How many watermark rows a page carries — enough to cover a full A4 sheet. */
const WATERMARK_ROWS = 3;

/** Reserved space for the next block when a heading must not be left stranded. */
const KEEP_WITH_NEXT_PX = 56;

export interface ReportPair {
  label: string;
  value: string;
}

export type ReportBlock =
  | { type: 'paragraphs'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'pairs'; items: ReportPair[] }
  | { type: 'table'; columns: string[]; rows: string[][]; total?: string[] }
  | { type: 'note'; text: string };

export interface ReportSection {
  title: string;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  /** Document heading, printed on page one. */
  title: string;
  /** One-line standfirst under the title (the estimate disclaimer, usually). */
  subtitle?: string;
  /** Suggested file name — browsers offer the document title when saving a PDF. */
  fileName: string;
  /** Small label / value pairs printed under the title (date, mode, version). */
  meta: ReportPair[];
  /** Headline figures printed as a row of boxes. */
  stats: ReportPair[];
  sections: ReportSection[];
  /** Closing note, printed in a bordered box after the last section. */
  closingNote?: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Free documents are always watermarked. */
  watermark: boolean;
  /** "Page {n} of {total}" — supplied translated by the caller. */
  pageLabel: (page: number, total: number) => string;
}

// ---------------------------------------------------------------------------
// HTML building (pure — unit tested)
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * One measurable unit of the document. Tables carry their rows separately so a
 * long table can be split across pages with its header row repeated.
 */
export type ReportAtom =
  | { kind: 'html'; html: string; keepWithNext?: boolean }
  | { kind: 'table'; head: string; rows: string[] };

const cell = (value: string, tag: 'td' | 'th' = 'td') => `<${tag}>${escapeHtml(value)}</${tag}>`;

function blockAtoms(block: ReportBlock): ReportAtom[] {
  switch (block.type) {
    case 'paragraphs':
      return block.items.filter(Boolean).map((text) => ({ kind: 'html', html: `<p>${escapeHtml(text)}</p>` }));
    case 'list':
      // One atom per item so a long list flows across pages instead of overflowing.
      return block.items
        .filter(Boolean)
        .map((text) => ({ kind: 'html', html: `<ul class="rp-list"><li>${escapeHtml(text)}</li></ul>` }));
    case 'pairs':
      return block.items.map((pair) => ({
        kind: 'html',
        html: `<div class="rp-pair"><span class="rp-pair-label">${escapeHtml(pair.label)}</span><span class="rp-pair-value">${escapeHtml(pair.value)}</span></div>`,
      }));
    case 'note':
      return [{ kind: 'html', html: `<div class="rp-note">${escapeHtml(block.text)}</div>` }];
    case 'table': {
      const head = `<thead><tr>${block.columns.map((c) => cell(c, 'th')).join('')}</tr></thead>`;
      const rows = block.rows.map((row) => `<tbody><tr>${row.map((c) => cell(c)).join('')}</tr></tbody>`);
      if (block.total) {
        rows.push(`<tbody><tr class="rp-total">${block.total.map((c) => cell(c)).join('')}</tr></tbody>`);
      }
      return [{ kind: 'table', head, rows }];
    }
  }
}

/** Flatten a document into the ordered atoms the paginator flows into pages. */
export function documentAtoms(doc: ReportDocument): ReportAtom[] {
  const atoms: ReportAtom[] = [];

  atoms.push({ kind: 'html', html: `<h1 class="rp-title">${escapeHtml(doc.title)}</h1>`, keepWithNext: true });
  if (doc.subtitle) atoms.push({ kind: 'html', html: `<p class="rp-subtitle">${escapeHtml(doc.subtitle)}</p>` });
  if (doc.meta.length) {
    atoms.push({
      kind: 'html',
      html: `<div class="rp-meta">${doc.meta
        .map((m) => `<span><b>${escapeHtml(m.label)}:</b> ${escapeHtml(m.value)}</span>`)
        .join('')}</div>`,
    });
  }
  if (doc.stats.length) {
    atoms.push({
      kind: 'html',
      html: `<div class="rp-stats">${doc.stats
        .map((s) => `<div class="rp-stat"><b>${escapeHtml(s.value)}</b><span>${escapeHtml(s.label)}</span></div>`)
        .join('')}</div>`,
    });
  }

  for (const section of doc.sections) {
    const inner = section.blocks.flatMap(blockAtoms);
    if (inner.length === 0) continue; // never print an empty heading
    atoms.push({ kind: 'html', html: `<h2 class="rp-h2">${escapeHtml(section.title)}</h2>`, keepWithNext: true });
    atoms.push(...inner);
  }

  if (doc.closingNote) atoms.push({ kind: 'html', html: `<div class="rp-note">${escapeHtml(doc.closingNote)}</div>` });
  return atoms;
}

// ---------------------------------------------------------------------------
// Pagination (pure — the measurer is injected, so this is unit tested in node)
// ---------------------------------------------------------------------------

export interface AtomMetrics {
  /** Rendered height of an `html` atom. Ignored for tables. */
  height: number;
  /** Height of a table's repeated header row. */
  headHeight?: number;
  /** Height of each table row, in order. */
  rowHeights?: number[];
}

export type Measurer = (atom: ReportAtom) => AtomMetrics;

/**
 * Flow atoms into pages of `pageHeight` pixels. Returns each page's inner HTML.
 * A block taller than a whole page is placed anyway (clipped by the page) —
 * never dropped.
 */
export function paginate(atoms: ReportAtom[], measure: Measurer, pageHeight: number): string[] {
  const pages: string[] = [];
  let current: string[] = [];
  let used = 0;

  const flush = () => {
    if (current.length === 0) return;
    pages.push(current.join(''));
    current = [];
    used = 0;
  };
  /** An empty page always accepts the next block, however tall it is. */
  const fits = (height: number) => used === 0 || used + height <= pageHeight;

  atoms.forEach((atom, index) => {
    const metrics = measure(atom);

    if (atom.kind === 'html') {
      let needed = metrics.height;
      const next = atoms[index + 1];
      if (atom.keepWithNext && next) {
        needed += Math.min(measure(next).height || KEEP_WITH_NEXT_PX, KEEP_WITH_NEXT_PX);
      }
      if (!fits(needed)) flush();
      current.push(atom.html);
      used += metrics.height;
      return;
    }

    const headHeight = metrics.headHeight ?? 0;
    const rowHeights = metrics.rowHeights ?? [];
    let row = 0;
    while (row < atom.rows.length) {
      if (!fits(headHeight + (rowHeights[row] ?? 0))) flush();
      const chunk: string[] = [];
      let height = headHeight;
      while (row < atom.rows.length) {
        const rowHeight = rowHeights[row] ?? 0;
        const roomLeft = used + height + rowHeight <= pageHeight;
        if (!roomLeft && !(used === 0 && chunk.length === 0)) break;
        height += rowHeight;
        chunk.push(atom.rows[row]);
        row += 1;
      }
      current.push(`<table class="rp-table">${atom.head}${chunk.join('')}</table>`);
      used += height;
      if (row < atom.rows.length) flush(); // remaining rows continue overleaf, header repeated
    }
  });

  flush();
  return pages.length ? pages : [''];
}

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

const CONTACT_LINE = `${SITE_NAME} · ${SITE_ORIGIN.replace(/^https?:\/\//, '')} · ${CONTACT.email}`;

function watermarkHtml(): string {
  const row = `<span>${escapeHtml(REPORT_WATERMARK_TEXT)}</span>`;
  return `<div class="rp-watermark" aria-hidden="true">${row.repeat(WATERMARK_ROWS)}</div>`;
}

/** One A4 page: brand header label, flowed content, footer, watermark. */
export function pageHtml(doc: ReportDocument, inner: string, page: number, total: number): string {
  return (
    `<section class="rp-page">` +
    (doc.watermark ? watermarkHtml() : '') +
    `<header class="rp-header"><span class="rp-brandmark">${escapeHtml(REPORT_BRAND)}</span>` +
    `<span class="rp-header-doc">${escapeHtml(doc.title)}</span></header>` +
    `<div class="rp-content">${inner}</div>` +
    `<footer class="rp-footer"><span>${escapeHtml(CONTACT_LINE)}</span>` +
    `<span>${escapeHtml(doc.pageLabel(page, total))}</span></footer>` +
    `</section>`
  );
}

export const REPORT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  color: #111827;
  font-family: 'Segoe UI', system-ui, -apple-system, 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', Arial, sans-serif;
  font-size: 11.5px;
  line-height: 1.55;
}
.rp-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  padding: 13mm 16mm 10mm;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  page-break-after: always;
  break-after: page;
}
.rp-page:last-of-type { page-break-after: auto; break-after: auto; }
.rp-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8mm;
  border-bottom: 1.5px solid #db2777;
  padding-bottom: 5px;
}
.rp-brandmark { font-size: 13px; font-weight: 700; letter-spacing: .01em; color: #9d174d; white-space: nowrap; }
.rp-header-doc { font-size: 9px; color: #6b7280; text-align: end; }
.rp-content { position: relative; z-index: 1; flex: 1 1 auto; padding-top: 7mm; overflow: hidden; }
.rp-footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  border-top: 1px solid #e5e7eb;
  padding-top: 4px;
  font-size: 8.5px;
  color: #6b7280;
}
.rp-watermark {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  pointer-events: none;
}
.rp-watermark span {
  transform: rotate(-30deg);
  white-space: nowrap;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: .16em;
  color: rgba(219, 39, 119, .11);
}
.rp-title { margin: 0; font-size: 21px; line-height: 1.25; color: #111827; }
.rp-subtitle { margin: 5px 0 0; font-size: 10.5px; color: #6b7280; }
.rp-meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 9px; color: #4b5563; }
.rp-meta b { color: #111827; font-weight: 600; }
.rp-stats { margin-top: 10px; display: flex; gap: 6px; }
.rp-stat { flex: 1 1 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 7px 8px; }
.rp-stat b { display: block; font-size: 14px; color: #111827; }
.rp-stat span { font-size: 8.5px; color: #6b7280; }
.rp-h2 {
  margin: 14px 0 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #be185d;
}
.rp-content p { margin: 6px 0 0; }
.rp-list { margin: 4px 0 0; padding-inline-start: 15px; }
.rp-list li { margin: 0; padding: 0; }
.rp-pair { margin-top: 4px; display: flex; gap: 8px; }
.rp-pair-label { min-width: 34mm; font-weight: 600; color: #374151; }
.rp-pair-value { flex: 1 1 auto; }
.rp-note {
  margin-top: 10px;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 9.5px;
  color: #78350f;
}
.rp-table { width: 100%; margin-top: 6px; border-collapse: collapse; }
.rp-table th, .rp-table td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: start; }
.rp-table th { font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
.rp-total td { font-weight: 700; color: #111827; }
#rp-measure { position: absolute; top: 0; left: -10000px; visibility: hidden; display: flow-root; }
@media screen { body { background: #f3f4f6; padding: 12px 0; } .rp-page { margin: 0 auto 12px; box-shadow: 0 1px 6px rgba(0,0,0,.18); } }
`;

export function reportShellHtml(doc: ReportDocument, body: string): string {
  return (
    `<!doctype html><html lang="${escapeHtml(doc.lang)}" dir="${doc.dir}"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${escapeHtml(doc.fileName)}</title><style>${REPORT_CSS}</style></head>` +
    `<body>${body}</body></html>`
  );
}

// ---------------------------------------------------------------------------
// Browser rendering
// ---------------------------------------------------------------------------

/** Measure atoms against a live element that has the real page content width. */
function domMeasurer(host: HTMLElement): Measurer {
  return (atom) => {
    if (atom.kind === 'html') {
      host.innerHTML = atom.html;
      return { height: host.offsetHeight };
    }
    // Render the whole table once, then read the real header and row heights.
    host.innerHTML = `<table class="rp-table">${atom.head}${atom.rows.join('')}</table>`;
    const table = host.querySelector('table');
    const headHeight = table?.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const rowHeights = Array.from(table?.querySelectorAll('tbody') ?? []).map((b) => b.getBoundingClientRect().height);
    return { height: host.offsetHeight, headHeight, rowHeights };
  };
}

/**
 * Lay the document out and open the browser's print dialog on it, so the
 * visitor saves a real PDF. Rendering happens inside an offscreen iframe: the
 * page the visitor is on is never disturbed and its styles cannot leak in.
 */
export function printReport(doc: ReportDocument): boolean {
  if (typeof document === 'undefined') return false;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', doc.fileName);
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(frame);

  const frameDoc = frame.contentDocument;
  const frameWin = frame.contentWindow;
  if (!frameDoc || !frameWin) {
    frame.remove();
    return false;
  }

  // Pass one: a single empty page, so the real content box can be measured.
  frameDoc.open();
  frameDoc.write(reportShellHtml(doc, `${pageHtml(doc, '', 1, 1)}<div id="rp-measure"></div>`));
  frameDoc.close();

  const content = frameDoc.querySelector<HTMLElement>('.rp-content');
  const measure = frameDoc.getElementById('rp-measure');
  if (!content || !measure) {
    frame.remove();
    return false;
  }
  const pageHeight = content.clientHeight;
  measure.style.width = `${content.clientWidth}px`;

  // Pass two: flow the atoms into pages and replace the body with them.
  const pages = paginate(documentAtoms(doc), domMeasurer(measure), pageHeight);
  frameDoc.body.innerHTML = pages.map((inner, i) => pageHtml(doc, inner, i + 1, pages.length)).join('');

  const cleanup = () => {
    window.clearTimeout(fallback);
    frame.remove();
  };
  const fallback = window.setTimeout(cleanup, 60_000);
  frameWin.addEventListener('afterprint', cleanup, { once: true });

  // Let the fresh layout settle before the dialog snapshots it.
  window.setTimeout(() => {
    frameWin.focus();
    frameWin.print();
  }, 60);
  return true;
}
