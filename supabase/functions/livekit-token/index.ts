// =============================================================================
// livekit-token — issues short-lived LiveKit participant tokens for Buddy
// voice sessions.
//
// Pipeline: feature flag → method check → origin allowlist/CORS → body size +
// JSON parse → validation (./security.ts) → Turnstile server-side
// verification → rate limit (salted IP hash, voice_sessions count) → create
// voice_sessions row → mint minimal-grant AccessToken → safe response.
//
// The response contains ONLY public values: the LiveKit websocket URL, the
// participant token, the room name and the session id. LIVEKIT_API_SECRET
// never leaves this function.
//
// Secrets (Supabase Edge Function secrets — NEVER in the frontend):
//   LIVEKIT_URL            wss://<project>.livekit.cloud (public URL, but kept
//                          server-side so it can rotate without a rebuild)
//   LIVEKIT_API_KEY        LiveKit API key
//   LIVEKIT_API_SECRET     LiveKit API secret (token signing)
//   TURNSTILE_SECRET_KEY   Cloudflare Turnstile secret
//   ALLOWED_ORIGINS        optional comma-separated extra origins
//   RATE_LIMIT_SALT        salt for IP hashing (shared with submit-lead)
//   VOICE_AGENT_ENABLED    global kill switch — must be exactly "true"
//   VOICE_RATE_LIMITS      optional "perHour,perDay" override, e.g. "6,20"
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';
import {
  buildVisitorGrant,
  generateParticipantIdentity,
  generateRoomName,
  isOriginAllowed,
  isVoiceAgentEnabled,
  resolveAllowedOrigins,
  resolveRateWindows,
  TOKEN_TTL_SECONDS,
  validateTokenRequest,
} from './security.ts';

const MAX_BODY_BYTES = 10_000;

const allowedOrigins = resolveAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
const rateWindows = resolveRateWindows(Deno.env.get('VOICE_RATE_LIMITS'));

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
    console.error('livekit-token: TURNSTILE_SECRET_KEY is not configured');
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
      console.warn('livekit-token: turnstile rejected', outcome['error-codes'] ?? []);
    }
    return outcome.success === true;
  } catch (e) {
    console.error('livekit-token: turnstile verification call failed', e);
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

/** True when the caller is within every configured window. Fails CLOSED —
 * voice sessions cost real provider money, unlike form submissions. */
async function checkRateLimit(ipHash: string): Promise<boolean> {
  for (const { windowMinutes, maxSessions } of rateWindows) {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from('voice_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (error) {
      console.error('livekit-token: rate-limit query failed', error.message);
      return false;
    }
    if ((count ?? 0) >= maxSessions) return false;
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
    return new Response(JSON.stringify({ ok: false, error: 'forbidden_origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return clientError(405, 'method_not_allowed', 'Use POST.', origin);
  }

  // Global kill switch — checked after CORS so the frontend gets a readable,
  // machine-checkable "voice_disabled" and can fall back to the manual flow.
  if (!isVoiceAgentEnabled(Deno.env.get('VOICE_AGENT_ENABLED'))) {
    return clientError(503, 'voice_disabled', 'Voice sessions are currently unavailable.', origin);
  }

  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  if (!livekitUrl || !apiKey || !apiSecret) {
    console.error('livekit-token: LiveKit credentials are not configured');
    return clientError(503, 'voice_disabled', 'Voice sessions are currently unavailable.', origin);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return clientError(413, 'payload_too_large', 'Request is too large.', origin);
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return clientError(413, 'payload_too_large', 'Request is too large.', origin);
    }
    body = JSON.parse(text);
  } catch {
    return clientError(400, 'invalid_json', 'Body must be valid JSON.', origin);
  }

  const validated = validateTokenRequest(body);
  if (!validated.ok) {
    return clientError(422, validated.error, validated.message, origin);
  }

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip');

  const turnstileOk = await verifyTurnstile(validated.data.turnstileToken, clientIp);
  if (!turnstileOk) {
    return clientError(
      403,
      'turnstile_failed',
      'Human verification failed or expired. Please retry the check and try again.',
      origin,
    );
  }

  const ipHash = await hashIp(clientIp ?? 'unknown');
  if (!(await checkRateLimit(ipHash))) {
    return clientError(
      429,
      'rate_limited',
      'Too many voice sessions from your network. Please try again later.',
      origin,
    );
  }

  // Server-generated, unguessable room + identity. Never client input.
  const roomName = generateRoomName();
  const identity = generateParticipantIdentity();

  const { data: session, error: insertError } = await supabase
    .from('voice_sessions')
    .insert({
      room_name: roomName,
      participant_identity: identity,
      status: 'created',
      selected_language: validated.data.preferredLanguage,
      ip_hash: ipHash,
      origin,
      consent_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insertError || !session) {
    console.error('livekit-token: session insert failed', insertError?.message ?? 'no data');
    return clientError(500, 'session_failed', 'Could not start a voice session. Please try again.', origin);
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: TOKEN_TTL_SECONDS,
      // Room metadata lets the agent worker know the session id + language
      // hint without trusting anything from the browser.
      metadata: JSON.stringify({
        sessionId: session.id,
        preferredLanguage: validated.data.preferredLanguage,
      }),
    });
    at.addGrant(buildVisitorGrant(roomName));
    const token = await at.toJwt();

    return json(
      200,
      {
        ok: true,
        url: livekitUrl,
        token,
        roomName,
        sessionId: session.id,
        expiresInSeconds: TOKEN_TTL_SECONDS,
      },
      origin,
    );
  } catch (e) {
    // Never leak signing errors; mark the orphaned session row as errored.
    console.error('livekit-token: token mint failed', e);
    await supabase.from('voice_sessions').update({ status: 'error' }).eq('id', session.id);
    return clientError(500, 'session_failed', 'Could not start a voice session. Please try again.', origin);
  }
});
