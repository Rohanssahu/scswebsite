// Static security review of the owner-dashboard migrations.
//
// The live checks (real roles, real rows) live in admin_access_verification.sql
// and need a database. These assertions need only the SQL text, so they run in
// CI on every commit and fail the moment the posture drifts: a grant to anon, a
// DELETE privilege, a sensitive column added to a view, an ungated view, or an
// RPC that forgets to re-check is_active_admin().

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');
const part1 = readFileSync(join(MIGRATIONS, '20260821300001_create_admin_users.sql'), 'utf8');
const part2 = readFileSync(join(MIGRATIONS, '20260821300002_admin_dashboard_access.sql'), 'utf8');
const sql = `${part1}\n${part2}`;

/** Strip `--` line comments so commentary never satisfies (or breaks) a check. */
const code = sql
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n');

const lower = code.toLowerCase();

const grants = lower.match(/\bgrant\b[\s\S]*?;/g) ?? [];
const views = code.match(/create\s+view[\s\S]*?;\n/gi) ?? [];
const functions = code.match(/create\s+or\s+replace\s+function[\s\S]*?\$\$;/gi) ?? [];

const ADMIN_VIEWS = [
  'admin_leads_list',
  'admin_lead_stats',
  'admin_unsubmitted_consultations',
  'admin_consultations',
  'admin_consultation_messages',
  'admin_consultation_proposals',
  'admin_consultation_artifacts',
  'admin_lead_requirements',
  'admin_lead_estimates',
  'admin_lead_reviews',
  'admin_lead_notes',
];

const WRITE_RPCS = ['admin_set_lead_status', 'admin_add_lead_note', 'admin_update_lead_note'];

describe('owner dashboard migrations — authorization posture', () => {
  it('adds no RLS policy at all: authorization lives in the views and RPCs', () => {
    expect(lower).not.toMatch(/create\s+policy/);
    expect(lower).not.toMatch(/alter\s+policy/);
    expect(lower).not.toMatch(/drop\s+policy/);
  });

  it('keeps row level security enabled on the new tables', () => {
    expect(lower).toContain('alter table public.admin_users enable row level security');
    expect(lower).toContain('alter table public.lead_internal_notes enable row level security');
    expect(lower).not.toMatch(/disable\s+row\s+level\s+security/);
  });

  it('grants nothing to anon or public, anywhere', () => {
    expect(grants.length).toBeGreaterThan(10);
    for (const grant of grants) {
      expect(grant).not.toMatch(/\bto\b[^;]*\banon\b/);
      expect(grant).not.toMatch(/\bto\b[^;]*\bpublic\b/);
      expect(grant).toMatch(/\bto\s+authenticated\s*;/);
    }
  });

  it('explicitly revokes anon on every new relation', () => {
    for (const relation of [...ADMIN_VIEWS, 'lead_internal_notes', 'admin_users']) {
      expect(
        lower,
        relation,
      ).toMatch(new RegExp(`revoke all on (?:table )?public\\.${relation}\\s+from[^;]*anon`));
    }
  });

  it('grants the browser no table privilege whatsoever — only views and functions', () => {
    for (const grant of grants) {
      const isView = ADMIN_VIEWS.some((view) => grant.includes(`public.${view}`));
      const isFunction = grant.includes('grant execute on function');
      expect(isView || isFunction, `unexpected grant: ${grant.replace(/\s+/g, ' ')}`).toBe(true);
      // and reads are select-only
      if (isView) expect(grant).toMatch(/grant\s+select\s+on/);
    }
  });

  it('never grants INSERT, UPDATE, DELETE, TRUNCATE or ALL', () => {
    for (const verb of ['insert', 'update', 'delete', 'truncate']) {
      expect(lower, verb).not.toMatch(new RegExp(`grant[^;]*\\b${verb}\\b`));
    }
    expect(lower).not.toMatch(/grant\s+all\b/);
  });

  it('leaves the internal-only tables completely untouched', () => {
    for (const table of [
      'voice_sessions',
      'voice_session_events',
      'consultation_events',
      'lead_submission_events',
      'lead_notifications',
    ]) {
      for (const grant of grants) {
        expect(grant, `${table} must stay unreachable`).not.toContain(`public.${table}`);
      }
      for (const view of views) {
        expect(view, `${table} must not be exposed by a view`).not.toContain(`public.${table}`);
      }
    }
  });
});

describe('owner dashboard migrations — the read surface', () => {
  it('exposes exactly the expected views, each gated on is_active_admin()', () => {
    expect(views).toHaveLength(ADMIN_VIEWS.length);
    for (const view of views) {
      expect(view).toMatch(/public\.is_active_admin\(\)/);
      // no view may be readable without the predicate
      const tail = view.slice(view.lastIndexOf('where'));
      expect(tail).toContain('public.is_active_admin()');
    }
    for (const name of ADMIN_VIEWS) {
      expect(code, name).toContain(`create view public.${name}`);
    }
  });

  it('never selects a secret, hash or network-context column', () => {
    const viewText = views.join('\n');
    for (const forbidden of [
      'metadata',
      'access_token_hash',
      'ip_hash',
      'room_name',
      'participant_identity',
      'origin',
      'current_route',
      'last_error',
      'provider_id',
    ]) {
      expect(viewText, `view exposes ${forbidden}`).not.toContain(forbidden);
    }
    // and no view is a wildcard select
    expect(viewText).not.toMatch(/select\s+\*/i);
  });

  it('gates transcript rows on recorded consent', () => {
    const messageView = views.find((view) => view.includes('admin_consultation_messages'));
    expect(messageView).toContain('transcript_consent');
  });

  it('never reads admin_users through a view', () => {
    for (const view of views) {
      expect(view).not.toContain('admin_users');
    }
  });
});

describe('owner dashboard migrations — the write surface', () => {
  it('defines exactly three write RPCs and no delete path', () => {
    for (const rpc of WRITE_RPCS) {
      expect(lower, rpc).toContain(`create or replace function public.${rpc}(`);
    }
    expect(lower).not.toMatch(/delete\s+from\s+public\./);
    expect(lower).not.toMatch(/function\s+public\.admin_delete/);
  });

  it('makes every RPC a definer with a fixed search_path that re-checks authorization', () => {
    const writeFunctions = functions.filter((fn) =>
      WRITE_RPCS.some((rpc) => fn.includes(`public.${rpc}(`)),
    );
    expect(writeFunctions).toHaveLength(WRITE_RPCS.length);
    for (const fn of writeFunctions) {
      expect(fn).toContain('security definer');
      expect(fn).toMatch(/set\s+search_path\s*=\s*public,\s*pg_temp/);
      expect(fn).toContain('if not public.is_active_admin() then');
      expect(fn).toContain("errcode = '42501'");
    }
  });

  it('lets the status RPC write only `status`, and only allowed values', () => {
    const fn = functions.find((f) => f.includes('public.admin_set_lead_status('))!;
    const update = fn.slice(fn.indexOf('update public.leads'), fn.indexOf('returning'));
    expect(update).toContain('set status = p_status');
    for (const column of ['reference_code', 'name', 'email', 'phone', 'metadata', 'project_summary']) {
      expect(update, column).not.toContain(column);
    }
    for (const status of ['new', 'contacted', 'qualified', 'proposal_sent', 'hired', 'closed']) {
      expect(fn).toContain(`'${status}'`);
    }
    // legacy values are readable but not settable from the dashboard
    expect(fn).not.toContain("'spam'");
  });

  it('takes the note author from auth.uid(), never from an argument', () => {
    const fn = functions.find((f) => f.includes('public.admin_add_lead_note('))!;
    expect(fn).toMatch(/function\s+public\.admin_add_lead_note\(p_lead_id uuid, p_note text\)/);
    expect(fn).toContain('values (p_lead_id, auth.uid(), v_note)');
    expect(fn).toContain('char_length(v_note)');
  });

  it('lets an admin edit only their own note', () => {
    const fn = functions.find((f) => f.includes('public.admin_update_lead_note('))!;
    expect(fn).toContain('set note = v_note');
    expect(fn).toContain('author_id = auth.uid()');
  });
});

describe('owner dashboard migrations — the helper and the lifecycle', () => {
  it('pins is_active_admin as a stable definer with a fixed search_path', () => {
    const fn = functions.find((f) => f.includes('public.is_active_admin()'))!;
    expect(fn).toContain('security definer');
    expect(fn).toContain('stable');
    expect(fn).toMatch(/set\s+search_path\s*=\s*public,\s*pg_temp/);
    expect(fn).toContain('auth.uid()');
    expect(fn).toContain("a.role in ('owner', 'admin')");
    expect(fn).toContain('a.is_active');
  });

  it('answers "who am I" without any grant on admin_users', () => {
    const fn = functions.find((f) => f.includes('public.admin_me()'))!;
    expect(fn).toContain('security definer');
    expect(fn).toContain('a.user_id = auth.uid()');
    expect(lower).toContain('grant execute on function public.admin_me() to authenticated');
    // the table itself is never granted
    for (const grant of grants) {
      expect(grant).not.toMatch(/on\s+table\s+public\.admin_users/);
    }
  });

  it('is additive: it never drops or unlocks an existing object', () => {
    expect(lower).not.toMatch(/drop\s+table/);
    expect(lower).not.toMatch(/drop\s+function/);
    expect(lower).not.toMatch(/drop\s+view/);
    // the only constraint touched is the lead-status vocabulary, and it widens
    const drops = lower.match(/drop\s+constraint[^;]*;/g) ?? [];
    expect(drops).toHaveLength(1);
    expect(drops[0]).toContain('leads_status_check');
    const check = lower.match(/add\s+constraint\s+leads_status_check[\s\S]*?;/)![0];
    for (const legacy of ['new', 'contacted', 'qualified', 'in_review', 'closed', 'spam']) {
      expect(check, legacy).toContain(`'${legacy}'`);
    }
    for (const added of ['proposal_sent', 'hired']) {
      expect(check, added).toContain(`'${added}'`);
    }
    // and the public submission transactions are not redefined here
    expect(lower).not.toContain('submit_lead_tx');
    expect(lower).not.toContain('submit_voice_lead_tx');
    expect(lower).not.toContain('finalize_consultation_tx');
  });

  it('commits no owner identity — no real e-mail, UUID or membership insert', () => {
    expect(lower).not.toContain('insert into public.admin_users');
    expect(sql).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    expect(sql).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  });
});
