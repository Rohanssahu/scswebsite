-- =============================================================================
-- public.finalize_consultation_tx — atomic conversion of an AI consultation
-- meeting into a lead (+ requirement snapshot, + optional human-review
-- request) and the final proposal version, in ONE transaction.
--
-- Additive companion to submit_lead_tx / submit_voice_lead_tx (both
-- unchanged). `payload` is the ALREADY-VALIDATED output of the
-- `consultation-agent` Edge Function — never raw browser or model input:
--   {
--     "meeting_id":  "<uuid of an existing consultation_meetings row>",
--     "lead":        { ...lead columns },
--     "requirement": { ...requirements columns },
--     "proposal":    { version, config_version, currency, proposal,
--                      total_hours_min/max, total_cost_min/max,
--                      duration_weeks_min/max, weekly_capacity_hours,
--                      confidence },
--     "review":      { "reason", "visitor_message" } | null
--   }
-- Returns: { "lead_id", "reference_code", "requirement_id", "proposal_id",
--            "review_id" }
--
-- DUPLICATE GUARD: the meeting row is locked and rejected if it already has a
-- lead_id, so a meeting can finalize at most once (errcode P0003).
-- =============================================================================

create or replace function public.finalize_consultation_tx(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_meeting_id     uuid := (payload ->> 'meeting_id')::uuid;
  v_lead           jsonb := payload -> 'lead';
  v_requirement    jsonb := payload -> 'requirement';
  v_proposal       jsonb := payload -> 'proposal';
  v_review         jsonb := payload -> 'review';
  v_existing_lead  uuid;
  v_reference      text;
  v_lead_id        uuid;
  v_requirement_id uuid;
  v_proposal_id    uuid;
  v_review_id      uuid;
  v_version        integer;
begin
  if v_meeting_id is null or v_lead is null or v_requirement is null or v_proposal is null then
    raise exception 'payload requires meeting_id, lead, requirement and proposal';
  end if;

  -- Lock the meeting row; a meeting may finalize at most once.
  select lead_id into v_existing_lead
    from public.consultation_meetings
   where id = v_meeting_id
   for update;
  if not found then
    raise exception 'consultation meeting not found' using errcode = 'P0002';
  end if;
  if v_existing_lead is not null then
    raise exception 'consultation meeting already finalized' using errcode = 'P0003';
  end if;

  select 'SCS-' || string_agg(
           substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                  1 + floor(random() * 31)::int, 1), '')
    into v_reference
    from generate_series(1, 8);

  insert into public.leads (
    reference_code, lead_type, source, name, email, phone, company, country,
    preferred_language, preferred_contact_method, service, project_mode,
    project_summary, budget_range, timeline, human_review_requested, metadata
  ) values (
    v_reference,
    v_lead ->> 'lead_type',
    v_lead ->> 'source',
    v_lead ->> 'name',
    v_lead ->> 'email',
    v_lead ->> 'phone',
    v_lead ->> 'company',
    v_lead ->> 'country',
    v_lead ->> 'preferred_language',
    v_lead ->> 'preferred_contact_method',
    v_lead ->> 'service',
    v_lead ->> 'project_mode',
    v_lead ->> 'project_summary',
    v_lead ->> 'budget_range',
    v_lead ->> 'timeline',
    coalesce((v_lead ->> 'human_review_requested')::boolean, false),
    coalesce(v_lead -> 'metadata', '{}'::jsonb)
  )
  returning id into v_lead_id;

  insert into public.requirements (
    lead_id, mode, answers, requirement_summary, demo_estimate,
    estimate_version, selected_language, current_route
  ) values (
    v_lead_id,
    v_requirement ->> 'mode',
    coalesce(v_requirement -> 'answers', '{}'::jsonb),
    v_requirement ->> 'requirement_summary',
    coalesce(v_requirement -> 'demo_estimate', '{}'::jsonb),
    coalesce(v_requirement ->> 'estimate_version', 'consultation-v1'),
    v_requirement ->> 'selected_language',
    v_requirement ->> 'current_route'
  )
  returning id into v_requirement_id;

  -- Supersede earlier proposal versions and store the final one.
  update public.consultation_proposals
     set status = 'superseded'
   where meeting_id = v_meeting_id and status = 'preliminary';

  select coalesce(max(version), 0) + 1 into v_version
    from public.consultation_proposals
   where meeting_id = v_meeting_id;

  insert into public.consultation_proposals (
    meeting_id, version, status, requires_human_review, currency,
    config_version, proposal,
    total_hours_min, total_hours_max, total_cost_min, total_cost_max,
    duration_weeks_min, duration_weeks_max, weekly_capacity_hours, confidence
  ) values (
    v_meeting_id,
    v_version,
    'preliminary',
    true,
    coalesce(v_proposal ->> 'currency', 'USD'),
    v_proposal ->> 'config_version',
    coalesce(v_proposal -> 'proposal', '{}'::jsonb),
    (v_proposal ->> 'total_hours_min')::int,
    (v_proposal ->> 'total_hours_max')::int,
    (v_proposal ->> 'total_cost_min')::int,
    (v_proposal ->> 'total_cost_max')::int,
    (v_proposal ->> 'duration_weeks_min')::int,
    (v_proposal ->> 'duration_weeks_max')::int,
    coalesce((v_proposal ->> 'weekly_capacity_hours')::int, 40),
    v_proposal ->> 'confidence'
  )
  returning id into v_proposal_id;

  if v_review is not null then
    insert into public.human_review_requests (
      lead_id, requirement_id, reason, visitor_message
    ) values (
      v_lead_id,
      v_requirement_id,
      v_review ->> 'reason',
      v_review ->> 'visitor_message'
    )
    returning id into v_review_id;
  end if;

  update public.consultation_meetings
     set lead_id = v_lead_id,
         status = 'completed',
         review_status = case when v_review is not null then 'requested' else review_status end,
         finalized_at = now(),
         ended_at = coalesce(ended_at, now())
   where id = v_meeting_id;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'reference_code', v_reference,
    'requirement_id', v_requirement_id,
    'proposal_id', v_proposal_id,
    'review_id', v_review_id
  );
end;
$$;

-- Only trusted server-side callers (service role) may execute this.
revoke all on function public.finalize_consultation_tx(jsonb) from public, anon, authenticated;
