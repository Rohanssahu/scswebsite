// =============================================================================
// submit-lead — the single trusted entry point for all public lead
// submissions (contact / consultation / project_requirement / human_review).
//
// Pipeline: method check → origin allowlist/CORS → body size + JSON parse →
// validation (./validation.ts) → Turnstile server-side verification →
// rate limit (salted IP hash) → atomic insert via public.submit_lead_tx →
// safe response ({ ok, referenceCode, … }) with no internal details.
//
// Secrets (Supabase Edge Function secrets — NEVER in the frontend):
//   TURNSTILE_SECRET_KEY  Cloudflare Turnstile secret (required)
//   ALLOWED_ORIGINS       optional comma-separated extra origins
//   RATE_LIMIT_SALT       optional salt for IP hashing (fallback provided)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  isOriginAllowed,
  resolveAllowedOrigins,
  validateSubmission,
  type ValidatedRequirement,
  type ValidatedReview,
  type ValidatedLead,
} from './validation.ts';

const MAX_BODY_BYTES = 100_000;
const RATE_LIMITS = [
  { windowMinutes: 10, maxSubmissions: 5 },
  { windowMinutes: 24 * 60, maxSubmissions: 20 },
];

type ResendEmail = { from: string; to: [string]; subject: string; text: string };

/** Keep visitor-provided values safe for an email body and bounded in logs. */
const clean = (value: string | null | undefined): string => (value ?? '').replace(/[\r\n]+/g, ' ').trim();

function leadLabel(lead: ValidatedLead): string {
  if (lead.service?.startsWith('Job application')) return 'Job application';
  return ({
    contact: 'Contact form',
    consultation: 'Schedule call',
    project_requirement: 'Project estimate',
    human_review: 'Human review request',
  } as Record<string, string>)[lead.lead_type] ?? 'Website lead';
}

/** Recipient comes only from the private server secret, never the request. */
function buildAdminLeadEmail(
  lead: ValidatedLead,
  requirement: ValidatedRequirement | null,
  review: ValidatedReview | null,
  referenceCode: string,
): ResendEmail | null {
  const recipient = Deno.env.get('LEAD_ADMIN_EMAIL')?.trim();
  if (!recipient) return null;
  const lines = [
    `New ${leadLabel(lead)} — ${referenceCode}`,
    '',
    `Name: ${clean(lead.name)}`,
    `Email: ${clean(lead.email)}`,
    ...(lead.phone ? [`Phone / WhatsApp: ${clean(lead.phone)}`] : []),
    ...(lead.company ? [`Company: ${clean(lead.company)}`] : []),
    ...(lead.country ? [`Country: ${clean(lead.country)}`] : []),
    ...(lead.service ? [`Service: ${clean(lead.service)}`] : []),
    ...(lead.project_mode ? [`Project mode: ${clean(lead.project_mode)}`] : []),
    ...(lead.budget_range ? [`Budget: ${clean(lead.budget_range)}`] : []),
    ...(lead.timeline ? [`Timeline: ${clean(lead.timeline)}`] : []),
    ...(lead.preferred_contact_method ? [`Preferred contact: ${clean(lead.preferred_contact_method)}`] : []),
    ...(lead.source ? [`Submitted from: ${clean(lead.source)}`] : []),
    '',
    ...(lead.project_summary ? ['Message:', clean(lead.project_summary), ''] : []),
    ...(requirement?.requirement_summary ? ['Requirement summary:', clean(requirement.requirement_summary), ''] : []),
    ...(review?.visitor_message ? ['Review request:', clean(review.visitor_message), ''] : []),
    'This lead is also stored securely in the SCS admin dashboard.',
  ];
  return {
    from: Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'SCS Softwares <onboarding@resend.dev>',
    to: [recipient],
    subject: `[SCS lead] ${leadLabel(lead)} — ${referenceCode}`,
    text: lines.join('\n'),
  };
}

/** Best effort only: a saved lead must never fail because email delivery does. */
async function notifyAdminOfLead(
  lead: ValidatedLead,
  requirement: ValidatedRequirement | null,
  review: ValidatedReview | null,
  referenceCode: string,
): Promise<void> {
  const email = buildAdminLeadEmail(lead, requirement, review, referenceCode);
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!email || !apiKey) return;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });
    if (!response.ok) console.error('submit-lead: notification email rejected', response.status);
  } catch {
    console.error('submit-lead: notification email could not be sent');
  }
}

const allowedOrigins = resolveAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status: number, body: Record<string, unknown>, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function clientError(status: number, error: string, message: string, origin: string): Response {
  return json(status, { ok: false, error, message }, origin);
}

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    // Fail closed: verification is never bypassed because a key is missing.
    console.error('submit-lead: TURNSTILE_SECRET_KEY is not configured');
    return false;
  }
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) form.set('remoteip', remoteIp);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const outcome = (await res.json()) as { success?: boolean; ['error-codes']?: string[] };
    if (!outcome.success) {
      console.warn('submit-lead: turnstile rejected', outcome['error-codes'] ?? []);
    }
    return outcome.success === true;
  } catch (e) {
    console.error('submit-lead: turnstile verification call failed', e);
    return false;
  }
}

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('RATE_LIMIT_SALT') ?? 'scs-lead-rate-limit-v1';
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns true when the caller is within all rate windows. */
async function checkRateLimit(ipHash: string): Promise<boolean> {
  for (const { windowMinutes, maxSubmissions } of RATE_LIMITS) {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from('lead_submission_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (error) {
      console.error('submit-lead: rate-limit query failed', error.message);
      return true; // availability over strictness — Turnstile still gates
    }
    if ((count ?? 0) >= maxSubmissions) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const originAllowed = isOriginAllowed(origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return originAllowed
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response('Forbidden', { status: 403 });
  }

  if (!originAllowed) {
    // Unknown origins get no CORS headers and no details.
    return new Response(JSON.stringify({ ok: false, error: 'forbidden_origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return clientError(405, 'method_not_allowed', 'Use POST.', origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return clientError(413, 'payload_too_large', 'Submission is too large.', origin);
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return clientError(413, 'payload_too_large', 'Submission is too large.', origin);
    }
    body = JSON.parse(text);
  } catch {
    return clientError(400, 'invalid_json', 'Body must be valid JSON.', origin);
  }

  const validated = validateSubmission(body);
  if (!validated.ok) {
    // Honeypot hits and malformed input share a terse, generic rejection.
    const status = validated.error === 'honeypot' ? 400 : 422;
    return clientError(status, validated.error, validated.message, origin);
  }
  const { action, turnstileToken, lead, requirement, review } = validated.data;

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip');

  const turnstileOk = await verifyTurnstile(turnstileToken, clientIp);
  if (!turnstileOk) {
    return clientError(
      403,
      'turnstile_failed',
      'Human verification failed or expired. Please retry the check and submit again.',
      origin,
    );
  }

  const ipHash = await hashIp(clientIp ?? 'unknown');
  if (!(await checkRateLimit(ipHash))) {
    return clientError(
      429,
      'rate_limited',
      'Too many submissions from your network. Please try again later.',
      origin,
    );
  }

  const { error: rpcError, data } = await supabase.rpc('submit_lead_tx', {
    payload: { lead, requirement, review },
  });
  if (rpcError || !data?.reference_code) {
    // Full detail goes to function logs only — never to the browser.
    console.error('submit-lead: submit_lead_tx failed', rpcError?.message ?? 'no data');
    return clientError(500, 'storage_failed', 'We could not save your submission. Please try again.', origin);
  }

  await notifyAdminOfLead(lead, requirement, review, data.reference_code as string);

  // Best-effort rate-limit event + housekeeping; a failure here never blocks
  // the visitor’s already-stored submission.
  const { error: eventError } = await supabase
    .from('lead_submission_events')
    .insert({ ip_hash: ipHash });
  if (eventError) console.error('submit-lead: rate event insert failed', eventError.message);
  supabase
    .from('lead_submission_events')
    .delete()
    .lt('created_at', new Date(Date.now() - 48 * 3600_000).toISOString())
    .then(({ error }) => {
      if (error) console.error('submit-lead: rate event cleanup failed', error.message);
    });

  return json(
    200,
    {
      ok: true,
      action,
      referenceCode: data.reference_code as string,
      ...(action === 'human_review' ? { reviewStatus: 'requested' } : {}),
    },
    origin,
  );
});
