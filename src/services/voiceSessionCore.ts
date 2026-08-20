// =============================================================================
// Buddy voice session — pure core logic (no LiveKit / browser dependencies).
//
// Everything security- or state-relevant that the UI relies on lives here so
// it can be unit-tested: validating the token response, whitelisting the
// agent's data-channel messages, and the session state machine. The LiveKit
// wiring in voiceSession.ts stays a thin transport layer.
// =============================================================================

/** UI-facing session states. */
export type VoiceSessionState =
  | 'idle'
  | 'consent' // consent + Turnstile screen shown
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'paused' // mic muted by the visitor
  | 'completed'
  | 'error';

export type VoiceErrorCode =
  | 'mic_denied'
  | 'voice_disabled'
  | 'turnstile_failed'
  | 'rate_limited'
  | 'connect_failed'
  | 'disconnected'
  | 'expired'
  | 'unknown';

/** Map a livekit-token function error payload to a UI error code. */
export function mapTokenError(errorCode: string | undefined, status?: number): VoiceErrorCode {
  switch (errorCode) {
    case 'voice_disabled':
      return 'voice_disabled';
    case 'turnstile_failed':
      return 'turnstile_failed';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return status && status >= 500 ? 'connect_failed' : 'unknown';
  }
}

export interface VoiceTokenResponse {
  url: string;
  token: string;
  roomName: string;
  sessionId: string;
  expiresInSeconds: number;
}

/** Strictly validate the livekit-token response before connecting anywhere.
 * The URL must be a LiveKit websocket URL — never an arbitrary target. */
export function parseTokenResponse(data: unknown): VoiceTokenResponse | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.ok !== true) return null;
  const url = typeof d.url === 'string' ? d.url : '';
  const token = typeof d.token === 'string' ? d.token : '';
  const roomName = typeof d.roomName === 'string' ? d.roomName : '';
  const sessionId = typeof d.sessionId === 'string' ? d.sessionId : '';
  if (!/^wss:\/\/[a-z0-9.-]+/i.test(url)) return null;
  if (token.length < 20 || token.length > 4096) return null;
  if (!roomName || !sessionId) return null;
  const expires = typeof d.expiresInSeconds === 'number' ? d.expiresInSeconds : 600;
  return { url, token, roomName, sessionId, expiresInSeconds: expires };
}

// --- agent → browser state messages (topic buddy.state) --------------------------

export interface BuddyEstimateView {
  totalHoursMin: number;
  totalHoursMax: number;
  totalCostMin: number;
  totalCostMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
  weeklyCapacityHours: number;
  currency: 'USD';
  confidence: 'low' | 'medium' | 'high';
  modules: Array<{ name: string; hours_min: number; hours_max: number }>;
  teamRoles: string[];
  assumptions: string[];
  exclusions: string[];
  risks: string[];
  status: 'preliminary';
}

export interface BuddyProgressView {
  intent: string | null;
  collected: string[];
  missingRequired: string[];
  percent: number;
  confidence: string;
}

export interface BuddyStateView {
  progress: BuddyProgressView | null;
  language: string | null;
  estimate: BuddyEstimateView | null;
  confirmed: boolean;
  referenceCode: string | null;
}

const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;

const strList = (v: unknown, maxItems = 30, maxLen = 300): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === 'string')
        .slice(0, maxItems)
        .map((i) => i.slice(0, maxLen))
    : [];

/**
 * Whitelist-parse one buddy.state data message. Anything malformed returns
 * null and is ignored — the agent is trusted infrastructure, but the room is
 * still an external channel, so the UI never renders unvalidated content.
 */
export function parseBuddyState(raw: string): BuddyStateView | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const d = parsed as Record<string, unknown>;
  if (d.type !== 'buddy.state') return null;

  let progress: BuddyProgressView | null = null;
  if (typeof d.progress === 'object' && d.progress !== null) {
    const p = d.progress as Record<string, unknown>;
    progress = {
      intent: typeof p.intent === 'string' ? p.intent.slice(0, 40) : null,
      collected: strList(p.collected, 40, 64),
      missingRequired: strList(p.missingRequired, 40, 64),
      percent: num(p.percent, 0, 100) ?? 0,
      confidence: typeof p.confidence === 'string' ? p.confidence.slice(0, 10) : 'low',
    };
  }

  let estimate: BuddyEstimateView | null = null;
  if (typeof d.estimate === 'object' && d.estimate !== null) {
    const e = d.estimate as Record<string, unknown>;
    const hoursMin = num(e.totalHoursMin, 0, 100000);
    const hoursMax = num(e.totalHoursMax, 0, 100000);
    const costMin = num(e.totalCostMin, 0, 10000000);
    const costMax = num(e.totalCostMax, 0, 10000000);
    const weeksMin = num(e.durationWeeksMin, 0, 520);
    const weeksMax = num(e.durationWeeksMax, 0, 520);
    const capacity = num(e.weeklyCapacityHours, 1, 168);
    const confidence = e.confidence === 'low' || e.confidence === 'medium' || e.confidence === 'high' ? e.confidence : null;
    if (
      hoursMin !== null &&
      hoursMax !== null &&
      costMin !== null &&
      costMax !== null &&
      weeksMin !== null &&
      weeksMax !== null &&
      capacity !== null &&
      confidence !== null
    ) {
      const modules = Array.isArray(e.modules)
        ? e.modules
            .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
            .slice(0, 20)
            .map((m) => ({
              name: typeof m.name === 'string' ? m.name.slice(0, 100) : '',
              hours_min: num(m.hours_min, 0, 100000) ?? 0,
              hours_max: num(m.hours_max, 0, 100000) ?? 0,
            }))
            .filter((m) => m.name)
        : [];
      estimate = {
        totalHoursMin: hoursMin,
        totalHoursMax: hoursMax,
        totalCostMin: costMin,
        totalCostMax: costMax,
        durationWeeksMin: weeksMin,
        durationWeeksMax: weeksMax,
        weeklyCapacityHours: capacity,
        currency: 'USD',
        confidence,
        modules,
        teamRoles: strList(e.teamRoles, 12, 100),
        assumptions: strList(e.assumptions),
        exclusions: strList(e.exclusions),
        risks: strList(e.risks),
        status: 'preliminary',
      };
    }
  }

  const reference = typeof d.referenceCode === 'string' && /^SCS-[A-Z0-9]{8}$/.test(d.referenceCode) ? d.referenceCode : null;

  return {
    progress,
    language: typeof d.language === 'string' ? d.language.slice(0, 20) : null,
    estimate,
    confirmed: d.confirmed === true,
    referenceCode: reference,
  };
}

// --- transcript entries ----------------------------------------------------------------

export interface TranscriptItem {
  id: string;
  speaker: 'user' | 'buddy';
  text: string;
  final: boolean;
}

/** Merge a transcription segment into the list (segments update in place). */
export function upsertTranscript(items: TranscriptItem[], incoming: TranscriptItem, max = 200): TranscriptItem[] {
  const idx = items.findIndex((i) => i.id === incoming.id);
  const next = idx === -1 ? [...items, incoming] : items.map((i, n) => (n === idx ? incoming : i));
  return next.length > max ? next.slice(next.length - max) : next;
}
