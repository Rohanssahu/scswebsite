# Production Launch — scssoftwares.com

Owner-controlled deployment runbook for the SEO launch (Phase 4).

- **Production origin:** `https://scssoftwares.com` (apex, no `www`)
- **Host:** GitHub Pages, `Rohanssahu/scswebsite`, served from the `gh-pages` branch
- **Custom domain:** declared by `public/CNAME` → copied to `dist/CNAME` by the build
- **Indexable pages:** 36, matching the 36 URLs in `sitemap.xml` exactly
- **Target markets live:** United States, United Kingdom, UAE, Canada, Australia, Singapore, Germany, Netherlands, Turkey

Nothing in this document has been executed against production. Every command below
is for the owner to run deliberately.

---

## 1. Before deployment

### 1.1 Required public environment variables

Only `VITE_`-prefixed variables reach the browser bundle. Three are read by the
application code; the rest of `.env.example` is currently unused by `src/`.

| Variable | Required | Read by | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **yes** | `src/services/supabaseClient.ts`, `src/services/admin/adminClient.ts` | Project URL. Public by design. |
| `VITE_SUPABASE_ANON_KEY` | **yes** | `src/services/supabaseClient.ts`, `src/services/admin/adminClient.ts` | Publishable key (`sb_publishable_…`). Public by design. |
| `VITE_TURNSTILE_SITE_KEY` | **yes** | `src/services/supabaseClient.ts` (Turnstile widget on the lead forms) | Site key (`0x4AAA…`). Public by design. |
| `VITE_GA_MEASUREMENT_ID` | no | *nothing* | Listed in `.env.example` but unused — the GA4 id (`G-RMGB9J9TT5`) is hard-coded in `index.html` and pinned by a test. Either wire it up or drop it from the example file. |
| `VITE_WHATSAPP_NUMBER` | no | *nothing* | Unused by `src/`. |
| `VITE_CALCOM_URL` | no | *nothing* | Unused by `src/`. |

Preflight, without printing any value:

```bash
node -e '
const fs=require("fs");
const need=["VITE_SUPABASE_URL","VITE_SUPABASE_ANON_KEY","VITE_TURNSTILE_SITE_KEY"];
const src=fs.existsSync(".env.production.local")?".env.production.local":".env.local";
const env=Object.fromEntries(fs.readFileSync(src,"utf8").split("\n")
  .filter(l=>l.includes("=")&&!l.trim().startsWith("#"))
  .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const missing=need.filter(k=>!env[k]);
console.log("env file:",src);
for(const k of need) console.log("  "+k+": "+(env[k]?"present":"MISSING"));
if(missing.length){console.error("\nBUILD BLOCKED — missing: "+missing.join(", "));process.exit(1);}
console.log("\nall required public variables present");'
```

**Never** put any of these in a `VITE_` variable — they would be compiled into a
public JavaScript file: Supabase service-role key or `sb_secret_…` key, the
database password or any Postgres connection string, `TURNSTILE_SECRET_KEY`,
`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`, `VOICE_AGENT_SECRET`, `GOOGLE_API_KEY`,
`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, or any access token. Those live only as
Supabase Edge Function secrets and LiveKit Cloud agent secrets.

### 1.2 Cloudflare Turnstile hostname allowlist

The widget refuses to solve on a hostname the site key does not list.

1. Cloudflare dashboard → **Turnstile** → the widget for this site → **Settings**.
2. Hostnames must include **`scssoftwares.com`**. Add `www.scssoftwares.com` only
   if you intend the `www` host to work at all — the site does not use it.
3. Confirm the widget mode matches what the Edge Function expects (managed /
   non-interactive), and that `TURNSTILE_SECRET_KEY` in Supabase is the secret
   **paired with this exact site key**. A mismatched pair fails every submission
   with `turnstile_failed`.

### 1.3 Supabase `ALLOWED_ORIGINS`

The browser-facing Edge Functions must allow the apex origin.

1. Supabase dashboard → **Edge Functions** → **Secrets**.
2. `ALLOWED_ORIGINS` must contain `https://scssoftwares.com`.
3. Remove any Vercel preview or `github.io` origin that is no longer used.

Verified on 2026-08-22 — all four browser-facing functions already answer a CORS
preflight from `https://scssoftwares.com` with that exact origin.

### 1.4 Edge Function availability

| Function | Called by | Status (2026-08-22) |
|---|---|---|
| `submit-lead` | browser (contact, schedule-call, requirement) | deployed, apex allowed |
| `ai-estimate` | browser (project analysis) | deployed, apex allowed |
| `consultation-meeting` | browser (AI consultation) | deployed, apex allowed |
| `livekit-token` | browser (voice/consultation) | deployed, apex allowed |
| `voice-lead` | Buddy agent worker (server-to-server) | deployed (no CORS by design) |
| `consultation-agent` | Buddy agent worker (server-to-server) | **NOT DEPLOYED — 404** |

Re-check any time, without printing secrets:

```bash
# 404 = not deployed. 401/403 = deployed and correctly rejecting an
# unauthenticated call. Replace <project-ref> with your Supabase project ref.
for fn in submit-lead ai-estimate consultation-meeting livekit-token voice-lead consultation-agent; do
  printf '%-24s %s\n' "$fn" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X POST \
       -H 'content-type: application/json' -d '{}' \
       "https://<project-ref>.supabase.co/functions/v1/$fn")"
done
```

**`consultation-agent` must be deployed before the AI consultation feature is
usable.** Without it the Buddy worker cannot load meeting context, persist state
or finalize a meeting into a lead. It does **not** affect the public marketing
site or search indexing, so it is not a blocker for the SEO launch itself.

```bash
supabase functions deploy consultation-agent
```

### 1.5 LiveKit agent status

```bash
cd agent && lk agent status
```

Verified 2026-08-22: agent `buddy-it-manager` (`CA_2djswg89Y9zG`, us-east) is
deployed and **Sleeping** with `0 / 1 / 1` replicas — scale-to-zero, wakes on
demand. That is the expected idle state, not a fault.

### 1.6 Git state warning

The repository is **8 commits ahead of `origin/main`** and nothing has been
pushed. `dist/` is **tracked in git**, so every build produces a large diff of
generated files alongside the source changes.

Commit `ef12a61` ("feat: launch international SEO, market pages and analytics")
captured most of the Phase 4 work. What is still uncommitted afterwards is the
GA4 measurement-id correction:

| File | Change |
|---|---|
| `index.html` | measurement id `G-1VQ1H1Y6S1` → `G-RMGB9J9TT5` |
| `src/utils/analytics.test.ts` | test pinning that id |
| `PRODUCTION_LAUNCH.md` | this document |
| `dist/` (78 files) | rebuild carrying the new id |

Do not deploy from an unreviewed tree. Follow §4 to check the remaining work in,
then deploy.

### 1.7 Production build command

```bash
npm run build
```

which runs `vite build && node scripts/prerender.mjs` and emits 46 prerendered
routes, `404.html`, `sitemap.xml`, `robots.txt` and a preserved `CNAME`.

---

## 2. Deployment

Verified against `package.json` — `gh-pages@6.3.0` is a local devDependency, so
`npx` resolves it without a network fetch, and `verify:dist` maps to
`node scripts/verify-dist.mjs`.

```bash
npm run build && npm run verify:dist && npx gh-pages -d dist
```

This is the correct command. Notes:

- Run it from the repository root, on the commit you intend to ship.
- `npm run deploy` also exists but its `predeploy` hook runs **only** `npm run
  build` — it skips `verify:dist`. Prefer the explicit chain above.
- `verify:dist` exits non-zero on any failure, so a bad build never reaches the
  `gh-pages` step.
- `gh-pages -d dist` force-replaces the contents of the `gh-pages` branch. It
  does not touch `main`.
- `dist/CNAME` is a normal file and is published. `gh-pages` skips dotfiles by
  default; nothing in `dist` currently starts with `.`, so nothing is lost.

---

## 3. After deployment

Give GitHub Pages a couple of minutes, then work through this list.

### 3.1 Reachability and metadata

```bash
for p in / /about /services /services/custom-software-development \
         /services/ai-voice-agent-development /locations \
         /locations/united-states /locations/united-kingdom \
         /locations/united-arab-emirates /locations/canada /locations/australia \
         /locations/singapore /locations/germany /locations/netherlands \
         /locations/turkey /project-analysis /schedule-call \
         /sitemap.xml /robots.txt; do
  printf '%-46s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://scssoftwares.com$p")"
done
```

Every line must read `200`.

- [ ] Apex homepage `https://scssoftwares.com/` loads the prerendered page
- [ ] `/about` loads
- [ ] `/services` hub loads and lists all 15 service pages
- [ ] A software service page loads — `/services/custom-software-development`
- [ ] An AI service page loads — `/services/ai-voice-agent-development`
- [ ] `/locations` hub loads and lists exactly nine markets
- [ ] All nine country pages load (list above)
- [ ] `/project-analysis` loads
- [ ] `/schedule-call` loads
- [ ] `/sitemap.xml` returns 36 `<loc>` entries, all on `https://scssoftwares.com`
- [ ] `/robots.txt` names the sitemap and disallows `/admin` and `/ai-consultation/`

### 3.2 Indexing directives

```bash
# must print: noindex,nofollow
curl -s https://scssoftwares.com/admin | grep -o 'name="robots" content="[^"]*"'

# must load through the 404.html fallback and render the meeting screen
curl -s -o /dev/null -w '%{http_code}\n' https://scssoftwares.com/ai-consultation/TEST-REF
```

- [ ] `/admin` serves the fallback with `noindex,nofollow`
- [ ] `/ai-consultation/<any-reference>` returns the fallback document (HTTP 404
      status is correct on GitHub Pages) and the SPA renders the meeting screen
      in a real browser
- [ ] A hard refresh on `/locations/turkey` still renders the full page

### 3.3 Domain and transport

- [ ] `https://scssoftwares.com` resolves — custom domain intact after the deploy
- [ ] GitHub → **Settings → Pages** still shows the custom domain and
      **Enforce HTTPS** is ticked
- [ ] `http://scssoftwares.com` redirects to `https://`
- [ ] The padlock shows a valid certificate for the apex domain

### 3.4 Forms — test with obviously fake data, then clean up

Use data you can find again, e.g. name `ZZ Launch Test`, email
`launchtest+2026@example.com`.

- [ ] `/contact` — submit and confirm the success dialog shows a reference code
- [ ] `/schedule-call` — book a slot and confirm the confirmation screen
- [ ] `/project-analysis` — run an analysis through to the result page
- [ ] `/project-analysis/result` — submit a requirement and note the reference

**Then delete the exact test records**, in the Supabase dashboard (Table Editor)
or via SQL, matching on the email you used and nothing broader:

```sql
-- Review first.
select id, created_at, reference_code, kind
from leads
where email = 'launchtest+2026@example.com';

-- Delete only those rows.
delete from leads
where email = 'launchtest+2026@example.com';
```

Also delete any consultation/meeting rows created by the schedule-call test, and
confirm the admin dashboard no longer lists them.

### 3.5 Analytics

- [ ] GA4 → property **G-RMGB9J9TT5** → **Realtime** shows one page view when
      you load the homepage (the stream should stop saying "No data received")
- [ ] Navigating homepage → `/services` → `/locations/turkey` produces exactly
      **three** page views, not six
- [ ] A contact submission produces one `contact_submitted` event
- [ ] `/admin` produces **no** page view

---

## 4. Git — safe owner commands

`dist/` is tracked, so a build always dirties the tree. None of the commands
below rewrite history.

**1. Review what changed**

```bash
git status
git diff --stat -- . ':(exclude)dist'      # source only, readable
git diff -- . ':(exclude)dist'             # full source diff
git diff --stat -- dist                    # generated output, expect churn
git diff --check                           # whitespace / conflict markers
```

**2. Create a final source checkpoint commit**

```bash
git add index.html src/utils/analytics.test.ts PRODUCTION_LAUNCH.md
git status --short                          # confirm ONLY source is staged
git commit -m "fix(analytics): tag the site with the live GA4 stream G-RMGB9J9TT5"
```

To include the rebuilt output in the same checkpoint (optional — `dist` is
tracked in this repo):

```bash
git add dist
git commit -m "chore: rebuild dist for launch"
```

**3. Push source safely**

```bash
git fetch origin
git log --oneline origin/main..HEAD         # review the 9 commits going up
git push origin main                        # plain fast-forward push, no --force
```

**4. Deploy `dist`**

```bash
npm run build && npm run verify:dist && npx gh-pages -d dist
```

Never run `reset`, `rebase`, `commit --amend`, `push --force`, or a squash on
this branch. No command in this document takes a secret as an argument.

---

## 5. Search Console and Bing — owner actions

None of these have been performed. No verification token has been generated or
placed in the repository.

### 5.1 Google Search Console

1. <https://search.google.com/search-console> → **Add property** → **Domain** →
   enter `scssoftwares.com` (domain property, not URL-prefix — it covers every
   subdomain and both schemes).
2. Google shows a **TXT record**. Add it at the DNS provider for
   `scssoftwares.com`, wait for propagation, then click **Verify**.
3. **Sitemaps** → submit `https://scssoftwares.com/sitemap.xml`. It should report
   36 discovered URLs.
4. **URL Inspection** → run **Test live URL** on:
   - `https://scssoftwares.com/`
   - `https://scssoftwares.com/services`
   - `https://scssoftwares.com/locations`
   Each must report the page as indexable with the correct canonical.
5. **Request indexing** for the priority pages:
   - `/`, `/services`, `/locations`
   - `/services/custom-software-development`, `/services/ai-development`,
     `/services/ai-voice-agent-development`
   - the nine country pages
6. Monitor weekly for the first month:
   - **Indexing → Pages** — watch "Not indexed" reasons
   - **Experience → Core Web Vitals**
   - **Enhancements** — Breadcrumbs and Organization structured data

### 5.2 Bing Webmaster Tools

1. <https://www.bing.com/webmasters> → **Add a site**.
2. Easiest path: **Import from Google Search Console** (carries verification
   across). Otherwise verify by DNS TXT the same way.
3. **Sitemaps** → submit `https://scssoftwares.com/sitemap.xml`.
4. Check **Site Explorer** and **URL Inspection** after a few days.

---

## 6. Rollback

The `gh-pages` branch holds the live site; `main` holds the source. They roll
back independently and neither needs history rewriting.

**Roll back the live site to the previous deploy**

```bash
git fetch origin gh-pages
git log --oneline origin/gh-pages | head -5     # find the last good commit

# Recover that snapshot into a clean directory and republish it.
rm -rf /tmp/rollback && mkdir -p /tmp/rollback
git archive origin/gh-pages~1 | tar -x -C /tmp/rollback
ls /tmp/rollback/CNAME                          # CNAME must be present
npx gh-pages -d /tmp/rollback
```

**Rebuild from a known-good source commit instead**

```bash
git fetch origin
git switch --detach <good-commit-sha>
npm ci && npm run build && npm run verify:dist
npx gh-pages -d dist
git switch main
```

**If the custom domain breaks:** GitHub → **Settings → Pages** → re-enter
`scssoftwares.com`, save, wait for the certificate, then re-tick **Enforce
HTTPS**. Confirm `dist/CNAME` still contains `scssoftwares.com` before the next
deploy.

**Emergency de-index** (only if wrong content went live): edit
`public/robots.txt` to `Disallow: /`, rebuild and redeploy, then use Search
Console **Removals** for anything already indexed. Reverse it as soon as the
content is fixed — a long-lived blanket disallow costs rankings.

---

## 7. Known non-blocking items

- **`consultation-agent` Edge Function is not deployed** (§1.4). Blocks the AI
  consultation feature, not the marketing site or indexing.
- **`vercel.json` is present at the repository root.** It is not copied into
  `dist`, so it has no effect on GitHub Pages. Keep it only if a Vercel project
  is genuinely wanted. If one is connected to this repo it will publish a second
  indexable origin (`*.vercel.app`) of the same content, and its
  `rewrites` rule sends every non-asset path to `/index.html`, bypassing all 46
  prerendered files. Confirm at <https://vercel.com/dashboard> that no project is
  connected; deleting the file requires owner approval and was not done here.
- **`.nojekyll` is absent.** Nothing in `dist` starts with `_`, so Jekyll drops
  nothing today. To add the safety net, create `public/.nojekyll` and deploy with
  `npx gh-pages -d dist --dotfiles` — the flag is required, because `gh-pages`
  skips dotfiles by default.
- **`npm audit` reports 9 production-tree advisories** (transitive: `picomatch`
  and `minimatch` under `gh-pages`, `yaml` under `tailwindcss`). All are
  build-time tooling, none ships to the browser. Do not run `npm audit fix`
  immediately before a launch — it rewrites the lockfile.
- **9 ESLint warnings**, all `react-refresh/only-export-components` in shadcn/ui
  boilerplate and two admin files. Zero errors.
- **Some titles and descriptions exceed Google's typical truncation width** (up
  to 75 and 190 characters). All are within the project's own asserted ceilings
  and every one is unique; this is cosmetic SERP truncation, not a defect.
- **`.env.example` lists three unused variables** — `VITE_GA_MEASUREMENT_ID`,
  `VITE_WHATSAPP_NUMBER`, `VITE_CALCOM_URL`. Nothing in `src/` reads them.

---

## 8. Analytics configuration note

### Measurement ID

The site is tagged **`G-RMGB9J9TT5`**, matching the GA4 web stream the owner reads.

Until Phase 4 it was tagged `G-1VQ1H1Y6S1` — an id that has never matched that
stream, which is why the property reported *"Data collection isn't active for your
website"* and *"No data received"*. Any historical data collected under
`G-1VQ1H1Y6S1` stays in that property and does not carry across; this is a fresh
start on `G-RMGB9J9TT5`.

The id lives in exactly one place, `index.html`, and is pinned by
`src/utils/analytics.test.ts` so it cannot drift again unnoticed.

### Two GA4 stream settings to correct

1. **Stream URL** is `http://www.scssoftwares.com`. Change it to
   `https://scssoftwares.com` — the apex over HTTPS is the canonical origin, and
   `www` only exists as a 301 redirect. This field does not gate collection, but
   a wrong value misleads the GA4 setup helper.
2. **Redact data** shows *URL query parameter keys: inactive*. Turn it on as
   defence in depth. `RouteAnalytics` already strips the query string before
   sending, so this is a second layer rather than a fix.

### Page views

Page views are now sent **only** by `src/components/RouteAnalytics.tsx`, once per
route navigation. `index.html` configures the tag with `send_page_view: false`,
so the tag itself sends nothing.

**One GA4 admin action is required to keep the count exact:**

> GA4 Admin → **Data Streams** → the web stream → **Enhanced measurement** →
> gear icon next to **Page views** → turn **OFF** "Page changes based on browser
> history events".

Leaving it on adds a second page view per client-side navigation on top of the
one the app sends. Verify with the §3.5 three-navigation check.

Events currently reported, all privacy-safe (event name, a coarse enum label, a
bounded integer — never a name, email, phone number, requirement text,
transcript, meeting reference or token):

| Event | Fired at |
|---|---|
| `contact_submitted` | `/contact` submission accepted |
| `requirement_submitted` | requirement submitted from the estimate result |
| `human_review_requested` | human review requested from the estimate result |
| `project_analysis_completed` | analysis finished, result saved |
| `consultation_scheduled` | consultation booked |
| `consultation_completed` | consultation meeting completed |
| `consultation_*` (9 more) | consultation lifecycle and coarse error categories |
