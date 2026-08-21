// =============================================================================
// consultation-meeting — LiveKit token minting for AI consultation meetings.
//
// Mirror of livekit-token/token.ts (kept local so the function stays
// self-contained). Everything security-relevant — grants, TTL, room name,
// explicit agent dispatch — is decided server-side; nothing here reads request
// input. The browser can never choose the agent name, the room or any grant.
//
// The worker registers with the named agent (default "buddy-it-manager"),
// which puts LiveKit in EXPLICIT dispatch mode: the RoomConfiguration below is
// the only thing that creates a job, and it applies when the room is FIRST
// created — guaranteed because index.ts generates a fresh random room name
// for every join.
// =============================================================================

import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'npm:livekit-server-sdk@2';
import { TOKEN_TTL_SECONDS } from './validation.ts';

export interface MeetingGrant {
  room: string;
  roomJoin: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateOwnMetadata: boolean;
  roomAdmin: boolean;
  roomCreate: boolean;
  roomList: boolean;
  roomRecord: boolean;
}

/** Minimum grants for the meeting client: join ONE named room, publish mic +
 * optional camera, subscribe to Buddy, exchange data messages. No admin,
 * create, list or record permissions — and none of this is influenced by the
 * request body. */
export function buildMeetingGrant(roomName: string): MeetingGrant {
  return {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: false,
    roomAdmin: false,
    roomCreate: false,
    roomList: false,
    roomRecord: false,
  };
}

export interface MintMeetingTokenArgs {
  apiKey: string;
  apiSecret: string;
  /** Server-generated random room name (generateRoomName). */
  roomName: string;
  /** Server-generated random identity (generateParticipantIdentity). */
  identity: string;
  /** JSON participant metadata (mode + meeting id + language) for the worker. */
  metadata: string;
  /** Server-resolved dispatch target (resolveAgentName) — never client input. */
  agentName: string;
}

/** Mint the short-lived, minimal-grant participant token with explicit agent
 * dispatch attached. Never logged; the API secret never leaves this process. */
export async function mintMeetingToken(args: MintMeetingTokenArgs): Promise<string> {
  const at = new AccessToken(args.apiKey, args.apiSecret, {
    identity: args.identity,
    ttl: TOKEN_TTL_SECONDS,
    metadata: args.metadata,
  });
  at.addGrant(buildMeetingGrant(args.roomName));
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: args.agentName })],
  });
  return at.toJwt();
}
