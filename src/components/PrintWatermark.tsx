import { SITE_NAME } from '@/seo/site';

/**
 * Brand stamp for anything the visitor prints straight from the site (Ctrl+P →
 * "Save as PDF"). It is hidden on screen and only paints when printing, so no
 * free PDF leaves the platform unbranded.
 *
 * Generated documents do not rely on this: `printReport` lays out its own pages
 * and stamps each one, which is the only way to guarantee the mark on *every*
 * page in every browser. This overlay is the safety net for the browser's own
 * print of a normal page.
 */
const PrintWatermark = () => (
  <div className="print-watermark" aria-hidden="true">
    <span className="print-watermark-mark">{SITE_NAME}</span>
    <span className="print-watermark-label">
      {SITE_NAME} — preliminary document, not a final quotation.
    </span>
  </div>
);

export default PrintWatermark;
