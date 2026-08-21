// =============================================================================
// livekit-token — token minting (shared code path).
//
// Kept separate from index.ts so vitest can exercise the EXACT minting logic
// the Edge Function runs (the npm: specifier is aliased to the plain package
// in vitest.config.ts). Everything security-relevant — grants, TTL, room
// name, agent dispatch — is decided server-side; nothing here reads request
// input.
//
// The worker registers with a named agent ("buddy-it-manager"), which puts
// LiveKit in EXPLICIT dispatch mode: it only creates a job when a room asks
// for that agent. The RoomConfiguration below is that ask. Room configuration
// applies when the room is FIRST created — guaranteed for every session,
// because index.ts always generates a fresh random room name.
// =============================================================================

import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'npm:livekit-server-sdk@2';
import { buildVisitorGrant, TOKEN_TTL_SECONDS } from './security.ts';

export interface MintVoiceTokenArgs {
  apiKey: string;
  apiSecret: string;
  /** Server-generated random room name (generateRoomName). */
  roomName: string;
  /** Server-generated random identity (generateParticipantIdentity). */
  identity: string;
  /** JSON participant metadata (session id + language hint) for the worker. */
  metadata: string;
  /** Server-resolved dispatch target (resolveAgentName) — never client input. */
  agentName: string;
}

/** Mint the short-lived, minimal-grant participant token with explicit
 * agent dispatch attached. The token is returned to the caller only — it is
 * never logged, and the API secret never leaves this process. */
export async function mintVoiceToken(args: MintVoiceTokenArgs): Promise<string> {
  const at = new AccessToken(args.apiKey, args.apiSecret, {
    identity: args.identity,
    ttl: TOKEN_TTL_SECONDS,
    metadata: args.metadata,
  });
  at.addGrant(buildVisitorGrant(args.roomName));
  // Explicit dispatch: without this, a named worker never receives a job.
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: args.agentName })],
  });
  return at.toJwt();
}
