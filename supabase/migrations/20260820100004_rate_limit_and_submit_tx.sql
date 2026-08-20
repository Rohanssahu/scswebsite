-- =============================================================================
-- 1) public.lead_submission_events — minimal event log for basic rate
--    limiting. Stores ONLY a salted SHA-256 hash of the caller IP plus a
--    timestamp — never the raw IP.
-- 2) public.submit_lead_tx — atomic insert of lead (+ optional requirement,
--    + optional human-review request) in ONE transaction, callable only by
--    the service role from the `submit-lead` Edge Function.
-- =============================================================================

create table public.lead_submission_events (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null check (char_length(ip_hash) <= 64),
  created_at timestamptz not null default now()
);

create index lead_submission_events_ip_created_idx
  on public.lead_submission_events (ip_hash, created_at desc);

alter table public.lead_submission_events enable row level security;
revoke all on table public.lead_submission_events from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Atomic submission. `payload` is the ALREADY-VALIDATED output of the Edge
-- Function (never raw browser input). Shape:
--   {
--     "lead":        { ...lead columns except id/reference_code/status/... },
--     "requirement": { ...requirements columns } | null,
--     "review":      { "reason", "visitor_message" } | null
--   }
-- Returns: { "lead_id", "reference_code", "requirement_id", "review_id" }
-- -----------------------------------------------------------------------------
create or replace function public.submit_lead_tx(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead          jsonb := payload -> 'lead';
  v_requirement   jsonb := payload -> 'requirement';
  v_review        jsonb := payload -> 'review';
  v_reference     text;
  v_lead_id       uuid;
  v_requirement_id uuid;
  v_review_id     uuid;
begin
  if v_lead is null then
    raise exception 'payload.lead is required';
  end if;

  -- Public reference code, e.g. SCS-4F7K2P9Q (unambiguous alphabet).
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

  if v_requirement is not null then
    insert into public.requirements (
      lead_id, mode, answers, requirement_summary, demo_estimate,
      estimate_version, selected_language, current_route
    ) values (
      v_lead_id,
      v_requirement ->> 'mode',
      coalesce(v_requirement -> 'answers', '{}'::jsonb),
      v_requirement ->> 'requirement_summary',
      coalesce(v_requirement -> 'demo_estimate', '{}'::jsonb),
      coalesce(v_requirement ->> 'estimate_version', 'demo-v1'),
      v_requirement ->> 'selected_language',
      v_requirement ->> 'current_route'
    )
    returning id into v_requirement_id;
  end if;

  if v_review is not null then
    -- Public submissions can only ever create a 'requested' review; the
    -- default supplies that status and no other value is accepted here.
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

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'reference_code', v_reference,
    'requirement_id', v_requirement_id,
    'review_id', v_review_id
  );
end;
$$;

-- Only trusted server-side callers (service role) may execute this.
revoke all on function public.submit_lead_tx(jsonb) from public, anon, authenticated;
