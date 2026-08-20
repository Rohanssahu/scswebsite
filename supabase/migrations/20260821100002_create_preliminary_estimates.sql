-- =============================================================================
-- Buddy voice agent — preliminary_estimates + lead_notifications
--
-- preliminary_estimates: one server-validated preliminary estimate per voice
-- session. Every number is calculated and range-checked by deterministic
-- server-side code (agent worker engine + voice-lead re-validation) — never
-- accepted from model arithmetic or the browser. status is always
-- 'preliminary' until a human review produces a real quotation (out of scope
-- for this MVP — requires_human_review stays true).
--
-- lead_notifications: delivery status for Resend emails so a failed email can
-- be retried without ever rolling back a stored lead.
--
-- SECURITY: RLS enabled, zero policies, public grants revoked — browser roles
-- have no access. Only Edge Functions (service role) touch these tables.
-- =============================================================================

create table public.preliminary_estimates (
  id                      uuid primary key default gen_random_uuid(),
  session_id              uuid not null references public.voice_sessions (id) on delete cascade,
  lead_id                 uuid references public.leads (id) on delete set null,
  requirement_id          uuid references public.requirements (id) on delete set null,
  status                  text not null default 'preliminary'
                            check (status in ('preliminary','superseded')),
  requires_human_review   boolean not null default true,
  currency                text not null default 'USD' check (currency in ('USD')),
  -- Version of the server-side rate/limit configuration used.
  config_version          text not null check (char_length(config_version) <= 40),
  -- Whitelisted structured content produced by the deterministic engine:
  -- modules, architecture, per-role hours, team roles, assumptions,
  -- exclusions, risks. Validated field-by-field before insert.
  breakdown               jsonb not null default '{}'::jsonb
                            check (pg_column_size(breakdown) <= 32768),
  total_hours_min         integer not null check (total_hours_min between 0 and 100000),
  total_hours_max         integer not null check (total_hours_max between 0 and 100000),
  total_cost_min          integer not null check (total_cost_min between 0 and 10000000),
  total_cost_max          integer not null check (total_cost_max between 0 and 10000000),
  duration_weeks_min      integer not null check (duration_weeks_min between 0 and 520),
  duration_weeks_max      integer not null check (duration_weeks_max between 0 and 520),
  confidence              text not null check (confidence in ('low','medium','high')),
  created_at              timestamptz not null default now(),
  constraint preliminary_estimates_ranges_ordered
    check (total_hours_min <= total_hours_max
       and total_cost_min <= total_cost_max
       and duration_weeks_min <= duration_weeks_max)
);

create index preliminary_estimates_session_idx on public.preliminary_estimates (session_id);
create index preliminary_estimates_lead_idx    on public.preliminary_estimates (lead_id);

alter table public.preliminary_estimates enable row level security;
revoke all on table public.preliminary_estimates from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Email notification ledger. One row per (lead, recipient kind). Recipients
-- are fixed server-side: 'client' = the lead's own email, 'admin' = the
-- configured LEAD_ADMIN_EMAIL. Arbitrary recipients are impossible by design.
-- -----------------------------------------------------------------------------
create table public.lead_notifications (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads (id) on delete cascade,
  recipient    text not null check (recipient in ('client','admin')),
  -- Stored for audit; always derived server-side, never from request input.
  email_to     text not null check (char_length(email_to) <= 254),
  status       text not null default 'pending'
                 check (status in ('pending','sent','failed')),
  attempts     integer not null default 0 check (attempts between 0 and 10),
  -- Safe, truncated provider error label — never full response bodies.
  last_error   text check (char_length(last_error) <= 300),
  provider_id  text check (char_length(provider_id) <= 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (lead_id, recipient)
);

create index lead_notifications_status_idx on public.lead_notifications (status, updated_at);

create trigger lead_notifications_set_updated_at
  before update on public.lead_notifications
  for each row execute function public.set_updated_at();

alter table public.lead_notifications enable row level security;
revoke all on table public.lead_notifications from anon, authenticated;
