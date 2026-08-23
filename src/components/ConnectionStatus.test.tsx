// The connection drawer's view contract. These assertions pin the promises the
// drawer makes to a visitor whose internet drops mid-visit: the page itself is
// untouched, the outage is named in their own language, a live outage can be
// shrunk but never dismissed, and the actions the outage cost them are listed
// with the reload that recovers them.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '@/i18n/config';
import i18n from 'i18next';
import { ConnectionPanel, type ConnectionPanelProps } from './ConnectionStatus';
import type { BlockedAction } from '@/services/networkStatus';

const noop = () => {};

const render = (overrides: Partial<ConnectionPanelProps> = {}): string =>
  renderToStaticMarkup(
    <ConnectionPanel
      online={false}
      checking={false}
      outage="0:42"
      lastChecked="10:04"
      blocked={[]}
      collapsed={false}
      onCollapse={noop}
      onExpand={noop}
      onCheck={noop}
      onDismiss={noop}
      onReload={noop}
      {...overrides}
    />,
  );

const blocked = (kind: BlockedAction['kind'], count = 1): BlockedAction => ({ kind, count, at: 0 });

describe('ConnectionPanel — offline', () => {
  it('names the outage, its length and how to re-check', () => {
    const html = render();
    expect(html).toContain('No internet connection');
    expect(html).toContain('Offline for 0:42');
    expect(html).toContain('Check again');
    expect(html).toContain('Last checked at 10:04');
  });

  it('tells the visitor the loaded page still works', () => {
    expect(render()).toContain('This page keeps working');
  });

  it('is announced politely rather than grabbing focus', () => {
    const html = render();
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('sits on the right edge and never prints', () => {
    const html = render();
    expect(html).toContain('right-0');
    expect(html).toContain('no-print');
  });

  it('offers collapse — never dismiss — while the connection is down', () => {
    const html = render();
    expect(html).toContain('aria-label="Hide the connection notice"');
    expect(html).not.toContain('>Dismiss<');
  });

  it('collapses to a labelled rail that stays on the edge', () => {
    const html = render({ collapsed: true });
    expect(html).toContain('aria-label="No internet connection — show details"');
    expect(html).toContain('fixed right-0');
    expect(html).not.toContain('Check again'); // the panel body is gone
  });

  it('shows the re-check as running and hides the stale last-checked time', () => {
    const html = render({ checking: true });
    expect(html).toContain('Checking the connection…');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('Last checked');
  });

  it('lists what the outage cost the visitor, with repeat counts', () => {
    const html = render({ blocked: [blocked('form', 3), blocked('page')] });
    expect(html).toContain('Waiting for the connection');
    expect(html).toContain('Form could not be sent');
    expect(html).toContain('Page could not load');
    expect(html).toContain('×3');
  });
});

describe('ConnectionPanel — back online', () => {
  const online = { online: true, outage: null } satisfies Partial<ConnectionPanelProps>;

  it('turns into a recovery notice the visitor can dismiss', () => {
    const html = render(online);
    expect(html).toContain('Back online');
    expect(html).toContain('Dismiss');
    expect(html).toContain('bg-emerald-50/95');
    expect(html).not.toContain('Offline for');
  });

  it('offers a reload only when an action was actually lost', () => {
    expect(render(online)).not.toContain('Reload page');
    expect(render({ ...online, blocked: [blocked('ai')] })).toContain('Reload page');
  });
});

describe('ConnectionPanel — other languages', () => {
  it('renders the outage in Arabic and Urdu', async () => {
    await i18n.changeLanguage('ar');
    expect(render()).toContain('لا يوجد اتصال بالإنترنت');
    await i18n.changeLanguage('ur');
    expect(render()).toContain('انٹرنیٹ کنیکشن نہیں ہے');
    await i18n.changeLanguage('en');
  });
});
