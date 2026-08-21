// =============================================================================
// AI Consultation Meeting — LiveKit transport layer.
//
// Wraps livekit-client for the meeting room: microphone + optional camera,
// Buddy audio playback, chat over the lk.chat text stream, transcriptions,
// buddy.state data messages, active-speaker + connection-quality signals and
// reconnect handling. All parsing/state rules live in consultationCore.ts and
// voiceSessionCore.ts (unit-tested); this file is thin wiring.
//
// HARD RULE (mirrored from deriveBuddyActivity): before the agent participant
// joins, the UI only ever sees 'connecting'/'waiting' — local mic activity
// never fakes a live conversation.
// =============================================================================

import {
  ConnectionQuality as LkQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type TranscriptionSegment,
} from 'livekit-client';
import {
  deriveBuddyActivity,
  type BuddyActivity,
  type ChatMessage,
  type ConnectionQuality,
  type MeetingConnectionState,
  type MeetingJoinResponse,
} from '@/services/consultationCore';
import { parseBuddyState, type BuddyStateView } from '@/services/voiceSessionCore';

export interface MeetingSessionCallbacks {
  onConnection: (state: MeetingConnectionState, errorCode?: string) => void;
  onActivity: (activity: BuddyActivity) => void;
  onAgentPresent: (present: boolean) => void;
  onChat: (message: ChatMessage) => void;
  onBuddyState: (state: BuddyStateView) => void;
  onAudioLevel: (level: number) => void;
  onQuality: (quality: ConnectionQuality) => void;
  onLocalCamera: (stream: MediaStream | null) => void;
  onClientSpeaking: (speaking: boolean) => void;
  onBuddySpeaking: (speaking: boolean) => void;
}

const STATE_TOPIC = 'buddy.state';
const CHAT_TOPIC = 'lk.chat';

const mapQuality = (q: LkQuality): ConnectionQuality => {
  switch (q) {
    case LkQuality.Excellent:
      return 'excellent';
    case LkQuality.Good:
      return 'good';
    case LkQuality.Poor:
      return 'poor';
    case LkQuality.Lost:
      return 'lost';
    default:
      return 'unknown';
  }
};

/** One live consultation-meeting room. Create per join, then dispose. */
export class MeetingSession {
  private room: Room | null = null;
  private levelTimer: number | null = null;
  private decoder = new TextDecoder();
  private agentPresent = false;
  private micMuted = false;
  private agentSpeaking = false;
  private clientSpeaking = false;
  private audioElements = new Map<string, HTMLAudioElement>();
  private chatCounter = 0;

  constructor(private callbacks: MeetingSessionCallbacks) {}

  get isAgentPresent(): boolean {
    return this.agentPresent;
  }

  /** Ask for the mic first so denial is caught before connecting. */
  async connect(join: MeetingJoinResponse, options: { camera: boolean; micMuted: boolean }): Promise<void> {
    this.callbacks.onConnection('connecting');
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.callbacks.onConnection('error', 'mic_denied');
      throw new Error('mic_denied');
    }
    micStream.getTracks().forEach((t) => t.stop());

    const room = new Room();
    this.room = room;
    this.micMuted = options.micMuted;

    room.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant?: Participant) => {
      const isAgent = participant?.identity !== room.localParticipant.identity;
      for (const segment of segments) {
        this.callbacks.onChat({
          id: segment.id,
          sender: isAgent ? 'buddy' : 'client',
          text: segment.text.slice(0, 4000),
          at: Date.now(),
          final: segment.final,
          delivery: 'sent',
        });
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant, _kind, topic?: string) => {
      if (topic !== STATE_TOPIC) return;
      const parsed = parseBuddyState(this.decoder.decode(payload));
      if (parsed) this.callbacks.onBuddyState(parsed);
    });

    // Buddy's audio: explicitly attach subscribed audio tracks so playback
    // never depends on SDK auto-play behavior.
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach() as HTMLAudioElement;
        el.setAttribute('data-meeting-audio', 'true');
        el.style.display = 'none';
        document.body.appendChild(el);
        this.audioElements.set(track.sid ?? String(this.audioElements.size), el);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el.remove());
        if (track.sid) this.audioElements.delete(track.sid);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      this.stopLevelPolling();
      this.callbacks.onConnection('ended');
    });
    room.on(RoomEvent.Reconnecting, () => this.callbacks.onConnection('reconnecting'));
    room.on(RoomEvent.Reconnected, () => {
      this.callbacks.onConnection(this.agentPresent ? 'live' : 'connecting');
      this.emitActivity();
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      if (this.agentPresent) return;
      this.agentPresent = true;
      this.callbacks.onAgentPresent(true);
      this.callbacks.onConnection('live');
      this.emitActivity();
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (room.remoteParticipants.size === 0) {
        this.agentPresent = false;
        this.callbacks.onAgentPresent(false);
        this.callbacks.onConnection('connecting');
        this.emitActivity();
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      this.agentSpeaking = speakers.some((s) => s.identity !== room.localParticipant.identity);
      this.clientSpeaking = speakers.some((s) => s.identity === room.localParticipant.identity);
      this.callbacks.onBuddySpeaking(this.agentSpeaking && this.agentPresent);
      this.callbacks.onClientSpeaking(this.clientSpeaking);
      this.emitActivity();
    });

    room.on(RoomEvent.ConnectionQualityChanged, (quality: LkQuality, participant: Participant) => {
      if (participant.identity === room.localParticipant.identity) {
        this.callbacks.onQuality(mapQuality(quality));
      }
    });

    try {
      await room.connect(join.url, join.token);
      await room.localParticipant.setMicrophoneEnabled(!options.micMuted);
      if (options.camera) {
        await this.setCameraEnabled(true).catch(() => this.callbacks.onLocalCamera(null));
      }
    } catch {
      this.callbacks.onConnection('error', 'connect_failed');
      await this.dispose();
      throw new Error('connect_failed');
    }

    this.startLevelPolling();
    this.agentPresent = room.remoteParticipants.size > 0;
    this.callbacks.onAgentPresent(this.agentPresent);
    this.callbacks.onConnection(this.agentPresent ? 'live' : 'connecting');
    this.emitActivity();
  }

  private emitActivity(): void {
    this.callbacks.onActivity(
      deriveBuddyActivity({
        agentPresent: this.agentPresent,
        agentSpeaking: this.agentSpeaking,
        clientSpeaking: this.clientSpeaking && !this.micMuted,
      }),
    );
  }

  private startLevelPolling(): void {
    this.stopLevelPolling();
    this.levelTimer = window.setInterval(() => {
      const room = this.room;
      if (!room || room.state !== ConnectionState.Connected) return;
      let level = 0;
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

  async setMicEnabled(enabled: boolean): Promise<void> {
    this.micMuted = !enabled;
    await this.room?.localParticipant.setMicrophoneEnabled(enabled);
    this.emitActivity();
  }

  /** Enables/disables the local camera and hands the preview stream to the UI. */
  async setCameraEnabled(enabled: boolean): Promise<boolean> {
    const room = this.room;
    if (!room) return false;
    try {
      await room.localParticipant.setCameraEnabled(enabled);
    } catch {
      this.callbacks.onLocalCamera(null);
      return false;
    }
    if (!enabled) {
      this.callbacks.onLocalCamera(null);
      return true;
    }
    const publication = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    this.callbacks.onLocalCamera(mediaTrack ? new MediaStream([mediaTrack]) : null);
    return true;
  }

  /** Text chat: rides the agent framework's lk.chat text stream, with a local
   * echo carrying delivery state (pending → sent / error). */
  async sendChat(text: string): Promise<void> {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed || !this.room) return;
    this.chatCounter += 1;
    const id = `local-${this.chatCounter}-${Date.now()}`;
    const base: ChatMessage = { id, sender: 'client', text: trimmed, at: Date.now(), final: true, delivery: 'pending' };
    this.callbacks.onChat(base);
    try {
      await this.room.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
      this.callbacks.onChat({ ...base, delivery: 'sent' });
    } catch {
      this.callbacks.onChat({ ...base, delivery: 'error' });
    }
  }

  async end(): Promise<void> {
    this.stopLevelPolling();
    await this.room?.disconnect();
    this.cleanupAudio();
    this.room = null;
    this.callbacks.onConnection('ended');
  }

  async dispose(): Promise<void> {
    this.stopLevelPolling();
    await this.room?.disconnect();
    this.cleanupAudio();
    this.room = null;
  }

  private cleanupAudio(): void {
    this.audioElements.forEach((el) => el.remove());
    this.audioElements.clear();
    document.querySelectorAll('audio[data-meeting-audio="true"]').forEach((el) => el.remove());
  }
}
