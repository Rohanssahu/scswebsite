// Session/authorization context for every /admin route.
//
// Responsibilities:
//   * restore a persisted Supabase session on refresh and re-verify staff
//     membership (so revoking a row takes effect on the next load, not on the
//     next token expiry);
//   * subscribe to auth-state changes and unsubscribe on unmount;
//   * sign a session out the moment it turns out not to be staff;
//   * expose one status the guard and the login screen both read, which is what
//     keeps redirects loop-free.
//
// It never stores a password, never copies the access token anywhere and never
// logs an auth response.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAdminClient, isAdminAuthConfigured } from '@/services/admin/adminClient';
import { restoreAdminSession, safeSignOut } from '@/services/admin/adminAuth';
import {
  ADMIN_SIGN_IN_MESSAGES,
  ADMIN_SESSION_EXPIRED_MESSAGE,
  type AdminAuthStatus,
} from '@/services/admin/adminAuthCore';
import type { AdminRole } from '@/services/admin/adminTypes';

export interface AdminAuthContextValue {
  status: AdminAuthStatus;
  userId: string | null;
  email: string | null;
  role: AdminRole | null;
  /** A message the login screen should show (expired session, access denied…). */
  notice: string | null;
  setNotice: (message: string | null) => void;
  /** Re-run the session + membership check (used after a manual sign-in). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return value;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAuthStatus>(
    isAdminAuthConfigured ? 'checking' : 'error',
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);
  // Guards against an out-of-order membership check overwriting a newer one.
  const checkId = useRef(0);

  const clearIdentity = useCallback(() => {
    setUserId(null);
    setEmail(null);
    setRole(null);
  }, []);

  const evaluate = useCallback(async () => {
    if (!isAdminAuthConfigured) {
      setStatus('error');
      return;
    }
    const ticket = ++checkId.current;
    try {
      const session = await restoreAdminSession();
      if (!mounted.current || ticket !== checkId.current) return;

      if (!session.userId) {
        clearIdentity();
        setStatus('unauthenticated');
        return;
      }
      if (!session.membership) {
        // Signed in, but not staff (or deactivated since last visit).
        await safeSignOut();
        if (!mounted.current || ticket !== checkId.current) return;
        clearIdentity();
        setNotice(ADMIN_SIGN_IN_MESSAGES.unauthorized);
        setStatus('unauthorized');
        return;
      }
      setUserId(session.userId);
      setEmail(session.email);
      setRole(session.membership.role);
      setStatus('authorized');
    } catch {
      if (!mounted.current || ticket !== checkId.current) return;
      clearIdentity();
      setStatus('error');
    }
  }, [clearIdentity]);

  useEffect(() => {
    mounted.current = true;
    void evaluate();

    const client = getAdminClient();
    if (!client) return () => { mounted.current = false; };

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      if (event === 'SIGNED_OUT') {
        clearIdentity();
        // Keep any notice already on screen (e.g. "access denied").
        setStatus('unauthenticated');
        return;
      }
      if (event === 'TOKEN_REFRESHED' && !session) {
        clearIdentity();
        setNotice(ADMIN_SESSION_EXPIRED_MESSAGE);
        setStatus('expired');
        return;
      }
      // SIGNED_IN / USER_UPDATED / INITIAL_SESSION: re-verify membership.
      void evaluate();
    });

    return () => {
      mounted.current = false;
      data.subscription.unsubscribe();
    };
  }, [clearIdentity, evaluate]);

  const signOut = useCallback(async () => {
    await safeSignOut();
    if (!mounted.current) return;
    clearIdentity();
    setNotice(null);
    setStatus('unauthenticated');
  }, [clearIdentity]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ status, userId, email, role, notice, setNotice, refresh: evaluate, signOut }),
    [status, userId, email, role, notice, evaluate, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
