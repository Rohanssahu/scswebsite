-- =============================================================================
-- Buddy voice agent — voice_sessions + voice_session_events (Step: voice MVP)
--
-- SECURITY MODEL (same as leads/requirements):
--   The browser NEVER reads or writes these tables. Rows are created by the
--   `livekit-token` Edge Function and updated by the `voice-lead` Edge
--   Function (both service role). RLS is enabled with NO policies, and all
--   PostgREST grants for public roles are revoked, so anon/authenticated get
--   nothing — one visitor can never select another visitor's sessions.
--
-- PRIVACY:
--   No raw audio is ever stored. No full transcripts are stored here.
--   voice_session_events.data is a whitelisted, privacy-safe JSON blob
--   (event names, durations, counters, error codes) written server-side only.
-- =============================================================================

create table public.voice_sessions (
  id                    uuid primary key default gen_random_uuid(),
  -- LiveKit room + participant identity generated server-side (random).
  room_name             text not null unique check (char_length(room_name) <= 100),
  participant_identity  text not null check (char_length(participant_identity) <= 100),
  status                text not null default 'created'
                          check (status in
                            ('created','active','completed','abandoned','expired','error')),
  -- Conversation language chosen by the visitor (en / hi / hinglish / …).
  selected_language     text check (char_length(selected_language) <= 20),
  -- Salted SHA-256 hash of the caller IP (same scheme as lead rate limiting).
  ip_hash               text check (char_length(ip_hash) <= 64),
  -- Sanitized request origin (allowlisted before insert).
  origin                text check (char_length(origin) <= 300),
  turn_count            integer not null default 0 check (turn_count >= 0),
  disconnect_reason     text check (char_length(disconnect_reason) <= 200),
  -- Set by voice-lead when the session converts; also the duplicate guard.
  lead_id               uuid references public.leads (id) on delete set null,
  -- Consent captured in the UI before connecting (mic + data processing).
  consent_at            timestamptz,
  -- The visitor explicitly opted in to storing the transcript summary detail.
  transcript_consent    boolean not null default false,
  started_at            timestamptz,
  ended_at              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index voice_sessions_created_at_idx on public.voice_sessions (created_at desc);
create index voice_sessions_ip_created_idx on public.voice_sessions (ip_hash, created_at desc);
create index voice_sessions_status_idx     on public.voice_sessions (status);

create trigger voice_sessions_set_updated_at
  before update on public.voice_sessions
  for each row execute function public.set_updated_at();

alter table public.voice_sessions enable row level security;
revoke all on table public.voice_sessions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Privacy-safe event log per session: state transitions, tool calls, guard
-- rejections, provider timeouts, usage counters. Never transcript text,
-- audio, contact details or prompt content.
-- -----------------------------------------------------------------------------
create table public.voice_session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.voice_sessions (id) on delete cascade,
  event_type  text not null
                check (event_type in
                  ('session_started','session_ended','language_selected',
                   'state_updated','estimate_generated','estimate_rejected',
                   'confirmation_requested','lead_submitted','review_requested',
                   'guard_triggered','provider_timeout','provider_error',
                   'idle_timeout','turn_limit_reached','duration_limit_reached',
                   'usage','error')),
  -- Whitelisted metadata only (counters, codes, field names). Enforced by the
  -- Edge Function / worker; size-capped here as defense in depth.
  data        jsonb not null default '{}'::jsonb
                check (pg_column_size(data) <= 8192),
  created_at  timestamptz not null default now()
);

create index voice_session_events_session_idx
  on public.voice_session_events (session_id, created_at);

alter table public.voice_session_events enable row level security;
revoke all on table public.voice_session_events from anon, authenticated;
