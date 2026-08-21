// Data-layer contract tests. A recorded fake client lets us assert the exact
// PostgREST calls the dashboard makes: which relation, which columns, which
// bounds — and that a Postgres error never reaches the user interface.

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AdminDataError,
  LEAD_LIST_COLUMNS,
  TRANSCRIPT_LIMIT,
  addLeadNote,
  fetchLeadDetail,
  fetchLeadNotes,
  fetchLeadStats,
  fetchLeads,
  fetchUnsubmittedConsultations,
  isSessionExpired,
  mapDataError,
  updateLeadNote,
  updateLeadStatus,
} from './adminLeadsService';
import { DEFAULT_LEAD_FILTERS } from './adminLeadsCore';

type Result = { data: unknown; error: unknown; count?: number };
type Call = { table: string; method: string; args: unknown[] };

function makeClient(results: Record<string, Result>) {
  const calls: Call[] = [];
  const client = {
    async rpc(fn: string, args?: unknown) {
      calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] });
      return results[`rpc:${fn}`] ?? { data: null, error: null };
    },
    from(table: string) {
      const result = results[table] ?? { data: [], error: null, count: 0 };
      const builder: Record<string, unknown> = {};
      const record = (method: string) =>
        (...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        };
      for (const method of ['select', 'order', 'range', 'eq', 'gte', 'lte', 'or', 'in', 'update', 'insert', 'limit']) {
        builder[method] = record(method);
      }
      builder.maybeSingle = async () => {
        calls.push({ table, method: 'maybeSingle', args: [] });
        return result;
      };
      // Awaiting the builder resolves the query, exactly like postgrest-js.
      builder.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const find = (calls: Call[], table: string, method: string) =>
  calls.find((call) => call.table === table && call.method === method);
const findAll = (calls: Call[], table: string, method: string) =>
  calls.filter((call) => call.table === table && call.method === method);

const leadRow = { id: 'lead-1', reference_code: 'SCS-4F7K2P9Q', status: 'new' };

describe('lead list query', () => {
  it('reads the admin view with an explicit column list and an exact count', async () => {
    const { client, calls } = makeClient({
      admin_leads_list: { data: [leadRow], error: null, count: 143 },
    });
    const page = await fetchLeads(DEFAULT_LEAD_FILTERS, client);

    expect(page.total).toBe(143);
    expect(page.rows).toHaveLength(1);

    const select = find(calls, 'admin_leads_list', 'select');
    expect(select?.args[0]).toBe(LEAD_LIST_COLUMNS);
    expect(select?.args[1]).toEqual({ count: 'exact' });
    // never a wildcard, and never a column the migration withheld
    expect(String(select?.args[0])).not.toContain('*');
    for (const withheld of ['metadata', 'ip_hash', 'access_token_hash', 'room_name', 'origin']) {
      expect(String(select?.args[0])).not.toContain(withheld);
    }
  });

  it('sorts newest first and asks for exactly one page', async () => {
    const { client, calls } = makeClient({ admin_leads_list: { data: [], error: null, count: 0 } });
    await fetchLeads({ ...DEFAULT_LEAD_FILTERS, page: 3, pageSize: 20 }, client);
    expect(find(calls, 'admin_leads_list', 'order')?.args).toEqual([
      'created_at',
      { ascending: false },
    ]);
    expect(find(calls, 'admin_leads_list', 'range')?.args).toEqual([40, 59]);
  });

  it('pushes every filter to the server, never to the client', async () => {
    const { client, calls } = makeClient({ admin_leads_list: { data: [], error: null, count: 0 } });
    await fetchLeads(
      {
        ...DEFAULT_LEAD_FILTERS,
        search: 'asha',
        leadType: 'consultation',
        status: 'qualified',
        dateRange: '7d',
      },
      client,
    );
    const eqs = findAll(calls, 'admin_leads_list', 'eq').map((call) => call.args);
    expect(eqs).toContainEqual(['lead_type', 'consultation']);
    expect(eqs).toContainEqual(['status', 'qualified']);
    expect(find(calls, 'admin_leads_list', 'gte')?.args[0]).toBe('created_at');
    expect(find(calls, 'admin_leads_list', 'or')?.args[0]).toContain('reference_code.ilike.%asha%');
  });

  it('applies no filter when the defaults are untouched', async () => {
    const { client, calls } = makeClient({ admin_leads_list: { data: [], error: null, count: 0 } });
    await fetchLeads(DEFAULT_LEAD_FILTERS, client);
    expect(findAll(calls, 'admin_leads_list', 'eq')).toHaveLength(0);
    expect(findAll(calls, 'admin_leads_list', 'or')).toHaveLength(0);
    expect(findAll(calls, 'admin_leads_list', 'gte')).toHaveLength(0);
  });

  it('reports an empty result rather than throwing', async () => {
    const { client } = makeClient({ admin_leads_list: { data: [], error: null, count: 0 } });
    const page = await fetchLeads(DEFAULT_LEAD_FILTERS, client);
    expect(page.rows).toEqual([]);
    expect(page.total).toBe(0);
  });
});

describe('error translation', () => {
  it('never surfaces Postgres detail to the user', async () => {
    const { client } = makeClient({
      admin_leads_list: {
        data: null,
        error: {
          code: '42703',
          message: 'column leads.metadata does not exist',
          details: 'select metadata from public.leads',
          hint: 'Perhaps you meant…',
        },
      },
    });
    const error = await fetchLeads(DEFAULT_LEAD_FILTERS, client).catch((e) => e);
    expect(error).toBeInstanceOf(AdminDataError);
    expect(error.message).toBe('Something went wrong loading this data. Please try again.');
    expect(error.message).not.toContain('metadata');
    expect(error.message).not.toContain('select');
  });

  it('recognises an expired session so the guard can react', () => {
    expect(mapDataError({ code: 'PGRST301' }).code).toBe('session_expired');
    expect(mapDataError({ status: 401 }).code).toBe('session_expired');
    expect(isSessionExpired(mapDataError({ code: 'PGRST301' }))).toBe(true);
    expect(isSessionExpired(mapDataError({ code: '42501' }))).toBe(false);
  });

  it('maps privilege, missing-row and outage cases distinctly', () => {
    expect(mapDataError({ code: '42501' }).code).toBe('forbidden');
    expect(mapDataError({ code: 'PGRST116' }).code).toBe('not_found');
    expect(mapDataError({ status: 502 }).code).toBe('network');
    expect(mapDataError({}).code).toBe('network');
  });
});

describe('summary and consultation queries', () => {
  it('reads the stats view and tolerates the no-row (non-admin) case', async () => {
    const { client, calls } = makeClient({ admin_lead_stats: { data: null, error: null } });
    await expect(fetchLeadStats(client)).resolves.toEqual({
      new_leads: 0,
      consultations: 0,
      reviews_requested: 0,
      qualified_leads: 0,
    });
    expect(find(calls, 'admin_lead_stats', 'select')?.args[0]).toBe(
      'new_leads, consultations, reviews_requested, qualified_leads',
    );
  });

  it('lists unsubmitted consultations from their own view, bounded', async () => {
    const { client, calls } = makeClient({
      admin_unsubmitted_consultations: { data: [], error: null },
    });
    await fetchUnsubmittedConsultations(10, client);
    expect(find(calls, 'admin_unsubmitted_consultations', 'range')?.args).toEqual([0, 9]);
    expect(find(calls, 'admin_unsubmitted_consultations', 'order')?.args).toEqual([
      'created_at',
      { ascending: false },
    ]);
  });
});

describe('lead detail bundle', () => {
  const detailResults = (consultation: Record<string, unknown> | null) => ({
    admin_leads_list: { data: leadRow, error: null },
    admin_lead_requirements: { data: [], error: null },
    admin_lead_estimates: { data: [], error: null },
    admin_lead_reviews: { data: [], error: null },
    admin_consultations: { data: consultation ? [consultation] : [], error: null },
    admin_consultation_proposals: { data: [], error: null },
    admin_consultation_artifacts: { data: [], error: null },
    admin_consultation_messages: { data: [{ id: 'm1' }], error: null },
    admin_lead_notes: { data: [], error: null },
  });

  it('assembles the detail from the safe views only', async () => {
    const { client, calls } = makeClient(detailResults(null));
    const detail = await fetchLeadDetail('lead-1', client);
    expect(detail.lead).toEqual(leadRow);

    const tables = new Set(calls.map((call) => call.table));
    for (const expected of [
      'admin_leads_list',
      'admin_lead_requirements',
      'admin_lead_estimates',
      'admin_lead_reviews',
      'admin_consultations',
      'admin_lead_notes',
    ]) {
      expect(tables.has(expected), expected).toBe(true);
    }
    // base tables are never queried directly for reads
    for (const forbidden of [
      'leads',
      'requirements',
      'consultation_meetings',
      'voice_sessions',
      'lead_internal_notes',
      'admin_users',
    ]) {
      expect(tables.has(forbidden), forbidden).toBe(false);
    }
  });

  it('does not request a transcript when consent was never given', async () => {
    const { client, calls } = makeClient(
      detailResults({ id: 'meeting-1', transcript_consent: false }),
    );
    const detail = await fetchLeadDetail('lead-1', client);
    expect(detail.transcript).toEqual([]);
    expect(findAll(calls, 'admin_consultation_messages', 'select')).toHaveLength(0);
  });

  it('requests a bounded transcript when consent exists', async () => {
    const { client, calls } = makeClient(
      detailResults({ id: 'meeting-1', transcript_consent: true }),
    );
    const detail = await fetchLeadDetail('lead-1', client);
    expect(detail.transcript).toHaveLength(1);
    expect(find(calls, 'admin_consultation_messages', 'in')?.args).toEqual([
      'meeting_id',
      ['meeting-1'],
    ]);
    expect(find(calls, 'admin_consultation_messages', 'range')?.args).toEqual([
      0,
      TRANSCRIPT_LIMIT - 1,
    ]);
  });

  it('reports a missing lead as not_found', async () => {
    const { client } = makeClient({ admin_leads_list: { data: null, error: null } });
    const error = await fetchLeadDetail('lead-1', client).catch((e) => e);
    expect(error).toBeInstanceOf(AdminDataError);
    expect(error.code).toBe('not_found');
  });
});

describe('the only writes the dashboard performs', () => {
  it('moves the status through the definer RPC, never a table update', async () => {
    const { client, calls } = makeClient({
      'rpc:admin_set_lead_status': {
        data: { id: 'lead-1', reference_code: 'SCS-4F7K2P9Q', status: 'contacted', updated_at: 'x' },
        error: null,
      },
    });
    const result = await updateLeadStatus('lead-1', 'contacted', client);
    expect(result.status).toBe('contacted');

    const rpc = find(calls, 'rpc:admin_set_lead_status', 'rpc');
    expect(rpc?.args[0]).toEqual({ p_lead_id: 'lead-1', p_status: 'contacted' });
    // no table write is ever attempted
    expect(calls.some((call) => call.method === 'update')).toBe(false);
    expect(calls.some((call) => call.method === 'insert')).toBe(false);
    expect(calls.some((call) => call.method === 'delete')).toBe(false);
  });

  it('sends no author id — the function reads auth.uid() itself', async () => {
    const { client, calls } = makeClient({
      'rpc:admin_add_lead_note': { data: { id: 'n1', note: 'Called the client.' }, error: null },
    });
    await addLeadNote('lead-1', '  Called the client.  ', client);
    const rpc = find(calls, 'rpc:admin_add_lead_note', 'rpc');
    expect(rpc?.args[0]).toEqual({ p_lead_id: 'lead-1', p_note: 'Called the client.' });
    expect(JSON.stringify(rpc?.args[0])).not.toContain('author');
  });

  it('edits only the note text', async () => {
    const { client, calls } = makeClient({
      'rpc:admin_update_lead_note': { data: { id: 'n1', note: 'Updated.' }, error: null },
    });
    await updateLeadNote('n1', ' Updated. ', client);
    expect(find(calls, 'rpc:admin_update_lead_note', 'rpc')?.args[0]).toEqual({
      p_note_id: 'n1',
      p_note: 'Updated.',
    });
  });

  it('lists notes newest first from the notes view', async () => {
    const { client, calls } = makeClient({ admin_lead_notes: { data: [], error: null } });
    await fetchLeadNotes('lead-1', client);
    expect(find(calls, 'admin_lead_notes', 'select')?.args[0]).toBe(
      'id, lead_id, author_id, note, created_at, updated_at',
    );
    expect(find(calls, 'admin_lead_notes', 'order')?.args).toEqual([
      'created_at',
      { ascending: false },
    ]);
  });

  it('surfaces a refused write as a safe message', async () => {
    const { client } = makeClient({
      'rpc:admin_set_lead_status': {
        data: null,
        error: { code: '42501', message: 'not authorized' },
      },
    });
    const error = await updateLeadStatus('lead-1', 'hired', client).catch((e) => e);
    expect(error.code).toBe('forbidden');
    expect(error.message).toBe('This account does not have dashboard access.');
  });

  it('reports a rejected status value without echoing the SQL error', async () => {
    const { client } = makeClient({
      'rpc:admin_set_lead_status': {
        data: null,
        error: { code: '22023', message: 'unsupported status' },
      },
    });
    const error = await updateLeadStatus('lead-1', 'spam' as never, client).catch((e) => e);
    expect(error).toBeInstanceOf(AdminDataError);
    expect(error.message).not.toContain('unsupported status');
  });
});
