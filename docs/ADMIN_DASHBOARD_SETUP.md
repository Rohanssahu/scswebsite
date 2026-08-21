# SCS Owner Dashboard — setup and security notes

A small, staff-only dashboard on three routes:

| Route | What it does |
|---|---|
| `/admin/login` | Supabase Auth email + password sign-in |
| `/admin` | Summary cards, recent leads (search / filter / paginate), unsubmitted consultations |
| `/admin/leads/:id` | One lead: client, project, analysis + preliminary estimate, consultation, human review, status + internal notes |

It is **not** a CRM, a client portal, a payments system or a team-management tool, and it never
adds a public signup path.

---

## 1. Environment variables

**No new variables.** The dashboard reuses the two public values the site already ships:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

There is no service-role key in the frontend, and no owner email, password or UUID anywhere in
the repository. Sign-in credentials are typed by the owner and go straight to Supabase Auth.

---

## 2. Apply the migrations

Two additive migrations, in order:

```
supabase/migrations/20260821300001_create_admin_users.sql
supabase/migrations/20260821300002_admin_dashboard_access.sql
```

```bash
supabase db push          # or paste each file into the SQL Editor, in order
```

What they add:

* `public.admin_users (user_id, role, is_active, created_at)` — the staff allow-list. **No
  passwords.** RLS enabled, zero policies, zero grants: unreachable from the browser.
* `public.is_active_admin()` — `stable security definer`, fixed `search_path`, answers
  "is `auth.uid()` an active owner/admin?".
* `public.admin_me()` — lets the dashboard read its own role without any grant on `admin_users`.
* Eleven `admin_*` views — the entire read surface, explicit column lists, each ending in
  `where public.is_active_admin()`.
* Three write RPCs — `admin_set_lead_status`, `admin_add_lead_note`, `admin_update_lead_note`.
* `public.lead_internal_notes` — staff notes, kept out of client-submitted JSON. RLS enabled,
  zero policies, zero grants; reachable only through `admin_lead_notes` and the two note RPCs.
* One widened check constraint: `leads.status` now also accepts `proposal_sent` and `hired`.
  Every previous value (`new`, `contacted`, `qualified`, `in_review`, `closed`, `spam`) stays legal.

Nothing existing is dropped, unlocked or rewritten. `submit_lead_tx`, `submit_voice_lead_tx`,
`finalize_consultation_tx` and all six Edge Functions are untouched.

---

## 3. Create the owner account (manual, once)

Never commit a real email, password or UUID.

1. **Supabase Dashboard → Authentication → Users → Add user.**
   Use the owner's email and a strong, unique password. Mark the email as confirmed.
2. Copy the generated **User UID**.
3. **SQL Editor**, once:

   ```sql
   insert into public.admin_users (user_id, role)
   values ('OWNER_AUTH_UUID', 'owner');
   ```

4. Verify:

   ```sql
   select user_id, role, is_active from public.admin_users;
   ```

5. Sign in at `/admin/login`. You should land on `/admin`.
6. **Enable MFA** for that account in Supabase Auth when your project supports it, and consider
   turning off email signups for the project (Authentication → Providers) so no one can
   self-register. A self-registered account still cannot reach the dashboard — it has no
   `admin_users` row — but keeping the user table clean is worth it.

To revoke access later, without deleting anything:

```sql
update public.admin_users set is_active = false where user_id = 'OWNER_AUTH_UUID';
```

The change takes effect on that person's next page load, because the guard re-checks membership
on every session restore.

---

## 4. Verify the security posture

`supabase/tests/admin_access_verification.sql` is a read-only probe script. Replace the two
placeholder UUIDs, run it in the SQL Editor, and it will `raise exception` on any regression.
It rolls back at the end, so it never writes data. It asserts:

* **anon** gets `42501` on every base table, every admin view and every dashboard function;
* an **authenticated non-staff** user gets zero rows from every view, `null` from `admin_me()`,
  a refusal from every write RPC, and `42501` on every base table;
* an **active owner** can read the intended surface, cannot read `metadata`, `ip_hash`,
  `access_token_hash`, consultation events or notification errors, cannot `DELETE` or `INSERT`
  anything, cannot rewrite a client's email / reference code / answers, and cannot add themselves
  to `admin_users`;
* transcript rows are invisible for meetings without `transcript_consent`.

`supabase/tests/adminAccess.test.ts` asserts the same invariants statically against the migration
SQL, so it runs in CI on every commit (no database needed).

---

## 5. How authorization works (and why there are no RLS policies)

The existing tables were deliberately built as "RLS enabled, **zero policies**, all public grants
revoked" — the browser has never had any privilege on them. This feature keeps that exactly as it
is and adds **no policies at all**. Authorization sits in two narrower places:

**Reads** — eleven owner-privileged views, each with an explicit column list and
`where public.is_active_admin()`:

* anon holds no grant on the views → `permission denied`;
* an authenticated non-staff user passes the grant but fails the predicate → zero rows;
* an active owner/admin sees exactly the listed columns.

Because base tables are still ungranted, a crafted PostgREST request cannot reach them, and
`leads.metadata`, `consultation_meetings.access_token_hash` / `ip_hash` / `room_name` /
`participant_identity` / `origin`, `voice_sessions`, `voice_session_events`,
`consultation_events`, `lead_submission_events` and `lead_notifications` are simply not exposed
anywhere.

**Writes** — three `security definer` functions with fixed `search_path`, each of which re-checks
`is_active_admin()` and touches exactly one column:

| RPC | Writes | Guard |
|---|---|---|
| `admin_set_lead_status(lead_id, status)` | `leads.status` only | admin + status in the six dashboard values |
| `admin_add_lead_note(lead_id, note)` | one `lead_internal_notes` row | admin + author is `auth.uid()`, never an argument |
| `admin_update_lead_note(note_id, note)` | `lead_internal_notes.note` only | admin **and** `author_id = auth.uid()` |

There is no `DELETE` function and no `DELETE`/`INSERT`/`UPDATE` grant on any table, so the
dashboard cannot delete a lead, a requirement, a meeting or even a note; cannot change a public
reference code; and cannot rewrite a client's submitted answers.

`is_active_admin()` and `admin_me()` are `security definer` precisely so nothing needs a grant on
`admin_users` — which is also what makes recursion impossible.

> Supabase's linter flags owner-privileged views as "security definer view". That is intentional
> here: the predicate inside each view *is* the authorization, and the base tables stay ungranted.

---

## 6. Frontend layout

```
src/services/admin/
  adminClient.ts          second Supabase client: persisted session, own storage key
  adminAuthCore.ts        pure: safe error vocabulary, return-path allow-list, state machine
  adminAuth.ts            signInAdmin / restoreAdminSession / safeSignOut (admin_me RPC)
  adminTypes.ts           one interface per database view
  adminLeadsCore.ts       pure: labels, formatting, safe URLs, filters, pagination, query keys
  adminLeadsService.ts    typed reads (explicit columns, server-side paging) + the three RPCs

src/components/admin/
  AdminBoundary.tsx       layout route: auth provider + Suspense for the lazy screens
  AdminAuthProvider.tsx   session restore, auth-state subscription, clean unsubscribe, sign-out
  AdminGuard.tsx          renders children only in the `authorized` state
  AdminLayout.tsx         sidebar / mobile drawer, "View website", "Log out", noindex head
  adminSeo.ts             noindex,nofollow install + restore; isAdminPath()
  AdminLoginCard.tsx      presentational sign-in card
  AdminStatCards.tsx      four summary tiles
  LeadsTable.tsx          table + cards, with loading / empty / no-result / error states
  UnsubmittedConsultations.tsx
  LeadDetailView.tsx      route 3's body

src/pages/admin/
  AdminLogin.tsx  AdminDashboard.tsx  AdminLeadDetail.tsx
```

Notes:

* The dashboard is **English-only** by design — it is an internal tool, and it deliberately does
  not load the public i18n navigation.
* `/admin/*` renders no public `Header`, `Footer`, `LanguageSwitcher`, `ScrollButtons` or floating
  Buddy widget. `App.tsx` unmounts the two global floating widgets on admin paths, and a test
  asserts that no file under `src/**/admin/` imports them.
* Every admin screen installs `<meta name="robots" content="noindex,nofollow">` while mounted and
  removes it on unmount. `public/robots.txt` also disallows `/admin` for every crawler group.
* The three screens are lazily loaded, so a normal visitor downloads none of this.

---

## 7. Draft-lead lifecycle — current behaviour (unchanged)

Reviewed in `supabase/functions/consultation-meeting/index.ts`,
`supabase/functions/consultation-agent/index.ts` and
`supabase/migrations/20260821200002_finalize_consultation_tx.sql`:

* **Scheduling a consultation does *not* create a lead.** It inserts a
  `consultation_meetings` row with `lead_id = null`.
* Joining / starting a meeting updates that row (`status`, `started_at`, `join_count`,
  `requirements`, `requirement_summary`) — still no lead.
* A lead is created **only** by "End & submit", when `finalize_consultation_tx` runs. That one
  transaction inserts `leads` + `requirements` + a final `consultation_proposals` version, links
  `consultation_meetings.lead_id`, and sets the meeting to `completed`. It is idempotent: a second
  attempt raises `P0003`.
* A human-review request sets `consultation_meetings.review_status = 'requested'` and inserts a
  `human_review_requests` row — but again only as part of finalize.
* **Client abandonment therefore leaves no lead at all** — only a `consultation_meetings` row with
  `lead_id = null` and a status of `scheduled` / `in_progress` / `expired`.
* The voice flow behaves the same way: `voice_sessions` rows convert to a lead only in
  `submit_voice_lead_tx`.

This task **did not change that lifecycle** — doing so would mean rewriting the consultation Edge
Functions. Instead the dashboard tells the truth about it: abandoned and in-progress meetings
appear in the **"Unsubmitted consultations"** section on `/admin`, and no placeholder lead rows are
manufactured for them.

The preferred future behaviour (scheduling creates a draft lead, the meeting updates it, "End &
submit" marks it submitted/qualified) is a separate, larger change to
`consultation-meeting` / `consultation-agent` plus a new draft status value.

---

## 8. Controlled deployment steps

Nothing below has been run: no migration applied, no owner account created, no deploy.

1. **Review the SQL.** Read both migration files end to end. Confirm there is no
   `create policy`, no grant to `anon`, and no `insert into public.admin_users`.
2. **Staging database first.** `supabase db push` (or paste both files, in order) against a
   staging project.
3. **Create a staging owner** via Authentication → Users, then insert the `admin_users` row with
   that UUID.
4. **Run the probe.** `supabase/tests/admin_access_verification.sql` with a staging owner UUID and
   a staging non-admin UUID. Every block must pass silently.
5. **Smoke-test the three routes** on staging: sign in, wrong password, a non-admin account
   (expect immediate sign-out + "This account does not have dashboard access."), lead list,
   search/filter/pagination, a lead detail, a status change, an internal note, logout, and a hard
   refresh mid-session.
6. **Confirm the public site is unaffected** on staging: contact form, project analysis, the
   consultation scheduler and a Buddy meeting all still work. No Edge Function was redeployed, so
   this is a regression check, not a migration risk.
7. **Production migration** during a quiet window: apply both files in order. They are additive;
   the only change to an existing object is the widened `leads_status_check`.
8. **Production frontend** deploy (`npm run build`, then your normal Vercel deploy).
9. **Create the production owner account** manually and insert its `admin_users` row.
10. **Re-run the probe** against production with the real owner UUID, then sign in once to
    confirm, and enable MFA.
11. **Confirm `/admin` is noindexed**: check the response for `robots.txt` and the `robots` meta
    tag on `/admin/login`.

Rollback: revoke the grants and drop the new views/functions/table, or simply
`update public.admin_users set is_active = false` to lock every staff account out instantly while
leaving all data intact.
