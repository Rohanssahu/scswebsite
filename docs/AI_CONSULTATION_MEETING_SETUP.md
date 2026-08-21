# SCS AI Consultation Meeting — setup, deployment and operations

Browser-based consultation meeting where the client talks to **Buddy — AI Project
Consultant** (the existing LiveKit worker: OpenAI speech-to-text, Gemini
reasoning, ElevenLabs voice — see docs/BUDDY_VOICE_AGENT_SETUP.md §14) after
completing Project Analysis.

Nothing in this document has been deployed. Every command below is for the owner
to run deliberately.

---

## 1. Architecture

```
ProjectAnalysisResult ──"Schedule a Call"──▶ /schedule-call
                                              └─ ConsultationScheduler (AI tab)
                                                   │  create  (Turnstile + honeypot)
                                                   ▼
                                       consultation-meeting Edge Function
                                          · consultation_meetings row
                                          · public reference  SCSM-XXXXXXXXXX
                                          · access token (returned ONCE, hash stored)
                                                   │
                          ┌────────────────────────┴──────────────────────────┐
                          ▼                                                    ▼
        /ai-consultation/:meetingReference                          scheduled: countdown,
          · lobby: mic/speaker/camera tests                          .ics / Google link,
          · join  (Turnstile + scoped token)                         reschedule / cancel
                          │
                          ▼
        consultation-meeting  action=join
          · FRESH random room  scsm-<16>
          · minimal-grant LiveKit token
          · RoomConfiguration → RoomAgentDispatch({ agentName: buddy-it-manager })
          · metadata { mode: 'consultation', meetingId, preferredLanguage }
                          │
                          ▼
        Buddy worker (agent/src/agent.ts)
          · parseParticipantMeta sees mode='consultation' → runConsultationMeeting()
          · load_context ──▶ consultation-agent Edge Function (VOICE_AGENT_SECRET)
          · joins room, publishes buddy.state, speaks ONE English greeting
          · scripted opening: new project / existing project / clarify
            (agent/src/opening.ts — deterministic, not model-generated)
          · tools: send_chat_note, update_requirements, update_proposal,
                   mark_confirmed, verify_contact, set_transcript_consent,
                   finalize_consultation, request_human_review
                   (NO set_language — consultation meetings are English only)
          · numbers from agent/src/estimate.ts, re-validated server-side
                          │
                          ▼
        consultation-agent  action=finalize → finalize_consultation_tx
          · leads + requirements + consultation_proposals (+ human_review_requests)
          · idempotent: a meeting can finalize at most once (errcode P0003)
```

Key invariants:

* The browser never chooses the agent name, room name, participant identity,
  grants or token TTL — all server-resolved (`resolveAgentName` reads env only).
* The meeting reference alone grants nothing; a scoped bearer access token is
  required and only its SHA-256 hash is stored.
* Every hour/cost/duration figure is computed by `agent/src/estimate.ts` and
  independently **recomputed** by `sanitizeProposal` in the Edge Function. A
  mismatch rejects the whole payload, so LLM arithmetic can never be stored.
* No raw audio is recorded anywhere (`record: false`, `roomRecord: false`).
* Chat/transcript rows are written only when `transcript_consent` is true — the
  gate is enforced in the Edge Function, not trusted from the worker.

---

## 2. Files

### Database (additive migrations only)
| File | Contents |
|---|---|
| `supabase/migrations/20260821200001_create_consultation_meetings.sql` | `consultation_meetings`, `consultation_messages`, `consultation_artifacts`, `consultation_proposals`, `consultation_events` |
| `supabase/migrations/20260821200002_finalize_consultation_tx.sql` | `finalize_consultation_tx(jsonb)` |

### Edge Functions
| File | Purpose |
|---|---|
| `supabase/functions/consultation-meeting/index.ts` | browser API: create / resolve / join / reschedule / cancel / submit_links / request_review |
| `supabase/functions/consultation-meeting/validation.ts` | pure validation + join-window policy + URL allowlists |
| `supabase/functions/consultation-meeting/token.ts` | LiveKit minting with explicit agent dispatch |
| `supabase/functions/consultation-agent/index.ts` | worker API: load_context / save_state / save_message / save_proposal / finalize / meeting_event / meeting_status |
| `supabase/functions/consultation-agent/validation.ts` | requirement whitelist, deterministic proposal re-validation, finalize gates |
| `supabase/config.toml` | added `verify_jwt = false` blocks for both functions |

### Agent worker
| File | Change |
|---|---|
| `agent/src/meeting.ts` | **new** — consultation mode: context load, seeding, tools, proposal wiring, finalize |
| `agent/src/agent.ts` | parses `mode`/`meetingId` from participant metadata and branches to `runConsultationMeeting` |
| `agent/src/prompts.ts` | `buildConsultationPrompt`, `CONSULTATION_GREETING_*` |
| `agent/src/state.ts` | 9 additive consultation fields; `ConsultationLanguage` |
| `agent/src/backend.ts` | `ConsultationClient`, `loadConsultationBackendConfig`, `parseMeetingContext` |
| `agent/.env.example` | `BUDDY_CONSULTATION_URL` |

### Frontend
| File | Purpose |
|---|---|
| `src/pages/AiConsultation.tsx` | `/ai-consultation/:meetingReference` — access gate, lobby, live meeting, ended |
| `src/components/consultation/ConsultationScheduler.tsx` | scheduling flow inside `/schedule-call` |
| `src/components/consultation/BuddyTile.tsx` | Buddy tile, speaking ring, states, quality |
| `src/components/consultation/ClientTile.tsx` | camera / initials, mic + camera indicators |
| `src/components/consultation/MeetingControls.tsx` | bottom control bar |
| `src/components/consultation/MeetingChat.tsx` | chat with delivery state + new-message indicator |
| `src/components/consultation/ProjectDetailsPanel.tsx` | analysis + requirement progress |
| `src/components/consultation/FilesLinksPanel.tsx` | links/notes; upload behind `DOCUMENT_UPLOAD_ENABLED=false` |
| `src/components/consultation/ProposalPanel.tsx` | live preliminary proposal + mandatory disclaimer |
| `src/components/consultation/buddyAvatar.ts` | **the single avatar path** |
| `src/asset/buddy-avatar.svg` | replaceable placeholder avatar |
| `src/services/consultationCore.ts` | pure logic: parsing, activity rules, links, timezone, .ics, snapshot |
| `src/services/consultationService.ts` | Edge Function transport |
| `src/services/meetingSession.ts` | LiveKit meeting transport |
| `src/services/voiceSessionCore.ts` | extended `parseBuddyState` with `mode` / `proposal` / `finalized` |
| `src/hooks/useConsultationMeeting.ts` | React state for the live meeting |
| `src/utils/consultationAnalytics.ts` | privacy-safe event allowlist |
| `src/pages/ScheduleCall.tsx` | AI / human tabs (existing demo form untouched) |
| `src/App.tsx` | lazy route |
| `src/i18n/locales/{en,ar,ur}.json` | `meeting` namespace (215 keys each) |

### Replacing the Buddy avatar
Replace `src/asset/buddy-avatar.svg` with the supplied image (same filename), or
drop a new file in `src/asset/` and change the single import in
`src/components/consultation/buddyAvatar.ts`. No other code references the asset.

---

## 3. Secrets and configuration still required

Supabase Edge Function secrets (`supabase secrets set …`):

| Secret | Used by | Notes |
|---|---|---|
| `CONSULTATION_ENABLED` | consultation-meeting | **must be exactly `true`** — kill switch |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | consultation-meeting | already set for `livekit-token` |
| `TURNSTILE_SECRET_KEY` | consultation-meeting | already set |
| `VOICE_AGENT_SECRET` | consultation-agent | already set (same worker credential) |
| `RATE_LIMIT_SALT` | consultation-meeting | already set |
| `BUDDY_AGENT_NAME` | consultation-meeting | optional; must match the worker |
| `CONSULTATION_RATE_LIMITS` | consultation-meeting | optional `"perHour,perDay"`, default `3,8` |
| `ALLOWED_ORIGINS` | consultation-meeting | optional extra origins |

Agent worker env (LiveKit Cloud agent secrets / `agent/.env`):

| Variable | Value |
|---|---|
| `BUDDY_CONSULTATION_URL` | `https://<ref>.supabase.co/functions/v1/consultation-agent` |
| `VOICE_AGENT_SECRET` | same value as the Supabase secret |

Frontend: **no new variables.** It reuses `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_TURNSTILE_SITE_KEY`.

---

## 4. Deployment commands (run by the owner)

```bash
# 1) Migrations (additive; no existing table or RLS policy is modified)
npx supabase db push

# 2) Secrets
npx supabase secrets set CONSULTATION_ENABLED=true
npx supabase secrets set CONSULTATION_RATE_LIMITS=3,8        # optional

# 3) Edge Functions (both need --no-verify-jwt: browser publishable key /
#    shared-secret worker auth, matching submit-lead and voice-lead)
npx supabase functions deploy consultation-meeting --no-verify-jwt
npx supabase functions deploy consultation-agent  --no-verify-jwt

# 4) Agent worker (adds consultation mode; the existing voice flow is unchanged)
cd agent && npm run build && npm start        # or redeploy on LiveKit Cloud

# 5) Frontend
npm run build
```

Local verification already performed (no deployment):

```
npx vitest run                    # 16 files, 257 tests passing
npx tsc -p tsconfig.app.json      # clean for all new files
cd agent && npm run typecheck     # clean
cd agent && npm run build         # clean
npm run lint                      # 0 errors (7 pre-existing shadcn warnings)
npm run build                     # succeeds; AiConsultation is a lazy chunk
secret scan of dist/              # no API keys, secrets or service-role strings
```

---

## 5. Manual end-to-end checklist

1. **Instant meeting with analysis** — run `/project-analysis` to a result →
   "Schedule a Call" → AI tab shows "analysis will be attached" → Start now →
   lobby → join → Buddy greets automatically and summarizes the analysis without
   re-asking known details.
2. **No analysis** — open `/schedule-call` in a fresh browser profile → the amber
   "no analysis attached" notice shows → Buddy says so and starts fresh.
3. **English only** — Buddy greets once in English and never asks which
   language to use. Whatever `preferredLanguage` the scheduler stored, the
   meeting is conducted in English and the Project details panel shows English
   once the agent joins. (The scheduler form and its RTL rendering are
   unchanged; only Buddy's speech is English-only.)
4. **Typed input** — mute the mic and type a requirement in Chat; Buddy answers in
   chat and voice and the Project details panel progress advances.
5. **Proposal** — continue until Buddy calls `update_proposal`; the Live proposal
   tab populates, always with the preliminary/human-review disclaimer.
6. **Finalize** — confirm the summary out loud; verify Buddy reads the email
   letter-by-letter and phone digit-by-digit before submitting, then returns an
   `SCS-XXXXXXXX` reference. Try to finalize twice → the second attempt is
   refused as a duplicate.
7. **Links** — paste a GitHub URL (accepted), an `http://` URL (rejected), a URL
   with `user:token@` (rejected), a non-allowlisted repo host (rejected). Confirm
   the credentials warning is visible and upload shows "Coming soon".
8. **Scheduled meeting** — book 1 hour ahead; the lobby shows a countdown and
   refuses to join until the early-join window; download the `.ics` and confirm
   the copy says no calendar event was created for you.
9. **Reschedule / cancel** — from the blocked screen, cancel then reload: the
   meeting reports cancelled and cannot be joined.
10. **Access control** — open `/ai-consultation/<reference>` in a different
    browser: the access-key prompt appears and a wrong key is refused.
11. **Failure paths** — deny the mic (chat still works); block the worker so
    Buddy never joins (after ~30 s the fallback banner offers retry, chat,
    human review and the manual form); confirm the Buddy tile never shows
    Listening/Thinking before Buddy joins.
12. **Reconnect** — toggle Wi-Fi mid-meeting: the tile shows Reconnecting, then
    recovers, and previously confirmed answers are still reflected in the panel.
13. **Regression** — the existing floating Buddy voice widget and the manual
    project-analysis flow both still work.

---

## 6. Known limitations

* **Document upload is disabled** (`DOCUMENT_UPLOAD_ENABLED = false`). Links and
  notes are collected instead; no insecure upload path ships. Enabling it needs
  a private Supabase Storage bucket plus a signed-upload Edge Function.
* **Screen share** is rendered disabled with "Coming soon" — not wired up.
* **Human follow-up is a request**, not a booked meeting; no scheduling provider
  is integrated. The `.ics`/Google links only let the client add the event
  themselves.
* **No lip-sync** — a subtle audio-level pulse is used instead, as accurate
  visemes are not derivable from the current audio pipeline.
* **Analytics are inert** — `initGA()` is still not called anywhere in the app,
  so `trackConsultation` is a no-op until the owner wires GA up. The allowlist is
  in place for when they do.
* **Emails are not sent** for consultations (unlike `voice-lead`). The lead lands
  in `leads` and is visible to internal tooling; wiring Resend is a follow-up.
* **No staff/admin UI** — reading consultation data requires the service role
  (RLS is on with zero policies, matching the existing tables).
* **Consultation meetings are ENGLISH ONLY.** Buddy neither asks for nor
  accepts a language choice there, and `set_language` is not exposed as a tool.
  A `preferredLanguage` may still be stored on the meeting row and shown by the
  scheduler UI, but it does not change how Buddy speaks. The older
  `livekit-token` website widget is untouched and still offers en/hi/hinglish.

---

## 6a. Conversation behaviour, pacing and turn-taking

Buddy's consultation persona is a calm senior project/requirement manager. The
behaviour is split so each piece is unit-testable without a live session:

| File | Responsibility |
| --- | --- |
| `agent/src/prompts.ts` | English-only system prompt, requirement flow order, style rules, the single approved greeting (`CONSULTATION_GREETING`) |
| `agent/src/greeting.ts` | Greeting spoken exactly once per job — survives reconnect, retried join and agent re-entry |
| `agent/src/opening.ts` | Deterministic new / existing / unclear routing with three word-for-word replies |
| `agent/src/silence.ts` | One gentle "no rush" nudge after ~10 s of genuine silence, re-armed only by the client speaking |
| `agent/src/turn_taking.ts` | `isConfirmedClientTurn` (interim transcripts are never acted on) and the session `turnHandling` object |
| `agent/src/config.ts` | Every voice/timing number as a named constant with a validated env override |

**Opening flow.** The greeting is spoken once, in full, and then Buddy waits.
The client's answer is classified server-side into new project / existing
project / unclear; each path has a fixed reply, and the LLM turn for that one
exchange is suppressed with `StopResponse` so the wording cannot drift. An
unclear answer gets the clarification question (at most twice, then the LLM
takes over). The resolved choice is written to `state.intent`.

**Voice pacing** (ElevenLabs `voice_settings`, the only fields the installed
plugin sends): `speed 0.88`, `stability 0.60`, `similarity_boost 0.75`,
`style 0.15`, `use_speaker_boost true`, with `language: 'en'` and
`applyTextNormalization: 'auto'`. Pauses are punctuation-driven — the greeting
is spoken as one string with a blank line between sentences; there are no
sleeps.

**Turn-taking** (all values milliseconds):

| Setting | Value | Why |
| --- | --- | --- |
| Silero `minSilenceDuration` | 700 | a mid-sentence breath is not the end of a turn |
| Silero `minSpeechDuration` | 120 | a click/cough is not a turn (plugin default 50) |
| Silero `activationThreshold` | 0.6 | background-noise tolerance |
| `endpointing.minDelay` | 1000 | Buddy never answers sooner than this |
| `endpointing.maxDelay` | 4500 | longest thinking pause honoured |
| `interruption.minDuration` | 600 | barge-in stays on; a cough does not cut Buddy off |
| `preemptiveGeneration.enabled` | `false` | the framework default runs the LLM on **interim** text |
| silence reminder | 10000 | one nudge, then silence until the client speaks |

The prewarmed Silero VAD is retuned per meeting via the plugin's own
`updateOptions`, so no second ONNX model is loaded and the general website
voice flow keeps its own 550 ms window.

**Long lists** go to the meeting chat via the `send_chat_note` tool (an
`lk.chat` text stream) instead of being read aloud; `meetingSession.ts`
registers an inbound handler so they render in the existing chat panel. Buddy's
spoken words continue to arrive over `lk.transcription`, so notes never
duplicate speech.

**No speech after close.** The greeting gate, the silence reminder and the
opening router all consult `canSpeak(session)` before scheduling anything, and
all three are cancelled/disposed by the run-gate teardown and on client
disconnect.

---

## 7. Rollback / kill switch

**Instant kill switch (no redeploy):**
```bash
npx supabase secrets set CONSULTATION_ENABLED=false
```
Every `consultation-meeting` request then returns `503 consultation_disabled`;
the scheduler shows the fallback notice and the manual requirement flow stays
available. In-flight rooms finish; no new meeting can be created or joined.

**Roll back the worker change:** redeploy the previous agent build. Consultation
rooms then dispatch a worker without the mode branch, so nothing but the new
feature is affected — the general Buddy voice flow is untouched code.

**Roll back the frontend:** redeploy the previous build; the route disappears and
`/schedule-call` returns to the demo booking form only.

**Roll back the functions:**
```bash
npx supabase functions delete consultation-meeting
npx supabase functions delete consultation-agent
```

**Database:** the migrations are purely additive — no existing table, policy or
function was modified, so leaving the tables in place is safe and is the
recommended rollback (data is retained). If they must be removed:
```sql
drop function if exists public.finalize_consultation_tx(jsonb);
drop table if exists public.consultation_events;
drop table if exists public.consultation_proposals;
drop table if exists public.consultation_artifacts;
drop table if exists public.consultation_messages;
drop table if exists public.consultation_meetings;
```
