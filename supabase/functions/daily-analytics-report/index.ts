// =============================================================================
// daily-analytics-report — consent-based GA4 daily digest sent to the owner.
//
// Invoke once daily from a scheduler with:
//   Authorization: Bearer <DAILY_REPORT_SECRET>
//
// The report is aggregate only: country, city and device category. It never
// requests GA client IDs, IP addresses, form fields or unique device IDs.
// =============================================================================

import { SignJWT, importPKCS8 } from 'npm:jose@5.10.0';

type GaRow = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };
type GaResponse = { rows?: GaRow[] };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function sameSecret(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  if (av.length !== bv.length) return false;
  let different = 0;
  for (let i = 0; i < av.length; i++) different |= av[i] ^ bv[i];
  return different === 0;
}

async function googleAccessToken(): Promise<string> {
  const email = Deno.env.get('GA4_SERVICE_ACCOUNT_EMAIL') ?? '';
  const privateKey = (Deno.env.get('GA4_SERVICE_ACCOUNT_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('GA4 service account secrets are missing');
  const key = await importPKCS8(privateKey, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/analytics.readonly' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setSubject(email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Google token response had no access token');
  return data.access_token;
}

async function gaReport(accessToken: string, body: Record<string, unknown>): Promise<GaResponse> {
  const propertyId = Deno.env.get('GA4_PROPERTY_ID') ?? '';
  if (!/^\d+$/.test(propertyId)) throw new Error('GA4_PROPERTY_ID must be numeric');
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`GA4 report request failed (${response.status})`);
  return await response.json() as GaResponse;
}

const value = (row: GaRow | undefined, index: number, kind: 'dimensionValues' | 'metricValues') =>
  row?.[kind]?.[index]?.value ?? '0';

function reportText(summary: GaResponse, breakdown: GaResponse): string {
  const totals = summary.rows?.[0];
  const lines = [
    'SCS Softwares — daily website report',
    'Period: yesterday (GA4 property timezone)',
    '',
    `Active users: ${value(totals, 0, 'metricValues')}`,
    `Sessions: ${value(totals, 1, 'metricValues')}`,
    `New users: ${value(totals, 2, 'metricValues')}`,
    `Tracked events: ${value(totals, 3, 'metricValues')}`,
    '',
    'Top country / city / device combinations:',
  ];
  const rows = breakdown.rows ?? [];
  if (!rows.length) lines.push('No consented analytics data was recorded.');
  for (const row of rows.slice(0, 20)) {
    lines.push(`- ${value(row, 0, 'dimensionValues')} · ${value(row, 1, 'dimensionValues')} · ${value(row, 2, 'dimensionValues')}: ${value(row, 0, 'metricValues')} users, ${value(row, 1, 'metricValues')} sessions`);
  }
  lines.push('', 'This report is aggregate and consent-based. It contains no IP addresses, exact locations or unique device identifiers.');
  return lines.join('\n');
}

async function sendDigest(text: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const recipient = Deno.env.get('LEAD_ADMIN_EMAIL') ?? '';
  if (!apiKey || !recipient) throw new Error('Resend or lead recipient secret is missing');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'SCS Softwares <onboarding@resend.dev>',
      to: [recipient],
      subject: 'SCS Softwares — daily website visitor report',
      text,
    }),
  });
  if (!response.ok) throw new Error(`Resend email request failed (${response.status})`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  const expected = Deno.env.get('DAILY_REPORT_SECRET') ?? '';
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !(await sameSecret(provided, expected))) return json(401, { ok: false, error: 'unauthorized' });
  try {
    const token = await googleAccessToken();
    const dateRanges = [{ startDate: 'yesterday', endDate: 'yesterday' }];
    const [summary, breakdown] = await Promise.all([
      gaReport(token, {
        dateRanges,
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'newUsers' }, { name: 'eventCount' }],
      }),
      gaReport(token, {
        dateRanges,
        dimensions: [{ name: 'country' }, { name: 'city' }, { name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: '20',
      }),
    ]);
    await sendDigest(reportText(summary, breakdown));
    return json(200, { ok: true });
  } catch (error) {
    console.error('daily-analytics-report:', error instanceof Error ? error.message : 'unknown error');
    return json(500, { ok: false, error: 'report_failed' });
  }
});
