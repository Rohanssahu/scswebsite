// =============================================================================
// AI Consultation Meeting — pure core logic (no LiveKit / network deps).
//
// Everything security- or state-relevant the meeting UI relies on lives here
// so it can be unit-tested: response whitelisting, the meeting connection
// state machine (never show Listening/Thinking before the agent participant
// exists), chat message merging, link validation (client-side mirror of the
// Edge Function policy), calendar helpers and the analysis-snapshot builder.
// =============================================================================

import type { AnalysisResult, AnswerMap } from '@/types/projectAnalysis';

export const CONSULTATION_LANGUAGES = ['en', 'hi', 'hinglish', 'mr', 'ur', 'ar'] as const;
export type ConsultationLanguage = (typeof CONSULTATION_LANGUAGES)[number];

// --- meeting view (whitelisted server response) --------------------------------------

export interface MeetingView {
  reference: string;
  status: string;
  meetingKind: 'instant' | 'scheduled';
  reviewStatus: string;
  name: string;
  clientTimezone: string | null;
  scheduledAtUtc: string | null;
  earlyJoinMinutes: number;
  preferredLanguage: string | null;
  transcriptConsent: boolean;
  hasAnalysis: boolean;
  analysisMode: string | null;
  canJoin: boolean;
  joinBlockedReason: string | null;
  joinOpensAtUtc: string | null;
  finalized: boolean;
  finalizedReference: string | null;
}

const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, max = 300): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;

export function parseMeetingView(raw: unknown): MeetingView | null {
  if (!isDict(raw)) return null;
  const reference = str(raw.reference, 20);
  if (!reference || !/^SCSM-[A-Z0-9]{10}$/.test(reference)) return null;
  const meetingKind = raw.meetingKind === 'scheduled' ? 'scheduled' : 'instant';
  const early = typeof raw.earlyJoinMinutes === 'number' && Number.isFinite(raw.earlyJoinMinutes)
    ? Math.min(120, Math.max(5, Math.round(raw.earlyJoinMinutes)))
    : 15;
  return {
    reference,
    status: str(raw.status, 40) ?? 'unknown',
    meetingKind,
    reviewStatus: str(raw.reviewStatus, 40) ?? 'none',
    name: str(raw.name, 100) ?? '',
    clientTimezone: str(raw.clientTimezone, 64),
    scheduledAtUtc: str(raw.scheduledAtUtc, 40),
    earlyJoinMinutes: early,
    preferredLanguage: str(raw.preferredLanguage, 20),
    transcriptConsent: raw.transcriptConsent === true,
    hasAnalysis: raw.hasAnalysis === true,
    analysisMode: str(raw.analysisMode, 20),
    canJoin: raw.canJoin === true,
    joinBlockedReason: str(raw.joinBlockedReason, 40),
    joinOpensAtUtc: str(raw.joinOpensAtUtc, 40),
    finalized: raw.finalized === true,
    finalizedReference: str(raw.finalizedReference, 20),
  };
}

export interface MeetingJoinResponse {
  url: string;
  token: string;
  roomName: string;
  expiresInSeconds: number;
  meeting: MeetingView | null;
}

/** Strictly validate the join response — the URL must be a LiveKit websocket
 * URL, never an arbitrary target. */
export function parseJoinResponse(raw: unknown): MeetingJoinResponse | null {
  if (!isDict(raw) || raw.ok !== true) return null;
  const url = typeof raw.url === 'string' ? raw.url : '';
  const token = typeof raw.token === 'string' ? raw.token : '';
  const roomName = typeof raw.roomName === 'string' ? raw.roomName : '';
  if (!/^wss:\/\/[a-z0-9.-]+/i.test(url)) return null;
  if (token.length < 20 || token.length > 4096) return null;
  if (!roomName) return null;
  return {
    url,
    token,
    roomName,
    expiresInSeconds: typeof raw.expiresInSeconds === 'number' ? raw.expiresInSeconds : 600,
    meeting: parseMeetingView(raw.meeting),
  };
}

// --- meeting connection state machine -------------------------------------------------

/** Room-level connection state. */
export type MeetingConnectionState =
  | 'idle'
  | 'connecting' // connecting to LiveKit OR waiting for the agent to join
  | 'live' // agent participant present
  | 'reconnecting'
  | 'ended'
  | 'error';

/** Buddy's activity — only meaningful while the agent participant exists. */
export type BuddyActivity = 'waiting' | 'listening' | 'thinking' | 'speaking';

export interface ActivityInput {
  agentPresent: boolean;
  agentSpeaking: boolean;
  clientSpeaking: boolean;
}

/**
 * Derive Buddy's displayed activity. HARD RULE: before the agent participant
 * has joined, the only allowed state is 'waiting' — local microphone activity
 * must never fake Listening/Thinking.
 */
export function deriveBuddyActivity(input: ActivityInput): BuddyActivity {
  if (!input.agentPresent) return 'waiting';
  if (input.agentSpeaking) return 'speaking';
  if (input.clientSpeaking) return 'listening';
  return 'thinking';
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';

// --- chat model -------------------------------------------------------------------------

export type ChatSender = 'client' | 'buddy' | 'system';
export type ChatDelivery = 'pending' | 'sent' | 'error';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  at: number;
  final: boolean;
  delivery: ChatDelivery;
}

/** Upsert one message by id (transcription segments update in place). */
export function mergeChatMessage(items: ChatMessage[], incoming: ChatMessage, max = 300): ChatMessage[] {
  const idx = items.findIndex((i) => i.id === incoming.id);
  const next = idx === -1 ? [...items, incoming] : items.map((i, n) => (n === idx ? incoming : i));
  return next.length > max ? next.slice(next.length - max) : next;
}

// --- link validation (client-side mirror of the Edge Function policy) --------------------

export type LinkKind = 'repository' | 'figma' | 'api_docs' | 'website' | 'other_link' | 'note';

export const REPOSITORY_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org'];
export const FIGMA_HOSTS = ['figma.com'];

export type LinkCheck =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: 'invalid_url' | 'https_required' | 'credentials_in_url' | 'host_not_allowed' | 'repository_host_not_allowed' | 'figma_host_not_allowed' | 'url_too_long' };

const hostMatches = (host: string, allowed: string[]): boolean =>
  allowed.some((a) => host === a || host.endsWith(`.${a}`));

export function validateLink(kind: LinkKind, rawUrl: string): LinkCheck {
  if (rawUrl.length > 2048) return { ok: false, reason: 'url_too_long' };
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (parsed.username || parsed.password) return { ok: false, reason: 'credentials_in_url' };
  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, reason: 'host_not_allowed' };
  }
  if (kind === 'repository' && !hostMatches(host, REPOSITORY_HOSTS)) {
    return { ok: false, reason: 'repository_host_not_allowed' };
  }
  if (kind === 'figma' && !hostMatches(host, FIGMA_HOSTS)) {
    return { ok: false, reason: 'figma_host_not_allowed' };
  }
  return { ok: true, url: parsed.toString(), host };
}

// --- access-token storage ------------------------------------------------------------------

// sessionStorage (not localStorage): the scoped bearer token dies with the tab.
const ACCESS_PREFIX = 'scs-consultation-access:';

export function accessStorageKey(reference: string): string {
  return `${ACCESS_PREFIX}${reference}`;
}

export function saveAccessToken(storage: Pick<Storage, 'setItem'>, reference: string, token: string): void {
  try {
    storage.setItem(accessStorageKey(reference), token);
  } catch {
    // storage unavailable (private mode) — the user keeps the link-based flow
  }
}

export function loadAccessToken(storage: Pick<Storage, 'getItem'>, reference: string): string | null {
  try {
    const token = storage.getItem(accessStorageKey(reference));
    return token && /^[a-f0-9]{40,128}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function clearAccessToken(storage: Pick<Storage, 'removeItem'>, reference: string): void {
  try {
    storage.removeItem(accessStorageKey(reference));
  } catch {
    // ignore
  }
}

// --- calendar helpers ------------------------------------------------------------------------

const pad = (n: number): string => String(n).padStart(2, '0');

/** UTC timestamp in ICS basic format: 20260821T143000Z */
export function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export interface CalendarEventInput {
  reference: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  joinUrl: string;
}

/** Minimal, valid .ics file for the consultation (client downloads locally —
 * no external calendar provider is contacted or claimed). */
export function buildIcsFile(input: CalendarEventInput): string {
  const start = toIcsUtc(input.scheduledAtUtc);
  const end = toIcsUtc(new Date(Date.parse(input.scheduledAtUtc) + input.durationMinutes * 60_000).toISOString());
  const title = 'SCS AI Consultation Meeting';
  const description = `Join your SCS AI consultation (reference ${input.reference}): ${input.joinUrl}`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCS Softwares//AI Consultation//EN',
    'BEGIN:VEVENT',
    `UID:${input.reference.toLowerCase()}@scssoftwares.com`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${input.joinUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** "Add to Google Calendar" template link (a link the CLIENT opens — we never
 * claim an event was created on their behalf). */
export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const start = toIcsUtc(input.scheduledAtUtc);
  const end = toIcsUtc(new Date(Date.parse(input.scheduledAtUtc) + input.durationMinutes * 60_000).toISOString());
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'SCS AI Consultation Meeting',
    dates: `${start}/${end}`,
    details: `Join your SCS AI consultation (reference ${input.reference}): ${input.joinUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Combine a local date (YYYY-MM-DD) + time (HH:mm) in a given IANA timezone
 * into a UTC ISO string. Uses the standard two-pass offset trick — correct for
 * all real-world offsets (incl. half-hour zones), no libraries needed. */
export function localToUtcIso(dateIso: string, time: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const asUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  try {
    const offsetAt = (utcMs: number): number => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = dtf.formatToParts(new Date(utcMs));
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
      const zoned = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
      return zoned - utcMs;
    };
    let utcMs = asUtc - offsetAt(asUtc);
    utcMs = asUtc - offsetAt(utcMs); // second pass handles DST boundaries
    return new Date(utcMs).toISOString();
  } catch {
    return null;
  }
}

/** Format a UTC instant in the client's timezone for display. */
export function formatInTimezone(iso: string, timeZone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

// --- analysis snapshot builder ------------------------------------------------------------------

const answerStr = (answers: AnswerMap, key: string, max: number): string | null => {
  const v = answers[key];
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
};

const answerList = (answers: AnswerMap, key: string, maxItems: number, maxLen: number): string[] => {
  const v = answers[key];
  if (Array.isArray(v)) return v.filter((i) => typeof i === 'string' && i.trim()).slice(0, maxItems).map((i) => i.trim().slice(0, maxLen));
  return [];
};

/** Build the whitelisted snapshot sent at meeting creation. The server
 * re-sanitizes it; numeric figures are stored flagged as client-reported. */
export function buildAnalysisSnapshot(result: AnalysisResult, answers: AnswerMap): Record<string, unknown> {
  const totalHours = result.team.reduce((s, r) => s + (Number.isFinite(r.hours) ? r.hours : 0), 0);
  const totalCost = result.team.reduce(
    (s, r) => s + (Number.isFinite(r.hours) && Number.isFinite(r.hourlyRate) ? r.hours * r.hourlyRate : 0),
    0,
  );
  const capacity = result.weeklyCapacityHours > 0 ? result.weeklyCapacityHours : 40;
  const durationWeeks = totalHours > 0 ? Math.max(1, Math.ceil(totalHours / capacity)) : 0;

  const features = [
    ...answerList(answers, 'features', 15, 200),
    ...answerList(answers, 'modules', 15, 200),
    ...answerList(answers, 'newFeatures', 15, 200),
  ].slice(0, 25);

  const priorities: string[] = [];
  const timeline = answerStr(answers, 'timeline', 100);
  const budget = answerStr(answers, 'budget', 100);
  const urgency = answerStr(answers, 'urgency', 100);
  if (timeline) priorities.push(`Timeline: ${timeline}`);
  if (budget) priorities.push(`Budget: ${budget}`);
  if (urgency) priorities.push(`Urgency: ${urgency}`);

  const existingProblems = [
    ...result.problemsDetected.map((p) => p.title.slice(0, 300)),
    ...(answerStr(answers, 'broken', 300) ? [answerStr(answers, 'broken', 300) as string] : []),
  ].slice(0, 15);

  return {
    mode: result.mode,
    source: result.source ?? 'demo',
    generatedAt: result.generatedAt,
    projectType: answerStr(answers, 'projectType', 200) ?? answerStr(answers, 'idea', 200),
    platforms: answerList(answers, 'platform', 10, 120),
    features,
    currentCondition: answerStr(answers, 'working', 1000),
    technologyPreferences: answerStr(answers, 'technologies', 500),
    existingProblems,
    missingFeatures: result.missingFeatures.map((f) => f.slice(0, 200)).slice(0, 15),
    priorities,
    reportedEstimate: {
      totalHours: Math.min(100000, Math.max(0, Math.round(totalHours))),
      totalCost: Math.min(10000000, Math.max(0, Math.round(totalCost))),
      durationWeeks: Math.min(520, durationWeeks),
      weeklyCapacityHours: Math.min(168, Math.max(1, Math.round(capacity))),
    },
  };
}

// --- error mapping ---------------------------------------------------------------------------------

export type ConsultationErrorCode =
  | 'consultation_disabled'
  | 'turnstile_failed'
  | 'rate_limited'
  | 'meeting_not_found'
  | 'not_joinable'
  | 'invalid_request'
  | 'network'
  | 'server';

export function mapConsultationError(errorCode: string | undefined, status?: number): ConsultationErrorCode {
  switch (errorCode) {
    case 'consultation_disabled':
      return 'consultation_disabled';
    case 'turnstile_failed':
      return 'turnstile_failed';
    case 'rate_limited':
      return 'rate_limited';
    case 'meeting_not_found':
      return 'meeting_not_found';
    case 'not_joinable':
    case 'not_reschedulable':
    case 'not_cancellable':
      return 'not_joinable';
    case 'invalid_request':
    case 'honeypot':
    case 'unknown_action':
      return 'invalid_request';
    default:
      return status && status >= 500 ? 'server' : 'network';
  }
}
