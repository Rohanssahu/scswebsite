import { describe, expect, it } from 'vitest';
import {
  buildVisitorGrant,
  DEFAULT_RATE_WINDOWS,
  generateParticipantIdentity,
  generateRoomName,
  isOriginAllowed,
  isVoiceAgentEnabled,
  resolveAllowedOrigins,
  resolveRateWindows,
  TOKEN_TTL_SECONDS,
  validateTokenRequest,
} from './security';

const validBody = () => ({
  turnstileToken: 'tok_0123456789abcdef',
  consent: true as const,
});

describe('origin restrictions', () => {
  const allowed = resolveAllowedOrigins('https://rohanssahu.github.io');

  it('accepts production and configured origins', () => {
    expect(isOriginAllowed('https://scssoftwares.com', allowed)).toBe(true);
    expect(isOriginAllowed('https://rohanssahu.github.io', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('rejects unknown, missing and lookalike origins', () => {
    expect(isOriginAllowed('https://evil.example', allowed)).toBe(false);
    expect(isOriginAllowed('https://scssoftwares.com.evil.example', allowed)).toBe(false);
    expect(isOriginAllowed(null, allowed)).toBe(false);
    expect(isOriginAllowed('', allowed)).toBe(false);
  });

  it('ignores non-http(s) entries in ALLOWED_ORIGINS', () => {
    const list = resolveAllowedOrigins('javascript:alert(1),ftp://x,https://ok.example');
    expect(list).toContain('https://ok.example');
    expect(list.some((o) => o.startsWith('javascript'))).toBe(false);
  });
});

describe('request validation', () => {
  it('accepts a minimal valid request', () => {
    const res = validateTokenRequest(validBody());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.preferredLanguage).toBeNull();
      expect(res.data.consent).toBe(true);
    }
  });

  it('accepts supported preferred languages and normalizes case', () => {
    for (const lang of ['en', 'hi', 'hinglish', 'HI']) {
      const res = validateTokenRequest({ ...validBody(), preferredLanguage: lang });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.preferredLanguage).toBe(lang.toLowerCase());
    }
  });

  it('rejects unsupported languages', () => {
    const res = validateTokenRequest({ ...validBody(), preferredLanguage: 'fr' });
    expect(res.ok).toBe(false);
  });

  it('rejects missing or malformed turnstile tokens', () => {
    expect(validateTokenRequest({ consent: true }).ok).toBe(false);
    expect(validateTokenRequest({ ...validBody(), turnstileToken: 'short' }).ok).toBe(false);
    expect(validateTokenRequest({ ...validBody(), turnstileToken: 'x'.repeat(5000) }).ok).toBe(false);
  });

  it('rejects requests without explicit consent', () => {
    expect(validateTokenRequest({ turnstileToken: 'tok_0123456789abcdef' }).ok).toBe(false);
    expect(validateTokenRequest({ ...validBody(), consent: 'yes' }).ok).toBe(false);
    expect(validateTokenRequest({ ...validBody(), consent: false }).ok).toBe(false);
  });

  it('rejects unexpected properties — the browser cannot smuggle grants', () => {
    for (const extra of ['roomAdmin', 'room', 'identity', 'grants', 'ttl']) {
      const res = validateTokenRequest({ ...validBody(), [extra]: true });
      expect(res.ok).toBe(false);
    }
  });

  it('rejects non-object bodies', () => {
    expect(validateTokenRequest(null).ok).toBe(false);
    expect(validateTokenRequest([]).ok).toBe(false);
    expect(validateTokenRequest('hi').ok).toBe(false);
  });
});

describe('token grants and expiry', () => {
  it('grants only the minimum room permissions', () => {
    const grant = buildVisitorGrant('buddy-abc');
    expect(grant.room).toBe('buddy-abc');
    expect(grant.roomJoin).toBe(true);
    expect(grant.canPublish).toBe(true);
    expect(grant.canSubscribe).toBe(true);
    expect(grant.canPublishData).toBe(true);
    // The dangerous ones must always be off:
    expect(grant.roomAdmin).toBe(false);
    expect(grant.roomCreate).toBe(false);
    expect(grant.roomList).toBe(false);
    expect(grant.roomRecord).toBe(false);
    expect(grant.canUpdateOwnMetadata).toBe(false);
  });

  it('uses a short token lifetime', () => {
    expect(TOKEN_TTL_SECONDS).toBeLessThanOrEqual(900);
    expect(TOKEN_TTL_SECONDS).toBeGreaterThanOrEqual(60);
  });

  it('generates random, prefixed room names and identities', () => {
    const rooms = new Set(Array.from({ length: 50 }, generateRoomName));
    expect(rooms.size).toBe(50);
    for (const r of rooms) expect(r).toMatch(/^buddy-[a-z2-9]{16}$/);
    expect(generateParticipantIdentity()).toMatch(/^visitor-[a-z2-9]{12}$/);
  });
});

describe('rate limits and feature flag', () => {
  it('parses valid overrides', () => {
    expect(resolveRateWindows('6,20')).toEqual([
      { windowMinutes: 60, maxSessions: 6 },
      { windowMinutes: 1440, maxSessions: 20 },
    ]);
  });

  it('falls back to defaults on hostile or invalid values', () => {
    for (const v of [null, '', '0,5', '-1,10', 'a,b', '5', '5,10,20', '99999,1']) {
      expect(resolveRateWindows(v)).toEqual(DEFAULT_RATE_WINDOWS);
    }
  });

  it('feature flag is off unless exactly "true"', () => {
    expect(isVoiceAgentEnabled('true')).toBe(true);
    for (const v of [undefined, null, '', 'TRUE', '1', 'yes', 'on']) {
      expect(isVoiceAgentEnabled(v)).toBe(false);
    }
  });
});
