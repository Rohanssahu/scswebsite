# Supabase Secure Lead Collection — Owner Setup Guide

This guide activates the lead-collection backend added in Step 2. Until you
complete it, the website keeps working exactly as before: the Contact form
falls back to the existing EmailJS path, and the Consultation /
requirement-submission forms show a friendly "temporarily unavailable" notice.

**Never commit or paste real secret values into the repository.**

Architecture:

```
GitHub Pages React frontend
        ↓ HTTPS (anon key + Turnstile token)
Supabase Edge Function  submit-lead   (validates origin, Turnstile, fields, rate limit)
        ↓ service role (server-side only)
Supabase PostgreSQL     leads / requirements / human_review_requests
```

---

## 1. Create a Supabase project

1. Sign in at https://supabase.com/dashboard → **New project**.
2. Choose an organization, name it (e.g. `scs-website`), pick a strong
   database password (store it in a password manager — you rarely need it),
   and a region close to your visitors (e.g. `ap-south-1` Mumbai).

## 2. Find the Project URL and anon key

Dashboard → **Project Settings → API**:

- **Project URL** → goes in `VITE_SUPABASE_URL` (looks like `https://xxxx.supabase.co`)
- **anon / public key** → goes in `VITE_SUPABASE_ANON_KEY`

The anon key is safe for the browser. The **service_role key on the same page
is NOT** — never put it in any `VITE_*` variable or frontend file.

## 3. Apply the SQL migrations

Option A — SQL editor (no tooling needed):

1. Dashboard → **SQL Editor → New query**.
2. Paste and run each file in `supabase/migrations/` **in filename order**:
   1. `20260820100001_create_leads.sql`
   2. `20260820100002_create_requirements.sql`
   3. `20260820100003_create_human_review_requests.sql`
   4. `20260820100004_rate_limit_and_submit_tx.sql`

Option B — Supabase CLI (`npm i -g supabase`, then):

```bash
supabase login
supabase init          # once, in the repo root (creates supabase/config.toml)
supabase link --project-ref <your-project-ref>
supabase db push       # applies supabase/migrations/*
```

## 4. Create the Cloudflare Turnstile widget

1. https://dash.cloudflare.com → **Turnstile → Add site**.
2. Domain: `scssoftwares.com` (also add `localhost` for development).
3. Widget mode: **Managed** (recommended).
4. Copy the **Site key** (public → `VITE_TURNSTILE_SITE_KEY`) and the
   **Secret key** (server-only → Edge Function secret, next section).

For development/testing without a real widget, Cloudflare's documented test
keys always pass: site key `1x00000000000000000000AA`, secret
`1x0000000000000000000000000000000AA`. Use them **only** locally — production
must use your real keys (verification is never bypassed; if the secret is
missing the function fails closed).

## 5. Deploy the Edge Function and set its secrets

```bash
supabase functions deploy submit-lead
```

Then set the server-side secrets (Dashboard → **Edge Functions → submit-lead →
Secrets**, or CLI):

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<your turnstile secret>
supabase secrets set ALLOWED_ORIGINS=https://rohanssahu.github.io   # optional extras
supabase secrets set RATE_LIMIT_SALT=<any long random string>       # optional
```

Notes:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
  the platform — do not set them yourself.
- `https://scssoftwares.com`, `https://www.scssoftwares.com` and localhost dev
  ports are always allowed; `ALLOWED_ORIGINS` only adds extra origins
  (comma-separated).

## 6. Add the public variables to your local `.env`

Copy `.env.example` → `.env.local` and fill in the three public values:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TURNSTILE_SITE_KEY=0x4AAA...
```

`.env*` files are git-ignored — verify with `git status` that nothing appears.

## 7. Add the public variables to the GitHub Pages deployment

The site deploys from your machine via `npm run deploy` (which runs
`npm run build` first). Vite reads `.env.local` / `.env.production` at build
time, so as long as the three `VITE_` values are present in your local env
files, the deployed bundle includes them. They are public values — safe to
embed. If you later move to a GitHub Actions deploy, add the same three values
as repository **Variables** and pass them to the build step's `env:`.

## 8. Test with Supabase test data

1. `npm run dev`, open `http://localhost:5173/consultation-form`.
2. Submit a test consultation. You should get a success screen with a
   reference ID like `SCS-K4M2P7QW`.
3. Dashboard → **Table Editor → leads** — the row should be there
   (`lead_type = consultation`, `status = new`).
4. Run the project-analysis flow → result page → **Submit Requirement to SCS**
   → check `requirements` has a row linked by `lead_id`.
5. **Request Human Review** → check `human_review_requests` has a row with
   `status = requested` linked to the lead and requirement.
6. Contact form → check the lead row exists *and* the EmailJS email still
   arrives (email is now secondary; the database row is the source of truth).
7. Delete the test rows from the Table Editor afterwards.

## 9. Verify RLS is protecting the tables

In the SQL editor, run as the anon role simulation:

```sql
-- Should return 0 rows / permission errors when called via the public API.
select * from public.leads limit 1;
```

More direct: from a browser console on your site (or curl), call PostgREST
with the anon key — it must be denied:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/leads?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
# expected: "permission denied" — anon has no grants and RLS has no policies
```

Repeat for `requirements`, `human_review_requests`, `lead_submission_events`.
Also confirm inserts are denied the same way. Only the Edge Function (service
role) can touch these tables.

## 10. Rolling back safely

- **Frontend only**: remove the three `VITE_` values and rebuild/redeploy —
  every form returns to its pre-Step-2 behavior (Contact uses EmailJS,
  Consultation shows the unavailable notice). No data is lost.
- **Edge Function**: Dashboard → Edge Functions → submit-lead → delete (or
  `supabase functions delete submit-lead`). Forms fail safe with a friendly
  error.
- **Database**: the tables are additive. To remove completely:

  ```sql
  drop function if exists public.submit_lead_tx(jsonb);
  drop table if exists public.lead_submission_events;
  drop table if exists public.human_review_requests;
  drop table if exists public.requirements;
  drop table if exists public.leads;
  drop function if exists public.set_updated_at();
  ```

  Export any collected leads first (Table Editor → export CSV).

## Privacy disclosures needed later (not done in this step)

The Privacy Policy should eventually disclose: what lead data is stored
(name, email, phone, company, project details), that it is stored in Supabase
(hosting region), the consent basis, retention period, the use of Cloudflare
Turnstile (which sets its own cookies/telemetry), rate-limit IP hashing, and a
contact for deletion requests.
