-- =============================================================================
-- SCS Softwares — owner dashboard access verification.
--
-- Run by hand in the Supabase SQL Editor (or psql) AFTER applying
-- 20260821300001 + 20260821300002 and AFTER inserting the owner row.
-- READ-ONLY probe: it opens a transaction, impersonates each role, asserts the
-- expected outcome, and ROLLS BACK. It never leaves data behind.
--
-- Replace the two placeholders first (paste literal UUIDs if your client does
-- not support psql variables):
--   :owner_uuid      an auth.users id that HAS an active admin_users row
--   :non_admin_uuid  any other auth.users id with NO admin_users row
--
-- Any `raise exception` below means the security posture regressed.
--
-- DESIGN REMINDER: this feature adds no RLS policies. Authorization is the
-- `where public.is_active_admin()` predicate inside each admin_* view, plus the
-- same check at the top of each write RPC. anon holds no grant on any of them.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- A. ANONYMOUS VISITORS
--    Expected: 42501 (insufficient privilege) on every base table AND every
--    admin view — anon is granted nothing at all.
-- -----------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array[
    'leads', 'requirements', 'human_review_requests', 'preliminary_estimates',
    'consultation_meetings', 'consultation_messages', 'consultation_artifacts',
    'consultation_proposals', 'consultation_events', 'voice_sessions',
    'voice_session_events', 'lead_submission_events', 'lead_notifications',
    'admin_users', 'lead_internal_notes',
    'admin_leads_list', 'admin_lead_stats', 'admin_unsubmitted_consultations',
    'admin_consultations', 'admin_consultation_messages',
    'admin_consultation_proposals', 'admin_consultation_artifacts',
    'admin_lead_requirements', 'admin_lead_estimates', 'admin_lead_reviews',
    'admin_lead_notes'
  ] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then
        raise exception 'LEAK: anon read % rows from %', n, t;
      end if;
    exception when insufficient_privilege then
      null;  -- expected
    end;
  end loop;
end $$;

-- anon may not call any dashboard function
do $$
declare fn text;
begin
  foreach fn in array array[
    'select public.is_active_admin()',
    'select public.admin_me()',
    'select public.admin_set_lead_status(gen_random_uuid(), ''contacted'')',
    'select public.admin_add_lead_note(gen_random_uuid(), ''x'')',
    'select public.admin_update_lead_note(gen_random_uuid(), ''x'')'
  ] loop
    begin
      execute fn;
      raise exception 'LEAK: anon could run "%"', fn;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- B. AUTHENTICATED BUT NOT STAFF
--    The grant on the views exists for `authenticated`, but is_active_admin()
--    is false, so every view returns ZERO rows and every RPC refuses.
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":":non_admin_uuid"}';

do $$
declare
  n bigint;
  t text;
begin
  if public.is_active_admin() then
    raise exception 'SETUP ERROR: :non_admin_uuid is actually an active admin';
  end if;
  if public.admin_me() is not null then
    raise exception 'LEAK: admin_me() answered a non-staff caller';
  end if;

  foreach t in array array[
    'admin_leads_list', 'admin_lead_stats', 'admin_unsubmitted_consultations',
    'admin_consultations', 'admin_consultation_messages',
    'admin_consultation_proposals', 'admin_consultation_artifacts',
    'admin_lead_requirements', 'admin_lead_estimates', 'admin_lead_reviews',
    'admin_lead_notes'
  ] loop
    execute format('select count(*) from public.%I', t) into n;
    if n > 0 then
      raise exception 'LEAK: non-admin read % rows from %', n, t;
    end if;
  end loop;
end $$;

-- base tables stay unreachable even with a valid JWT
do $$
declare t text;
begin
  foreach t in array array['leads', 'requirements', 'consultation_meetings',
                           'lead_internal_notes', 'admin_users'] loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'LEAK: authenticated holds a grant on %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- and every write RPC refuses
do $$
declare fn text;
begin
  foreach fn in array array[
    'select public.admin_set_lead_status(gen_random_uuid(), ''contacted'')',
    'select public.admin_add_lead_note(gen_random_uuid(), ''x'')',
    'select public.admin_update_lead_note(gen_random_uuid(), ''x'')'
  ] loop
    begin
      execute fn;
      raise exception 'LEAK: a non-admin could run "%"', fn;
    exception when insufficient_privilege then null;  -- errcode 42501 from the RPC
    end;
  end loop;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- C. THE ACTIVE OWNER
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":":owner_uuid"}';

do $$
declare
  n bigint;
  v_lead uuid;
begin
  if not public.is_active_admin() then
    raise exception 'SETUP ERROR: :owner_uuid has no active admin_users row';
  end if;
  if public.admin_me() is null then
    raise exception 'admin_me() should describe the owner';
  end if;

  -- the whole dashboard surface is readable
  perform 1 from public.admin_leads_list limit 1;
  perform 1 from public.admin_lead_stats limit 1;
  perform 1 from public.admin_unsubmitted_consultations limit 1;
  perform 1 from public.admin_lead_requirements limit 1;
  perform 1 from public.admin_lead_estimates limit 1;
  perform 1 from public.admin_lead_reviews limit 1;
  perform 1 from public.admin_consultations limit 1;
  perform 1 from public.admin_consultation_proposals limit 1;
  perform 1 from public.admin_consultation_artifacts limit 1;
  perform 1 from public.admin_lead_notes limit 1;

  -- transcripts remain consent-gated
  select count(*) into n
    from public.admin_consultation_messages msg
    join public.consultation_meetings m on m.id = msg.meeting_id
   where not m.transcript_consent;
  if n > 0 then
    raise exception 'LEAK: % transcript rows visible without consent', n;
  end if;

  -- the allowed writes work (and roll back with everything else)
  select id into v_lead from public.admin_leads_list order by created_at desc limit 1;
  if v_lead is not null then
    perform public.admin_set_lead_status(v_lead, 'contacted');
    perform public.admin_add_lead_note(v_lead, 'verification probe');
  end if;

  -- a status outside the dashboard vocabulary is refused
  begin
    perform public.admin_set_lead_status(coalesce(v_lead, gen_random_uuid()), 'spam');
    raise exception 'LEAK: the RPC accepted a status outside the dashboard set';
  exception when others then
    if sqlstate <> '22023' and sqlstate <> 'P0002' then raise; end if;
  end;
end $$;

-- even an owner has no direct table privilege: no read, no write, no delete
do $$
declare probe text;
begin
  foreach probe in array array[
    'select metadata from public.leads limit 1',
    'select access_token_hash from public.consultation_meetings limit 1',
    'select ip_hash from public.voice_sessions limit 1',
    'select data from public.consultation_events limit 1',
    'select last_error from public.lead_notifications limit 1',
    'select * from public.admin_users limit 1',
    'select * from public.lead_internal_notes limit 1',
    'delete from public.leads where false',
    'delete from public.lead_internal_notes where false',
    'update public.leads set email = ''attacker@example.invalid'' where false',
    'update public.leads set reference_code = ''SCS-AAAAAAAA'' where false',
    'update public.requirements set answers = ''{}''::jsonb where false',
    'insert into public.leads (reference_code, lead_type, name, email) values (''SCS-ZZZZZZZZ'', ''contact'', ''nope'', ''nope@example.invalid'')',
    'insert into public.admin_users (user_id, role) values (auth.uid(), ''owner'')'
  ] loop
    begin
      execute probe;
      raise exception 'LEAK: owner could run "%"', probe;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

reset role;

rollback;

-- =============================================================================
-- D. Static posture check — run any time, no role switching needed.
-- =============================================================================
-- This feature must add ZERO policies; the list below should be unchanged from
-- before the migration (i.e. empty for these tables):
--   select schemaname, tablename, policyname, roles, cmd, qual, with_check
--     from pg_policies where schemaname = 'public' order by tablename;
--
-- Only the admin_* views may be granted to authenticated, select-only:
--   select table_name, privilege_type, grantee
--     from information_schema.role_table_grants
--    where table_schema = 'public' and grantee in ('anon','authenticated')
--    order by table_name, grantee;
--
-- Only these four functions may be executable by authenticated:
--   is_active_admin, admin_me, admin_set_lead_status, admin_add_lead_note,
--   admin_update_lead_note
--   select p.proname, p.prosecdef, p.proconfig
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname like 'admin\_%' or p.proname = 'is_active_admin';
