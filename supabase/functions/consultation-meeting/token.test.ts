import { TokenVerifier } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_NAME, resolveAgentName, TOKEN_TTL_SECONDS } from './validation';
import { buildMeetingGrant, mintMeetingToken } from './token';

// Test-only credentials — never real values.
const API_KEY = 'APItestkey000000';
const API_SECRET = 'testsecret-testsecret-testsecret-0000';
const MEETING_ID = '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60';

const mint = (overrides: Partial<Parameters<typeof mintMeetingToken>[0]> = {}) =>
  mintMeetingToken({
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    roomName: 'scsm-abc123xyz456pqrs',
    identity: 'client-abc123xyz456',
    metadata: JSON.stringify({ mode: 'consultation', meetingId: MEETING_ID, preferredLanguage: 'en' }),
    agentName: DEFAULT_AGENT_NAME,
    ...overrides,
  });

function decodePayload(jwt: string): Record<string, unknown> {
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

describe('consultation token minting (explicit agent dispatch)', () => {
  it('embeds an explicit dispatch for buddy-it-manager in the verified claims', async () => {
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(await mint());
    const roomConfig = claims.roomConfig as unknown as { agents?: Array<{ agentName?: string }> };
    expect(roomConfig).toBeDefined();
    expect(roomConfig.agents).toHaveLength(1);
    expect(roomConfig.agents?.[0]?.agentName).toBe('buddy-it-manager');
  });

  it('grants only what a meeting participant needs', async () => {
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(await mint());
    const video = claims.video as Record<string, unknown>;
    expect(video.room).toBe('scsm-abc123xyz456pqrs');
    expect(video.roomJoin).toBe(true);
    expect(video.canPublish).toBe(true);
    expect(video.canSubscribe).toBe(true);
    expect(video.canPublishData).toBe(true);
    expect(video.canUpdateOwnMetadata).toBe(false);
    expect(video.roomAdmin).toBe(false);
    expect(video.roomCreate).toBe(false);
    expect(video.roomList).toBe(false);
    expect(video.roomRecord).toBe(false);
  });

  it('never grants recording permission (no raw audio capture)', () => {
    expect(buildMeetingGrant('scsm-room').roomRecord).toBe(false);
  });

  it('scopes the grant to exactly one room', () => {
    expect(buildMeetingGrant('scsm-one').room).toBe('scsm-one');
    expect(buildMeetingGrant('scsm-two').room).toBe('scsm-two');
  });

  it('keeps the short token expiry', async () => {
    const payload = decodePayload(await mint());
    const exp = payload.exp as number;
    const nbf = payload.nbf as number;
    expect(exp - nbf).toBeLessThanOrEqual(TOKEN_TTL_SECONDS);
    expect(exp - nbf).toBeGreaterThan(0);
  });

  it('carries the consultation mode + meeting id metadata the worker needs', async () => {
    const payload = decodePayload(await mint());
    expect(payload.sub).toBe('client-abc123xyz456');
    const metadata = JSON.parse(String(payload.metadata)) as Record<string, unknown>;
    expect(metadata.mode).toBe('consultation');
    expect(metadata.meetingId).toBe(MEETING_ID);
  });

  it('never leaks the API secret into the token or payload', async () => {
    const jwt = await mint();
    expect(jwt).not.toContain(API_SECRET);
    expect(JSON.stringify(decodePayload(jwt))).not.toContain(API_SECRET);
  });

  it('dispatches only a server-resolved name (env-controlled)', async () => {
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(
      await mint({ agentName: resolveAgentName('custom-buddy_2') }),
    );
    const roomConfig = claims.roomConfig as unknown as { agents?: Array<{ agentName?: string }> };
    expect(roomConfig.agents?.[0]?.agentName).toBe('custom-buddy_2');
    // An unsafe value can never reach the token — it collapses to the default.
    const fallback = await new TokenVerifier(API_KEY, API_SECRET).verify(
      await mint({ agentName: resolveAgentName('evil agent; drop') }),
    );
    const fallbackConfig = fallback.roomConfig as unknown as { agents?: Array<{ agentName?: string }> };
    expect(fallbackConfig.agents?.[0]?.agentName).toBe('buddy-it-manager');
  });
});
