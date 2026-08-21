-- =============================================================================
-- SCS AI Consultation Meetings — consultation_meetings, consultation_messages,
-- consultation_artifacts, consultation_proposals, consultation_events.
--
-- SECURITY MODEL (same as leads/voice_sessions):
--   The browser NEVER reads or writes these tables directly. All access goes
--   through the `consultation-meeting` Edge Function (browser, Turnstile +
--   scoped access-token proof) and the `consultation-agent` Edge Function
--   (Buddy worker, VOICE_AGENT_SECRET). RLS is enabled with ZERO policies and
--   all PostgREST grants for public roles are revoked.
--
-- ACCESS PROOF:
--   A meeting is addressed by a non-sequential public reference
--   (SCSM-XXXXXXXXXX) PLUS a bearer access token generated at creation and
--   returned exactly once. Only the SHA-256 hash of that token is stored —
--   the reference alone never grants access to requirements, chat or links.
--
-- PRIVACY:
--   No raw audio is ever stored. consultation_messages rows are written only
--   when transcript_consent is true (enforced in the Edge Function).
--   consultation_events.data is a whitelisted, privacy-safe JSON blob.
-- =============================================================================

create table public.consultation_meetings (
  id                      uuid primary key default gen_random_uuid(),
  -- Public, non-sequential reference shown to the client. Safe to expose.
  public_reference        text not null unique
                            check (public_reference ~ '^SCSM-[A-Z0-9]{10}$'),
  -- SHA-256 hex of the one-time bearer access token (never the token itself).
  access_token_hash       text not null check (char_length(access_token_hash) = 64),
  meeting_kind            text not null check (meeting_kind in ('instant','scheduled')),
  status                  text not null default 'scheduled'
                            check (status in
                              ('scheduled','in_progress','completed','cancelled','expired','error')),
  -- Human follow-up: a REQUEST, never an automatically confirmed meeting.
  review_status           text not null default 'none'
                            check (review_status in ('none','requested')),
  name                    text not null check (char_length(name) between 2 and 100),
  email                   text not null
                            check (char_length(email) <= 254 and position('@' in email) > 1),
  phone                   text check (char_length(phone) <= 30),
  company                 text check (char_length(company) <= 150),
  -- Client's IANA timezone, stored separately from the UTC timestamp.
  client_timezone         text check (char_length(client_timezone) <= 64),
  scheduled_at            timestamptz,
  early_join_minutes      integer not null default 15 check (early_join_minutes between 5 and 120),
  selected_language       text check (char_length(selected_language) <= 20),
  -- Consent captured in the scheduling form (AI disclosure + data processing).
  consent_at              timestamptz not null,
  transcript_consent      boolean not null default false,
  transcript_consent_at   timestamptz,
  -- Immutable, whitelisted snapshot of the completed project analysis. Browser
  -- numbers inside are clamped and flagged as client-reported — the meeting
  -- proposal figures are always recomputed by the deterministic engine.
  analysis_snapshot       jsonb not null default '{}'::jsonb
                            check (pg_column_size(analysis_snapshot) <= 32768),
  -- Latest structured requirement state saved by the agent (whitelisted).
  requirements            jsonb not null default '{}'::jsonb
                            check (pg_column_size(requirements) <= 32768),
  requirement_summary     text check (char_length(requirement_summary) <= 10000),
  -- Latest LiveKit room (fresh + random per join, never client input).
  room_name               text check (char_length(room_name) <= 100),
  participant_identity    text check (char_length(participant_identity) <= 100),
  join_count              integer not null default 0 check (join_count between 0 and 100),
  -- Set by finalize_consultation_tx; also the duplicate-submission guard.
  lead_id                 uuid references public.leads (id) on delete set null,
  finalized_at            timestamptz,
  ip_hash                 text check (char_length(ip_hash) <= 64),
  origin                  text check (char_length(origin) <= 300),
  started_at              timestamptz,
  ended_at                timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- A scheduled meeting must carry a scheduled time; an instant one must not
  -- require one.
  constraint consultation_meetings_scheduled_time
    check (meeting_kind <> 'scheduled' or scheduled_at is not null)
);

create index consultation_meetings_created_at_idx on public.consultation_meetings (created_at desc);
create index consultation_meetings_ip_created_idx on public.consultation_meetings (ip_hash, created_at desc);
create index consultation_meetings_status_idx     on public.consultation_meetings (status);
create index consultation_meetings_reference_idx  on public.consultation_meetings (public_reference);

create trigger consultation_meetings_set_updated_at
  before update on public.consultation_meetings
  for each row execute function public.set_updated_at();

alter table public.consultation_meetings enable row level security;
revoke all on table public.consultation_meetings from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Chat/transcript lines. Written ONLY when the meeting has transcript_consent
-- (enforced by the consultation-agent Edge Function before insert).
-- -----------------------------------------------------------------------------
create table public.consultation_messages (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.consultation_meetings (id) on delete cascade,
  sender      text not null check (sender in ('client','buddy','system')),
  content     text not null check (char_length(content) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index consultation_messages_meeting_idx
  on public.consultation_messages (meeting_id, created_at);

alter table public.consultation_messages enable row level security;
revoke all on table public.consultation_messages from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Links & notes provided by the client (repository / Figma / API docs / live
-- site URLs, free-text notes). URLs are validated + host-checked by the Edge
-- Function and are stored as UNTRUSTED data — never fetched or cloned.
-- Document uploads are intentionally NOT part of this schema yet (feature-
-- flagged off until a signed private-bucket flow ships).
-- -----------------------------------------------------------------------------
create table public.consultation_artifacts (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.consultation_meetings (id) on delete cascade,
  kind        text not null
                check (kind in ('repository','figma','api_docs','website','other_link','note')),
  url         text check (char_length(url) <= 2048),
  -- Hostname extracted server-side for quick triage (untrusted display data).
  host        text check (char_length(host) <= 200),
  label       text check (char_length(label) <= 200),
  note        text check (char_length(note) <= 2000),
  created_at  timestamptz not null default now(),
  constraint consultation_artifacts_content
    check (url is not null or note is not null)
);

create index consultation_artifacts_meeting_idx
  on public.consultation_artifacts (meeting_id, created_at);

alter table public.consultation_artifacts enable row level security;
revoke all on table public.consultation_artifacts from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Versioned preliminary proposals. Every number is computed by the
-- deterministic engine (agent worker) and independently re-derived by the
-- consultation-agent Edge Function — model/browser arithmetic never lands
-- here. status is always 'preliminary' (or 'superseded'); a human review is
-- always required before anything becomes a quotation.
-- -----------------------------------------------------------------------------
create table public.consultation_proposals (
  id                     uuid primary key default gen_random_uuid(),
  meeting_id             uuid not null references public.consultation_meetings (id) on delete cascade,
  version                integer not null check (version between 1 and 100),
  status                 text not null default 'preliminary'
                           check (status in ('preliminary','superseded')),
  requires_human_review  boolean not null default true,
  currency               text not null default 'USD' check (currency in ('USD')),
  config_version         text not null check (char_length(config_version) <= 40),
  -- Whitelisted structured content: summary, recommended solution and
  -- architecture, stack, in/out of scope, AI + human roles, milestones,
  -- assumptions, dependencies, risks, per-role hours, modules.
  proposal               jsonb not null default '{}'::jsonb
                           check (pg_column_size(proposal) <= 32768),
  total_hours_min        integer not null check (total_hours_min between 0 and 100000),
  total_hours_max        integer not null check (total_hours_max between 0 and 100000),
  total_cost_min         integer not null check (total_cost_min between 0 and 10000000),
  total_cost_max         integer not null check (total_cost_max between 0 and 10000000),
  duration_weeks_min     integer not null check (duration_weeks_min between 0 and 520),
  duration_weeks_max     integer not null check (duration_weeks_max between 0 and 520),
  weekly_capacity_hours  integer not null default 40 check (weekly_capacity_hours between 1 and 168),
  confidence             text not null check (confidence in ('low','medium','high')),
  created_at             timestamptz not null default now(),
  unique (meeting_id, version),
  constraint consultation_proposals_ranges_ordered
    check (total_hours_min <= total_hours_max
       and total_cost_min <= total_cost_max
       and duration_weeks_min <= duration_weeks_max)
);

create index consultation_proposals_meeting_idx
  on public.consultation_proposals (meeting_id, version desc);

alter table public.consultation_proposals enable row level security;
revoke all on table public.consultation_proposals from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privacy-safe event log per meeting: lifecycle, state transitions, safe error
-- categories, counters. Never transcript text, contact details, URLs, file
-- names or prompt content.
-- -----------------------------------------------------------------------------
create table public.consultation_events (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.consultation_meetings (id) on delete cascade,
  event_type  text not null
                check (event_type in
                  ('meeting_created','lobby_opened','join_issued','agent_joined',
                   'greeting_spoken','language_selected','state_updated',
                   'proposal_generated','proposal_rejected','links_submitted',
                   'confirmation_requested','finalized','duplicate_finalize_blocked',
                   'review_requested','rescheduled','cancelled','expired',
                   'reconnected','guard_triggered','provider_timeout','provider_error',
                   'idle_timeout','turn_limit_reached','duration_limit_reached',
                   'session_ended','usage','error')),
  data        jsonb not null default '{}'::jsonb
                check (pg_column_size(data) <= 8192),
  created_at  timestamptz not null default now()
);

create index consultation_events_meeting_idx
  on public.consultation_events (meeting_id, created_at);

alter table public.consultation_events enable row level security;
revoke all on table public.consultation_events from anon, authenticated;
