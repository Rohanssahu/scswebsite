-- =============================================================================
-- public.submit_voice_lead_tx — atomic conversion of a Buddy voice session
-- into a lead (+ requirement snapshot, + preliminary estimate, + optional
-- human-review request, + pending notification rows) in ONE transaction.
--
-- Additive companion to public.submit_lead_tx (which is unchanged). `payload`
-- is the ALREADY-VALIDATED output of the `voice-lead` Edge Function — never
-- raw browser or model input. Shape:
--   {
--     "session_id":  "<uuid of an existing voice_sessions row>",
--     "lead":        { ...lead columns },
--     "requirement": { ...requirements columns },
--     "estimate":    { ...preliminary_estimates columns },
--     "review":      { "reason", "visitor_message" } | null,
--     "admin_email": "<configured LEAD_ADMIN_EMAIL>"
--   }
-- Returns: { "lead_id", "reference_code", "requirement_id", "estimate_id",
--            "review_id" }
--
-- DUPLICATE GUARD: the session row is locked and rejected if it already has a
-- lead_id, so a session can convert at most once.
-- =============================================================================

create or replace function public.submit_voice_lead_tx(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id     uuid := (payload ->> 'session_id')::uuid;
  v_lead           jsonb := payload -> 'lead';
  v_requirement    jsonb := payload -> 'requirement';
  v_estimate       jsonb := payload -> 'estimate';
  v_review         jsonb := payload -> 'review';
  v_admin_email    text  := payload ->> 'admin_email';
  v_existing_lead  uuid;
  v_reference      text;
  v_lead_id        uuid;
  v_requirement_id uuid;
  v_estimate_id    uuid;
  v_review_id      uuid;
begin
  if v_session_id is null or v_lead is null or v_requirement is null or v_estimate is null then
    raise exception 'payload requires session_id, lead, requirement and estimate';
  end if;

  -- Lock the session row; a session may convert into a lead at most once.
  select lead_id into v_existing_lead
    from public.voice_sessions
   where id = v_session_id
   for update;
  if not found then
    raise exception 'voice session not found' using errcode = 'P0002';
  end if;
  if v_existing_lead is not null then
    raise exception 'voice session already submitted' using errcode = 'P0003';
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
    coalesce(v_requirement ->> 'estimate_version', 'voice-v1'),
    v_requirement ->> 'selected_language',
    v_requirement ->> 'current_route'
  )
  returning id into v_requirement_id;

  insert into public.preliminary_estimates (
    session_id, lead_id, requirement_id, status, requires_human_review,
    currency, config_version, breakdown,
    total_hours_min, total_hours_max, total_cost_min, total_cost_max,
    duration_weeks_min, duration_weeks_max, confidence
  ) values (
    v_session_id,
    v_lead_id,
    v_requirement_id,
    'preliminary',
    true,
    coalesce(v_estimate ->> 'currency', 'USD'),
    v_estimate ->> 'config_version',
    coalesce(v_estimate -> 'breakdown', '{}'::jsonb),
    (v_estimate ->> 'total_hours_min')::int,
    (v_estimate ->> 'total_hours_max')::int,
    (v_estimate ->> 'total_cost_min')::int,
    (v_estimate ->> 'total_cost_max')::int,
    (v_estimate ->> 'duration_weeks_min')::int,
    (v_estimate ->> 'duration_weeks_max')::int,
    v_estimate ->> 'confidence'
  )
  returning id into v_estimate_id;

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

  -- Pending notification rows; the Edge Function sends and updates them.
  -- Recipients are fixed here — client = lead email, admin = configured email.
  insert into public.lead_notifications (lead_id, recipient, email_to)
  values (v_lead_id, 'client', v_lead ->> 'email');
  if v_admin_email is not null and v_admin_email <> '' then
    insert into public.lead_notifications (lead_id, recipient, email_to)
    values (v_lead_id, 'admin', v_admin_email);
  end if;

  update public.voice_sessions
     set lead_id = v_lead_id,
         status = 'completed',
         selected_language = coalesce(v_requirement ->> 'selected_language', selected_language),
         ended_at = coalesce(ended_at, now())
   where id = v_session_id;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'reference_code', v_reference,
    'requirement_id', v_requirement_id,
    'estimate_id', v_estimate_id,
    'review_id', v_review_id
  );
end;
$$;

-- Only trusted server-side callers (service role) may execute this.
revoke all on function public.submit_voice_lead_tx(jsonb) from public, anon, authenticated;
