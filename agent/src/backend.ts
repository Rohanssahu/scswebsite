// =============================================================================
// Buddy agent — client for the voice-lead Supabase Edge Function.
//
// The worker has NO Supabase keys: all persistence goes through voice-lead,
// authenticated with the VOICE_AGENT_SECRET shared key. Payload builders are
// pure and unit-tested; transport is a thin fetch with a timeout.
// =============================================================================

import type { PreliminaryEstimate } from './estimate.js';
import { buildSummary, projectMode, type ProjectState } from './state.js';

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  company?: string;
  preferredContactMethod: 'email' | 'phone' | 'whatsapp';
}

export interface SubmitLeadArgs {
  sessionId: string;
  state: ProjectState;
  estimate: PreliminaryEstimate;
  contact: ContactDetails;
  consentAt: string;
  transcriptSummary: string;
  transcriptExcerpt: string | null;
  humanReview: boolean;
  reviewMessage?: string;
}

/** Build the exact submit_lead wire payload voice-lead validates. Pure. */
export function buildSubmitLeadPayload(args: SubmitLeadArgs): Record<string, unknown> {
  const { state } = args;
  if (!state.intent) throw new Error('intent missing');
  if (!state.confirmedAt) throw new Error('visitor has not confirmed');
  return {
    action: 'submit_lead',
    session_id: args.sessionId,
    user_confirmed: true,
    confirmed_at: state.confirmedAt,
    consent: true,
    consent_at: args.consentAt,
    contact: {
      name: args.contact.name,
      email: args.contact.email,
      phone: args.contact.phone,
      company: args.contact.company ?? '',
      preferred_contact_method: args.contact.preferredContactMethod,
    },
    requirement: {
      mode: projectMode(state.intent),
      intent: state.intent,
      fields: {
        ...state.fields,
        ...(state.assumptions.length ? { assumptions: state.assumptions } : {}),
        ...(state.contradictions.length ? { contradictions: state.contradictions } : {}),
        ...(state.risks.length ? { risks: state.risks } : {}),
        ...(state.suggestedFeatures.length ? { suggested_features: state.suggestedFeatures } : {}),
        ...(state.deferredDecisions.length ? { deferred_decisions: state.deferredDecisions } : {}),
      },
      summary: buildSummary(state),
    },
    estimate: args.estimate,
    selected_language: state.language,
    transcript_consent: state.transcriptConsent,
    transcript_summary: args.transcriptSummary.slice(0, 2000),
    ...(state.transcriptConsent && args.transcriptExcerpt
      ? { transcript_excerpt: args.transcriptExcerpt }
      : {}),
    human_review: args.humanReview,
    ...(args.humanReview && args.reviewMessage ? { review_message: args.reviewMessage } : {}),
  };
}

export interface BackendConfig {
  functionUrl: string; // https://<ref>.supabase.co/functions/v1/voice-lead
  agentSecret: string;
  timeoutMs: number;
}

/** Config for the consultation-agent Edge Function (same secret, its own URL). */
export function loadConsultationBackendConfig(): BackendConfig | null {
  const functionUrl = process.env.BUDDY_CONSULTATION_URL ?? '';
  const agentSecret = process.env.VOICE_AGENT_SECRET ?? '';
  if (!/^https:\/\//.test(functionUrl) || agentSecret.length < 16) return null;
  const timeoutMs = Number.parseInt(process.env.BUDDY_BACKEND_TIMEOUT_MS ?? '10000', 10);
  return {
    functionUrl: functionUrl.replace(/\/+$/, ''),
    agentSecret,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 60000 ? timeoutMs : 10000,
  };
}

export function loadBackendConfig(): BackendConfig | null {
  // BUDDY_ prefix: names starting with SUPABASE_ are reserved by Supabase
  // tooling and can be stripped/overridden in managed environments.
  const functionUrl = process.env.BUDDY_VOICE_LEAD_URL ?? '';
  const agentSecret = process.env.VOICE_AGENT_SECRET ?? '';
  if (!/^https:\/\//.test(functionUrl) || agentSecret.length < 16) return null;
  const timeoutMs = Number.parseInt(process.env.BUDDY_BACKEND_TIMEOUT_MS ?? '10000', 10);
  return {
    functionUrl: functionUrl.replace(/\/+$/, ''),
    agentSecret,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 60000 ? timeoutMs : 10000,
  };
}

export interface BackendResult {
  ok: boolean;
  status: number;
  /** Machine-readable error code from the function, if any. */
  error?: string;
  referenceCode?: string;
  body?: Record<string, unknown>;
}

export class VoiceLeadClient {
  constructor(private config: BackendConfig) {}

  private async post(payload: Record<string, unknown>): Promise<BackendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(this.config.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-agent-key': this.config.agentSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
      return {
        ok: res.ok && body.ok === true,
        status: res.status,
        error: typeof body.error === 'string' ? body.error : undefined,
        referenceCode: typeof body.referenceCode === 'string' ? body.referenceCode : undefined,
        body,
      };
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      return { ok: false, status: 0, error: aborted ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  submitLead(args: SubmitLeadArgs): Promise<BackendResult> {
    return this.post(buildSubmitLeadPayload(args));
  }

  retryNotifications(args: SubmitLeadArgs): Promise<BackendResult> {
    return this.post({ ...buildSubmitLeadPayload(args), action: 'retry_notifications' });
  }

  sessionEvent(sessionId: string, eventType: string, data: Record<string, string | number | boolean> = {}): Promise<BackendResult> {
    return this.post({ action: 'session_event', session_id: sessionId, event_type: eventType, data });
  }

  sessionStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'abandoned' | 'expired' | 'error',
    extra: { disconnectReason?: string; turnCount?: number; language?: string | null; started?: boolean; ended?: boolean } = {},
  ): Promise<BackendResult> {
    return this.post({
      action: 'session_status',
      session_id: sessionId,
      status,
      ...(extra.disconnectReason ? { disconnect_reason: extra.disconnectReason } : {}),
      ...(extra.turnCount !== undefined ? { turn_count: extra.turnCount } : {}),
      ...(extra.language ? { selected_language: extra.language } : {}),
      ...(extra.started ? { started: true } : {}),
      ...(extra.ended ? { ended: true } : {}),
    });
  }
}

// =============================================================================
// Consultation-meeting client (consultation-agent Edge Function).
// Same transport + shared-secret scheme as VoiceLeadClient.
// =============================================================================

export interface MeetingContext {
  id: string;
  reference: string;
  status: string;
  meetingKind: string;
  reviewStatus: string;
  clientName: string;
  preferredLanguage: string | null;
  transcriptConsent: boolean;
  consentAt: string;
  analysisSnapshot: Record<string, unknown>;
  requirements: Record<string, unknown>;
  requirementSummary: string | null;
  finalized: boolean;
}

/** Whitelist-parse a load_context response. Returns null on anything odd. */
export function parseMeetingContext(body: Record<string, unknown> | undefined): MeetingContext | null {
  const m = body?.meeting;
  if (typeof m !== 'object' || m === null) return null;
  const d = m as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.reference !== 'string') return null;
  return {
    id: d.id,
    reference: d.reference,
    status: typeof d.status === 'string' ? d.status : 'unknown',
    meetingKind: typeof d.meetingKind === 'string' ? d.meetingKind : 'instant',
    reviewStatus: typeof d.reviewStatus === 'string' ? d.reviewStatus : 'none',
    clientName: typeof d.clientName === 'string' ? d.clientName.slice(0, 100) : '',
    preferredLanguage: typeof d.preferredLanguage === 'string' ? d.preferredLanguage : null,
    transcriptConsent: d.transcriptConsent === true,
    consentAt: typeof d.consentAt === 'string' ? d.consentAt : new Date().toISOString(),
    analysisSnapshot:
      typeof d.analysisSnapshot === 'object' && d.analysisSnapshot !== null
        ? (d.analysisSnapshot as Record<string, unknown>)
        : {},
    requirements:
      typeof d.requirements === 'object' && d.requirements !== null
        ? (d.requirements as Record<string, unknown>)
        : {},
    requirementSummary: typeof d.requirementSummary === 'string' ? d.requirementSummary : null,
    finalized: d.finalized === true,
  };
}

export class ConsultationClient {
  constructor(private config: BackendConfig) {}

  private async post(payload: Record<string, unknown>): Promise<BackendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(this.config.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-agent-key': this.config.agentSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
      return {
        ok: res.ok && body.ok === true,
        status: res.status,
        error: typeof body.error === 'string' ? body.error : undefined,
        referenceCode: typeof body.referenceCode === 'string' ? body.referenceCode : undefined,
        body,
      };
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      return { ok: false, status: 0, error: aborted ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }

  async loadContext(meetingId: string): Promise<MeetingContext | null> {
    const result = await this.post({ action: 'load_context', meeting_id: meetingId });
    if (!result.ok) return null;
    return parseMeetingContext(result.body);
  }

  saveState(
    meetingId: string,
    fields: Record<string, unknown>,
    summary: string,
    language: string | null,
    transcriptConsent?: boolean,
  ): Promise<BackendResult> {
    return this.post({
      action: 'save_state',
      meeting_id: meetingId,
      fields,
      summary,
      ...(language ? { selected_language: language } : {}),
      ...(transcriptConsent !== undefined ? { transcript_consent: transcriptConsent } : {}),
    });
  }

  saveMessage(meetingId: string, sender: 'client' | 'buddy' | 'system', content: string): Promise<BackendResult> {
    return this.post({ action: 'save_message', meeting_id: meetingId, sender, content });
  }

  saveProposal(meetingId: string, proposal: Record<string, unknown>): Promise<BackendResult> {
    return this.post({ action: 'save_proposal', meeting_id: meetingId, proposal });
  }

  finalize(payload: Record<string, unknown>): Promise<BackendResult> {
    return this.post(payload);
  }

  meetingEvent(
    meetingId: string,
    eventType: string,
    data: Record<string, string | number | boolean> = {},
  ): Promise<BackendResult> {
    return this.post({ action: 'meeting_event', meeting_id: meetingId, event_type: eventType, data });
  }

  meetingStatus(meetingId: string, status: 'in_progress' | 'completed' | 'error', ended = false): Promise<BackendResult> {
    return this.post({
      action: 'meeting_status',
      meeting_id: meetingId,
      status,
      ...(ended ? { ended: true } : {}),
    });
  }
}
