import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_NAME,
  evaluateJoinWindow,
  generateAccessToken,
  generateParticipantIdentity,
  generatePublicReference,
  generateRoomName,
  hashAccessToken,
  isConsultationEnabled,
  isOriginAllowed,
  isValidReference,
  isValidTimezone,
  resolveAgentName,
  resolveAllowedOrigins,
  resolveRateWindows,
  sanitizeAnalysisSnapshot,
  timingSafeEqualHex,
  validateArtifactUrl,
  validateCreateRequest,
  validateLinksRequest,
  validateRescheduleRequest,
  validateScopedOnly,
  MAX_SCHEDULE_AHEAD_DAYS,
  INSTANT_MEETING_TTL_MS,
  SCHEDULED_JOIN_GRACE_MS,
} from './validation.ts';

const NOW = Date.parse('2026-08-21T12:00:00.000Z');
const VALID_TOKEN = 'a'.repeat(64);

const baseCreate = (overrides: Record<string, unknown> = {}) => ({
  action: 'create',
  turnstileToken: 'turnstile-token-value',
  consent: true,
  meetingKind: 'instant',
  name: 'Asha Kumar',
  email: 'Asha@Example.com',
  clientTimezone: 'Asia/Kolkata',
  ...overrides,
});

describe('origin allowlist', () => {
  const allowed = resolveAllowedOrigins(null);

  it('accepts the production and localhost origins', () => {
    expect(isOriginAllowed('https://scssoftwares.com', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('rejects lookalike and non-http origins', () => {
    expect(isOriginAllowed('https://scssoftwares.com.evil.example', allowed)).toBe(false);
    expect(isOriginAllowed('javascript:alert(1)', allowed)).toBe(false);
    expect(isOriginAllowed('', allowed)).toBe(false);
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });

  it('only merges valid http(s) extras from the environment', () => {
    const merged = resolveAllowedOrigins('https://staging.example.com, ftp://nope.example, junk');
    expect(merged).toContain('https://staging.example.com');
    expect(merged.some((o) => o.startsWith('ftp:'))).toBe(false);
    expect(merged).not.toContain('junk');
  });
});

describe('create-request validation', () => {
  it('accepts a minimal valid instant request and normalizes the email', () => {
    const result = validateCreateRequest(baseCreate(), NOW);
    expect('ok' in result).toBe(false);
    if ('ok' in result) return;
    expect(result.email).toBe('asha@example.com');
    expect(result.meetingKind).toBe('instant');
    expect(result.transcriptConsent).toBe(false);
    expect(result.analysisSnapshot).toBeNull();
  });

  it('requires explicit consent', () => {
    const result = validateCreateRequest(baseCreate({ consent: false }), NOW);
    expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
  });

  it('rejects unknown top-level properties', () => {
    for (const key of ['agentName', 'roomName', 'accessToken', 'grants', 'ttl', 'reference', 'identity']) {
      const result = validateCreateRequest(baseCreate({ [key]: 'x' }), NOW);
      expect(result).toMatchObject({ ok: false, error: 'invalid_request' });
    }
  });

  it('flags a filled honeypot separately from validation errors', () => {
    const result = validateCreateRequest(baseCreate({ scs_hp_check: 'bot' }), NOW);
    expect(result).toMatchObject({ ok: false, error: 'honeypot' });
  });

  it('ignores an empty honeypot', () => {
    const result = validateCreateRequest(baseCreate({ scs_hp_check: '' }), NOW);
    expect('ok' in result).toBe(false);
  });

  it('rejects invalid emails, names, phones and timezones', () => {
    expect(validateCreateRequest(baseCreate({ email: 'not-an-email' }), NOW)).toMatchObject({ ok: false });
    expect(validateCreateRequest(baseCreate({ name: 'A' }), NOW)).toMatchObject({ ok: false });
    expect(validateCreateRequest(baseCreate({ phone: '12' }), NOW)).toMatchObject({ ok: false });
    expect(validateCreateRequest(baseCreate({ clientTimezone: 'Not a Zone!' }), NOW)).toMatchObject({ ok: false });
  });

  it('normalizes phone numbers with separators', () => {
    const result = validateCreateRequest(baseCreate({ phone: '+91 (98) 765-43210' }), NOW);
    expect('ok' in result).toBe(false);
    if ('ok' in result) return;
    expect(result.phone).toBe('+919876543210');
  });

  it('only accepts supported meeting languages', () => {
    for (const lang of ['en', 'hi', 'hinglish', 'mr', 'ur', 'ar']) {
      expect('ok' in validateCreateRequest(baseCreate({ preferredLanguage: lang }), NOW)).toBe(false);
    }
    expect(validateCreateRequest(baseCreate({ preferredLanguage: 'fr' }), NOW)).toMatchObject({ ok: false });
  });

  describe('scheduled meetings', () => {
    it('requires a scheduled time and converts it to UTC ISO', () => {
      const result = validateCreateRequest(
        baseCreate({ meetingKind: 'scheduled', scheduledAtUtc: '2026-08-22T09:30:00.000Z' }),
        NOW,
      );
      expect('ok' in result).toBe(false);
      if ('ok' in result) return;
      expect(result.scheduledAtUtc).toBe('2026-08-22T09:30:00.000Z');
    });

    it('rejects a missing, past or far-future time', () => {
      expect(validateCreateRequest(baseCreate({ meetingKind: 'scheduled' }), NOW)).toMatchObject({ ok: false });
      expect(
        validateCreateRequest(baseCreate({ meetingKind: 'scheduled', scheduledAtUtc: '2026-08-20T09:30:00Z' }), NOW),
      ).toMatchObject({ ok: false });
      const far = new Date(NOW + (MAX_SCHEDULE_AHEAD_DAYS + 2) * 86_400_000).toISOString();
      expect(
        validateCreateRequest(baseCreate({ meetingKind: 'scheduled', scheduledAtUtc: far }), NOW),
      ).toMatchObject({ ok: false });
    });

    it('rejects a scheduled time on an instant meeting', () => {
      expect(
        validateCreateRequest(baseCreate({ scheduledAtUtc: '2026-08-22T09:30:00Z' }), NOW),
      ).toMatchObject({ ok: false });
    });
  });
});

describe('analysis snapshot sanitization', () => {
  const raw = {
    mode: 'existing',
    source: 'ai',
    generatedAt: '2026-08-21T10:00:00.000Z',
    projectType: 'Marketplace',
    platforms: ['Web', 'Android', 42, ''],
    features: ['Search', 'Checkout'],
    currentCondition: 'Live but slow',
    technologyPreferences: 'React, Node',
    existingProblems: ['Slow search'],
    missingFeatures: ['Wishlist'],
    priorities: ['Timeline: 3 months'],
    reportedEstimate: { totalHours: 320.6, totalCost: 4800, durationWeeks: 8, weeklyCapacityHours: 40 },
  };

  it('keeps only whitelisted fields and clamps list entries', () => {
    const snapshot = sanitizeAnalysisSnapshot(raw);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.mode).toBe('existing');
    expect(snapshot?.platforms).toEqual(['Web', 'Android']);
    expect(snapshot?.features).toEqual(['Search', 'Checkout']);
  });

  it('flags reported figures as client-reported and rounds them', () => {
    const snapshot = sanitizeAnalysisSnapshot(raw);
    expect(snapshot?.reported).toEqual({
      client_reported: true,
      totalHours: 321,
      totalCost: 4800,
      durationWeeks: 8,
      weeklyCapacityHours: 40,
    });
  });

  it('rejects a snapshot carrying unknown fields', () => {
    expect(sanitizeAnalysisSnapshot({ ...raw, injectedPrice: 1 })).toBeNull();
  });

  it('rejects a snapshot with no valid mode', () => {
    expect(sanitizeAnalysisSnapshot({ mode: 'whatever' })).toBeNull();
    expect(sanitizeAnalysisSnapshot(null)).toBeNull();
    expect(sanitizeAnalysisSnapshot('nope')).toBeNull();
  });

  it('drops out-of-range reported numbers rather than storing them', () => {
    const snapshot = sanitizeAnalysisSnapshot({
      mode: 'new',
      reportedEstimate: { totalHours: 9_999_999, totalCost: -5, durationWeeks: 10_000, weeklyCapacityHours: 0 },
    });
    expect(snapshot?.reported).toBeNull();
  });

  it('accepts a snapshot supplied through the create request', () => {
    const result = validateCreateRequest(baseCreate({ analysisSnapshot: raw }), NOW);
    expect('ok' in result).toBe(false);
    if ('ok' in result) return;
    expect(result.analysisSnapshot?.mode).toBe('existing');
  });
});

describe('scoped access proof', () => {
  it('requires a well-formed reference and hex access token', () => {
    expect(validateScopedOnly({ action: 'resolve', reference: 'SCSM-ABCDEFGHJK', accessToken: VALID_TOKEN })).toMatchObject({
      reference: 'SCSM-ABCDEFGHJK',
    });
    expect(validateScopedOnly({ action: 'resolve', reference: 'SCS-ABCD1234', accessToken: VALID_TOKEN })).toMatchObject({
      ok: false,
    });
    expect(validateScopedOnly({ action: 'resolve', reference: 'SCSM-ABCDEFGHJK', accessToken: 'short' })).toMatchObject({
      ok: false,
    });
    expect(
      validateScopedOnly({ action: 'resolve', reference: 'SCSM-ABCDEFGHJK', accessToken: 'Z'.repeat(64) }),
    ).toMatchObject({ ok: false });
  });

  it('rejects extra properties on scoped actions', () => {
    expect(
      validateScopedOnly({ action: 'join', reference: 'SCSM-ABCDEFGHJK', accessToken: VALID_TOKEN, agentName: 'evil' }),
    ).toMatchObject({ ok: false });
  });

  it('validates the reference format', () => {
    expect(isValidReference('SCSM-ABCDEFGHJK')).toBe(true);
    expect(isValidReference('SCSM-abcdefghjk')).toBe(false);
    expect(isValidReference('SCSM-TOOSHORT')).toBe(false);
  });
});

describe('access token hashing', () => {
  it('generates a 64-char hex token and stores only its hash', async () => {
    const token = generateAccessToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const hash = await hashAccessToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
  });

  it('produces stable hashes and rejects mismatches', async () => {
    const token = generateAccessToken();
    const a = await hashAccessToken(token);
    const b = await hashAccessToken(token);
    expect(timingSafeEqualHex(a, b)).toBe(true);
    const other = await hashAccessToken(generateAccessToken());
    expect(timingSafeEqualHex(a, other)).toBe(false);
  });

  it('never treats empty or differently-sized values as equal', () => {
    expect(timingSafeEqualHex('', '')).toBe(false);
    expect(timingSafeEqualHex('abc', 'abcd')).toBe(false);
  });
});

describe('server-generated identifiers', () => {
  it('produces unguessable, unique references, rooms and identities', () => {
    const refs = new Set(Array.from({ length: 50 }, generatePublicReference));
    const rooms = new Set(Array.from({ length: 50 }, generateRoomName));
    const ids = new Set(Array.from({ length: 50 }, generateParticipantIdentity));
    expect(refs.size).toBe(50);
    expect(rooms.size).toBe(50);
    expect(ids.size).toBe(50);
    for (const ref of refs) expect(ref).toMatch(/^SCSM-[A-Z2-9]{10}$/);
    for (const room of rooms) expect(room).toMatch(/^scsm-[a-z2-9]{16}$/);
    for (const id of ids) expect(id).toMatch(/^client-[a-z2-9]{12}$/);
  });
});

describe('agent dispatch name', () => {
  it('defaults to buddy-it-manager and only accepts safe env values', () => {
    expect(DEFAULT_AGENT_NAME).toBe('buddy-it-manager');
    expect(resolveAgentName(undefined)).toBe('buddy-it-manager');
    expect(resolveAgentName('')).toBe('buddy-it-manager');
    expect(resolveAgentName('buddy-consultation')).toBe('buddy-consultation');
    expect(resolveAgentName('bad name!')).toBe('buddy-it-manager');
    expect(resolveAgentName('x'.repeat(80))).toBe('buddy-it-manager');
  });

  it('has no request-driven path to the agent name (browser cannot choose it)', () => {
    // Every request validator rejects an agentName property outright.
    expect(validateCreateRequest(baseCreate({ agentName: 'evil' }), NOW)).toMatchObject({ ok: false });
    expect(
      validateScopedOnly({ action: 'join', reference: 'SCSM-ABCDEFGHJK', accessToken: VALID_TOKEN, agentName: 'evil' }),
    ).toMatchObject({ ok: false });
  });
});

describe('feature flag and rate windows', () => {
  it('is disabled unless the value is exactly "true"', () => {
    expect(isConsultationEnabled('true')).toBe(true);
    expect(isConsultationEnabled('TRUE')).toBe(false);
    expect(isConsultationEnabled('1')).toBe(false);
    expect(isConsultationEnabled(undefined)).toBe(false);
  });

  it('falls back to conservative defaults on bad overrides', () => {
    expect(resolveRateWindows('5,12')).toEqual([
      { windowMinutes: 60, maxMeetings: 5 },
      { windowMinutes: 1440, maxMeetings: 12 },
    ]);
    expect(resolveRateWindows('0,5')).toEqual(resolveRateWindows(null));
    expect(resolveRateWindows('nonsense')).toEqual(resolveRateWindows(null));
    expect(resolveRateWindows('5')).toEqual(resolveRateWindows(null));
  });
});

describe('artifact URL validation', () => {
  it('accepts allowlisted repository hosts', () => {
    for (const url of [
      'https://github.com/scs/app',
      'https://gitlab.com/scs/app',
      'https://bitbucket.org/scs/app',
      'https://www.github.com/scs/app',
    ]) {
      expect(validateArtifactUrl('repository', url)).toMatchObject({ ok: true });
    }
  });

  it('rejects non-allowlisted repository hosts', () => {
    expect(validateArtifactUrl('repository', 'https://evil.example/scs/app')).toMatchObject({
      ok: false,
      reason: 'repository_host_not_allowed',
    });
    expect(validateArtifactUrl('repository', 'https://github.com.evil.example/x')).toMatchObject({ ok: false });
  });

  it('requires https and forbids embedded credentials', () => {
    expect(validateArtifactUrl('website', 'http://example.com')).toMatchObject({ ok: false, reason: 'https_required' });
    expect(validateArtifactUrl('repository', 'https://user:token@github.com/scs/app')).toMatchObject({
      ok: false,
      reason: 'credentials_in_url',
    });
  });

  it('blocks private, loopback and IP hosts (no SSRF targets stored)', () => {
    for (const url of [
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://10.0.0.5/x',
      'https://192.168.1.10/x',
      'https://172.16.0.1/x',
      'https://169.254.169.254/latest/meta-data',
      'https://internal.local/x',
    ]) {
      expect(validateArtifactUrl('website', url)).toMatchObject({ ok: false });
    }
  });

  it('rejects dangerous schemes and malformed URLs', () => {
    expect(validateArtifactUrl('website', 'javascript:alert(1)')).toMatchObject({ ok: false });
    expect(validateArtifactUrl('website', 'data:text/html,<script>')).toMatchObject({ ok: false });
    expect(validateArtifactUrl('website', 'not a url')).toMatchObject({ ok: false, reason: 'invalid_url' });
    expect(validateArtifactUrl('website', `https://example.com/${'x'.repeat(3000)}`)).toMatchObject({
      ok: false,
      reason: 'url_too_long',
    });
  });

  it('restricts figma links to figma.com', () => {
    expect(validateArtifactUrl('figma', 'https://www.figma.com/file/abc')).toMatchObject({ ok: true });
    expect(validateArtifactUrl('figma', 'https://notfigma.example/file/abc')).toMatchObject({ ok: false });
  });
});

describe('link submission validation', () => {
  const base = { action: 'submit_links', reference: 'SCSM-ABCDEFGHJK', accessToken: VALID_TOKEN };

  it('accepts a valid repository link and extracts the host', () => {
    const result = validateLinksRequest({ ...base, links: [{ kind: 'repository', url: 'https://github.com/scs/app' }] });
    expect('ok' in result).toBe(false);
    if ('ok' in result) return;
    expect(result.artifacts[0]).toMatchObject({ kind: 'repository', host: 'github.com' });
  });

  it('accepts a note without a URL and rejects a note carrying one', () => {
    expect('ok' in validateLinksRequest({ ...base, links: [{ kind: 'note', note: 'Some context' }] })).toBe(false);
    expect(
      validateLinksRequest({ ...base, links: [{ kind: 'note', note: 'x', url: 'https://github.com/a/b' }] }),
    ).toMatchObject({ ok: false });
  });

  it('rejects unknown kinds, unknown item properties and empty batches', () => {
    expect(validateLinksRequest({ ...base, links: [{ kind: 'exe', url: 'https://x.example' }] })).toMatchObject({ ok: false });
    expect(
      validateLinksRequest({ ...base, links: [{ kind: 'website', url: 'https://x.example', evil: 1 }] }),
    ).toMatchObject({ ok: false });
    expect(validateLinksRequest({ ...base, links: [] })).toMatchObject({ ok: false });
    expect(validateLinksRequest({ ...base, links: 'nope' })).toMatchObject({ ok: false });
  });

  it('caps the batch size', () => {
    const links = Array.from({ length: 11 }, () => ({ kind: 'website', url: 'https://example.com' }));
    expect(validateLinksRequest({ ...base, links })).toMatchObject({ ok: false });
  });
});

describe('reschedule validation', () => {
  const base = { action: 'reschedule', reference: 'SCSM-ABCDEFGHJK', accessToken: VALID_TOKEN };

  it('accepts a future time with a valid timezone', () => {
    const result = validateRescheduleRequest(
      { ...base, scheduledAtUtc: '2026-08-25T09:00:00.000Z', clientTimezone: 'Asia/Kolkata' },
      NOW,
    );
    expect('ok' in result).toBe(false);
  });

  it('rejects past times and bad timezones', () => {
    expect(
      validateRescheduleRequest({ ...base, scheduledAtUtc: '2026-01-01T09:00:00Z', clientTimezone: 'UTC' }, NOW),
    ).toMatchObject({ ok: false });
    expect(
      validateRescheduleRequest({ ...base, scheduledAtUtc: '2026-08-25T09:00:00Z', clientTimezone: '../etc' }, NOW),
    ).toMatchObject({ ok: false });
  });
});

describe('timezone validation', () => {
  it('accepts real IANA zones and rejects junk', () => {
    for (const tz of ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'America/Argentina/Salta']) {
      expect(isValidTimezone(tz)).toBe(true);
    }
    for (const tz of ['../../etc/passwd', 'Asia/Kolkata; DROP TABLE', '<script>', 'x'.repeat(80)]) {
      expect(isValidTimezone(tz)).toBe(false);
    }
  });
});

describe('join window policy', () => {
  const instant = {
    meetingKind: 'instant' as const,
    status: 'scheduled',
    scheduledAtMs: null,
    earlyJoinMinutes: 15,
    createdAtMs: NOW,
    nowMs: NOW,
  };

  it('allows an instant meeting right away', () => {
    expect(evaluateJoinWindow(instant)).toEqual({ canJoin: true });
  });

  it('expires an instant meeting after its TTL', () => {
    expect(evaluateJoinWindow({ ...instant, nowMs: NOW + INSTANT_MEETING_TTL_MS + 1000 })).toMatchObject({
      canJoin: false,
      reason: 'expired',
    });
  });

  const scheduledAt = NOW + 60 * 60 * 1000;
  const scheduled = {
    meetingKind: 'scheduled' as const,
    status: 'scheduled',
    scheduledAtMs: scheduledAt,
    earlyJoinMinutes: 15,
    createdAtMs: NOW,
    nowMs: NOW,
  };

  it('blocks joining before the early-join window and reports when it opens', () => {
    const result = evaluateJoinWindow(scheduled);
    expect(result).toMatchObject({ canJoin: false, reason: 'too_early' });
    if (result.canJoin) return;
    expect(result.opensAtMs).toBe(scheduledAt - 15 * 60 * 1000);
  });

  it('allows joining inside the early-join window', () => {
    expect(evaluateJoinWindow({ ...scheduled, nowMs: scheduledAt - 10 * 60 * 1000 })).toEqual({ canJoin: true });
    expect(evaluateJoinWindow({ ...scheduled, nowMs: scheduledAt })).toEqual({ canJoin: true });
  });

  it('respects a configurable early-join window', () => {
    expect(
      evaluateJoinWindow({ ...scheduled, earlyJoinMinutes: 90, nowMs: scheduledAt - 60 * 60 * 1000 }),
    ).toEqual({ canJoin: true });
  });

  it('expires a scheduled meeting after the grace period', () => {
    expect(evaluateJoinWindow({ ...scheduled, nowMs: scheduledAt + SCHEDULED_JOIN_GRACE_MS + 1000 })).toMatchObject({
      canJoin: false,
      reason: 'expired',
    });
  });

  it('never allows joining a cancelled, completed or errored meeting', () => {
    for (const [status, reason] of [
      ['cancelled', 'cancelled'],
      ['completed', 'completed'],
      ['expired', 'expired'],
      ['error', 'expired'],
    ] as const) {
      expect(evaluateJoinWindow({ ...instant, status })).toMatchObject({ canJoin: false, reason });
    }
  });

  it('allows rejoining an in-progress meeting inside the window', () => {
    expect(evaluateJoinWindow({ ...instant, status: 'in_progress' })).toEqual({ canJoin: true });
  });
});
