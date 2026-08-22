// =============================================================================
// Phase 9 — the whole-repository guarantees.
//
// These are source-level tests on purpose. The commercial policy is only worth
// anything if EVERY client-facing flow reads it instead of keeping its own copy
// of a rate, so this file asserts that no flow re-introduces one.
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ESTIMATION_POLICY_VERSION,
  MONTHLY_COST_MAX_USD,
  MONTHLY_COST_MIN_USD,
  STANDARD_HOURLY_RATE_USD,
  WEEKLY_CAPACITY_HOURS,
  WEEKLY_COST_USD,
} from './estimationPolicy';

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** Every module that computes or renders a client-facing money figure. */
const POLICY_CONSUMERS = [
  'src/data/assistantIntents.ts',
  'src/data/basicEstimate.ts',
  'src/data/guideEstimate.ts',
  'src/services/aiAnalysis.ts',
  'src/services/leadService.ts',
  'src/services/voiceSessionCore.ts',
  'src/components/estimation/BudgetPlanPanel.tsx',
  'src/components/consultation/ProposalPanel.tsx',
  'src/components/admin/LeadDetailView.tsx',
  'supabase/functions/ai-estimate/gemini.ts',
  'supabase/functions/submit-lead/validation.ts',
  'supabase/functions/voice-lead/validation.ts',
  'supabase/functions/consultation-agent/validation.ts',
  'agent/src/config.ts',
  'agent/src/estimate.ts',
  'agent/src/prompts.ts',
  'agent/src/knowledge.ts',
];

describe('every flow reads the one shared policy', () => {
  it.each(POLICY_CONSUMERS)('%s imports the estimation policy', (file) => {
    expect(read(file)).toMatch(/estimationPolicy/);
  });

  it('leaves no module computing a rate of its own', () => {
    // The retired hour/rate tables must not come back as live code anywhere.
    // (agent/src/config.ts names them once, in the comment explaining why they
    // were removed — a mention is fine, a declaration is not.)
    const DECLARATION = /(?:export\s+)?const\s+(COMPLEXITY_BASE_HOURS|MODULE_ROLE_SPLIT|MODULE_HOURS|CONCERN_EXTRAS|RANGE_SPREAD)\b/;
    for (const file of POLICY_CONSUMERS) {
      expect(read(file), file).not.toMatch(DECLARATION);
    }
  });

  it('has removed the deleted demo engines entirely', () => {
    for (const gone of ['src/data/demoAnalysis.ts', 'src/data/demoEstimate.ts']) {
      expect(() => read(gone)).toThrow();
    }
  });
});

describe('no client-facing rate above $5/hour survives anywhere', () => {
  /** Files whose figures a client can actually see or be charged from. */
  const CLIENT_FACING = [
    ...POLICY_CONSUMERS,
    'agent/knowledge/scs-knowledge.json',
    'src/i18n/locales/en.json',
    'src/i18n/locales/ar.json',
    'src/i18n/locales/ur.json',
    'src/data/guideIntents.ts',
  ];

  it('states no per-hour rate other than the standard rate', () => {
    // Any "$N/hr", "$N per hour", "$N/hour" or "$N/ساعة"-style claim.
    const RATE_CLAIM = /\$\s?(\d[\d,.]*)\s*(?:\/\s*(?:hr|hour|h)\b|per hour|فى الساعة|\/ساعة|فی گھنٹہ)/gi;
    for (const file of CLIENT_FACING) {
      const source = read(file);
      for (const match of source.matchAll(RATE_CLAIM)) {
        const amount = Number.parseFloat(match[1].replace(/,/g, ''));
        expect(amount, `${file}: "${match[0]}"`).toBeLessThanOrEqual(STANDARD_HOURLY_RATE_USD);
      }
    }
  });

  it('never re-introduces the old $10 / $15 / $20 / $25 role rates', () => {
    for (const file of CLIENT_FACING) {
      const source = read(file);
      expect(source, file).not.toMatch(/\$1[05]\s*\/\s*hr|\$20\s*\/\s*hr|\$25\s*\/\s*hr/i);
      expect(source, file).not.toMatch(/hourlyRate:\s*(?:[6-9]|[1-9]\d)\b/);
      expect(source, file).not.toMatch(/hourly_rate:\s*(?:[6-9]|[1-9]\d)\b/);
    }
  });
});

describe('the knowledge base Buddy is grounded in matches the policy', () => {
  const knowledge = JSON.parse(read('agent/knowledge/scs-knowledge.json'));

  it('mirrors the exact commercial constants', () => {
    expect(knowledge.hourlyEngagementModel.standardHourlyRateUsd).toBe(STANDARD_HOURLY_RATE_USD);
    expect(knowledge.hourlyEngagementModel.weeklyCostUsd).toBe(WEEKLY_COST_USD);
    expect(knowledge.hourlyEngagementModel.monthlyCostMinUsd).toBe(MONTHLY_COST_MIN_USD);
    expect(knowledge.hourlyEngagementModel.monthlyCostMaxUsd).toBe(MONTHLY_COST_MAX_USD);
    expect(knowledge.weeklyCapacity.hoursPerWeek).toBe(WEEKLY_CAPACITY_HOURS);
    expect(knowledge.budgetPolicy.optionalUpgradeMinPercent).toBe(20);
    expect(knowledge.budgetPolicy.optionalUpgradeMaxPercent).toBe(30);
  });

  it('forbids the claims the policy forbids', () => {
    const forbidden = knowledge.prohibitedClaims.join(' ').toLowerCase();
    expect(forbidden).toContain('percentage of the project is already complete');
    expect(forbidden).toContain('partial scope is the complete project');
    expect(forbidden).toContain('discount');
  });
});

describe('Gemini is the only reasoning provider', () => {
  it('the agent refuses an OpenAI LLM at the source level', () => {
    const llm = read('agent/src/providers/llm.ts');
    expect(llm).not.toMatch(/agents-plugin-openai/);
    expect(llm).toMatch(/only supported reasoning provider is "gemini"/);
  });

  it('OpenAI remains available only for speech-to-text', () => {
    const stt = read('agent/src/providers/stt.ts');
    expect(stt).toMatch(/agents-plugin-openai/);
    expect(read('agent/.env.example')).toMatch(/BUDDY_STT_PROVIDER/);
  });

  it('the analysis Edge Function instantiates Gemini, not a name in an env var', () => {
    const gemini = read('supabase/functions/ai-estimate/gemini.ts');
    expect(gemini).toMatch(/new GoogleGenAI\(\{ apiKey \}\)/);
    expect(gemini).toMatch(/ai\.models\.generateContent/);
  });
});

describe('no AI secret can reach the browser', () => {
  const BROWSER_TREES = ['src'];
  const SECRET_NAMES = /GOOGLE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ELEVENLABS_API_KEY|SUPABASE_SERVICE_ROLE_KEY/;

  it('no file under src/ names a provider secret', () => {
    const files = listFiles(BROWSER_TREES[0]).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
    for (const file of files) {
      expect(read(file), file).not.toMatch(SECRET_NAMES);
    }
  });

  it('no VITE_ variable is defined for an AI provider', () => {
    expect(read('.env.example')).not.toMatch(/VITE_[A-Z_]*(GOOGLE|GEMINI|OPENAI|ELEVENLABS)/);
  });

  it('no key-shaped literal exists anywhere under src/', () => {
    const files = listFiles(BROWSER_TREES[0]).filter((f) => /\.(ts|tsx)$/.test(f));
    for (const file of files) {
      expect(read(file), file).not.toMatch(/AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{20,}/);
    }
  });
});

describe('estimate versioning', () => {
  it('stamps a policy version that changes when the policy does', () => {
    expect(ESTIMATION_POLICY_VERSION).toMatch(/^estimation-policy-v\d+$/);
    // The agent stores the SAME version string with every estimate.
    expect(read('agent/src/config.ts')).toMatch(/ESTIMATE_CONFIG_VERSION = ESTIMATION_POLICY_VERSION/);
  });
});

describe('historical records are never recalculated', () => {
  it('no migration rewrites a stored money or hours figure', () => {
    // The lifecycle transactions legitimately update status/lead_id columns.
    // What must never happen is a migration recalculating a figure a client was
    // already quoted, so the assertion targets the money/hours columns only.
    const MONEY_WRITE =
      /set\s+[^;]*\b(total_cost_min|total_cost_max|total_hours_min|total_hours_max|hourly_rate|demo_estimate|breakdown|duration_weeks_min|duration_weeks_max)\b\s*=/;
    const migrations = listFiles('supabase/migrations').filter((f) => f.endsWith('.sql'));
    expect(migrations.length).toBeGreaterThan(0);
    for (const file of migrations) {
      expect(read(file).toLowerCase(), file).not.toMatch(MONEY_WRITE);
    }
  });

  it('adds no migration at all for the budget snapshot — it rides in existing jsonb', () => {
    // The snapshot is stored inside requirements.demo_estimate /
    // preliminary_estimates.breakdown / consultation_proposals.proposal, all
    // pre-existing jsonb columns, so no historical row is touched.
    const migrations = listFiles('supabase/migrations').filter((f) => f.endsWith('.sql'));
    for (const file of migrations) {
      expect(read(file).toLowerCase(), file).not.toMatch(/add column .*budget_plan/);
    }
  });
});

// --- helpers ------------------------------------------------------------------

function listFiles(rel: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(ROOT, dir))) {
      const relPath = `${dir}/${entry}`;
      if (statSync(path.join(ROOT, relPath)).isDirectory()) walk(relPath);
      else out.push(relPath);
    }
  };
  walk(rel);
  return out;
}
