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

export function loadBackendConfig(): BackendConfig | null {
  const functionUrl = process.env.SUPABASE_VOICE_LEAD_URL ?? '';
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
