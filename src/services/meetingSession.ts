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
//
// MICROPHONE: the device the client tested in the lobby is the device LiveKit
// captures (`micDeviceId`), and publication is verified rather than assumed —
// a missing or ended local audio track raises the in-meeting recovery banner
// instead of silently leaving the client unheard. Device ids stay in memory.
// =============================================================================

import {
  ConnectionQuality as LkQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
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
  /** Real state of the local microphone publication (never assumed). */
  onMicPublication: (status: MicPublicationStatus) => void;
}

/**
 * 'unknown'    — not applicable yet (not connected, or joined muted by choice)
 * 'published'  — a live local audio track exists on the room
 * 'failed'     — enabling/publishing the microphone did not produce a track
 * 'lost'       — it was published, then the device or track went away
 */
export type MicPublicationStatus = 'unknown' | 'published' | 'failed' | 'lost';

export interface MeetingConnectOptions {
  camera: boolean;
  micMuted: boolean;
  /** Device id of the microphone the client tested in the lobby. */
  micDeviceId?: string | null;
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
  /** In-flight or completed connect. Guarantees ONE room (and therefore one
   * agent dispatch) per session instance even if join is triggered twice —
   * a second room would make LiveKit dispatch a second consultation job. */
  private connecting: Promise<void> | null = null;
  /** The lobby-tested input device. Memory only — never stored or logged. */
  private micDeviceId: string | null = null;
  private micPublication: MicPublicationStatus = 'unknown';
  private micTrackEnded: (() => void) | null = null;
  private endedTrack: MediaStreamTrack | null = null;

  constructor(private callbacks: MeetingSessionCallbacks) {}

  get isAgentPresent(): boolean {
    return this.agentPresent;
  }

  /**
   * Connects once. Concurrent or repeated calls join the first attempt instead
   * of opening a second room; call `dispose()`/`end()` before reconnecting.
   */
  async connect(join: MeetingJoinResponse, options: MeetingConnectOptions): Promise<void> {
    if (this.connecting) return this.connecting;
    const attempt = this.connectOnce(join, options);
    this.connecting = attempt;
    try {
      await attempt;
    } catch (error) {
      // A failed attempt must not latch — the lobby offers a retry.
      this.connecting = null;
      throw error;
    }
  }

  private async connectOnce(join: MeetingJoinResponse, options: MeetingConnectOptions): Promise<void> {
    this.callbacks.onConnection('connecting');
    this.micDeviceId = options.micDeviceId ?? null;
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

    // Buddy's written notes: detailed lists (scope, features, milestones) that
    // he deliberately does NOT read aloud arrive as lk.chat text streams and
    // render in the same chat panel. His SPOKEN words come via
    // TranscriptionReceived (topic lk.transcription), so these never duplicate.
    try {
      room.registerTextStreamHandler(CHAT_TOPIC, (reader, participantInfo) => {
        if (participantInfo?.identity === room.localParticipant.identity) return;
        void reader
          .readAll()
          .then((text) => {
            const trimmed = text.trim().slice(0, 4000);
            if (!trimmed) return;
            this.callbacks.onChat({
              id: `note-${reader.info.id}`,
              sender: 'buddy',
              text: trimmed,
              at: Date.now(),
              final: true,
              delivery: 'sent',
            });
          })
          .catch(() => undefined);
      });
    } catch {
      // A handler for this topic is already registered on this room — the
      // existing one keeps working; notes are additive, never load-bearing.
    }

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

    // The local microphone going away mid-meeting must be surfaced at once —
    // and must never end the meeting on its own.
    room.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
      if (publication?.source !== Track.Source.Microphone) return;
      if (this.micPublication === 'published' && !this.micMuted) {
        this.detachMicTrackWatch();
        this.setMicPublication('lost');
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      this.stopLevelPolling();
      this.detachMicTrackWatch();
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
      // Reuse the exact microphone the client tested in the lobby.
      await room.localParticipant.setMicrophoneEnabled(!options.micMuted, this.audioCaptureOptions());
      if (options.camera) {
        await this.setCameraEnabled(true).catch(() => this.callbacks.onLocalCamera(null));
      }
    } catch {
      this.callbacks.onConnection('error', 'connect_failed');
      await this.dispose();
      throw new Error('connect_failed');
    }

    // Publication is checked, not assumed: joining without a live audio track
    // is exactly the case the in-meeting recovery banner exists for.
    this.setMicPublication(options.micMuted ? 'unknown' : this.inspectMicPublication());

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

  /** AudioCaptureOptions pinned to the lobby-tested input device. */
  private audioCaptureOptions(): { deviceId?: string; echoCancellation: boolean; noiseSuppression: boolean } {
    return {
      ...(this.micDeviceId ? { deviceId: this.micDeviceId } : {}),
      echoCancellation: true,
      noiseSuppression: true,
    };
  }

  /** Reads the ACTUAL local microphone publication off the room. */
  private inspectMicPublication(): MicPublicationStatus {
    const room = this.room;
    if (!room) return 'failed';
    const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    if (!publication || !publication.track || !mediaTrack) return 'failed';
    if (mediaTrack.readyState === 'ended') return 'failed';
    this.watchMicTrack(mediaTrack);
    return 'published';
  }

  /** A device unplugged mid-meeting ends the track without a room event. */
  private watchMicTrack(mediaTrack: MediaStreamTrack): void {
    this.detachMicTrackWatch();
    const listener = () => {
      if (this.micPublication !== 'published') return;
      this.setMicPublication('lost');
    };
    this.micTrackEnded = listener;
    this.endedTrack = mediaTrack;
    mediaTrack.addEventListener?.('ended', listener);
  }

  private detachMicTrackWatch(): void {
    if (this.endedTrack && this.micTrackEnded) {
      this.endedTrack.removeEventListener?.('ended', this.micTrackEnded);
    }
    this.endedTrack = null;
    this.micTrackEnded = null;
  }

  private setMicPublication(status: MicPublicationStatus): void {
    this.micPublication = status;
    this.callbacks.onMicPublication(status);
  }

  get micPublicationStatus(): MicPublicationStatus {
    return this.micPublication;
  }

  async setMicEnabled(enabled: boolean): Promise<void> {
    this.micMuted = !enabled;
    await this.room?.localParticipant.setMicrophoneEnabled(enabled, this.audioCaptureOptions());
    // Muting is the client's own choice, so it is never a publication failure.
    this.setMicPublication(enabled ? this.inspectMicPublication() : 'unknown');
    this.emitActivity();
  }

  /**
   * In-meeting recovery: republishes the microphone (same tested device) and
   * reports whether a live track actually exists afterwards. Never ends the
   * meeting, and never touches text chat.
   */
  async retryMicrophone(): Promise<MicPublicationStatus> {
    const room = this.room;
    if (!room) {
      this.setMicPublication('failed');
      return 'failed';
    }
    this.detachMicTrackWatch();
    // Muted while we deliberately unpublish, so our own teardown is not
    // reported back to the client as the microphone being lost.
    this.micMuted = true;
    try {
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(true, this.audioCaptureOptions());
    } catch {
      this.setMicPublication('failed');
      return 'failed';
    }
    this.micMuted = false;
    const status = this.inspectMicPublication();
    this.setMicPublication(status);
    this.emitActivity();
    return status;
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
    this.connecting = null;
    this.stopLevelPolling();
    this.detachMicTrackWatch();
    // Leaving unpublishes the microphone; that is not a device failure.
    this.micPublication = 'unknown';
    await this.room?.disconnect();
    this.cleanupAudio();
    this.room = null;
    this.callbacks.onConnection('ended');
  }

  async dispose(): Promise<void> {
    this.connecting = null;
    this.stopLevelPolling();
    this.detachMicTrackWatch();
    this.micPublication = 'unknown';
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
