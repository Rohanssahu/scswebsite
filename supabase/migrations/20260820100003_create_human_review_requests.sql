-- =============================================================================
-- Table: public.human_review_requests — a visitor's explicit request for a
-- human review of their (demo) requirement/estimate.
--
-- Public submissions may only ever create rows with status 'requested'.
-- assigned_to / reviewed_at / status transitions are STAFF-ONLY fields:
-- the Edge Function never accepts them from the browser, and no public role
-- has write access to this table at all.
-- =============================================================================

create table public.human_review_requests (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads (id) on delete cascade,
  requirement_id   uuid references public.requirements (id) on delete set null,
  reason           text check (char_length(reason) <= 500),
  visitor_message  text check (char_length(visitor_message) <= 2000),
  status           text not null default 'requested'
                     check (status in ('requested','in_review','completed','rejected')),
  -- Staff-only fields, set by internal tooling in a later step.
  assigned_to      text check (char_length(assigned_to) <= 150),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index human_review_requests_lead_id_idx        on public.human_review_requests (lead_id);
create index human_review_requests_requirement_id_idx on public.human_review_requests (requirement_id);
create index human_review_requests_status_idx         on public.human_review_requests (status);

create trigger human_review_requests_set_updated_at
  before update on public.human_review_requests
  for each row execute function public.set_updated_at();

alter table public.human_review_requests enable row level security;
revoke all on table public.human_review_requests from anon, authenticated;
