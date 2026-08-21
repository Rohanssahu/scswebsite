// =============================================================================
// livekit-token — pure validation / policy layer.
//
// Dependency-free and runtime-agnostic (no Deno / Node APIs beyond the
// standard `crypto.getRandomValues`), so the exact code the Edge Function
// runs is unit-tested by vitest from the repo root.
//
// Everything here is deliberately conservative: the browser can only ask
// "may I start a voice session?" — it can never choose the room name, the
// identity, the permissions or the token lifetime.
// =============================================================================

// Origin allowlist — intentionally the same policy as submit-lead. Kept as a
// local copy so each function stays self-contained for deployment.
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://scssoftwares.com',
  'https://www.scssoftwares.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

export function resolveAllowedOrigins(envValue?: string | null): string[] {
  const extra = (envValue ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => /^https?:\/\//.test(o));
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

export function isOriginAllowed(origin: string | null | undefined, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.includes(origin.replace(/\/+$/, ''));
}

// --- request validation --------------------------------------------------------

export const TOKEN_LIMITS = {
  turnstileToken: { min: 10, max: 4096 },
  language: { max: 20 },
} as const;

/** Spoken languages Buddy supports in this MVP. */
export const VOICE_LANGUAGES = ['en', 'hi', 'hinglish'] as const;

export interface ValidatedTokenRequest {
  turnstileToken: string;
  /** Optional UI hint; the agent still confirms the language by voice. */
  preferredLanguage: string | null;
  /** Visitor consented to mic capture + processing. Must be exactly true. */
  consent: true;
}

export type TokenValidation =
  | { ok: true; data: ValidatedTokenRequest }
  | { ok: false; error: 'invalid_request'; message: string };

const TOP_LEVEL_KEYS = new Set(['turnstileToken', 'consent', 'preferredLanguage']);

const fail = (message: string): TokenValidation => ({ ok: false, error: 'invalid_request', message });

const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate the browser request. Strips everything it does not explicitly
 * copy; unknown properties are rejected outright (a browser has no reason to
 * send them — see submit-lead for the same posture).
 */
export function validateTokenRequest(body: unknown): TokenValidation {
  if (!isDict(body)) return fail('Request body must be a JSON object.');
  for (const key of Object.keys(body)) {
    if (!TOP_LEVEL_KEYS.has(key)) return fail(`Unexpected property "${key}".`);
  }

  const token = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (token.length < TOKEN_LIMITS.turnstileToken.min || token.length > TOKEN_LIMITS.turnstileToken.max) {
    return fail('Missing or invalid Turnstile token.');
  }

  if (body.consent !== true) return fail('Microphone and data-processing consent is required.');

  let preferredLanguage: string | null = null;
  if (body.preferredLanguage !== undefined && body.preferredLanguage !== null) {
    if (typeof body.preferredLanguage !== 'string') return fail('Invalid preferred language.');
    const lang = body.preferredLanguage.trim().toLowerCase().slice(0, TOKEN_LIMITS.language.max);
    if (!(VOICE_LANGUAGES as readonly string[]).includes(lang)) {
      return fail('Unsupported preferred language.');
    }
    preferredLanguage = lang;
  }

  return { ok: true, data: { turnstileToken: token, preferredLanguage, consent: true } };
}

// --- room / identity generation --------------------------------------------------

const ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomSlug(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ROOM_ALPHABET[b % ROOM_ALPHABET.length];
  return out;
}

/** Random, unguessable room name. Never derived from client input. */
export function generateRoomName(): string {
  return `buddy-${randomSlug(16)}`;
}

/** Random participant identity for the visitor. Never client-chosen. */
export function generateParticipantIdentity(): string {
  return `visitor-${randomSlug(12)}`;
}

// --- grants -----------------------------------------------------------------------

/** Token lifetime in seconds — enough to join, far too short to hoard. */
export const TOKEN_TTL_SECONDS = 600;

export interface VoiceGrant {
  room: string;
  roomJoin: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateOwnMetadata: boolean;
  roomAdmin: boolean;
  roomCreate: boolean;
  roomList: boolean;
  roomRecord: boolean;
}

/**
 * Minimum grants for a visitor: join ONE named room, publish their mic,
 * subscribe to Buddy, exchange data messages. Absolutely no admin, create,
 * list or record permissions — and none of this is influenced by the request
 * body, so "arbitrary room-admin permissions from the browser" cannot exist.
 */
export function buildVisitorGrant(roomName: string): VoiceGrant {
  return {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false,
    roomAdmin: false,
    roomCreate: false,
    roomList: false,
    roomRecord: false,
  };
}

// --- rate limiting ----------------------------------------------------------------

export interface RateWindow {
  windowMinutes: number;
  maxSessions: number;
}

/** Defaults: 4 sessions/hour and 10/day per (salted, hashed) IP. */
export const DEFAULT_RATE_WINDOWS: RateWindow[] = [
  { windowMinutes: 60, maxSessions: 4 },
  { windowMinutes: 24 * 60, maxSessions: 10 },
];

/**
 * Parse "perHour,perDay" style env overrides (e.g. "6,20"). Invalid values
 * fall back to the conservative defaults — misconfiguration can only make
 * the limit stricter to parse errors, never remove it.
 */
export function resolveRateWindows(envValue?: string | null): RateWindow[] {
  if (!envValue) return DEFAULT_RATE_WINDOWS;
  const parts = envValue.split(',').map((p) => Number.parseInt(p.trim(), 10));
  if (parts.length !== 2 || parts.some((n) => !Number.isInteger(n) || n < 1 || n > 1000)) {
    return DEFAULT_RATE_WINDOWS;
  }
  return [
    { windowMinutes: 60, maxSessions: parts[0] },
    { windowMinutes: 24 * 60, maxSessions: parts[1] },
  ];
}

/** Feature flag: anything except the exact string "true" means disabled. */
export function isVoiceAgentEnabled(envValue?: string | null): boolean {
  return envValue === 'true';
}

// --- agent dispatch ---------------------------------------------------------------

/** Must match the worker's BUDDY_AGENT_NAME (agent/src/agent.ts). */
export const DEFAULT_AGENT_NAME = 'buddy-it-manager';

/**
 * Resolve the agent name used for explicit dispatch. Comes ONLY from the
 * server environment — never from the request. Invalid values fall back to
 * the default so a typo can never silently disable dispatch or inject an
 * unexpected name into tokens.
 */
export function resolveAgentName(envValue?: string | null): string {
  const value = (envValue ?? '').trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : DEFAULT_AGENT_NAME;
}
