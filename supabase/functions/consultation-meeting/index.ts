// =============================================================================
// consultation-meeting — browser-facing API for SCS AI Consultation Meetings.
//
// Actions (single POST endpoint, strict per-action schemas):
//   create         Turnstile + honeypot + rate limit → consultation_meetings
//                  row → returns the public reference + one-time access token.
//   resolve        reference + access token → safe lobby/meeting view.
//   join           reference + access token + Turnstile → fresh random LiveKit
//                  room, minimal-grant token, explicit `buddy-it-manager`
//                  dispatch (server-controlled — the browser can never pick
//                  the agent name, room or grants).
//   reschedule     move a scheduled meeting (token-scoped).
//   cancel         cancel a meeting (token-scoped).
//   submit_links   store validated repository/Figma/docs/site URLs + notes as
//                  UNTRUSTED metadata (never fetched or cloned).
//   request_review request a human follow-up (a request, not a confirmation).
//
// Security pipeline: feature flag → method → origin allowlist/CORS → body
// size + JSON parse → per-action validation (./validation.ts) → Turnstile
// (create/join) → rate limit (salted IP hash) → service-role writes.
// The access token is returned exactly once at creation; only its SHA-256
// hash is stored. A meeting reference alone never grants access.
//
// Secrets (Supabase Edge Function secrets — NEVER in the frontend):
//   LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET
//   TURNSTILE_SECRET_KEY     Cloudflare Turnstile secret
//   ALLOWED_ORIGINS          optional comma-separated extra origins
//   RATE_LIMIT_SALT          salt for IP hashing (shared with submit-lead)
//   CONSULTATION_ENABLED     global kill switch — must be exactly "true"
//   CONSULTATION_RATE_LIMITS optional "perHour,perDay" override, e.g. "5,12"
//   BUDDY_AGENT_NAME         optional dispatch-name override
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  evaluateJoinWindow,
  generateAccessToken,
  generateParticipantIdentity,
  generatePublicReference,
  generateRoomName,
  hashAccessToken,
  isConsultationEnabled,
  isOriginAllowed,
  LIMITS,
  resolveAgentName,
  resolveAllowedOrigins,
  resolveRateWindows,
  timingSafeEqualHex,
  TOKEN_TTL_SECONDS,
  validateCreateRequest,
  validateLinksRequest,
  validateRescheduleRequest,
  validateReviewRequest,
  validateScopedOnly,
  type ScopedRequestBase,
} from './validation.ts';
import { mintMeetingToken } from './token.ts';

const MAX_BODY_BYTES = 60_000;

const allowedOrigins = resolveAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
const rateWindows = resolveRateWindows(Deno.env.get('CONSULTATION_RATE_LIMITS'));
const agentName = resolveAgentName(Deno.env.get('BUDDY_AGENT_NAME'));

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
    console.error('consultation-meeting: TURNSTILE_SECRET_KEY is not configured');
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
    const outcome = (await res.json()) as { success?: boolean };
    return outcome.success === true;
  } catch (e) {
    console.error('consultation-meeting: turnstile verification call failed', e);
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

/** Fails CLOSED — consultations dispatch a paid AI agent. */
async function checkRateLimit(ipHash: string): Promise<boolean> {
  for (const { windowMinutes, maxMeetings } of rateWindows) {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from('consultation_meetings')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (error) {
      console.error('consultation-meeting: rate-limit query failed', error.message);
      return false;
    }
    if ((count ?? 0) >= maxMeetings) return false;
  }
  return true;
}

interface MeetingRow {
  id: string;
  public_reference: string;
  access_token_hash: string;
  meeting_kind: 'instant' | 'scheduled';
  status: string;
  review_status: string;
  name: string;
  client_timezone: string | null;
  scheduled_at: string | null;
  early_join_minutes: number;
  selected_language: string | null;
  transcript_consent: boolean;
  analysis_snapshot: Record<string, unknown>;
  join_count: number;
  lead_id: string | null;
  finalized_at: string | null;
  created_at: string;
}

const MEETING_COLUMNS =
  'id, public_reference, access_token_hash, meeting_kind, status, review_status, name, ' +
  'client_timezone, scheduled_at, early_join_minutes, selected_language, transcript_consent, ' +
  'analysis_snapshot, join_count, lead_id, finalized_at, created_at';

/** Load + authorize one meeting. Constant-time hash comparison; the same
 * generic error is returned whether the reference or the token is wrong. */
async function authorizeMeeting(scoped: ScopedRequestBase): Promise<MeetingRow | null> {
  const { data, error } = await supabase
    .from('consultation_meetings')
    .select(MEETING_COLUMNS)
    .eq('public_reference', scoped.reference)
    .maybeSingle();
  if (error) {
    console.error('consultation-meeting: meeting lookup failed', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as MeetingRow;
  const providedHash = await hashAccessToken(scoped.accessToken);
  if (!timingSafeEqualHex(providedHash, row.access_token_hash)) return null;
  return row;
}

function logEvent(meetingId: string, eventType: string, data: Record<string, unknown> = {}): void {
  void supabase
    .from('consultation_events')
    .insert({ meeting_id: meetingId, event_type: eventType, data })
    .then(({ error }) => {
      if (error) console.error('consultation-meeting: event insert failed', error.message);
    });
}

/** Safe, token-scoped view of a meeting for the client UI. */
function meetingView(row: MeetingRow, finalizedReference: string | null): Record<string, unknown> {
  const window = evaluateJoinWindow({
    meetingKind: row.meeting_kind,
    status: row.status,
    scheduledAtMs: row.scheduled_at ? Date.parse(row.scheduled_at) : null,
    earlyJoinMinutes: row.early_join_minutes,
    createdAtMs: Date.parse(row.created_at),
    nowMs: Date.now(),
  });
  const snapshot = row.analysis_snapshot ?? {};
  return {
    reference: row.public_reference,
    status: row.status,
    meetingKind: row.meeting_kind,
    reviewStatus: row.review_status,
    name: row.name,
    clientTimezone: row.client_timezone,
    scheduledAtUtc: row.scheduled_at,
    earlyJoinMinutes: row.early_join_minutes,
    preferredLanguage: row.selected_language,
    transcriptConsent: row.transcript_consent,
    hasAnalysis: Object.keys(snapshot).length > 0,
    analysisMode: typeof snapshot.mode === 'string' ? snapshot.mode : null,
    canJoin: window.canJoin,
    joinBlockedReason: window.canJoin ? null : window.reason,
    joinOpensAtUtc:
      !window.canJoin && window.opensAtMs ? new Date(window.opensAtMs).toISOString() : null,
    finalized: Boolean(row.finalized_at),
    finalizedReference,
  };
}

async function lookupFinalizedReference(row: MeetingRow): Promise<string | null> {
  if (!row.lead_id) return null;
  const { data } = await supabase
    .from('leads')
    .select('reference_code')
    .eq('id', row.lead_id)
    .maybeSingle();
  return (data?.reference_code as string | undefined) ?? null;
}

/** Mark a stale meeting expired (idempotent best-effort). */
async function expireIfNeeded(row: MeetingRow): Promise<MeetingRow> {
  const window = evaluateJoinWindow({
    meetingKind: row.meeting_kind,
    status: row.status,
    scheduledAtMs: row.scheduled_at ? Date.parse(row.scheduled_at) : null,
    earlyJoinMinutes: row.early_join_minutes,
    createdAtMs: Date.parse(row.created_at),
    nowMs: Date.now(),
  });
  if (!window.canJoin && window.reason === 'expired' && (row.status === 'scheduled' || row.status === 'in_progress')) {
    await supabase.from('consultation_meetings').update({ status: 'expired' }).eq('id', row.id);
    logEvent(row.id, 'expired');
    return { ...row, status: 'expired' };
  }
  return row;
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
    return new Response(JSON.stringify({ ok: false, error: 'forbidden_origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return clientError(405, 'method_not_allowed', 'Use POST.', origin);
  }

  if (!isConsultationEnabled(Deno.env.get('CONSULTATION_ENABLED'))) {
    return clientError(503, 'consultation_disabled', 'AI consultations are currently unavailable.', origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return clientError(413, 'payload_too_large', 'Request is too large.', origin);
  }

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return clientError(413, 'payload_too_large', 'Request is too large.', origin);
    }
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return clientError(400, 'invalid_json', 'Body must be a valid JSON object.', origin);
  }

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip');

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    switch (action) {
      // ------------------------------------------------------------------ create
      case 'create': {
        const validated = validateCreateRequest(body, Date.now());
        if ('ok' in validated) {
          const status = validated.error === 'honeypot' ? 400 : 422;
          return clientError(status, validated.error, validated.message, origin);
        }

        if (!(await verifyTurnstile(validated.turnstileToken, clientIp))) {
          return clientError(403, 'turnstile_failed', 'Human verification failed or expired.', origin);
        }

        const ipHash = await hashIp(clientIp ?? 'unknown');
        if (!(await checkRateLimit(ipHash))) {
          return clientError(429, 'rate_limited', 'Too many consultations from your network. Please try again later.', origin);
        }

        const reference = generatePublicReference();
        const accessToken = generateAccessToken();
        const accessTokenHash = await hashAccessToken(accessToken);
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from('consultation_meetings')
          .insert({
            public_reference: reference,
            access_token_hash: accessTokenHash,
            meeting_kind: validated.meetingKind,
            status: 'scheduled',
            name: validated.name,
            email: validated.email,
            phone: validated.phone,
            company: validated.company,
            client_timezone: validated.clientTimezone,
            scheduled_at: validated.scheduledAtUtc,
            selected_language: validated.preferredLanguage,
            consent_at: now,
            transcript_consent: validated.transcriptConsent,
            transcript_consent_at: validated.transcriptConsent ? now : null,
            analysis_snapshot: validated.analysisSnapshot ?? {},
            ip_hash: ipHash,
            origin,
          })
          .select(MEETING_COLUMNS)
          .single();
        if (error || !data) {
          console.error('consultation-meeting: insert failed', error?.message ?? 'no data');
          return clientError(500, 'storage_failed', 'Could not create the consultation. Please try again.', origin);
        }
        const row = data as MeetingRow;
        logEvent(row.id, 'meeting_created', {
          kind: validated.meetingKind,
          has_analysis: Boolean(validated.analysisSnapshot),
        });
        return json(200, { ok: true, accessToken, meeting: meetingView(row, null) }, origin);
      }

      // ----------------------------------------------------------------- resolve
      case 'resolve': {
        const validated = validateScopedOnly(body);
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        let row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);
        row = await expireIfNeeded(row);
        const finalizedReference = await lookupFinalizedReference(row);
        if (row.status === 'scheduled' || row.status === 'in_progress') {
          logEvent(row.id, 'lobby_opened');
        }
        return json(200, { ok: true, meeting: meetingView(row, finalizedReference) }, origin);
      }

      // -------------------------------------------------------------------- join
      case 'join': {
        // join carries an extra turnstileToken on top of the scoped proof.
        const { turnstileToken, ...rest } = body;
        const validated = validateScopedOnly(rest);
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        const turnstile = typeof turnstileToken === 'string' ? turnstileToken.trim() : '';
        if (turnstile.length < LIMITS.turnstileToken.min || turnstile.length > LIMITS.turnstileToken.max) {
          return clientError(422, 'invalid_request', 'Missing or invalid Turnstile token.', origin);
        }

        let row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);
        row = await expireIfNeeded(row);

        const window = evaluateJoinWindow({
          meetingKind: row.meeting_kind,
          status: row.status,
          scheduledAtMs: row.scheduled_at ? Date.parse(row.scheduled_at) : null,
          earlyJoinMinutes: row.early_join_minutes,
          createdAtMs: Date.parse(row.created_at),
          nowMs: Date.now(),
        });
        if (!window.canJoin) {
          return clientError(409, 'not_joinable', `Meeting cannot be joined (${window.reason}).`, origin);
        }

        if (!(await verifyTurnstile(turnstile, clientIp))) {
          return clientError(403, 'turnstile_failed', 'Human verification failed or expired.', origin);
        }

        const livekitUrl = Deno.env.get('LIVEKIT_URL');
        const apiKey = Deno.env.get('LIVEKIT_API_KEY');
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
        if (!livekitUrl || !apiKey || !apiSecret) {
          console.error('consultation-meeting: LiveKit credentials are not configured');
          return clientError(503, 'consultation_disabled', 'AI consultations are currently unavailable.', origin);
        }

        // Fresh, unguessable room + identity for every join. Never client input.
        const roomName = generateRoomName();
        const identity = generateParticipantIdentity();

        const { error: updateError } = await supabase
          .from('consultation_meetings')
          .update({
            status: 'in_progress',
            room_name: roomName,
            participant_identity: identity,
            started_at: row.join_count === 0 ? new Date().toISOString() : undefined,
            join_count: row.join_count + 1,
          })
          .eq('id', row.id);
        if (updateError) {
          console.error('consultation-meeting: join update failed', updateError.message);
          return clientError(500, 'storage_failed', 'Could not join the meeting. Please try again.', origin);
        }

        const token = await mintMeetingToken({
          apiKey,
          apiSecret,
          roomName,
          identity,
          // The worker trusts ONLY this server-minted metadata: mode switch +
          // meeting id + language hint. Nothing here comes from the browser
          // beyond values this function already validated and stored.
          metadata: JSON.stringify({
            mode: 'consultation',
            meetingId: row.id,
            preferredLanguage: row.selected_language,
          }),
          agentName,
        });

        logEvent(row.id, 'join_issued', { join_count: row.join_count + 1 });
        return json(
          200,
          {
            ok: true,
            url: livekitUrl,
            token,
            roomName,
            expiresInSeconds: TOKEN_TTL_SECONDS,
            meeting: meetingView({ ...row, status: 'in_progress' }, null),
          },
          origin,
        );
      }

      // ------------------------------------------------------------- reschedule
      case 'reschedule': {
        const validated = validateRescheduleRequest(body, Date.now());
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        const row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);
        if (row.meeting_kind !== 'scheduled' || row.status !== 'scheduled') {
          return clientError(409, 'not_reschedulable', 'This meeting can no longer be rescheduled.', origin);
        }
        const { error } = await supabase
          .from('consultation_meetings')
          .update({ scheduled_at: validated.scheduledAtUtc, client_timezone: validated.clientTimezone })
          .eq('id', row.id);
        if (error) {
          console.error('consultation-meeting: reschedule failed', error.message);
          return clientError(500, 'storage_failed', 'Could not reschedule. Please try again.', origin);
        }
        logEvent(row.id, 'rescheduled');
        return json(
          200,
          {
            ok: true,
            meeting: meetingView(
              { ...row, scheduled_at: validated.scheduledAtUtc, client_timezone: validated.clientTimezone },
              null,
            ),
          },
          origin,
        );
      }

      // ------------------------------------------------------------------ cancel
      case 'cancel': {
        const validated = validateScopedOnly(body);
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        const row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);
        if (row.status === 'completed' || row.status === 'cancelled') {
          return clientError(409, 'not_cancellable', 'This meeting can no longer be cancelled.', origin);
        }
        const { error } = await supabase
          .from('consultation_meetings')
          .update({ status: 'cancelled', ended_at: new Date().toISOString() })
          .eq('id', row.id);
        if (error) {
          console.error('consultation-meeting: cancel failed', error.message);
          return clientError(500, 'storage_failed', 'Could not cancel. Please try again.', origin);
        }
        logEvent(row.id, 'cancelled');
        return json(200, { ok: true, meeting: meetingView({ ...row, status: 'cancelled' }, null) }, origin);
      }

      // ------------------------------------------------------------ submit_links
      case 'submit_links': {
        const validated = validateLinksRequest(body);
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        const row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);

        const { count, error: countError } = await supabase
          .from('consultation_artifacts')
          .select('id', { count: 'exact', head: true })
          .eq('meeting_id', row.id);
        if (countError) {
          console.error('consultation-meeting: artifact count failed', countError.message);
          return clientError(500, 'storage_failed', 'Could not save the links. Please try again.', origin);
        }
        if ((count ?? 0) + validated.artifacts.length > LIMITS.maxLinksPerMeeting) {
          return clientError(409, 'too_many_links', 'Link limit for this meeting reached.', origin);
        }

        const { error } = await supabase.from('consultation_artifacts').insert(
          validated.artifacts.map((a) => ({
            meeting_id: row.id,
            kind: a.kind,
            url: a.url,
            host: a.host,
            label: a.label,
            note: a.note,
          })),
        );
        if (error) {
          console.error('consultation-meeting: artifact insert failed', error.message);
          return clientError(500, 'storage_failed', 'Could not save the links. Please try again.', origin);
        }
        logEvent(row.id, 'links_submitted', { count: validated.artifacts.length });
        return json(200, { ok: true, saved: validated.artifacts.length }, origin);
      }

      // ---------------------------------------------------------- request_review
      case 'request_review': {
        const validated = validateReviewRequest(body);
        if ('ok' in validated) return clientError(422, validated.error, validated.message, origin);
        const row = await authorizeMeeting(validated);
        if (!row) return clientError(404, 'meeting_not_found', 'Meeting not found or access denied.', origin);
        const { error } = await supabase
          .from('consultation_meetings')
          .update({ review_status: 'requested' })
          .eq('id', row.id);
        if (error) {
          console.error('consultation-meeting: review update failed', error.message);
          return clientError(500, 'storage_failed', 'Could not record the request. Please try again.', origin);
        }
        if (validated.message) {
          await supabase.from('consultation_artifacts').insert({
            meeting_id: row.id,
            kind: 'note',
            label: 'human_review_request',
            note: validated.message,
          });
        }
        logEvent(row.id, 'review_requested');
        return json(200, { ok: true, reviewStatus: 'requested' }, origin);
      }

      default:
        return clientError(400, 'unknown_action', 'Unknown action.', origin);
    }
  } catch (e) {
    // Never leak stack traces or database errors to the client.
    console.error('consultation-meeting: unhandled error', e);
    return clientError(500, 'server_error', 'Something went wrong. Please try again.', origin);
  }
});
