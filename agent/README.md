# Buddy — SCS Softwares voice agent worker

LiveKit Agents (Node.js) worker that powers the real-time voice IT Manager on
the SCS Softwares website. See **`docs/BUDDY_VOICE_AGENT_SETUP.md`** at the
repo root for the complete setup, deployment and testing guide.

Quick reference:

```bash
cd agent
npm install
cp .env.example .env      # fill in real values (never commit)
npm run download-files    # fetch the Silero VAD model once
npm run dev               # local dev worker against your LiveKit project
npm run typecheck
npm run build             # compile to dist/ for deployment
```

Architecture summary:

- `src/agent.ts` — entrypoint: VAD → STT → LLM → TTS pipeline, strict tools,
  session limits, audit events.
- `src/providers/llm.ts` — provider abstraction (OpenAI now; Gemini adapter
  placeholder documented in the file).
- `src/state.ts` — typed requirement state; the model can only write through
  the strict zod schema.
- `src/estimate.ts` — deterministic estimate engine; the model classifies,
  the server calculates.
- `src/backend.ts` — voice-lead Edge Function client (shared secret); the
  worker holds no database credentials.
- `knowledge/scs-knowledge.json` — the only facts Buddy may state.
