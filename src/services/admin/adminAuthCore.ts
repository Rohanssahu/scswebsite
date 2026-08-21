// Pure authorization/routing logic for the owner dashboard.
//
// Everything here is side-effect free so it can be unit-tested without a
// browser, a router or a Supabase project: the auth state machine, the safe
// error vocabulary and the return-path allow-list.

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_LOGIN_PATH = '/admin/login';

/**
 * Guard states. `unauthorized` means "signed in to Supabase, but not staff" —
 * a different outcome from `unauthenticated`, and the reason the login screen
 * signs such a session straight back out.
 */
export type AdminAuthStatus =
  | 'checking'
  | 'authorized'
  | 'unauthenticated'
  | 'unauthorized'
  | 'expired'
  | 'error';

export type AdminSignInErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'unauthorized'
  | 'network'
  | 'unknown';

/**
 * User-facing copy. Note that `invalid_credentials` is intentionally identical
 * for "no such account" and "wrong password" — the dashboard never reveals
 * whether an e-mail address exists. No message ever echoes back a Postgres or
 * GoTrue error string.
 */
export const ADMIN_SIGN_IN_MESSAGES: Record<AdminSignInErrorCode, string> = {
  not_configured: 'Sign-in is unavailable right now. Please try again later.',
  invalid_credentials: 'Email or password is incorrect.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  unauthorized: 'This account does not have dashboard access.',
  network: 'Could not reach the sign-in service. Please check your connection.',
  unknown: 'Sign-in failed. Please try again.',
};

export const ADMIN_SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.';

export interface AuthErrorLike {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
}

/**
 * Collapse any Supabase auth failure into one of six safe codes.
 *
 * Anything that could distinguish "unknown e-mail" from "wrong password"
 * (400/401/422, `invalid_credentials`, `email_not_confirmed`, …) becomes the
 * same `invalid_credentials`.
 */
export function mapSignInError(error: AuthErrorLike | null | undefined): AdminSignInErrorCode {
  if (!error) return 'unknown';
  const status = typeof error.status === 'number' ? error.status : undefined;
  if (status === 429) return 'rate_limited';
  if (error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') {
    return 'rate_limited';
  }
  if (status === 400 || status === 401 || status === 403 || status === 422) {
    return 'invalid_credentials';
  }
  if (status !== undefined && status >= 500) return 'network';
  if (error.name === 'AuthRetryableFetchError' || error.name === 'TypeError') return 'network';
  if (status === undefined && !error.code) return 'network';
  return 'unknown';
}

/** Never let a message from the network reach the screen verbatim. */
export function signInMessage(code: AdminSignInErrorCode): string {
  return ADMIN_SIGN_IN_MESSAGES[code] ?? ADMIN_SIGN_IN_MESSAGES.unknown;
}

// Backslashes and colons (i.e. any scheme) are rejected outright rather than
// sanitised away. Control characters are checked by code point, because a
// control-character range inside a literal regex is itself a lint hazard.
const UNSAFE_PATH_CHARS = /[\\:]/;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Allow-list for the post-login redirect. Only internal dashboard paths are
 * preserved; everything else (absolute URLs, protocol-relative `//host`,
 * `javascript:`, encoded traversal, the login route itself) collapses to the
 * dashboard home, so `?from=` can never become an open redirect.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (typeof value !== 'string') return ADMIN_HOME_PATH;
  const raw = value.trim();
  if (!raw || raw.length > 300) return ADMIN_HOME_PATH;
  if (hasControlCharacter(raw) || UNSAFE_PATH_CHARS.test(raw)) return ADMIN_HOME_PATH;
  if (raw.includes('%')) return ADMIN_HOME_PATH; // no percent-encoded trickery
  if (!raw.startsWith('/') || raw.startsWith('//')) return ADMIN_HOME_PATH;
  if (raw.includes('..')) return ADMIN_HOME_PATH;
  const path = raw.split(/[?#]/)[0];
  if (path !== ADMIN_HOME_PATH && !path.startsWith(`${ADMIN_HOME_PATH}/`)) {
    return ADMIN_HOME_PATH;
  }
  // Bouncing back to the login screen would loop.
  if (path === ADMIN_LOGIN_PATH) return ADMIN_HOME_PATH;
  return raw;
}

/** `/admin/login?from=<safe path>` — omits the parameter for the default target. */
export function buildLoginRedirect(from: string | null | undefined): string {
  const target = safeReturnPath(from);
  if (target === ADMIN_HOME_PATH) return ADMIN_LOGIN_PATH;
  return `${ADMIN_LOGIN_PATH}?from=${encodeURIComponent(target)}`;
}

/** Read `?from=` out of a location search string, already sanitised. */
export function returnPathFromSearch(search: string | null | undefined): string {
  if (!search) return ADMIN_HOME_PATH;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return safeReturnPath(params.get('from'));
}

/** True while the guard may render protected content. */
export function shouldRenderChildren(status: AdminAuthStatus): boolean {
  return status === 'authorized';
}

/** True when the guard must navigate to the login screen. */
export function shouldRedirectToLogin(status: AdminAuthStatus): boolean {
  return status === 'unauthenticated' || status === 'expired' || status === 'unauthorized';
}

/**
 * Map a Supabase `onAuthStateChange` event plus the membership answer onto the
 * next guard status. Keeping this pure is what makes "session expired" and
 * "signed in but not staff" testable without a live GoTrue.
 */
export function nextStatusForAuthEvent(
  event: string,
  hasSession: boolean,
  isStaff: boolean | null,
): AdminAuthStatus {
  if (event === 'SIGNED_OUT') return 'unauthenticated';
  if (!hasSession) return event === 'TOKEN_REFRESHED' ? 'expired' : 'unauthenticated';
  if (isStaff === null) return 'checking';
  return isStaff ? 'authorized' : 'unauthorized';
}
