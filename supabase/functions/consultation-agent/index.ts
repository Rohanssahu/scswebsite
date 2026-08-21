// =============================================================================
// consultation-agent — server-to-server endpoint for the Buddy agent worker
// while it runs an AI consultation meeting.
//
// NOT a browser endpoint: there is no CORS support at all, and every request
// must carry the shared secret in `x-buddy-agent-key`. The worker uses it to:
//   action=load_context    load the meeting + analysis snapshot at job start
//   action=save_state      persist the structured requirement state
//   action=save_message    persist one chat/transcript line (ONLY with
//                          transcript consent — enforced here, not trusted)
//   action=save_proposal   store a validated preliminary proposal version
//   action=finalize        convert the meeting into a lead + final proposal
//                          (atomic + idempotent via finalize_consultation_tx)
//   action=meeting_event   append a privacy-safe meeting event
//   action=meeting_status  update meeting lifecycle status
//
// Secrets (Supabase Edge Function secrets):
//   VOICE_AGENT_SECRET   shared secret the agent worker must present (same
//                        secret as voice-lead — one worker, one credential)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  meetingProjectMode,
  SERVICE_BY_INTENT,
  validateFinalize,
  validateMeetingEvent,
  validateMeetingStatus,
  validateSaveMessage,
  validateSaveProposal,
  validateSaveState,
  type ValidatedProposal,
} from './validation.ts';

const MAX_BODY_BYTES = 200_000;

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

/** Timing-safe secret check via SHA-256 digest comparison (same scheme as
 * voice-lead). */
async function isAuthorized(req: Request): Promise<boolean> {
  const secret = Deno.env.get('VOICE_AGENT_SECRET');
  if (!secret || secret.length < 16) {
    console.error('consultation-agent: VOICE_AGENT_SECRET is not configured (min 16 chars)');
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MeetingRow {
  id: string;
  public_reference: string;
  status: string;
  meeting_kind: string;
  review_status: string;
  name: string;
  selected_language: string | null;
  transcript_consent: boolean;
  consent_at: string;
  analysis_snapshot: Record<string, unknown>;
  requirements: Record<string, unknown>;
  requirement_summary: string | null;
  lead_id: string | null;
  finalized_at: string | null;
}

async function loadMeeting(meetingId: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase
    .from('consultation_meetings')
    .select(
      'id, public_reference, status, meeting_kind, review_status, name, selected_language, ' +
        'transcript_consent, consent_at, analysis_snapshot, requirements, requirement_summary, ' +
        'lead_id, finalized_at',
    )
    .eq('id', meetingId)
    .maybeSingle();
  if (error) {
    console.error('consultation-agent: meeting lookup failed', error.message);
    return null;
  }
  return (data as MeetingRow | null) ?? null;
}

function proposalRow(meetingId: string, version: number, p: ValidatedProposal): Record<string, unknown> {
  return {
    meeting_id: meetingId,
    version,
    status: 'preliminary',
    requires_human_review: true,
    currency: p.currency,
    config_version: p.config_version,
    proposal: p.content,
    total_hours_min: p.total_hours_min,
    total_hours_max: p.total_hours_max,
    total_cost_min: p.total_cost_min,
    total_cost_max: p.total_cost_max,
    duration_weeks_min: p.duration_weeks_min,
    duration_weeks_max: p.duration_weeks_max,
    weekly_capacity_hours: p.weekly_capacity_hours,
    confidence: p.confidence,
  };
}

/** Supersede current preliminary versions and insert the next one. */
async function insertProposalVersion(
  meetingId: string,
  proposal: ValidatedProposal,
): Promise<{ ok: boolean; version?: number }> {
  const { data: latest, error: latestError } = await supabase
    .from('consultation_proposals')
    .select('version')
    .eq('meeting_id', meetingId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    console.error('consultation-agent: proposal version lookup failed', latestError.message);
    return { ok: false };
  }
  const version = ((latest?.version as number | undefined) ?? 0) + 1;
  await supabase
    .from('consultation_proposals')
    .update({ status: 'superseded' })
    .eq('meeting_id', meetingId)
    .eq('status', 'preliminary');
  const { error } = await supabase.from('consultation_proposals').insert(proposalRow(meetingId, version, proposal));
  if (error) {
    console.error('consultation-agent: proposal insert failed', error.message);
    return { ok: false };
  }
  return { ok: true, version };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return clientError(405, 'method_not_allowed', 'Use POST.');
  }
  if (!(await isAuthorized(req))) {
    return clientError(401, 'unauthorized', 'Missing or invalid agent credential.');
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return clientError(413, 'payload_too_large', 'Request is too large.');
  }

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return clientError(413, 'payload_too_large', 'Request is too large.');
    }
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return clientError(400, 'invalid_json', 'Body must be a valid JSON object.');
  }

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    switch (action) {
      // ------------------------------------------------------------ load_context
      case 'load_context': {
        const meetingId = typeof body.meeting_id === 'string' ? body.meeting_id : '';
        if (!UUID_RE.test(meetingId)) return clientError(422, 'invalid_request', 'meeting_id must be a UUID.');
        const meeting = await loadMeeting(meetingId);
        if (!meeting) return clientError(404, 'meeting_not_found', 'Meeting not found.');
        return json(200, {
          ok: true,
          meeting: {
            id: meeting.id,
            reference: meeting.public_reference,
            status: meeting.status,
            meetingKind: meeting.meeting_kind,
            reviewStatus: meeting.review_status,
            clientName: meeting.name,
            preferredLanguage: meeting.selected_language,
            transcriptConsent: meeting.transcript_consent,
            consentAt: meeting.consent_at,
            analysisSnapshot: meeting.analysis_snapshot ?? {},
            requirements: meeting.requirements ?? {},
            requirementSummary: meeting.requirement_summary,
            finalized: Boolean(meeting.finalized_at),
          },
        });
      }

      // -------------------------------------------------------------- save_state
      case 'save_state': {
        const validated = validateSaveState(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const update: Record<string, unknown> = {
          requirements: validated.data.answers,
          requirement_summary: validated.data.summary,
        };
        if (validated.data.language) update.selected_language = validated.data.language;
        if (validated.data.transcriptConsent !== undefined) {
          update.transcript_consent = validated.data.transcriptConsent;
          update.transcript_consent_at = validated.data.transcriptConsent ? new Date().toISOString() : null;
        }
        const { error } = await supabase
          .from('consultation_meetings')
          .update(update)
          .eq('id', validated.data.meetingId);
        if (error) {
          console.error('consultation-agent: state save failed', error.message);
          return clientError(500, 'storage_failed', 'Could not save the state.');
        }
        return json(200, { ok: true });
      }

      // ------------------------------------------------------------ save_message
      case 'save_message': {
        const validated = validateSaveMessage(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const meeting = await loadMeeting(validated.data.meetingId);
        if (!meeting) return clientError(404, 'meeting_not_found', 'Meeting not found.');
        // Consent gate lives HERE — the worker's claim is never trusted.
        if (!meeting.transcript_consent) {
          return clientError(409, 'no_transcript_consent', 'The client has not consented to transcript storage.');
        }
        const { error } = await supabase.from('consultation_messages').insert({
          meeting_id: meeting.id,
          sender: validated.data.sender,
          content: validated.data.content,
        });
        if (error) {
          console.error('consultation-agent: message insert failed', error.message);
          return clientError(500, 'storage_failed', 'Could not save the message.');
        }
        return json(200, { ok: true });
      }

      // ----------------------------------------------------------- save_proposal
      case 'save_proposal': {
        const validated = validateSaveProposal(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const meeting = await loadMeeting(validated.data.meetingId);
        if (!meeting) return clientError(404, 'meeting_not_found', 'Meeting not found.');
        if (meeting.finalized_at) {
          return clientError(409, 'already_finalized', 'The meeting is already finalized.');
        }
        const result = await insertProposalVersion(meeting.id, validated.data.proposal);
        if (!result.ok) return clientError(500, 'storage_failed', 'Could not save the proposal.');
        return json(200, { ok: true, version: result.version });
      }

      // ---------------------------------------------------------------- finalize
      case 'finalize': {
        const validated = validateFinalize(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const d = validated.data;

        const answers: Record<string, unknown> = { ...d.answers, intent: d.intent };
        const payload = {
          meeting_id: d.meetingId,
          lead: {
            lead_type: d.review ? 'human_review' : 'project_requirement',
            source: 'ai-consultation',
            name: d.contact.name,
            email: d.contact.email,
            phone: d.contact.phone,
            company: d.contact.company,
            preferred_language: d.language,
            preferred_contact_method: d.contact.preferred_contact_method,
            service: SERVICE_BY_INTENT[d.intent],
            project_mode: meetingProjectMode(d.intent),
            project_summary: d.requirementSummary.slice(0, 5000),
            budget_range: typeof d.answers.budget_range === 'string' ? d.answers.budget_range.slice(0, 100) : null,
            timeline: typeof d.answers.deadline === 'string' ? d.answers.deadline.slice(0, 100) : null,
            human_review_requested: Boolean(d.review),
            metadata: {
              channel: 'ai-consultation',
              confirmed_at: d.confirmedAt,
              consent_at: d.consentAt,
            },
          },
          requirement: {
            mode: meetingProjectMode(d.intent),
            answers,
            requirement_summary: d.requirementSummary,
            demo_estimate: {
              status: 'preliminary',
              currency: d.proposal.currency,
              total_hours_min: d.proposal.total_hours_min,
              total_hours_max: d.proposal.total_hours_max,
              total_cost_min: d.proposal.total_cost_min,
              total_cost_max: d.proposal.total_cost_max,
              duration_weeks_min: d.proposal.duration_weeks_min,
              duration_weeks_max: d.proposal.duration_weeks_max,
            },
            estimate_version: 'consultation-v1',
            selected_language: d.language,
            current_route: 'ai-consultation',
          },
          proposal: {
            currency: d.proposal.currency,
            config_version: d.proposal.config_version,
            proposal: d.proposal.content,
            total_hours_min: d.proposal.total_hours_min,
            total_hours_max: d.proposal.total_hours_max,
            total_cost_min: d.proposal.total_cost_min,
            total_cost_max: d.proposal.total_cost_max,
            duration_weeks_min: d.proposal.duration_weeks_min,
            duration_weeks_max: d.proposal.duration_weeks_max,
            weekly_capacity_hours: d.proposal.weekly_capacity_hours,
            confidence: d.proposal.confidence,
          },
          review: d.review,
        };

        const { data, error } = await supabase.rpc('finalize_consultation_tx', { payload });
        if (error) {
          const message = error.message ?? '';
          if (message.includes('already finalized')) {
            return clientError(409, 'duplicate_submission', 'This meeting was already finalized.');
          }
          if (message.includes('not found')) {
            return clientError(404, 'meeting_not_found', 'Meeting not found.');
          }
          console.error('consultation-agent: finalize failed', message);
          return clientError(500, 'storage_failed', 'Could not finalize the consultation.');
        }
        const result = data as Record<string, unknown>;
        await supabase.from('consultation_events').insert({
          meeting_id: d.meetingId,
          event_type: 'finalized',
          data: { review_requested: Boolean(result.review_id) },
        });
        return json(200, {
          ok: true,
          referenceCode: result.reference_code,
          leadId: result.lead_id,
          proposalId: result.proposal_id,
          reviewRequested: Boolean(result.review_id),
        });
      }

      // ------------------------------------------------------------ meeting_event
      case 'meeting_event': {
        const validated = validateMeetingEvent(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const { error } = await supabase.from('consultation_events').insert({
          meeting_id: validated.data.meetingId,
          event_type: validated.data.eventType,
          data: validated.data.data,
        });
        if (error) {
          console.error('consultation-agent: event insert failed', error.message);
          return clientError(500, 'storage_failed', 'Could not save the event.');
        }
        return json(200, { ok: true });
      }

      // ----------------------------------------------------------- meeting_status
      case 'meeting_status': {
        const validated = validateMeetingStatus(body);
        if (!validated.ok) return clientError(422, 'invalid_request', validated.message);
        const meeting = await loadMeeting(validated.data.meetingId);
        if (!meeting) return clientError(404, 'meeting_not_found', 'Meeting not found.');
        // A finalized/cancelled meeting's status is never regressed by the worker.
        if (meeting.finalized_at || meeting.status === 'cancelled' || meeting.status === 'completed') {
          return json(200, { ok: true, unchanged: true });
        }
        const update: Record<string, unknown> = { status: validated.data.status };
        if (validated.data.ended) update.ended_at = new Date().toISOString();
        const { error } = await supabase.from('consultation_meetings').update(update).eq('id', meeting.id);
        if (error) {
          console.error('consultation-agent: status update failed', error.message);
          return clientError(500, 'storage_failed', 'Could not update the status.');
        }
        return json(200, { ok: true });
      }

      default:
        return clientError(400, 'unknown_action', 'Unknown action.');
    }
  } catch (e) {
    // Never leak stack traces or database errors to the caller.
    console.error('consultation-agent: unhandled error', e);
    return clientError(500, 'server_error', 'Something went wrong.');
  }
});
