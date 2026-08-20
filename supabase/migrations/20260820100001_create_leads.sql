-- =============================================================================
-- SCS Softwares — lead collection schema (Step 2)
-- Table: public.leads — one row per public submission (contact message,
-- consultation request, project-requirement submission, human-review request).
--
-- SECURITY MODEL
--   The browser NEVER reads or writes these tables directly. All public
--   submissions go through the `submit-lead` Edge Function, which runs with
--   the service role (bypasses RLS). RLS is enabled with NO policies for
--   anon/authenticated, so direct PostgREST access is fully denied.
--
--   FUTURE (documented, intentionally NOT implemented in this step):
--   staff/admin dashboard access should be added as authenticated-role
--   policies gated on a staff claim or a `staff_members` table, e.g.:
--     create policy "staff can read leads" on public.leads
--       for select to authenticated
--       using (exists (select 1 from public.staff_members s
--                      where s.user_id = auth.uid()));
-- =============================================================================

-- Shared trigger: keep updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.leads (
  id                        uuid primary key default gen_random_uuid(),
  -- Public, human-friendly reference shown to the visitor. Safe to expose.
  reference_code            text not null unique
                              check (reference_code ~ '^SCS-[A-Z0-9]{8}$'),
  lead_type                 text not null
                              check (lead_type in
                                ('contact','consultation','project_requirement','human_review')),
  -- Where the submission came from (route or channel), e.g. '/contact'.
  source                    text check (char_length(source) <= 300),
  name                      text not null
                              check (char_length(name) between 2 and 100),
  email                     text not null
                              check (char_length(email) <= 254 and position('@' in email) > 1),
  phone                     text check (char_length(phone) <= 30),
  company                   text check (char_length(company) <= 150),
  country                   text check (char_length(country) <= 100),
  preferred_language        text check (char_length(preferred_language) <= 10),
  preferred_contact_method  text check (preferred_contact_method in
                                ('email','phone','whatsapp')),
  service                   text check (char_length(service) <= 100),
  project_mode              text check (project_mode in ('new','existing')),
  project_summary           text check (char_length(project_summary) <= 5000),
  budget_range              text check (char_length(budget_range) <= 100),
  timeline                  text check (char_length(timeline) <= 100),
  status                    text not null default 'new'
                              check (status in
                                ('new','contacted','qualified','in_review','closed','spam')),
  human_review_requested    boolean not null default false,
  -- Sanitized, non-sensitive structured context only (consent timestamp,
  -- hashed IP, user agent family…). Never tokens, files or raw voice data.
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_lead_type_idx  on public.leads (lead_type);
create index leads_status_idx     on public.leads (status);
create index leads_email_idx      on public.leads (email);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Lock the table down: RLS on, zero policies → anon/authenticated get nothing.
alter table public.leads enable row level security;

-- Belt and suspenders: remove PostgREST grants for public roles entirely.
revoke all on table public.leads from anon, authenticated;
