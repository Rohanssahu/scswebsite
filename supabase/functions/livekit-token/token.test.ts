import { TokenVerifier } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_NAME, resolveAgentName, TOKEN_TTL_SECONDS } from './security';
import { mintVoiceToken } from './token';

// Test-only credentials — never real values.
const API_KEY = 'APItestkey000000';
const API_SECRET = 'testsecret-testsecret-testsecret-0000';

const mint = (overrides: Partial<Parameters<typeof mintVoiceToken>[0]> = {}) =>
  mintVoiceToken({
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    roomName: 'buddy-abc123xyz456pq',
    identity: 'visitor-abc123xyz456',
    metadata: JSON.stringify({ sessionId: '3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60', preferredLanguage: null }),
    agentName: DEFAULT_AGENT_NAME,
    ...overrides,
  });

/** Decode the (already signature-verified elsewhere) payload for raw claims. */
function decodePayload(jwt: string): Record<string, unknown> {
  const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

describe('voice token minting (explicit agent dispatch)', () => {
  it('embeds an explicit dispatch for buddy-it-manager in the verified claims', async () => {
    const jwt = await mint();
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(jwt);
    const roomConfig = claims.roomConfig as unknown as { agents?: Array<{ agentName?: string }> };
    expect(roomConfig).toBeDefined();
    expect(roomConfig.agents).toHaveLength(1);
    expect(roomConfig.agents?.[0]?.agentName).toBe('buddy-it-manager');
  });

  it('keeps the minimal participant grants unchanged', async () => {
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(await mint());
    const video = claims.video as Record<string, unknown>;
    expect(video.room).toBe('buddy-abc123xyz456pq');
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

  it('keeps the short expiry unchanged', async () => {
    const payload = decodePayload(await mint());
    const exp = payload.exp as number;
    const nbf = payload.nbf as number;
    expect(exp - nbf).toBeLessThanOrEqual(TOKEN_TTL_SECONDS);
    expect(exp - nbf).toBeGreaterThan(0);
  });

  it('carries identity and session metadata, and never the API secret', async () => {
    const jwt = await mint();
    const payload = decodePayload(jwt);
    expect(payload.sub).toBe('visitor-abc123xyz456');
    expect(String(payload.metadata)).toContain('3f6c2f5e-8a3d-4f9a-9a3f-1b2c3d4e5f60');
    expect(jwt).not.toContain(API_SECRET);
    expect(JSON.stringify(payload)).not.toContain(API_SECRET);
  });

  it('dispatches whatever server-resolved name it is given (env-controlled only)', async () => {
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(
      await mint({ agentName: resolveAgentName('custom-buddy_2') }),
    );
    const roomConfig = claims.roomConfig as unknown as { agents?: Array<{ agentName?: string }> };
    expect(roomConfig.agents?.[0]?.agentName).toBe('custom-buddy_2');
  });
});
