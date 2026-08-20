-- =============================================================================
-- Table: public.requirements — detailed project information captured by the
-- project-analysis flow (new-project or existing-project), linked to a lead.
--
-- The stored demo_estimate is preliminary/demo output of the frontend's
-- example calculator. It is NEVER a final quotation — `status` records that.
-- Same security model as public.leads: service-role writes only, no public
-- policies (see 20260820100001_create_leads.sql for the future staff policy).
-- =============================================================================

create table public.requirements (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references public.leads (id) on delete cascade,
  mode                 text not null check (mode in ('new','existing')),
  -- Visitor answers keyed by question id (strings or string arrays),
  -- validated and size-limited by the Edge Function before insert.
  answers              jsonb not null default '{}'::jsonb,
  requirement_summary  text check (char_length(requirement_summary) <= 10000),
  -- Sanitized demo estimate (whitelisted numeric fields only).
  demo_estimate        jsonb not null default '{}'::jsonb,
  estimate_version     text not null default 'demo-v1'
                         check (char_length(estimate_version) <= 40),
  selected_language    text check (char_length(selected_language) <= 10),
  current_route        text check (char_length(current_route) <= 300),
  -- 'preliminary' = demo estimate, not a quotation. 'superseded' for later
  -- resubmissions once staff tooling exists.
  status               text not null default 'preliminary'
                         check (status in ('preliminary','in_review','superseded')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index requirements_lead_id_idx    on public.requirements (lead_id);
create index requirements_created_at_idx on public.requirements (created_at desc);

create trigger requirements_set_updated_at
  before update on public.requirements
  for each row execute function public.set_updated_at();

alter table public.requirements enable row level security;
revoke all on table public.requirements from anon, authenticated;
