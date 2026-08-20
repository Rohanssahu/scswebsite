// Regression test: real users were rejected with the server's honeypot
// "Invalid submission." because browser autofill filled the hidden field.
// Autofill heuristics key off name/id/label semantics (e.g. "website") and
// skip readonly inputs — these assertions pin the autofill-proof contract.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HoneypotField from './HoneypotField';

const render = () => renderToStaticMarkup(<HoneypotField value="" onChange={() => {}} />);

describe('HoneypotField (autofill regression)', () => {
  it('never uses autofill-recognizable name/id/label like "website"', () => {
    const html = render().toLowerCase();
    expect(html).not.toMatch(/name="[^"]*(website|url|company|address|email|phone)[^"]*"/);
    expect(html).not.toMatch(/id="[^"]*(website|url)[^"]*"/);
    expect(html).not.toContain('>website<');
  });

  it('is readonly until focused, unfocusable and hidden from AT', () => {
    const html = render();
    expect(html).toContain('readonly=""');
    expect(html).toContain('tabindex="-1"');
    expect(html.toLowerCase()).toContain('autocomplete="off"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('carries password-manager ignore attributes', () => {
    const html = render();
    expect(html).toContain('data-1p-ignore="true"');
    expect(html).toContain('data-lpignore="true"');
    expect(html).toContain('data-form-type="other"');
  });

  it('stays an off-screen rendered input (not display:none) so bots still see it', () => {
    const html = render();
    expect(html).toContain('-9999px');
    expect(html).not.toContain('display:none');
  });
});
