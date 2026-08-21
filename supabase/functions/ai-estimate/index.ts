// =============================================================================
// ai-estimate — server-side Gemini proxy for the project-estimation experience.
//
// The Gemini key lives ONLY here (Supabase Edge Function secret), never in the
// frontend. Two tasks:
//
//   { task: 'extract', mode, docName?, docText? | pdfBase64? }
//     → reads a requirement/project document and returns auto-fill answers for
//       the questionnaire plus a short document summary.
//
//   { task: 'analyze', mode, answers, docSummary? }
//     → generates the full project analysis (health score, issues, team,
//       milestones…) tailored to the client's actual answers, including any
//       free-typed technologies or requirements.
//
// Secrets (Supabase Edge Function secrets — NEVER in the frontend):
//   GOOGLE_API_KEY   required
//   GEMINI_MODEL     optional, default DEFAULT_GEMINI_MODEL (gemini-3.6-flash)
//   ALLOWED_ORIGINS  optional comma-separated extra origins
//
// Privacy note: Gemini's free tier may use submitted content to improve
// Google's models and is suitable for development/testing only. Production
// processing of confidential client documents/requirements should run on a
// paid-tier Gemini account with reviewed data-handling terms — see
// docs/BUDDY_VOICE_AGENT_SETUP.md § Gemini free-tier vs paid-tier.
// =============================================================================

import {
  categorizeError,
  createGeminiGenerate,
  DEFAULT_GEMINI_MODEL,
  handleAnalyze,
  handleExtract,
  isOriginAllowed,
  resolveAllowedOrigins,
} from './gemini.ts';

const MAX_BODY_BYTES = 7_000_000; // allows a ~4MB PDF as base64
const MAX_PDF_BASE64_CHARS = 5_800_000;

const allowedOrigins = resolveAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));

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

// --- lightweight per-isolate rate limit (best effort; key cost protection) ---
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_CALLS = 20;
const rateBuckets = new Map<string, number[]>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const calls = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (calls.length >= RATE_MAX_CALLS) return false;
  calls.push(now);
  rateBuckets.set(ip, calls);
  return true;
}

function requireApiKey(): string {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    const err = new Error('GOOGLE_API_KEY is not configured');
    (err as unknown as { status: number }).status = 401;
    throw err;
  }
  return apiKey;
}

function resolveModel(): string {
  // The default lives in gemini.ts (DEFAULT_GEMINI_MODEL) so the model name is
  // never hardcoded in more than one place.
  return Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL;
}

// --- request handler ------------------------------------------------------------------

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const originAllowed = isOriginAllowed(origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return originAllowed
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response('Forbidden', { status: 403 });
  }
  if (!originAllowed) return new Response('Forbidden', { status: 403 });
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed', message: 'POST only' }, origin);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!withinRateLimit(ip)) {
    return json(429, { ok: false, error: 'rate_limited', message: 'Too many requests — try again shortly.' }, origin);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { ok: false, error: 'too_large', message: 'Request body too large' }, origin);
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: 'bad_json', message: 'Invalid JSON body' }, origin);
  }

  const task = body.task;
  const mode = body.mode;
  if ((task !== 'extract' && task !== 'analyze') || (mode !== 'new' && mode !== 'existing')) {
    return json(400, { ok: false, error: 'bad_request', message: 'Unknown task or mode' }, origin);
  }

  try {
    const apiKey = requireApiKey();
    const model = resolveModel();
    const generate = createGeminiGenerate();

    if (task === 'extract') {
      const docText = typeof body.docText === 'string' ? body.docText : undefined;
      const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : undefined;
      const docName = typeof body.docName === 'string' ? body.docName.slice(0, 200) : 'document';
      // An empty / whitespace-only document never reaches Gemini: the request
      // carries only metadata (name, MIME type) and cannot be extracted from.
      if (!docText?.trim() && !pdfBase64?.trim()) {
        return json(400, { ok: false, error: 'no_document', message: 'docText or pdfBase64 is required' }, origin);
      }
      if (pdfBase64 && pdfBase64.length > MAX_PDF_BASE64_CHARS) {
        return json(413, { ok: false, error: 'pdf_too_large', message: 'PDF must be under 4MB' }, origin);
      }
      return json(200, await handleExtract(mode, docName, docText, pdfBase64, { generate, apiKey, model }), origin);
    }

    const docSummary = typeof body.docSummary === 'string' ? body.docSummary : undefined;
    return json(200, await handleAnalyze(mode, body.answers, docSummary, { generate, apiKey, model }), origin);
  } catch (e) {
    const { code, status, message } = categorizeError(e);
    // Never log document content, answers, or the API key — only the safe
    // category and a short, truncated diagnostic message.
    console.error('ai-estimate: task failed', task, code, e instanceof Error ? e.message.slice(0, 200) : e);
    return json(status, { ok: false, error: code, message }, origin);
  }
});
