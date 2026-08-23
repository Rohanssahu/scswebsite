// =============================================================================
// AI Consultation Meeting — network layer for the consultation-meeting Edge
// Function. Thin transport; all parsing/validation lives in
// consultationCore.ts (unit-tested). No secrets: the browser only ever holds
// the publishable Supabase key, the Turnstile token and the meeting-scoped
// access token.
// =============================================================================

import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabaseClient';
import { isConnectionError, reportNetworkFailure } from '@/services/networkStatus';
import {
  mapConsultationError,
  parseJoinResponse,
  parseMeetingView,
  type ConsultationErrorCode,
  type LinkKind,
  type MeetingJoinResponse,
  type MeetingView,
} from '@/services/consultationCore';

export class ConsultationError extends Error {
  constructor(
    public code: ConsultationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConsultationError';
  }
}

async function invoke(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured) throw new ConsultationError('consultation_disabled', 'Consultations are not configured.');
  const supabase = getSupabaseClient();
  if (!supabase) throw new ConsultationError('consultation_disabled', 'Consultations are not configured.');

  const { data, error } = await supabase.functions.invoke('consultation-meeting', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    let payload: { error?: string } | null = null;
    if (context && typeof context.json === 'function') {
      try {
        payload = await context.json();
      } catch {
        payload = null;
      }
    }
    if (isConnectionError(error)) reportNetworkFailure('meeting');
    throw new ConsultationError(mapConsultationError(payload?.error, context?.status), 'Consultation request failed.');
  }
  if (typeof data !== 'object' || data === null || (data as Record<string, unknown>).ok !== true) {
    throw new ConsultationError('server', 'Unexpected consultation service response.');
  }
  return data as Record<string, unknown>;
}

export interface CreateMeetingInput {
  turnstileToken: string;
  honeypot: string;
  meetingKind: 'instant' | 'scheduled';
  name: string;
  email: string;
  phone?: string;
  company?: string;
  clientTimezone: string;
  scheduledAtUtc?: string;
  preferredLanguage?: string;
  transcriptConsent: boolean;
  analysisSnapshot: Record<string, unknown> | null;
}

export interface CreateMeetingResult {
  accessToken: string;
  meeting: MeetingView;
}

export async function createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
  const data = await invoke({
    action: 'create',
    turnstileToken: input.turnstileToken,
    scs_hp_check: input.honeypot,
    consent: true,
    meetingKind: input.meetingKind,
    name: input.name,
    email: input.email,
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.company ? { company: input.company } : {}),
    clientTimezone: input.clientTimezone,
    ...(input.scheduledAtUtc ? { scheduledAtUtc: input.scheduledAtUtc } : {}),
    ...(input.preferredLanguage ? { preferredLanguage: input.preferredLanguage } : {}),
    transcriptConsent: input.transcriptConsent,
    ...(input.analysisSnapshot ? { analysisSnapshot: input.analysisSnapshot } : {}),
  });
  const accessToken = typeof data.accessToken === 'string' ? data.accessToken : '';
  const meeting = parseMeetingView(data.meeting);
  if (!accessToken || !meeting) throw new ConsultationError('server', 'Unexpected consultation service response.');
  return { accessToken, meeting };
}

export async function resolveMeeting(reference: string, accessToken: string): Promise<MeetingView> {
  const data = await invoke({ action: 'resolve', reference, accessToken });
  const meeting = parseMeetingView(data.meeting);
  if (!meeting) throw new ConsultationError('server', 'Unexpected consultation service response.');
  return meeting;
}

export async function joinMeeting(
  reference: string,
  accessToken: string,
  turnstileToken: string,
): Promise<MeetingJoinResponse> {
  const data = await invoke({ action: 'join', reference, accessToken, turnstileToken });
  const parsed = parseJoinResponse(data);
  if (!parsed) throw new ConsultationError('server', 'Unexpected consultation service response.');
  return parsed;
}

export async function rescheduleMeeting(
  reference: string,
  accessToken: string,
  scheduledAtUtc: string,
  clientTimezone: string,
): Promise<MeetingView> {
  const data = await invoke({ action: 'reschedule', reference, accessToken, scheduledAtUtc, clientTimezone });
  const meeting = parseMeetingView(data.meeting);
  if (!meeting) throw new ConsultationError('server', 'Unexpected consultation service response.');
  return meeting;
}

export async function cancelMeeting(reference: string, accessToken: string): Promise<MeetingView> {
  const data = await invoke({ action: 'cancel', reference, accessToken });
  const meeting = parseMeetingView(data.meeting);
  if (!meeting) throw new ConsultationError('server', 'Unexpected consultation service response.');
  return meeting;
}

export interface LinkSubmission {
  kind: LinkKind;
  url?: string;
  label?: string;
  note?: string;
}

export async function submitLinks(
  reference: string,
  accessToken: string,
  links: LinkSubmission[],
): Promise<number> {
  const data = await invoke({ action: 'submit_links', reference, accessToken, links });
  return typeof data.saved === 'number' ? data.saved : links.length;
}

export async function requestHumanReview(
  reference: string,
  accessToken: string,
  message?: string,
): Promise<void> {
  await invoke({ action: 'request_review', reference, accessToken, ...(message ? { message } : {}) });
}
