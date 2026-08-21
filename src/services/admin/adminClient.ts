// Supabase client for the owner dashboard.
//
// Deliberately a SECOND client, separate from services/supabaseClient.ts:
//   * the public client stays session-less (persistSession: false) so nothing
//     about a staff login can ever leak into a visitor's Edge Function calls;
//   * this one persists and refreshes a session, under its own storage key, so
//     the dashboard survives a page refresh.
//
// It is created lazily, on the first /admin render, and uses ONLY the public
// project URL and the anon/publishable key — the same two values the rest of
// the site already ships. There is no service-role key in this bundle, and no
// owner e-mail, UUID or password anywhere in the frontend: the browser sends
// credentials to Supabase Auth and asks the database who it is talking to.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Storage key kept distinct from any future public auth usage. */
export const ADMIN_AUTH_STORAGE_KEY = 'scs-admin-auth';

export const isAdminAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

/** Lazily created singleton; null when the public Supabase config is absent. */
export function getAdminClient(): SupabaseClient | null {
  if (!isAdminAuthConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        // The Supabase client owns the session. We never copy the access token
        // into localStorage ourselves and never store the password at all.
        persistSession: true,
        autoRefreshToken: true,
        // Admin routes are never an OAuth callback target.
        detectSessionInUrl: false,
        storageKey: ADMIN_AUTH_STORAGE_KEY,
      },
    });
  }
  return client;
}
