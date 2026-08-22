/**
 * `2026-08-23` → `23 August 2026`.
 *
 * Its own module so both the article layout and the hub can use it without
 * either file exporting a non-component alongside a component.
 *
 * Deliberately not `toLocaleDateString`: this string is rendered at build time
 * by Node and again in the browser, and the two must agree exactly or React
 * reports a hydration mismatch on every article. A fixed English month list has
 * no locale or timezone to disagree about. The machine-readable form lives in
 * the `<time datetime>` attribute next to it, which is what a crawler reads.
 */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatArticleDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
