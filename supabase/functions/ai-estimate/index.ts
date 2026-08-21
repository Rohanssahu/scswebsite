// =============================================================================
// ai-estimate — server-side OpenAI proxy for the project-estimation experience.
//
// The OpenAI key lives ONLY here (Supabase Edge Function secret), never in the
// frontend. Two tasks:
//
//   { task: 'extract', mode, docName?, docText? | pdfBase64? }
//     → reads a requirement/project document and returns auto-fill answers for
//       the questionnaire plus a short document summary.
//
//   { task: 'analyze', mode, answers, docSummary? }
//     → generates the full project analysis (health score, issues, team,
//       milestones…) tailored to the client's actual answers, including any
//       free-typed technologies or requirements.
//
// Secrets (Supabase Edge Function secrets — NEVER in the frontend):
//   OPENAI_API_KEY   required
//   OPENAI_MODEL     optional, default gpt-4o-mini
//   ALLOWED_ORIGINS  optional comma-separated extra origins
// =============================================================================

const MAX_BODY_BYTES = 7_000_000; // allows a ~4MB PDF as base64
const MAX_DOC_TEXT_CHARS = 24_000;
const MAX_PDF_BASE64_CHARS = 5_800_000;
const OPENAI_TIMEOUT_MS = 60_000;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://scssoftwares.com',
  'https://www.scssoftwares.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

function resolveAllowedOrigins(envValue?: string | null): string[] {
  const extra = (envValue ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => /^https?:\/\//.test(o));
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

const allowedOrigins = resolveAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));

function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin.replace(/\/+$/, ''));
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status: number, body: Record<string, unknown>, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// --- lightweight per-isolate rate limit (best effort; key cost protection) ---
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX_CALLS = 20;
const rateBuckets = new Map<string, number[]>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const calls = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (calls.length >= RATE_MAX_CALLS) return false;
  calls.push(now);
  rateBuckets.set(ip, calls);
  return true;
}

// --- questionnaire definition (kept in sync with src/data/analysisQuestions.ts)
interface QuestionDef {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'single' | 'multi';
  options?: string[];
}

const QUESTIONS: Record<'new' | 'existing', QuestionDef[]> = {
  new: [
    { id: 'idea', label: 'Project idea / goal', type: 'textarea' },
    { id: 'audience', label: 'Target users', type: 'text' },
    {
      id: 'features',
      label: 'Main features',
      type: 'multi',
      options: [
        'User profiles',
        'Search & filters',
        'Chat / messaging',
        'Notifications',
        'Booking / scheduling',
        'E-commerce / catalog',
        'Analytics dashboard',
        'File uploads',
        'Maps / location',
      ],
    },
    { id: 'platform', label: 'Platform', type: 'single', options: ['Web only', 'Mobile only', 'Web + Mobile'] },
    {
      id: 'modules',
      label: 'Core modules',
      type: 'multi',
      options: ['User login / accounts', 'Online payments', 'Admin panel', 'None of these'],
    },
    {
      id: 'timeline',
      label: 'Timeline',
      type: 'single',
      options: ['ASAP (under 1 month)', '1–3 months', '3–6 months', 'Flexible'],
    },
    {
      id: 'budget',
      label: 'Approximate budget',
      type: 'single',
      options: ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', '$15,000+', 'Not sure yet'],
    },
  ],
  existing: [
    {
      id: 'projectType',
      label: 'Project type',
      type: 'single',
      options: ['Web application', 'Mobile application', 'Web + Mobile', 'Website / CMS', 'Other'],
    },
    {
      id: 'technologies',
      label: 'Technologies used',
      type: 'multi',
      options: [
        'React',
        'Vue',
        'Angular',
        'Node.js',
        'PHP / Laravel',
        'Python / Django',
        'WordPress',
        'Flutter',
        'React Native',
        'Kotlin',
        'Swift',
        'Native (iOS / Android)',
        'Not sure',
      ],
    },
    { id: 'working', label: 'What currently works', type: 'textarea' },
    { id: 'broken', label: 'Broken / incomplete parts', type: 'textarea' },
    {
      id: 'newFeatures',
      label: 'New features required',
      type: 'multi',
      options: [
        'Payments',
        'Admin panel',
        'Notifications',
        'Reports / analytics',
        'Mobile app version',
        'Performance improvements',
        'Redesign / new UI',
        'Production deployment / go live',
        'Publish on App Store / Play Store',
        'API / third-party integration',
        'Security & bug fixes',
        'No new features — just fixes',
      ],
    },
    { id: 'projectLink', label: 'Live URL / repository', type: 'text' },
    {
      id: 'urgency',
      label: 'Urgency',
      type: 'single',
      options: ['Critical — need help this week', 'High — within 2–4 weeks', 'Normal — 1–2 months', 'Flexible'],
    },
    {
      id: 'budget',
      label: 'Approximate budget',
      type: 'single',
      options: ['Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000', '$15,000+', 'Not sure yet'],
    },
  ],
};

// --- OpenAI helpers ------------------------------------------------------------

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; file: { filename: string; file_data: string } };

interface ChatMessage {
  role: 'system' | 'user';
  content: string | ContentPart[];
}

async function callOpenAI(
  messages: ChatMessage[],
  responseFormat: Record<string, unknown>,
  maxTokens: number,
): Promise<unknown> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('ai-estimate: OpenAI error', res.status, detail.slice(0, 500));
      throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned no content');
    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

// --- extract task ----------------------------------------------------------------

function sanitizeAnswers(mode: 'new' | 'existing', raw: unknown): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {};
  if (typeof raw !== 'object' || raw === null) return answers;
  for (const q of QUESTIONS[mode]) {
    const value = (raw as Record<string, unknown>)[q.id];
    if (q.type === 'multi') {
      const arr = (Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [])
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 15);
      if (arr.length) answers[q.id] = arr;
    } else if (typeof value === 'string' && value.trim()) {
      answers[q.id] = value.trim().slice(0, q.type === 'text' || q.type === 'single' ? 300 : 1500);
    }
  }
  return answers;
}

async function handleExtract(
  mode: 'new' | 'existing',
  docName: string,
  docText: string | undefined,
  pdfBase64: string | undefined,
): Promise<Record<string, unknown>> {
  const questionSpec = QUESTIONS[mode]
    .map((q) => {
      const opts = q.options ? ` Preferred options: ${q.options.join(' | ')}. Custom values are allowed too.` : '';
      return `- "${q.id}" (${q.type === 'multi' ? 'array of strings' : 'string'}): ${q.label}.${opts}`;
    })
    .join('\n');

  const instruction = `You are the intake assistant for SCS Softwares, a software agency. Read the client's document and fill the project questionnaire.

Return ONLY a JSON object of this shape:
{
  "answers": { /* only the fields you can confidently fill from the document */ },
  "docSummary": "plain-text summary (max 1200 characters) of the document's key requirements, features, technologies, constraints and anything relevant to estimating the project"
}

Questionnaire fields (mode: ${mode} project):
${questionSpec}

Rules:
- Fill a field only when the document clearly supports it; otherwise omit the field entirely.
- For fields with preferred options, use the exact option string when it matches; use a short custom string when the document says something not covered by the options.
- Never invent budgets, timelines or technologies that are not in the document.
- Write answers and the summary in English.`;

  const userContent: ContentPart[] = [];
  if (pdfBase64) {
    userContent.push({
      type: 'file',
      file: { filename: docName || 'document.pdf', file_data: `data:application/pdf;base64,${pdfBase64}` },
    });
    userContent.push({ type: 'text', text: instruction });
  } else {
    userContent.push({
      type: 'text',
      text: `${instruction}\n\nDocument "${docName}":\n---\n${(docText ?? '').slice(0, MAX_DOC_TEXT_CHARS)}\n---`,
    });
  }

  const parsed = (await callOpenAI(
    [{ role: 'user', content: userContent }],
    { type: 'json_object' },
    1800,
  )) as { answers?: unknown; docSummary?: unknown };

  return {
    ok: true,
    answers: sanitizeAnswers(mode, parsed.answers),
    docSummary: typeof parsed.docSummary === 'string' ? parsed.docSummary.slice(0, 2000) : '',
  };
}

// --- analyze task ------------------------------------------------------------------

const stringArray = { type: 'array', items: { type: 'string' } };

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'healthScore',
    'riskLevel',
    'requirementSummary',
    'currentlyWorking',
    'problemsDetected',
    'missingFeatures',
    'recommendedSolution',
    'team',
    'weeklyCapacityHours',
    'assumptions',
    'milestones',
    'benefits',
    'nextSteps',
  ],
  properties: {
    healthScore: { type: 'integer', description: '0-100 readiness/health score' },
    riskLevel: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    requirementSummary: stringArray,
    currentlyWorking: stringArray,
    problemsDetected: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'summary', 'detail'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          summary: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    missingFeatures: stringArray,
    recommendedSolution: stringArray,
    team: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'hours', 'hourlyRate'],
        properties: {
          role: { type: 'string' },
          hours: { type: 'integer' },
          hourlyRate: { type: 'integer' },
        },
      },
    },
    weeklyCapacityHours: { type: 'integer' },
    assumptions: stringArray,
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'week', 'deliverables'],
        properties: {
          title: { type: 'string' },
          week: { type: 'string' },
          deliverables: stringArray,
        },
      },
    },
    benefits: stringArray,
    nextSteps: stringArray,
  },
};

const ANALYZE_SYSTEM_PROMPT = `You are the senior project-estimation engine of SCS Softwares, a software development agency. You produce realistic, client-specific project analyses — never generic boilerplate.

Guidelines:
- Base EVERYTHING on the client's actual answers and document summary. Quote their own goals, features and technologies back to them, including free-typed values that are not from any predefined list. If they mention an unfamiliar technology or requirement, interpret it correctly using your knowledge and address it explicitly.
- healthScore: for a new project this is a readiness score (more detail and clearer scope → higher, typically 55-95); for an existing project it reflects code/product health from what they reported broken vs working (typically 35-90). riskLevel: Low if ≥70, Medium if 50-69, High if <50.
- team: 4-7 roles relevant to the actual stack and scope (e.g. Requirement Analyst, UI/UX Designer, Frontend Developer, Backend Developer, Mobile Developer, QA Tester, Code Auditor / Tech Lead, DevOps). hours per role realistic for the described scope; hourlyRate in USD between 5 and 25 matching an offshore agency.
- weeklyCapacityHours: 40 unless urgency justifies more (max 60).
- problemsDetected: 2-4 genuine risks/issues derived from their situation (missing budget, tight timeline, payment compliance, unaudited code, unclear stack, app-store publishing, etc.). Reference what THEY said.
- milestones: 3-4 phases with week ranges consistent with total hours ÷ weekly capacity.
- requirementSummary: 4-6 lines restating their project in "Label: value" style using their own answers.
- currentlyWorking: for existing projects, itemize what they said works; for new projects a single line noting it is a new build.
- missingFeatures: what needs to be built/added based on their answers.
- recommendedSolution: 3-5 concrete, ordered recommendations tailored to them.
- assumptions: 3-4 items; include that the final quote follows a scoping call.
- benefits: 3-4 SCS benefits (transparent hourly pricing, dedicated PM & weekly demos, NDA + full source-code ownership, post-launch support).
- nextSteps: 3 items ending with a review call with an SCS consultant.
- Write in clear, professional English. Keep every string concise (under 200 characters except problemsDetected.detail, which may reach 350).`;

async function handleAnalyze(
  mode: 'new' | 'existing',
  answers: unknown,
  docSummary: string | undefined,
): Promise<Record<string, unknown>> {
  const cleanAnswers = sanitizeAnswers(mode, answers);
  const parts = [
    `Project mode: ${mode === 'new' ? 'NEW project (nothing built yet)' : 'EXISTING project (needs fixes/completion)'}`,
    `Client questionnaire answers (free-typed custom values included):\n${JSON.stringify(cleanAnswers, null, 2)}`,
  ];
  if (docSummary?.trim()) {
    parts.push(`Summary of the client's uploaded document(s):\n${docSummary.trim().slice(0, 8000)}`);
  }
  parts.push('Generate the full project analysis JSON now.');

  const result = await callOpenAI(
    [
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: parts.join('\n\n') },
    ],
    {
      type: 'json_schema',
      json_schema: { name: 'project_analysis', strict: true, schema: ANALYSIS_SCHEMA },
    },
    3500,
  );

  return { ok: true, result };
}

// --- request handler ------------------------------------------------------------------

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const originAllowed = isOriginAllowed(origin);

  if (req.method === 'OPTIONS') {
    return originAllowed
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response('Forbidden', { status: 403 });
  }
  if (!originAllowed) return new Response('Forbidden', { status: 403 });
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed', message: 'POST only' }, origin);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!withinRateLimit(ip)) {
    return json(429, { ok: false, error: 'rate_limited', message: 'Too many requests — try again shortly.' }, origin);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(413, { ok: false, error: 'too_large', message: 'Request body too large' }, origin);
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: 'bad_json', message: 'Invalid JSON body' }, origin);
  }

  const task = body.task;
  const mode = body.mode;
  if ((task !== 'extract' && task !== 'analyze') || (mode !== 'new' && mode !== 'existing')) {
    return json(400, { ok: false, error: 'bad_request', message: 'Unknown task or mode' }, origin);
  }

  try {
    if (task === 'extract') {
      const docText = typeof body.docText === 'string' ? body.docText : undefined;
      const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : undefined;
      const docName = typeof body.docName === 'string' ? body.docName.slice(0, 200) : 'document';
      if (!docText?.trim() && !pdfBase64) {
        return json(400, { ok: false, error: 'no_document', message: 'docText or pdfBase64 is required' }, origin);
      }
      if (pdfBase64 && pdfBase64.length > MAX_PDF_BASE64_CHARS) {
        return json(413, { ok: false, error: 'pdf_too_large', message: 'PDF must be under 4MB' }, origin);
      }
      return json(200, await handleExtract(mode, docName, docText, pdfBase64), origin);
    }
    const docSummary = typeof body.docSummary === 'string' ? body.docSummary : undefined;
    return json(200, await handleAnalyze(mode, body.answers, docSummary), origin);
  } catch (e) {
    console.error('ai-estimate: task failed', task, e instanceof Error ? e.message : e);
    return json(502, { ok: false, error: 'ai_failed', message: 'AI analysis is temporarily unavailable' }, origin);
  }
});
