// Owner-dashboard authentication transport.
//
// The browser never compares credentials itself and never learns a password
// policy: it hands the e-mail/password pair to Supabase Auth, then asks the
// database "am I staff?" through the security-definer public.admin_me()
// function. Authorization therefore lives in Postgres, not here — the browser
// holds no privilege on public.admin_users at all.
//
// Nothing in this module logs. No credential, session, access token or raw
// provider response is ever written to the console or to storage by us — the
// Supabase client owns the session.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/services/admin/adminClient';
import {
  mapSignInError,
  signInMessage,
  type AdminSignInErrorCode,
} from '@/services/admin/adminAuthCore';
import type { AdminMembership, AdminRole } from '@/services/admin/adminTypes';

/** Error carrying a machine code and an already-safe user-facing message. */
export class AdminAuthError extends Error {
  constructor(public code: AdminSignInErrorCode) {
    super(signInMessage(code));
    this.name = 'AdminAuthError';
  }
}

function requireClient(client?: SupabaseClient | null): SupabaseClient {
  const resolved = client ?? getAdminClient();
  if (!resolved) throw new AdminAuthError('not_configured');
  return resolved;
}

/**
 * The single authorization question, answered by the database.
 *
 * `admin_me()` is a security-definer function: the browser holds no privilege
 * on public.admin_users at all, so "not staff" and "row hidden" are the same
 * NULL from here. Returns null for anyone who is not an active owner/admin.
 */
export async function fetchMembership(
  userId: string,
  client?: SupabaseClient | null,
): Promise<AdminMembership | null> {
  const supabase = requireClient(client);
  const { data, error } = await supabase.rpc('admin_me');

  if (error) {
    // Deny by default; the distinction only picks the user-facing message.
    const status = (error as { status?: number }).status;
    throw new AdminAuthError(status && status >= 500 ? 'network' : 'unknown');
  }
  if (!data || typeof data !== 'object') return null;

  const row = data as { user_id?: string; role?: string; is_active?: boolean };
  if (row.is_active !== true) return null;
  if (row.role !== 'owner' && row.role !== 'admin') return null;
  // The function keys off auth.uid(); a mismatch would mean a swapped session.
  if (row.user_id !== userId) return null;
  return { userId: row.user_id, role: row.role as AdminRole, isActive: true };
}

export interface AdminSession {
  userId: string;
  email: string | null;
  membership: AdminMembership;
}

/**
 * Sign in, then verify staff membership. An authenticated-but-unauthorized
 * account is signed straight back out before the error is thrown, so a
 * non-staff visitor never holds a dashboard session for even one render.
 */
export async function signInAdmin(
  email: string,
  password: string,
  client?: SupabaseClient | null,
): Promise<AdminSession> {
  const supabase = requireClient(client);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw new AdminAuthError(mapSignInError(error));
  const user = data?.user;
  const session = data?.session;
  if (!user || !session) throw new AdminAuthError('invalid_credentials');

  let membership: AdminMembership | null = null;
  try {
    membership = await fetchMembership(user.id, supabase);
  } catch (cause) {
    await safeSignOut(supabase);
    throw cause instanceof AdminAuthError ? cause : new AdminAuthError('unknown');
  }

  if (!membership) {
    await safeSignOut(supabase);
    throw new AdminAuthError('unauthorized');
  }

  return { userId: user.id, email: user.email ?? null, membership };
}

/** Sign out, swallowing transport failures — the local session is cleared either way. */
export async function safeSignOut(client?: SupabaseClient | null): Promise<void> {
  const supabase = client ?? getAdminClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    /* the client drops the local session regardless */
  }
}

export interface RestoredSession {
  /** Present only when a valid Supabase session exists. */
  userId: string | null;
  email: string | null;
  /** Null when there is a session but no active staff row. */
  membership: AdminMembership | null;
}

/**
 * Restore a persisted session on page load and re-check membership. Called by
 * the guard, so revoking someone's admin_users row takes effect on their next
 * refresh rather than whenever their JWT happens to expire.
 */
export async function restoreAdminSession(
  client?: SupabaseClient | null,
): Promise<RestoredSession> {
  const supabase = requireClient(client);
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AdminAuthError('network');

  const session = data?.session ?? null;
  if (!session?.user) return { userId: null, email: null, membership: null };

  const membership = await fetchMembership(session.user.id, supabase);
  return { userId: session.user.id, email: session.user.email ?? null, membership };
}
