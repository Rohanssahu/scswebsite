// Login/authorization transport, exercised against a recorded fake Supabase
// client. The point of these assertions is the security contract: a signed-in
// account that is not staff must be signed back out, and no failure path may
// leave a usable session behind.

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminAuthError, fetchMembership, restoreAdminSession, signInAdmin } from './adminAuth';

const OWNER_ID = '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60';

interface FakeOptions {
  signIn?: { data: unknown; error: unknown };
  session?: { data: unknown; error: unknown };
  membership?: { data: unknown; error: unknown };
}

function makeClient(options: FakeOptions) {
  const calls: string[] = [];
  const client = {
    auth: {
      signInWithPassword: async (credentials: { email: string; password: string }) => {
        calls.push(`signInWithPassword:${credentials.email}`);
        return options.signIn ?? { data: null, error: { status: 400 } };
      },
      signOut: async () => {
        calls.push('signOut');
        return { error: null };
      },
      getSession: async () => {
        calls.push('getSession');
        return options.session ?? { data: { session: null }, error: null };
      },
    },
    rpc: async (fn: string) => {
      calls.push(`rpc:${fn}`);
      return options.membership ?? { data: null, error: null };
    },
    from: (table: string) => {
      calls.push(`from:${table}`);
      throw new Error('the dashboard must not read admin_users as a table');
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const activeOwner = { data: { user_id: OWNER_ID, role: 'owner', is_active: true }, error: null };
const ADMIN_ME = 'rpc:admin_me';
const signedIn = {
  data: { user: { id: OWNER_ID, email: 'owner@example.test' }, session: { access_token: 'x' } },
  error: null,
};

describe('successful owner login', () => {
  it('returns the membership and never signs out', async () => {
    const { client, calls } = makeClient({ signIn: signedIn, membership: activeOwner });
    const session = await signInAdmin('  owner@example.test ', 'correct-horse', client);
    expect(session.userId).toBe(OWNER_ID);
    expect(session.membership).toEqual({ userId: OWNER_ID, role: 'owner', isActive: true });
    expect(calls).not.toContain('signOut');
    // the e-mail is trimmed before it reaches the provider
    expect(calls).toContain('signInWithPassword:owner@example.test');
  });

  it('asks the definer function rather than reading admin_users', async () => {
    const { client, calls } = makeClient({ signIn: signedIn, membership: activeOwner });
    await signInAdmin('owner@example.test', 'correct-horse', client);
    expect(calls).toContain(ADMIN_ME);
    expect(calls.some((call) => call.startsWith('from:'))).toBe(false);
  });
});

describe('wrong credentials', () => {
  it('throws the shared invalid-credentials message and queries nothing', async () => {
    const { client, calls } = makeClient({
      signIn: { data: null, error: { status: 400, code: 'invalid_credentials' } },
    });
    await expect(signInAdmin('owner@example.test', 'nope', client)).rejects.toMatchObject({
      name: 'AdminAuthError',
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    });
    // no membership lookup happens for an unauthenticated attempt
    expect(calls).not.toContain(ADMIN_ME);
  });

  it('treats a missing session in a "successful" response as a failure', async () => {
    const { client } = makeClient({ signIn: { data: { user: null, session: null }, error: null } });
    await expect(signInAdmin('owner@example.test', 'x', client)).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });
});

describe('authenticated but unauthorized account', () => {
  it('signs the session out before reporting no access', async () => {
    const { client, calls } = makeClient({
      signIn: signedIn,
      membership: { data: null, error: null },
    });
    await expect(signInAdmin('stranger@example.test', 'right-password', client)).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'This account does not have dashboard access.',
    });
    expect(calls).toContain('signOut');
    // and the sign-out happens after the membership check, not before
    expect(calls.indexOf('signOut')).toBeGreaterThan(calls.indexOf(ADMIN_ME));
  });

  it('rejects a deactivated staff row', async () => {
    const { client, calls } = makeClient({
      signIn: signedIn,
      membership: { data: { user_id: OWNER_ID, role: 'owner', is_active: false }, error: null },
    });
    await expect(signInAdmin('owner@example.test', 'x', client)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(calls).toContain('signOut');
  });

  it('rejects a row whose role is not owner/admin', async () => {
    const { client } = makeClient({
      signIn: signedIn,
      membership: { data: { user_id: OWNER_ID, role: 'viewer', is_active: true }, error: null },
    });
    await expect(signInAdmin('owner@example.test', 'x', client)).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('signs out when the membership lookup itself fails', async () => {
    const { client, calls } = makeClient({
      signIn: signedIn,
      membership: { data: null, error: { status: 500 } },
    });
    await expect(signInAdmin('owner@example.test', 'x', client)).rejects.toBeInstanceOf(AdminAuthError);
    expect(calls).toContain('signOut');
  });
});

describe('session restore', () => {
  it('returns no identity when there is no stored session', async () => {
    const { client } = makeClient({ session: { data: { session: null }, error: null } });
    await expect(restoreAdminSession(client)).resolves.toEqual({
      userId: null,
      email: null,
      membership: null,
    });
  });

  it('re-verifies membership on every restore, so revoking access takes effect', async () => {
    const { client, calls } = makeClient({
      session: {
        data: { session: { user: { id: OWNER_ID, email: 'owner@example.test' } } },
        error: null,
      },
      membership: { data: null, error: null },
    });
    const restored = await restoreAdminSession(client);
    expect(restored.userId).toBe(OWNER_ID);
    expect(restored.membership).toBeNull();
    expect(calls).toContain(ADMIN_ME);
  });

  it('restores an active owner', async () => {
    const { client } = makeClient({
      session: {
        data: { session: { user: { id: OWNER_ID, email: 'owner@example.test' } } },
        error: null,
      },
      membership: activeOwner,
    });
    const restored = await restoreAdminSession(client);
    expect(restored.membership?.role).toBe('owner');
  });

  it('surfaces a transport failure as a safe network error', async () => {
    const { client } = makeClient({ session: { data: null, error: { status: 503 } } });
    await expect(restoreAdminSession(client)).rejects.toMatchObject({ code: 'network' });
  });
});

describe('membership helper', () => {
  it('rejects an answer that does not match the signed-in user', async () => {
    const { client } = makeClient({
      membership: { data: { user_id: 'someone-else', role: 'owner', is_active: true }, error: null },
    });
    await expect(fetchMembership(OWNER_ID, client)).resolves.toBeNull();
  });

  it('returns null rather than throwing when the caller is not staff', async () => {
    const { client } = makeClient({ membership: { data: null, error: null } });
    await expect(fetchMembership(OWNER_ID, client)).resolves.toBeNull();
  });
});
