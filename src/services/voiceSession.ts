// =============================================================================
// Buddy voice session — LiveKit transport layer.
//
// Thin wiring around livekit-client: fetch a short-lived participant token
// from the `livekit-token` Edge Function (Turnstile-gated; no LiveKit secret
// ever reaches the browser), connect, publish the mic, and surface
// transcripts / agent state / audio levels to the React hook.
//
// All parsing and validation logic lives in voiceSessionCore.ts (unit-tested).
// =============================================================================

import {
  ConnectionState,
  Room,
  RoomEvent,
  type Participant,
  type TranscriptionSegment,
} from 'livekit-client';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabaseClient';
import {
  mapTokenError,
  parseBuddyState,
  parseTokenResponse,
  type BuddyStateView,
  type TranscriptItem,
  type VoiceErrorCode,
  type VoiceSessionState,
  type VoiceTokenResponse,
} from '@/services/voiceSessionCore';

export class VoiceSessionError extends Error {
  constructor(
    public code: VoiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'VoiceSessionError';
  }
}

/** Request a participant token. Throws VoiceSessionError with a safe code. */
export async function requestVoiceToken(
  turnstileToken: string,
  preferredLanguage: string | null,
): Promise<VoiceTokenResponse> {
  if (!isSupabaseConfigured) throw new VoiceSessionError('voice_disabled', 'Voice is not configured.');
  const supabase = getSupabaseClient();
  if (!supabase) throw new VoiceSessionError('voice_disabled', 'Voice is not configured.');

  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: { turnstileToken, consent: true, ...(preferredLanguage ? { preferredLanguage } : {}) },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    let payload: { error?: string } | null = null;
    if (context && typeof context.json === 'function') {
      try {
        payload = await context.json();
      } catch {
        payload = null;
      }
    }
    throw new VoiceSessionError(
      mapTokenError(payload?.error, context?.status),
      'Could not start a voice session.',
    );
  }

  const parsed = parseTokenResponse(data);
  if (!parsed) throw new VoiceSessionError('connect_failed', 'Unexpected voice service response.');
  return parsed;
}

export interface VoiceSessionCallbacks {
  onState: (state: VoiceSessionState, error?: VoiceErrorCode) => void;
  onTranscript: (item: TranscriptItem) => void;
  onBuddyState: (state: BuddyStateView) => void;
  onAudioLevel: (level: number) => void;
}

const STATE_TOPIC = 'buddy.state';
const CHAT_TOPIC = 'lk.chat';

/** One live LiveKit room session. Create per conversation, then dispose. */
export class VoiceSession {
  private room: Room | null = null;
  private levelTimer: number | null = null;
  private muted = false;
  private decoder = new TextDecoder();

  constructor(private callbacks: VoiceSessionCallbacks) {}

  /** Ask for mic permission first so denial is caught before connecting. */
  async connect(tokenResponse: VoiceTokenResponse): Promise<void> {
    this.callbacks.onState('connecting');
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.callbacks.onState('error', 'mic_denied');
      throw new VoiceSessionError('mic_denied', 'Microphone access was denied.');
    }
    // Tracks are re-acquired by LiveKit; release the permission probe.
    micStream.getTracks().forEach((t) => t.stop());

    const room = new Room();
    this.room = room;

    room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant?: Participant) => {
      const isAgent = participant?.identity !== room.localParticipant.identity;
      for (const segment of segments) {
        this.callbacks.onTranscript({
          id: segment.id,
          speaker: isAgent ? 'buddy' : 'user',
          text: segment.text.slice(0, 2000),
          final: segment.final,
        });
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant, _kind, topic?: string) => {
      if (topic !== STATE_TOPIC) return;
      const parsed = parseBuddyState(this.decoder.decode(payload));
      if (parsed) this.callbacks.onBuddyState(parsed);
    });

    room.on(RoomEvent.Disconnected, () => {
      this.stopLevelPolling();
      this.callbacks.onState('completed');
    });
    room.on(RoomEvent.Reconnecting, () => this.callbacks.onState('connecting'));
    room.on(RoomEvent.Reconnected, () => this.callbacks.onState(this.muted ? 'paused' : 'listening'));

    // The agent publishes its state via participant attributes when speaking;
    // active-speaker events give us listening/speaking/thinking transitions.
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      if (this.muted) return;
      const agentSpeaking = speakers.some((s) => s.identity !== room.localParticipant.identity);
      const userSpeaking = speakers.some((s) => s.identity === room.localParticipant.identity);
      if (agentSpeaking) this.callbacks.onState('speaking');
      else if (userSpeaking) this.callbacks.onState('listening');
      else this.callbacks.onState('thinking');
    });

    try {
      await room.connect(tokenResponse.url, tokenResponse.token);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      this.callbacks.onState('error', 'connect_failed');
      await this.dispose();
      throw new VoiceSessionError('connect_failed', 'Could not connect to the voice service.');
    }

    this.startLevelPolling();
    this.callbacks.onState('listening');
  }

  private startLevelPolling(): void {
    this.stopLevelPolling();
    this.levelTimer = window.setInterval(() => {
      const room = this.room;
      if (!room || room.state !== ConnectionState.Connected) return;
      let level = room.localParticipant.audioLevel;
      room.remoteParticipants.forEach((p) => {
        level = Math.max(level, p.audioLevel);
      });
      this.callbacks.onAudioLevel(Math.min(1, Math.max(0, level)));
    }, 120);
  }

  private stopLevelPolling(): void {
    if (this.levelTimer !== null) {
      window.clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    await this.room?.localParticipant.setMicrophoneEnabled(!muted);
    this.callbacks.onState(muted ? 'paused' : 'listening');
  }

  /** Text-chat fallback: rides the agent framework's lk.chat text stream. */
  async sendText(text: string): Promise<void> {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed || !this.room) return;
    await this.room.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
  }

  async end(): Promise<void> {
    this.stopLevelPolling();
    await this.room?.disconnect();
    this.room = null;
    this.callbacks.onState('completed');
  }

  async dispose(): Promise<void> {
    this.stopLevelPolling();
    await this.room?.disconnect();
    this.room = null;
  }
}
