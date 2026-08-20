// =============================================================================
// voice-lead — server-to-server endpoint for the Buddy agent worker.
//
// NOT a browser endpoint: there is no CORS support at all, and every request
// must carry the shared secret in `x-buddy-agent-key`. The worker uses it to:
//   action=submit_lead          convert a confirmed session into a lead
//                               (atomic via submit_voice_lead_tx) and send
//                               the client + admin emails through Resend
//   action=session_event        append a privacy-safe session event
//   action=session_status       update session lifecycle status
//   action=retry_notifications  retry failed emails for a lead
//
// Email failures NEVER roll back a stored lead — delivery status lives in
// lead_notifications and can be retried.
//
// Secrets (Supabase Edge Function secrets):
//   VOICE_AGENT_SECRET   shared secret the agent worker must present
//   RESEND_API_KEY       Resend API key
//   LEAD_ADMIN_EMAIL     internal notification recipient
//   EMAIL_FROM_ADDRESS   verified sender, e.g. "SCS Softwares <hello@scssoftwares.com>"
//   PUBLIC_SITE_URL      e.g. https://scssoftwares.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildAdminEmail, buildClientEmail, type EmailPayload, type NotificationInput } from './emails.ts';
import {
  validateSessionEvent,
  validateSessionStatus,
  validateVoiceSubmission,
} from './validation.ts';

const MAX_BODY_BYTES = 200_000;
const MAX_EMAIL_ATTEMPTS = 5;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const clientError = (status: number, error: string, message: string) =>
  json(status, { ok: false, error, message });

/** Timing-safe secret check via SHA-256 digest comparison. */
async function isAuthorized(req: Request): Promise<boolean> {
  const secret = Deno.env.get('VOICE_AGENT_SECRET');
  if (!secret || secret.length < 16) {
    console.error('voice-lead: VOICE_AGENT_SECRET is not configured (min 16 chars)');
    return false; // fail closed
  }
  const provided = req.headers.get('x-buddy-agent-key') ?? '';
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(secret)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}

// --- email delivery ---------------------------------------------------------------

async function sendViaResend(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'resend_not_configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Log status only — provider response bodies stay in function logs.
      const detail = await res.text().catch(() => '');
      console.error('voice-lead: resend rejected', res.status, detail.slice(0, 500));
      return { ok: false, error: `resend_http_${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('voice-lead: resend call failed', e);
    return { ok: false, error: 'resend_network' };
  }
}

async function recordNotification(
  leadId: string,
  recipient: 'client' | 'admin',
  result: { ok: boolean; id?: string; error?: string },
): Promise<void> {
  const { data: row } = await supabase
    .from('lead_notifications')
    .select('attempts')
    .eq('lead_id', leadId)
    .eq('recipient', recipient)
    .maybeSingle();
  const attempts = Math.min((row?.attempts ?? 0) + 1, 10);
  const { error } = await supabase
    .from('lead_notifications')
    .update({
      status: result.ok ? 'sent' : 'failed',
      attempts,
      last_error: result.ok ? null : (result.error ?? 'unknown').slice(0, 300),
      provider_id: result.id ?? null,
    })
    .eq('lead_id', leadId)
    .eq('recipient', recipient);
  if (error) console.error('voice-lead: notification update failed', error.message);
}

async function sendLeadEmails(input: NotificationInput, leadId: string): Promise<{ client: boolean; admin: boolean }> {
  const clientResult = await sendViaResend(buildClientEmail(input));
  await recordNotification(leadId, 'client', clientResult);
  let adminOk = false;
  if (input.adminEmail) {
    const adminResult = await sendViaResend(buildAdminEmail(input));
    await recordNotification(leadId, 'admin', adminResult);
    adminOk = adminResult.ok;
  }
  return { client: clientResult.ok, admin: adminOk };
}

// --- actions ----------------------------------------------------------------------

async function handleSubmitLead(body: unknown): Promise<Response> {
  const validated = validateVoiceSubmission(body);
  if (!validated.ok) return clientError(422, validated.error, validated.message);
  const s = validated.data;

  const adminEmail = Deno.env.get('LEAD_ADMIN_EMAIL') ?? '';
  const { data, error } = await supabase.rpc('submit_voice_lead_tx', {
    payload: {
      session_id: s.session_id,
      lead: s.lead,
      requirement: s.requirement,
      estimate: {
        currency: s.estimate.currency,
        config_version: s.estimate.config_version,
        breakdown: {
          modules: s.estimate.modules,
          architecture: s.estimate.architecture,
          role_hours: s.estimate.role_hours,
          team_roles: s.estimate.team_roles,
          hourly_rate_min: s.estimate.hourly_rate_min,
          hourly_rate_max: s.estimate.hourly_rate_max,
          weekly_capacity_hours: s.estimate.weekly_capacity_hours,
          assumptions: s.estimate.assumptions,
          exclusions: s.estimate.exclusions,
          risks: s.estimate.risks,
        },
        total_hours_min: s.estimate.total_hours_min,
        total_hours_max: s.estimate.total_hours_max,
        total_cost_min: s.estimate.total_cost_min,
        total_cost_max: s.estimate.total_cost_max,
        duration_weeks_min: s.estimate.duration_weeks_min,
        duration_weeks_max: s.estimate.duration_weeks_max,
        confidence: s.estimate.confidence,
      },
      review: s.review,
      admin_email: adminEmail,
    },
  });

  if (error || !data?.reference_code) {
    const message = error?.message ?? '';
    if (message.includes('already submitted')) {
      return clientError(409, 'duplicate_submission', 'This session was already submitted.');
    }
    if (message.includes('not found')) {
      return clientError(404, 'session_not_found', 'Unknown voice session.');
    }
    console.error('voice-lead: submit_voice_lead_tx failed', message || 'no data');
    return clientError(500, 'storage_failed', 'Could not store the submission.');
  }

  const referenceCode = data.reference_code as string;
  const leadId = data.lead_id as string;

  // Emails are best-effort AFTER the lead is durably stored.
  const emails = await sendLeadEmails(
    {
      submission: s,
      referenceCode,
      fromAddress: Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'SCS Softwares <onboarding@resend.dev>',
      adminEmail,
      siteUrl: (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://scssoftwares.com').replace(/\/+$/, ''),
    },
    leadId,
  );

  return json(200, {
    ok: true,
    referenceCode,
    leadId,
    estimateId: data.estimate_id ?? null,
    reviewRequested: s.review !== null,
    notifications: emails,
  });
}

async function handleSessionEvent(body: unknown): Promise<Response> {
  const validated = validateSessionEvent(body);
  if (!validated.ok) return clientError(422, validated.error, validated.message);
  const { error } = await supabase.from('voice_session_events').insert({
    session_id: validated.data.session_id,
    event_type: validated.data.event_type,
    data: validated.data.data,
  });
  if (error) {
    console.error('voice-lead: event insert failed', error.message);
    return clientError(500, 'storage_failed', 'Could not store the event.');
  }
  return json(200, { ok: true });
}

async function handleSessionStatus(body: unknown): Promise<Response> {
  const validated = validateSessionStatus(body);
  if (!validated.ok) return clientError(422, validated.error, validated.message);
  const d = validated.data;
  const patch: Record<string, unknown> = { status: d.status };
  if (d.disconnect_reason) patch.disconnect_reason = d.disconnect_reason;
  if (d.turn_count !== null) patch.turn_count = d.turn_count;
  if (d.selected_language) patch.selected_language = d.selected_language;
  if (d.started) patch.started_at = new Date().toISOString();
  if (d.ended) patch.ended_at = new Date().toISOString();
  const { error, data } = await supabase
    .from('voice_sessions')
    .update(patch)
    .eq('id', d.session_id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('voice-lead: status update failed', error.message);
    return clientError(500, 'storage_failed', 'Could not update the session.');
  }
  if (!data) return clientError(404, 'session_not_found', 'Unknown voice session.');
  return json(200, { ok: true });
}

/**
 * Retry failed emails for an already-stored lead. The worker re-sends the
 * SAME submit payload (it keeps it until the session ends); the lead itself
 * is never touched — only lead_notifications rows still marked failed and
 * under the attempt cap are re-sent, with content rebuilt from the payload
 * and recipients still fixed server-side.
 */
async function handleRetryNotifications(body: unknown): Promise<Response> {
  const validated = validateVoiceSubmission(body);
  if (!validated.ok) return clientError(422, validated.error, validated.message);
  const s = validated.data;

  const { data: session } = await supabase
    .from('voice_sessions')
    .select('lead_id')
    .eq('id', s.session_id)
    .maybeSingle();
  if (!session?.lead_id) {
    return clientError(404, 'not_found', 'No stored lead for this session.');
  }
  const { data: lead } = await supabase
    .from('leads')
    .select('reference_code')
    .eq('id', session.lead_id)
    .maybeSingle();
  if (!lead?.reference_code) {
    return clientError(404, 'not_found', 'Stored lead is missing.');
  }

  const { data: rows, error } = await supabase
    .from('lead_notifications')
    .select('recipient, status, attempts')
    .eq('lead_id', session.lead_id);
  if (error || !rows?.length) {
    return clientError(404, 'not_found', 'No notifications recorded for this lead.');
  }

  const adminEmail = Deno.env.get('LEAD_ADMIN_EMAIL') ?? '';
  const input: NotificationInput = {
    submission: s,
    referenceCode: lead.reference_code as string,
    fromAddress: Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'SCS Softwares <onboarding@resend.dev>',
    adminEmail,
    siteUrl: (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://scssoftwares.com').replace(/\/+$/, ''),
  };

  const results: Record<string, boolean> = {};
  for (const row of rows) {
    const retriable = row.status !== 'sent' && row.attempts < MAX_EMAIL_ATTEMPTS;
    if (!retriable) continue;
    if (row.recipient === 'client') {
      const r = await sendViaResend(buildClientEmail(input));
      await recordNotification(session.lead_id, 'client', r);
      results.client = r.ok;
    } else if (row.recipient === 'admin' && adminEmail) {
      const r = await sendViaResend(buildAdminEmail(input));
      await recordNotification(session.lead_id, 'admin', r);
      results.admin = r.ok;
    }
  }
  return json(200, { ok: true, referenceCode: lead.reference_code, retried: results });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return clientError(405, 'method_not_allowed', 'Use POST.');
  }
  if (!(await isAuthorized(req))) {
    return clientError(401, 'unauthorized', 'Missing or invalid agent key.');
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return clientError(413, 'payload_too_large', 'Request is too large.');
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return clientError(413, 'payload_too_large', 'Request is too large.');
    }
    body = JSON.parse(text);
  } catch {
    return clientError(400, 'invalid_json', 'Body must be valid JSON.');
  }

  const action = (body as { action?: unknown })?.action;
  switch (action) {
    case 'submit_lead':
      return handleSubmitLead(body);
    case 'session_event':
      return handleSessionEvent(body);
    case 'session_status':
      return handleSessionStatus(body);
    case 'retry_notifications':
      return handleRetryNotifications(body);
    default:
      return clientError(400, 'unknown_action', 'Unknown action.');
  }
});
