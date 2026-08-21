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
// MICROPHONE — the rules this file exists to enforce:
//   * the meeting's audio track is created by LiveKit AFTER room.connect();
//     the lobby's device-test stream is temporary and is never reused (it has
//     already been stopped by DeviceCheckController by the time we get here);
//   * the device the client tested in the lobby is the device LiveKit captures
//     (`micDeviceId`), passed straight to the participant microphone API;
//   * publication is CONFIRMED against real LiveKit state (a live publication,
//     source microphone, kind audio, track not ended, mute flag as intended)
//     before the join is reported as connected;
//   * a microphone failure NEVER tears down the room. It raises the in-meeting
//     recovery UI and leaves text chat working — the old behaviour disposed the
//     room, which left LiveKit with a participant that published nothing;
//   * every mic operation is single-flight, so a double tap or a retry storm
//     can never publish two microphone tracks;
//   * device ids stay in memory. Diagnostics carry booleans and fixed enums
//     only (buildMicDiagnostic) — never labels, ids, tokens or audio.
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
  buildMicDiagnostic,
  deriveBuddyActivity,
  deriveJoinStage,
  deriveMicControlState,
  type BuddyActivity,
  type ChatMessage,
  type ConnectionQuality,
  type MeetingConnectionState,
  type MeetingJoinResponse,
  type MeetingJoinStage,
  type MicControlState,
  type MicPublicationStatus,
} from '@/services/consultationCore';
import {
  describeDevices,
  hasEnumerateSupport,
  type DeviceOption,
  type RawDeviceInfo,
} from '@/services/deviceCheck';
import { parseBuddyState, type BuddyStateView } from '@/services/voiceSessionCore';

export type { MicPublicationStatus } from '@/services/consultationCore';

/** Why the microphone is being (re)acquired. Diagnostics only. */
type MicReason = 'join' | 'unmute' | 'retry' | 'reconnect' | 'switch_device';

/** Non-identifying reasons the client must be told about before we fall back. */
export type MicNotice = 'device_changed' | 'no_device';

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
  /** What the microphone button must show, derived from the real publication. */
  onMicState: (state: MicControlState) => void;
  /** Staged join progress — 'connected' means voice really is two-way. */
  onJoinStage: (stage: MeetingJoinStage) => void;
  /** The client is told before any silent device fallback happens. */
  onMicNotice: (notice: MicNotice) => void;
}

export interface MeetingConnectOptions {
  camera: boolean;
  micMuted: boolean;
  /** Device id of the microphone the client tested in the lobby. */
  micDeviceId?: string | null;
}

export interface MeetingSessionOptions {
  /** How long to wait for LiveKit to confirm the publication. */
  publicationTimeoutMs?: number;
  /** Diagnostic sink. Receives allowlisted primitives only. */
  logger?: (payload: Record<string, string | boolean>) => void;
}

const STATE_TOPIC = 'buddy.state';
const CHAT_TOPIC = 'lk.chat';
const DEFAULT_PUBLICATION_TIMEOUT_MS = 4000;
const PUBLICATION_POLL_MS = 25;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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
  private agentSpeaking = false;
  private clientSpeaking = false;
  private audioElements = new Map<string, HTMLAudioElement>();
  private chatCounter = 0;
  /** In-flight or completed connect. Guarantees ONE room (and therefore one
   * agent dispatch) per session instance even if join is triggered twice —
   * a second room would make LiveKit dispatch a second consultation job. */
  private connecting: Promise<void> | null = null;
  private roomConnected = false;
  /** The lobby-tested input device. Memory only — never stored or logged. */
  private micDeviceId: string | null = null;
  /** The client's own mute decision. Distinct from "not published". */
  private micIntentMuted = false;
  private micPublication: MicPublicationStatus = 'unknown';
  /** Single-flight guard: one microphone operation at a time, ever. */
  private micOperation: Promise<MicPublicationStatus> | null = null;
  private restoringMic = false;
  /** True while we are deliberately tearing media down (leave / device change),
   * so our own teardown is never reported back as a lost microphone. */
  private releasingMic = false;
  private leaving = false;
  private micTrackEnded: (() => void) | null = null;
  private endedTrack: MediaStreamTrack | null = null;
  /** Input devices for the in-meeting picker. Memory only. */
  private microphones: DeviceOption[] = [];
  private readonly publicationTimeoutMs: number;
  private readonly logger: (payload: Record<string, string | boolean>) => void;

  constructor(
    private callbacks: MeetingSessionCallbacks,
    options: MeetingSessionOptions = {},
  ) {
    this.publicationTimeoutMs = options.publicationTimeoutMs ?? DEFAULT_PUBLICATION_TIMEOUT_MS;
    this.logger =
      options.logger ??
      ((payload) => {
        // Safe by construction: buildMicDiagnostic emits allowlisted primitives.
        console.info('[meeting:mic]', payload);
      });
  }

  get isAgentPresent(): boolean {
    return this.agentPresent;
  }

  get micPublicationStatus(): MicPublicationStatus {
    return this.micPublication;
  }

  /** Input devices seen at the last enumeration. Labels are display-only. */
  get microphoneOptions(): DeviceOption[] {
    return this.microphones;
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
    this.micDeviceId = options.micDeviceId ?? null;
    this.micIntentMuted = options.micMuted;
    this.roomConnected = false;
    this.leaving = false;
    this.micPublication = 'unknown';
    this.callbacks.onConnection('connecting');
    this.emitJoinStage();

    const room = new Room();
    this.room = room;

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
      if (this.releasingMic || this.leaving || this.micIntentMuted) return;
      if (this.micPublication !== 'published') return;
      this.detachMicTrackWatch();
      this.setMicPublication('lost');
      this.diagnose('mic_unpublished');
    });

    room.on(RoomEvent.Disconnected, () => {
      this.roomConnected = false;
      this.stopLevelPolling();
      this.detachMicTrackWatch();
      this.callbacks.onConnection('ended');
    });
    room.on(RoomEvent.Reconnecting, () => this.callbacks.onConnection('reconnecting'));
    room.on(RoomEvent.Reconnected, () => {
      this.roomConnected = true;
      this.callbacks.onConnection(this.agentPresent ? 'live' : 'connecting');
      this.emitActivity();
      // Same room, same Buddy, same job: only the publication may need work.
      void this.restoreMicrophoneAfterReconnect();
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      if (this.agentPresent) return;
      this.agentPresent = true;
      this.callbacks.onAgentPresent(true);
      this.callbacks.onConnection('live');
      this.emitActivity();
      this.emitJoinStage();
    });
    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (room.remoteParticipants.size === 0) {
        this.agentPresent = false;
        this.callbacks.onAgentPresent(false);
        this.callbacks.onConnection('connecting');
        this.emitActivity();
        this.emitJoinStage();
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

    // ---- room connection: the only failure that may end the join ----------
    try {
      await room.connect(join.url, join.token);
    } catch {
      this.callbacks.onConnection('error', 'connect_failed');
      await this.dispose();
      throw new Error('connect_failed');
    }
    this.roomConnected = true;
    this.emitJoinStage();
    this.diagnose('room_connected');

    // ---- microphone: a failure here keeps the meeting open ----------------
    // The client stays in THIS room (no second room, no second Buddy job) and
    // gets the recovery UI plus text chat instead of a dead-silent meeting.
    if (options.micMuted) {
      this.setMicPublication('unknown');
    } else {
      await this.acquireMicrophone('join');
    }

    if (options.camera) {
      await this.setCameraEnabled(true).catch(() => this.callbacks.onLocalCamera(null));
    }

    this.startLevelPolling();
    this.agentPresent = room.remoteParticipants.size > 0;
    this.callbacks.onAgentPresent(this.agentPresent);
    this.callbacks.onConnection(this.agentPresent ? 'live' : 'connecting');
    this.emitActivity();
    this.emitJoinStage();
  }

  // ---------------------------------------------------------------------------
  // Microphone
  // ---------------------------------------------------------------------------

  /**
   * Enables + publishes the microphone and CONFIRMS the result against real
   * LiveKit state. Single-flight: concurrent callers share one attempt, which
   * is what makes "never publish duplicate microphone tracks" true.
   */
  private acquireMicrophone(reason: MicReason): Promise<MicPublicationStatus> {
    if (this.micOperation) return this.micOperation;
    const attempt = this.runMicrophoneAcquisition(reason);
    this.micOperation = attempt;
    return attempt.finally(() => {
      if (this.micOperation === attempt) this.micOperation = null;
    });
  }

  private async runMicrophoneAcquisition(reason: MicReason): Promise<MicPublicationStatus> {
    const room = this.room;
    if (!room || !this.roomConnected) {
      this.diagnose(`mic_no_room_${reason}`);
      return this.setMicPublication('failed');
    }
    this.setMicPublication('publishing');

    // An input device must actually exist. Enumeration is feature-detected:
    // browsers that will not enumerate (Safari before permission) are simply
    // asked for the default device instead of being blocked.
    const device = await this.resolveInputDevice();
    if (device === 'none') {
      this.callbacks.onMicNotice('no_device');
      this.diagnose(`mic_no_device_${reason}`);
      return this.setMicPublication('failed');
    }
    // A silent switch to a different microphone is never acceptable: the
    // client hears about it before we fall back to the browser default.
    if (device === 'fallback') this.callbacks.onMicNotice('device_changed');

    let published: unknown;
    try {
      // The supported participant API: it unmutes an existing publication and
      // creates + publishes a fresh LiveKit track when there is none. The
      // lobby's temporary test track is never involved.
      published = await room.localParticipant.setMicrophoneEnabled(true, this.audioCaptureOptions());
    } catch {
      this.diagnose(`mic_enable_failed_${reason}`);
      return this.setMicPublication('failed');
    }

    // Publication is waited for and verified, never assumed.
    const publication = await this.awaitMicPublication(published);
    if (!publication) {
      this.diagnose(`mic_publication_missing_${reason}`);
      return this.setMicPublication('failed');
    }

    // Unmuted unless the client explicitly chose otherwise.
    if (publication.isMuted && !this.micIntentMuted) {
      try {
        await publication.unmute();
      } catch {
        // The verification below is what the client is actually told.
      }
    }

    const confirmed = this.livePublication();
    if (!confirmed) {
      this.diagnose(`mic_publication_lost_${reason}`);
      return this.setMicPublication('failed');
    }
    const mediaTrack = confirmed.track?.mediaStreamTrack;
    if (mediaTrack) this.watchMicTrack(mediaTrack);
    const status = this.setMicPublication('published');
    this.diagnose(`mic_published_${reason}`, confirmed);
    return status;
  }

  /**
   * Waits for LiveKit to confirm the publication. The enable call normally
   * resolves after publishing, so the common path costs nothing; the poll
   * covers the SDK's pending-publication path, which resolves with no
   * publication at all.
   */
  private async awaitMicPublication(returned: unknown): Promise<LocalTrackPublication | null> {
    const immediate = this.asLivePublication(returned) ?? this.livePublication();
    if (immediate) return immediate;
    const deadline = Date.now() + this.publicationTimeoutMs;
    while (Date.now() < deadline) {
      await delay(PUBLICATION_POLL_MS);
      const current = this.livePublication();
      if (current) return current;
    }
    return null;
  }

  /** The ACTUAL local microphone publication, or null if it is not usable. */
  private livePublication(): LocalTrackPublication | null {
    const room = this.room;
    if (!room) return null;
    return this.asLivePublication(room.localParticipant.getTrackPublication(Track.Source.Microphone));
  }

  /**
   * Verifies a candidate really is a live microphone publication: source
   * microphone, kind audio, a track present, and that track not ended.
   */
  private asLivePublication(candidate: unknown): LocalTrackPublication | null {
    if (!candidate || typeof candidate !== 'object') return null;
    const publication = candidate as LocalTrackPublication;
    if (publication.source !== Track.Source.Microphone) return null;
    if (publication.kind && publication.kind !== Track.Kind.Audio) return null;
    const mediaTrack = publication.track?.mediaStreamTrack;
    if (!publication.track || !mediaTrack) return null;
    if (mediaTrack.readyState === 'ended') return null;
    return publication;
  }

  /**
   * Confirms an input device exists and that the tested one is still present.
   * Also refreshes the in-meeting picker list (memory only).
   */
  private async resolveInputDevice(): Promise<'ok' | 'fallback' | 'none'> {
    const mediaDevices = navigator?.mediaDevices;
    if (!hasEnumerateSupport(navigator) || !mediaDevices?.enumerateDevices) return 'ok';
    let raw: RawDeviceInfo[];
    try {
      raw = (await mediaDevices.enumerateDevices()) as unknown as RawDeviceInfo[];
    } catch {
      return 'ok'; // enumeration is a nicety; LiveKit may still succeed
    }
    const list = Array.isArray(raw) ? raw : [];
    this.microphones = describeDevices(list, 'audioinput', (index) => `Microphone ${index}`);
    if (!list.some((device) => device.kind === 'audioinput')) return 'none';
    // Ids are hidden until permission is granted, so an empty picker list is
    // not evidence that the tested device is gone.
    if (!this.micDeviceId || this.microphones.length === 0) return 'ok';
    if (this.microphones.some((option) => option.deviceId === this.micDeviceId)) return 'ok';
    this.micDeviceId = null;
    return 'fallback';
  }

  /** AudioCaptureOptions pinned to the lobby-tested input device. */
  private audioCaptureOptions(): { deviceId?: string; echoCancellation: boolean; noiseSuppression: boolean } {
    return {
      ...(this.micDeviceId ? { deviceId: this.micDeviceId } : {}),
      echoCancellation: true,
      noiseSuppression: true,
    };
  }

  /** A device unplugged mid-meeting ends the track without a room event. */
  private watchMicTrack(mediaTrack: MediaStreamTrack): void {
    this.detachMicTrackWatch();
    const listener = () => {
      if (this.releasingMic || this.leaving) return;
      if (this.micPublication !== 'published') return;
      this.setMicPublication('lost');
      this.diagnose('mic_track_ended');
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

  private setMicPublication(status: MicPublicationStatus): MicPublicationStatus {
    this.micPublication = status;
    this.callbacks.onMicPublication(status);
    this.emitMicState();
    this.emitJoinStage();
    return status;
  }

  /** LiveKit's own mute flag — the button must never claim more than this. */
  private isPublicationMuted(): boolean {
    const room = this.room;
    const publication = room?.localParticipant.getTrackPublication(Track.Source.Microphone) as
      | LocalTrackPublication
      | undefined;
    if (!publication?.track) return this.micIntentMuted;
    return typeof publication.isMuted === 'boolean' ? publication.isMuted : this.micIntentMuted;
  }

  private emitMicState(): void {
    this.callbacks.onMicState(
      deriveMicControlState({ publication: this.micPublication, muted: this.isPublicationMuted() }),
    );
  }

  private emitJoinStage(): void {
    this.callbacks.onJoinStage(
      deriveJoinStage({
        roomConnected: this.roomConnected,
        localParticipant: Boolean(this.room?.localParticipant),
        micPublication: this.micPublication,
        micIntentMuted: this.micIntentMuted,
        agentPresent: this.agentPresent,
      }),
    );
  }

  private diagnose(event: string, publication?: LocalTrackPublication | null): void {
    const mediaTrack = publication?.track?.mediaStreamTrack;
    this.logger(
      buildMicDiagnostic({
        event,
        roomConnected: this.roomConnected,
        publication: this.micPublication,
        trackSource: publication?.source ?? null,
        trackKind: publication?.kind ?? null,
        muted: publication ? Boolean(publication.isMuted) : null,
        ended: mediaTrack ? mediaTrack.readyState === 'ended' : null,
        publicationSid: publication?.trackSid ?? null,
      }),
    );
  }

  /**
   * Mute/unmute the REAL publication.
   *   * unmute — unmutes the existing publication, or recreates and publishes
   *     one when it is gone (single-flight, so never a duplicate);
   *   * mute   — mutes the track and keeps it published. It is only stopped
   *     when leaving or changing devices.
   */
  async setMicEnabled(enabled: boolean): Promise<MicPublicationStatus> {
    this.micIntentMuted = !enabled;
    const room = this.room;
    if (!room) {
      this.emitMicState();
      this.emitJoinStage();
      return this.micPublication;
    }
    if (enabled) {
      const status = await this.acquireMicrophone('unmute');
      this.emitActivity();
      return status;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(false, this.audioCaptureOptions());
    } catch {
      // Verified below — the client's own mute is never a publication failure.
    }
    const status = this.setMicPublication(this.livePublication() ? 'published' : 'unknown');
    this.diagnose('mic_muted', this.livePublication());
    this.emitActivity();
    return status;
  }

  /**
   * In-meeting recovery: republishes the microphone in the SAME room (no new
   * room, no second Buddy dispatch) and reports whether a live track really
   * exists afterwards. Never ends the meeting, never touches text chat.
   */
  async retryMicrophone(): Promise<MicPublicationStatus> {
    const room = this.room;
    if (!room) {
      this.diagnose('mic_retry_no_room');
      return this.setMicPublication('failed');
    }
    this.micIntentMuted = false;
    this.detachMicTrackWatch();
    // Only a dead publication is dropped: a healthy one is reused, so a
    // repeated retry cannot stack up microphone tracks.
    await this.dropMicPublication(false);
    return this.acquireMicrophone('retry');
  }

  /**
   * "Choose another microphone". Switches the live capture device when there is
   * one (the supported LiveKit device API), otherwise publishes a fresh track
   * from the newly chosen device. Ids stay in memory.
   */
  async switchMicrophone(deviceId: string | null): Promise<MicPublicationStatus> {
    this.micDeviceId = deviceId;
    this.micIntentMuted = false;
    const room = this.room;
    if (!room) {
      this.diagnose('mic_switch_no_room');
      return this.setMicPublication('failed');
    }
    if (deviceId && this.livePublication() && typeof room.switchActiveDevice === 'function') {
      this.releasingMic = true;
      try {
        const switched = await room.switchActiveDevice('audioinput', deviceId, true);
        if (switched) {
          const publication = this.livePublication();
          const mediaTrack = publication?.track?.mediaStreamTrack;
          if (publication && mediaTrack) {
            this.watchMicTrack(mediaTrack);
            const status = this.setMicPublication('published');
            this.diagnose('mic_device_switched', publication);
            return status;
          }
        }
      } catch {
        // Fall through to a clean republish on the newly chosen device.
      } finally {
        this.releasingMic = false;
      }
    }
    this.detachMicTrackWatch();
    // Changing device is one of the two cases where stopping the track is right.
    await this.dropMicPublication(true);
    return this.acquireMicrophone('switch_device');
  }

  /** Refreshes the in-meeting device picker. Labels are display-only. */
  async refreshMicrophones(): Promise<DeviceOption[]> {
    await this.resolveInputDevice();
    return this.microphones;
  }

  /**
   * Drops the microphone publication we own. `force` also drops a healthy one
   * (device change); without it a healthy publication is always kept, so retry
   * never duplicates or interrupts working audio.
   */
  private async dropMicPublication(force: boolean): Promise<void> {
    const room = this.room;
    if (!room) return;
    const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone) as
      | LocalTrackPublication
      | undefined;
    if (!publication) return;
    if (!force && this.asLivePublication(publication)) return;
    this.releasingMic = true;
    try {
      if (publication.track && typeof room.localParticipant.unpublishTrack === 'function') {
        // We only ever stop tracks LiveKit created for THIS meeting.
        await room.localParticipant.unpublishTrack(publication.track, true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch {
      // A publication that will not drop is reported by the verification pass.
    } finally {
      this.releasingMic = false;
    }
  }

  /**
   * After a LiveKit reconnect: LiveKit republishes local tracks itself, so we
   * verify first and republish AT MOST ONCE if it did not. No new room, no
   * second agent job, no repeated greeting.
   */
  private async restoreMicrophoneAfterReconnect(): Promise<void> {
    if (this.leaving || this.micIntentMuted || this.restoringMic) return;
    if (this.micPublication === 'unknown') return; // never published; nothing to restore
    this.restoringMic = true;
    try {
      if (this.livePublication()) {
        const publication = this.livePublication();
        const mediaTrack = publication?.track?.mediaStreamTrack;
        if (mediaTrack) this.watchMicTrack(mediaTrack);
        this.setMicPublication('published');
        this.diagnose('mic_reconnect_intact', publication);
        return;
      }
      await this.acquireMicrophone('reconnect');
    } finally {
      this.restoringMic = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Activity, levels, camera, chat
  // ---------------------------------------------------------------------------

  private emitActivity(): void {
    this.callbacks.onActivity(
      deriveBuddyActivity({
        agentPresent: this.agentPresent,
        agentSpeaking: this.agentSpeaking,
        // Only a really-published, unmuted microphone may drive "listening".
        clientSpeaking: this.clientSpeaking && this.micPublication === 'published' && !this.micIntentMuted,
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
   * echo carrying delivery state (pending → sent / error). Always available,
   * whatever the microphone is doing. */
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

  // ---------------------------------------------------------------------------
  // Teardown — only ever touches media this session created
  // ---------------------------------------------------------------------------

  async end(): Promise<void> {
    await this.teardown();
    this.callbacks.onConnection('ended');
  }

  async dispose(): Promise<void> {
    await this.teardown();
  }

  private async teardown(): Promise<void> {
    this.leaving = true;
    this.connecting = null;
    this.stopLevelPolling();
    this.detachMicTrackWatch();
    // Leaving unpublishes the microphone; that is not a device failure.
    this.micPublication = 'unknown';
    this.roomConnected = false;
    const room = this.room;
    if (room) {
      // Unpublish + stop the meeting's own microphone track. The lobby's test
      // media is owned by DeviceCheckController and is never touched here.
      await this.dropMicPublication(true);
      try {
        room.unregisterTextStreamHandler?.(CHAT_TOPIC);
      } catch {
        // never registered, or already gone
      }
      try {
        await room.disconnect();
      } catch {
        // disconnecting a dead room is fine
      }
      room.removeAllListeners?.();
    }
    this.cleanupAudio();
    this.room = null;
    this.micOperation = null;
    this.restoringMic = false;
  }

  private cleanupAudio(): void {
    this.audioElements.forEach((el) => el.remove());
    this.audioElements.clear();
    document.querySelectorAll('audio[data-meeting-audio="true"]').forEach((el) => el.remove());
  }
}
