-- =============================================================================
-- SCS Softwares — Company Owner Dashboard, part 2: read/write surface.
--
-- Additive only. The public submission path is untouched: every Edge Function
-- still writes with the service role, and every existing table keeps its
-- current posture — RLS enabled, ZERO policies, all public grants revoked.
--
-- NO NEW RLS POLICIES ARE CREATED BY THIS FEATURE.
-- Authorization lives in two places instead, both of which are narrower than a
-- policy would be:
--
--   1. READS — a fixed set of `admin_*` views. Each one lists an EXPLICIT column
--      set and ends with `where public.is_active_admin()`. They are ordinary
--      (owner-privileged) views, so the base tables need no grant at all:
--        * anon holds no grant on the views  -> permission denied;
--        * a non-staff authenticated user passes the grant but fails the
--          predicate                          -> zero rows;
--        * an active owner/admin              -> exactly the listed columns.
--      Sensitive columns (ip_hash, access_token_hash, leads.metadata, room
--      names, provider errors) are simply not in any view, and the browser has
--      no privilege to reach a base table directly, so they are unreachable.
--
--   2. WRITES — three security-definer RPCs, each of which re-checks
--      is_active_admin() itself and touches exactly one column. There is no
--      INSERT, UPDATE or DELETE grant on any table for anon or authenticated,
--      so a crafted PostgREST request has nothing to aim at.
--
-- Tables that stay completely unreachable: voice_sessions, voice_session_events,
-- consultation_events, lead_submission_events, lead_notifications, admin_users.
--
-- Verification queries: supabase/tests/admin_access_verification.sql
-- =============================================================================


-- =============================================================================
-- 1. Widen the lead status vocabulary (additive: every existing value stays
--    legal). The dashboard needs 'proposal_sent' and 'hired'; 'in_review' and
--    'spam' remain valid for rows written before this migration.
-- =============================================================================

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'proposal_sent',
                    'hired', 'in_review', 'closed', 'spam'));


-- =============================================================================
-- 2. Internal notes — staff-authored, kept strictly OUT of the client-submitted
--    JSON (leads.metadata / requirements.answers are never rewritten).
--
--    Same lockdown as every other table: RLS on, no policies, no public grants.
--    All access goes through admin_lead_notes (read) and the two note RPCs.
-- =============================================================================

create table public.lead_internal_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  -- Nullable so removing an auth user never deletes the business record.
  author_id  uuid references auth.users (id) on delete set null,
  note       text not null check (char_length(note) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_internal_notes_lead_idx
  on public.lead_internal_notes (lead_id, created_at desc);

create trigger lead_internal_notes_set_updated_at
  before update on public.lead_internal_notes
  for each row execute function public.set_updated_at();

comment on table public.lead_internal_notes is
  'Staff-only notes about a lead. Never merged into client-submitted payloads.';

alter table public.lead_internal_notes enable row level security;
revoke all on table public.lead_internal_notes from anon, authenticated;


-- =============================================================================
-- 3. The dashboard's read surface. Explicit columns, owner-privileged views,
--    every one gated on is_active_admin().
-- =============================================================================

-- One row per lead, pre-joined with the newest requirement, meeting, review and
-- estimate so the list screen needs a single request.
create view public.admin_leads_list as
select
  l.id,
  l.reference_code,
  l.lead_type,
  l.source,
  l.name,
  l.email,
  l.phone,
  l.company,
  l.country,
  l.preferred_contact_method,
  l.preferred_language,
  l.service,
  l.project_mode,
  l.project_summary,
  l.budget_range,
  l.timeline,
  l.status,
  l.human_review_requested,
  l.created_at,
  l.updated_at,
  rq.mode              as requirement_mode,
  cm.public_reference  as meeting_reference,
  cm.status            as meeting_status,
  hr.status            as review_status,
  est.kind             as estimate_kind,
  est.currency         as estimate_currency,
  est.hours_min        as estimate_hours_min,
  est.hours_max        as estimate_hours_max,
  est.cost_min         as estimate_cost_min,
  est.cost_max         as estimate_cost_max
from public.leads l
left join lateral (
  select r.mode
    from public.requirements r
   where r.lead_id = l.id
   order by r.created_at desc
   limit 1
) rq on true
left join lateral (
  select m.public_reference, m.status
    from public.consultation_meetings m
   where m.lead_id = l.id
   order by m.created_at desc
   limit 1
) cm on true
left join lateral (
  select h.status
    from public.human_review_requests h
   where h.lead_id = l.id
   order by h.created_at desc
   limit 1
) hr on true
left join lateral (
  select x.kind, x.currency, x.hours_min, x.hours_max, x.cost_min, x.cost_max
    from (
      select 'consultation_proposal'::text as kind, p.currency,
             p.total_hours_min as hours_min, p.total_hours_max as hours_max,
             p.total_cost_min  as cost_min,  p.total_cost_max  as cost_max,
             p.created_at
        from public.consultation_proposals p
        join public.consultation_meetings m2 on m2.id = p.meeting_id
       where m2.lead_id = l.id
      union all
      select 'voice_estimate'::text, e.currency,
             e.total_hours_min, e.total_hours_max,
             e.total_cost_min,  e.total_cost_max,
             e.created_at
        from public.preliminary_estimates e
       where e.lead_id = l.id
    ) x
   order by x.created_at desc
   limit 1
) est on true
where public.is_active_admin();

grant select on public.admin_leads_list to authenticated;

-- Summary cards.
create view public.admin_lead_stats as
select
  (select count(*) from public.leads where status = 'new')                    as new_leads,
  (select count(*) from public.consultation_meetings)                         as consultations,
  (select count(*) from public.human_review_requests
     where status in ('requested', 'in_review'))                             as reviews_requested,
  (select count(*) from public.leads
     where status in ('qualified', 'proposal_sent', 'hired'))                 as qualified_leads
where public.is_active_admin();

grant select on public.admin_lead_stats to authenticated;

-- Consultation meetings that never produced a lead — shown truthfully as
-- "unsubmitted", never converted into a fake lead row.
create view public.admin_unsubmitted_consultations as
select
  m.id,
  m.public_reference,
  m.meeting_kind,
  m.status,
  m.review_status,
  m.name,
  m.email,
  m.phone,
  m.company,
  m.scheduled_at,
  m.started_at,
  m.ended_at,
  m.selected_language,
  m.transcript_consent,
  m.join_count,
  m.requirement_summary,
  m.created_at
from public.consultation_meetings m
where m.lead_id is null
  and public.is_active_admin();

grant select on public.admin_unsubmitted_consultations to authenticated;

-- access_token_hash, ip_hash, origin, room_name and participant_identity are
-- absent by construction: the access proof and network context never reach a
-- browser.
create view public.admin_consultations as
select
  m.id,
  m.lead_id,
  m.public_reference,
  m.meeting_kind,
  m.status,
  m.review_status,
  m.name,
  m.email,
  m.phone,
  m.company,
  m.client_timezone,
  m.scheduled_at,
  m.selected_language,
  m.consent_at,
  m.transcript_consent,
  m.transcript_consent_at,
  m.analysis_snapshot,
  m.requirements,
  m.requirement_summary,
  m.join_count,
  m.finalized_at,
  m.started_at,
  m.ended_at,
  m.created_at
from public.consultation_meetings m
where public.is_active_admin();

grant select on public.admin_consultations to authenticated;

-- Transcript lines, gated on recorded consent at the database layer.
create view public.admin_consultation_messages as
select
  msg.id,
  msg.meeting_id,
  m.lead_id,
  msg.sender,
  msg.content,
  msg.created_at
from public.consultation_messages msg
join public.consultation_meetings m on m.id = msg.meeting_id
where m.transcript_consent
  and public.is_active_admin();

grant select on public.admin_consultation_messages to authenticated;

create view public.admin_consultation_proposals as
select
  p.id,
  p.meeting_id,
  m.lead_id,
  p.version,
  p.status,
  p.requires_human_review,
  p.currency,
  p.config_version,
  p.proposal,
  p.total_hours_min,
  p.total_hours_max,
  p.total_cost_min,
  p.total_cost_max,
  p.duration_weeks_min,
  p.duration_weeks_max,
  p.weekly_capacity_hours,
  p.confidence,
  p.created_at
from public.consultation_proposals p
join public.consultation_meetings m on m.id = p.meeting_id
where public.is_active_admin();

grant select on public.admin_consultation_proposals to authenticated;

-- Client-provided links/notes. Stored untrusted; the UI validates the scheme
-- again before rendering an anchor.
create view public.admin_consultation_artifacts as
select
  a.id,
  a.meeting_id,
  m.lead_id,
  a.kind,
  a.url,
  a.host,
  a.label,
  a.note,
  a.created_at
from public.consultation_artifacts a
join public.consultation_meetings m on m.id = a.meeting_id
where public.is_active_admin();

grant select on public.admin_consultation_artifacts to authenticated;

create view public.admin_lead_requirements as
select
  r.id,
  r.lead_id,
  r.mode,
  r.answers,
  r.requirement_summary,
  r.demo_estimate,
  r.estimate_version,
  r.status,
  r.created_at
from public.requirements r
where public.is_active_admin();

grant select on public.admin_lead_requirements to authenticated;

create view public.admin_lead_estimates as
select
  e.id,
  e.lead_id,
  e.requirement_id,
  e.status,
  e.requires_human_review,
  e.currency,
  e.config_version,
  e.breakdown,
  e.total_hours_min,
  e.total_hours_max,
  e.total_cost_min,
  e.total_cost_max,
  e.duration_weeks_min,
  e.duration_weeks_max,
  e.confidence,
  e.created_at
from public.preliminary_estimates e
where public.is_active_admin();

grant select on public.admin_lead_estimates to authenticated;

create view public.admin_lead_reviews as
select
  h.id,
  h.lead_id,
  h.requirement_id,
  h.reason,
  h.visitor_message,
  h.status,
  h.assigned_to,
  h.reviewed_at,
  h.created_at,
  h.updated_at
from public.human_review_requests h
where public.is_active_admin();

grant select on public.admin_lead_reviews to authenticated;

create view public.admin_lead_notes as
select
  n.id,
  n.lead_id,
  n.author_id,
  n.note,
  n.created_at,
  n.updated_at
from public.lead_internal_notes n
where public.is_active_admin();

grant select on public.admin_lead_notes to authenticated;


-- =============================================================================
-- 4. The only three writes the dashboard can perform. Each re-checks
--    authorization, validates its input and touches exactly one column.
--    No table-level INSERT/UPDATE/DELETE privilege is granted anywhere.
-- =============================================================================

-- Operational status only. reference_code, contact details, project answers and
-- metadata are not assignable here at all, so a dashboard session cannot rewrite
-- anything the client submitted.
create or replace function public.admin_set_lead_status(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('new', 'contacted', 'qualified', 'proposal_sent', 'hired', 'closed') then
    raise exception 'unsupported status' using errcode = '22023';
  end if;

  update public.leads
     set status = p_status
   where id = p_lead_id
  returning jsonb_build_object(
             'id', id,
             'reference_code', reference_code,
             'status', status,
             'updated_at', updated_at)
    into v_result;

  if v_result is null then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.admin_set_lead_status(uuid, text) from public, anon;
grant execute on function public.admin_set_lead_status(uuid, text) to authenticated;

-- The author is always the caller — it is never accepted as an argument.
create or replace function public.admin_add_lead_note(p_lead_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note   text := btrim(coalesce(p_note, ''));
  v_result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if char_length(v_note) < 1 or char_length(v_note) > 4000 then
    raise exception 'note must be 1-4000 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.leads where id = p_lead_id) then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;

  insert into public.lead_internal_notes (lead_id, author_id, note)
  values (p_lead_id, auth.uid(), v_note)
  returning jsonb_build_object(
             'id', id,
             'lead_id', lead_id,
             'author_id', author_id,
             'note', note,
             'created_at', created_at,
             'updated_at', updated_at)
    into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_add_lead_note(uuid, text) from public, anon;
grant execute on function public.admin_add_lead_note(uuid, text) to authenticated;

-- Editing is limited to the note's own author, and only the text can change.
create or replace function public.admin_update_lead_note(p_note_id uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note   text := btrim(coalesce(p_note, ''));
  v_result jsonb;
begin
  if not public.is_active_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if char_length(v_note) < 1 or char_length(v_note) > 4000 then
    raise exception 'note must be 1-4000 characters' using errcode = '22023';
  end if;

  update public.lead_internal_notes
     set note = v_note
   where id = p_note_id
     and author_id = auth.uid()
  returning jsonb_build_object(
             'id', id,
             'lead_id', lead_id,
             'author_id', author_id,
             'note', note,
             'created_at', created_at,
             'updated_at', updated_at)
    into v_result;

  if v_result is null then
    raise exception 'note not found or not yours' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

revoke all on function public.admin_update_lead_note(uuid, text) from public, anon;
grant execute on function public.admin_update_lead_note(uuid, text) to authenticated;

-- No delete function exists, and no DELETE privilege is granted: the dashboard
-- cannot remove a lead, a requirement, a meeting or even a note.


-- =============================================================================
-- 5. Anonymous visitors are never granted anything on the new objects.
-- =============================================================================

revoke all on public.admin_leads_list                from anon;
revoke all on public.admin_lead_stats                from anon;
revoke all on public.admin_unsubmitted_consultations from anon;
revoke all on public.admin_consultations             from anon;
revoke all on public.admin_consultation_messages     from anon;
revoke all on public.admin_consultation_proposals    from anon;
revoke all on public.admin_consultation_artifacts    from anon;
revoke all on public.admin_lead_requirements         from anon;
revoke all on public.admin_lead_estimates            from anon;
revoke all on public.admin_lead_reviews              from anon;
revoke all on public.admin_lead_notes                from anon;
revoke all on table public.lead_internal_notes       from anon;
