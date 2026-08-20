// Centralized Supabase configuration for the frontend.
//
// Only PUBLIC values live here: the project URL, the anon key and the
// Turnstile SITE key (all safe to ship in a browser bundle). Server-side
// secrets (service-role key, Turnstile secret, etc.) exist only as Supabase
// Edge Function secrets and must never appear in VITE_* variables.
//
// When configuration is missing (e.g. a build without env vars), nothing
// crashes: consumers check `isSupabaseConfigured` / `isLeadCaptureReady`
// and show a safe user-facing message instead.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Secure lead capture needs both Supabase and Turnstile public config. */
export const isLeadCaptureReady = isSupabaseConfigured && Boolean(TURNSTILE_SITE_KEY);

let client: SupabaseClient | null = null;

/** Lazily created singleton; null when the public config is absent. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
