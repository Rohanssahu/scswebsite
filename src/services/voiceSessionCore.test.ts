import { describe, expect, it } from 'vitest';
import {
  mapTokenError,
  parseBuddyState,
  parseTokenResponse,
  upsertTranscript,
  type TranscriptItem,
} from './voiceSessionCore';

describe('token response validation', () => {
  const valid = {
    ok: true,
    url: 'wss://scs-buddy.livekit.cloud',
    token: 'x'.repeat(120),
    roomName: 'buddy-abc123',
    sessionId: '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60',
    expiresInSeconds: 600,
  };

  it('accepts a valid response', () => {
    const parsed = parseTokenResponse(valid);
    expect(parsed).not.toBeNull();
    expect(parsed?.roomName).toBe('buddy-abc123');
  });

  it('rejects non-wss URLs — the browser never connects to arbitrary targets', () => {
    for (const url of ['ws://insecure.example', 'https://evil.example', 'javascript:alert(1)', '']) {
      expect(parseTokenResponse({ ...valid, url })).toBeNull();
    }
  });

  it('rejects malformed or unsuccessful responses', () => {
    expect(parseTokenResponse(null)).toBeNull();
    expect(parseTokenResponse({ ...valid, ok: false })).toBeNull();
    expect(parseTokenResponse({ ...valid, token: 'short' })).toBeNull();
    expect(parseTokenResponse({ ...valid, sessionId: '' })).toBeNull();
  });

  it('maps server error codes to UI error codes', () => {
    expect(mapTokenError('voice_disabled')).toBe('voice_disabled');
    expect(mapTokenError('turnstile_failed')).toBe('turnstile_failed');
    expect(mapTokenError('rate_limited')).toBe('rate_limited');
    expect(mapTokenError(undefined, 500)).toBe('connect_failed');
    expect(mapTokenError('weird', 400)).toBe('unknown');
  });
});

describe('buddy.state message whitelisting', () => {
  const message = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      type: 'buddy.state',
      progress: { intent: 'new_project', collected: ['business_goal'], missingRequired: ['deadline'], percent: 40, confidence: 'low' },
      language: 'hinglish',
      estimate: null,
      confirmed: false,
      referenceCode: null,
      ...extra,
    });

  it('parses a valid state message', () => {
    const parsed = parseBuddyState(message());
    expect(parsed?.progress?.percent).toBe(40);
    expect(parsed?.language).toBe('hinglish');
    expect(parsed?.confirmed).toBe(false);
  });

  it('ignores non-buddy messages and invalid JSON', () => {
    expect(parseBuddyState('not json')).toBeNull();
    expect(parseBuddyState(JSON.stringify({ type: 'other' }))).toBeNull();
    expect(parseBuddyState(JSON.stringify(['array']))).toBeNull();
  });

  it('drops estimates with hostile numbers', () => {
    const hostile = message({
      estimate: {
        totalHoursMin: -5,
        totalHoursMax: 100,
        totalCostMin: 0,
        totalCostMax: 999999999999,
        durationWeeksMin: 1,
        durationWeeksMax: 2,
        weeklyCapacityHours: 40,
        confidence: 'medium',
      },
    });
    expect(parseBuddyState(hostile)?.estimate).toBeNull();
  });

  it('accepts a sane estimate and truncates lists', () => {
    const parsed = parseBuddyState(
      message({
        estimate: {
          totalHoursMin: 100,
          totalHoursMax: 160,
          totalCostMin: 1000,
          totalCostMax: 3200,
          durationWeeksMin: 3,
          durationWeeksMax: 4,
          weeklyCapacityHours: 40,
          confidence: 'medium',
          modules: [{ name: 'Core', hours_min: 10, hours_max: 20 }],
          teamRoles: Array.from({ length: 50 }, (_, i) => `Role ${i}`),
          assumptions: ['a'],
          exclusions: ['b'],
          risks: ['c'],
        },
      }),
    );
    expect(parsed?.estimate?.totalCostMax).toBe(3200);
    expect(parsed?.estimate?.teamRoles.length).toBeLessThanOrEqual(12);
    expect(parsed?.estimate?.status).toBe('preliminary');
  });

  it('only accepts well-formed SCS reference codes', () => {
    expect(parseBuddyState(message({ referenceCode: 'SCS-ABC23456' }))?.referenceCode).toBe('SCS-ABC23456');
    expect(parseBuddyState(message({ referenceCode: 'DROP TABLE' }))?.referenceCode).toBeNull();
    expect(parseBuddyState(message({ referenceCode: 'scs-lower123' }))?.referenceCode).toBeNull();
  });
});

describe('transcript merging', () => {
  const item = (id: string, text: string, final = false): TranscriptItem => ({ id, speaker: 'user', text, final });

  it('updates segments in place as they finalize', () => {
    let items = upsertTranscript([], item('a', 'hel'));
    items = upsertTranscript(items, item('a', 'hello', true));
    items = upsertTranscript(items, item('b', 'world'));
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('hello');
    expect(items[0].final).toBe(true);
  });

  it('caps the transcript length', () => {
    let items: TranscriptItem[] = [];
    for (let i = 0; i < 250; i++) items = upsertTranscript(items, item(`id-${i}`, `t${i}`), 200);
    expect(items).toHaveLength(200);
    expect(items[0].id).toBe('id-50');
  });
});
