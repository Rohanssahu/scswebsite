-- =============================================================================
-- SCS Softwares — Company Owner Dashboard, part 1: staff authorization.
--
-- Additive only. Nothing here changes the existing public submission flow:
-- `submit-lead`, `voice-lead`, `consultation-meeting` and `consultation-agent`
-- keep running with the service role and keep bypassing RLS exactly as before.
--
-- WHAT THIS ADDS
--   public.admin_users      — the ONLY list of accounts allowed into /admin.
--   public.is_active_admin()— the single authorization predicate used by every
--                             dashboard view and RPC added in part 2.
--   public.admin_me()       — lets the dashboard read its own role without any
--                             grant on admin_users.
--
-- WHAT THIS DELIBERATELY DOES NOT ADD
--   * No passwords, no password hashes, no e-mail addresses. Authentication is
--     Supabase Auth's job; this table only answers "is this uid staff?".
--   * No self-service signup path. Rows are inserted by hand in the SQL Editor
--     (see docs/ADMIN_DASHBOARD_SETUP.md) — anon and authenticated have no
--     INSERT/UPDATE/DELETE privilege on this table at all.
--   * No real owner UUID or e-mail. Never commit one to this repository.
-- =============================================================================

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Staff allow-list for the owner dashboard. Never stores credentials. '
  'Rows are created manually via the Supabase SQL Editor; no public role can write here.';

-- -----------------------------------------------------------------------------
-- The authorization predicate.
--
-- SECURITY DEFINER so it can read admin_users without the caller needing a
-- policy on it — that is what prevents RECURSIVE RLS: policies on other tables
-- call this function, the function reads admin_users as its owner, and the
-- admin_users policy below never calls the function back.
--
-- STABLE so Postgres evaluates it once per statement rather than once per row.
-- Fixed search_path so a hostile temp object can never shadow `admin_users`.
-- -----------------------------------------------------------------------------
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.admin_users a
     where a.user_id = auth.uid()
       and a.is_active
       and a.role in ('owner', 'admin')
  );
$$;

comment on function public.is_active_admin() is
  'True when the current JWT belongs to an active owner/admin. Returns false '
  'for anon (auth.uid() is null) and for any authenticated user without a row.';

-- Anonymous visitors can never even ask the question.
revoke all on function public.is_active_admin() from public;
revoke all on function public.is_active_admin() from anon;
grant execute on function public.is_active_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- admin_users stays COMPLETELY unreachable from the browser: RLS on, zero
-- policies, zero grants — exactly the posture the existing tables use. The
-- dashboard learns its own role through the definer function below instead of
-- selecting the table, so no RLS policy is needed anywhere in this feature.
-- -----------------------------------------------------------------------------
alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;

-- "Who am I?" for the dashboard header. Returns NULL for anyone who is not an
-- active owner/admin, so absent and denied look identical from the browser.
create or replace function public.admin_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('user_id', a.user_id, 'role', a.role, 'is_active', a.is_active)
    from public.admin_users a
   where a.user_id = auth.uid()
     and a.is_active
     and a.role in ('owner', 'admin');
$$;

revoke all on function public.admin_me() from public;
revoke all on function public.admin_me() from anon;
grant execute on function public.admin_me() to authenticated;

-- Membership changes remain an out-of-band, human operation in the SQL Editor.
