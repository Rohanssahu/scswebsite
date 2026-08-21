import { describe, expect, it } from 'vitest';
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_SIGN_IN_MESSAGES,
  buildLoginRedirect,
  mapSignInError,
  nextStatusForAuthEvent,
  returnPathFromSearch,
  safeReturnPath,
  shouldRedirectToLogin,
  shouldRenderChildren,
  signInMessage,
} from './adminAuthCore';

describe('sign-in error mapping', () => {
  it('never distinguishes a wrong password from an unknown account', () => {
    const wrongPassword = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
    const unknownEmail = { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
    const unconfirmed = { status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' };
    expect(mapSignInError(wrongPassword)).toBe('invalid_credentials');
    expect(mapSignInError(unknownEmail)).toBe('invalid_credentials');
    expect(mapSignInError(unconfirmed)).toBe('invalid_credentials');
    expect(signInMessage(mapSignInError(wrongPassword))).toBe('Email or password is incorrect.');
  });

  it('maps throttling, server failures and offline clients separately', () => {
    expect(mapSignInError({ status: 429 })).toBe('rate_limited');
    expect(mapSignInError({ code: 'over_request_rate_limit' })).toBe('rate_limited');
    expect(mapSignInError({ status: 503 })).toBe('network');
    expect(mapSignInError({ name: 'AuthRetryableFetchError' })).toBe('network');
    expect(mapSignInError({ name: 'TypeError', message: 'Failed to fetch' })).toBe('network');
    expect(mapSignInError(null)).toBe('unknown');
  });

  it('never leaks a provider message into user-facing copy', () => {
    const provider = { status: 400, message: 'AuthApiError: user 8f2c… has no password set' };
    const message = signInMessage(mapSignInError(provider));
    expect(message).toBe(ADMIN_SIGN_IN_MESSAGES.invalid_credentials);
    expect(message).not.toContain('8f2c');
    expect(message).not.toContain('AuthApiError');
  });

  it('has a distinct message for an authenticated but unauthorized account', () => {
    expect(ADMIN_SIGN_IN_MESSAGES.unauthorized).toBe('This account does not have dashboard access.');
  });
});

describe('return-path allow-list', () => {
  it('keeps internal dashboard paths, including query strings', () => {
    expect(safeReturnPath('/admin')).toBe('/admin');
    expect(safeReturnPath('/admin/leads/3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60')).toBe(
      '/admin/leads/3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60',
    );
    expect(safeReturnPath('/admin?status=new')).toBe('/admin?status=new');
  });

  it('refuses anything that could leave the dashboard', () => {
    for (const hostile of [
      'https://evil.example/admin',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'data:text/html,<script>',
      '/admin/../../etc/passwd',
      '/%2f%2fevil.example',
      '/contact',
      '/',
      'admin',
      '',
      '   ',
      null,
      undefined,
      `/admin/${'x'.repeat(400)}`,
    ]) {
      expect(safeReturnPath(hostile as string), String(hostile)).toBe(ADMIN_HOME_PATH);
    }
  });

  it('never returns the login route itself, so redirects cannot loop', () => {
    expect(safeReturnPath(ADMIN_LOGIN_PATH)).toBe(ADMIN_HOME_PATH);
    expect(safeReturnPath('/admin/login?from=/admin/login')).toBe(ADMIN_HOME_PATH);
    expect(buildLoginRedirect(ADMIN_LOGIN_PATH)).toBe(ADMIN_LOGIN_PATH);
  });

  it('round-trips a deep link through the login redirect', () => {
    const target = '/admin/leads/3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60';
    const redirect = buildLoginRedirect(target);
    expect(redirect).toBe(`${ADMIN_LOGIN_PATH}?from=${encodeURIComponent(target)}`);
    expect(returnPathFromSearch(redirect.slice(redirect.indexOf('?')))).toBe(target);
  });

  it('omits the parameter when the target is already the dashboard home', () => {
    expect(buildLoginRedirect('/admin')).toBe(ADMIN_LOGIN_PATH);
    expect(returnPathFromSearch('')).toBe(ADMIN_HOME_PATH);
    expect(returnPathFromSearch('?from=https://evil.example')).toBe(ADMIN_HOME_PATH);
  });
});

describe('guard state machine', () => {
  it('renders protected content only when authorized', () => {
    expect(shouldRenderChildren('authorized')).toBe(true);
    for (const status of ['checking', 'unauthenticated', 'unauthorized', 'expired', 'error'] as const) {
      expect(shouldRenderChildren(status)).toBe(false);
    }
  });

  it('sends unauthenticated, expired and unauthorized visitors to the login screen', () => {
    expect(shouldRedirectToLogin('unauthenticated')).toBe(true);
    expect(shouldRedirectToLogin('expired')).toBe(true);
    expect(shouldRedirectToLogin('unauthorized')).toBe(true);
    // `checking` must NOT redirect, or a refresh would bounce a valid session.
    expect(shouldRedirectToLogin('checking')).toBe(false);
    expect(shouldRedirectToLogin('authorized')).toBe(false);
    expect(shouldRedirectToLogin('error')).toBe(false);
  });

  it('maps auth events onto the next status', () => {
    expect(nextStatusForAuthEvent('SIGNED_OUT', false, null)).toBe('unauthenticated');
    expect(nextStatusForAuthEvent('SIGNED_IN', true, true)).toBe('authorized');
    expect(nextStatusForAuthEvent('SIGNED_IN', true, false)).toBe('unauthorized');
    expect(nextStatusForAuthEvent('SIGNED_IN', true, null)).toBe('checking');
    // A refresh that produced no session is an expired session, not a sign-out.
    expect(nextStatusForAuthEvent('TOKEN_REFRESHED', false, null)).toBe('expired');
    expect(nextStatusForAuthEvent('TOKEN_REFRESHED', true, true)).toBe('authorized');
    expect(nextStatusForAuthEvent('INITIAL_SESSION', false, null)).toBe('unauthenticated');
  });
});
