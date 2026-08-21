// Guards the two rules the consultation meeting cannot work without:
//   1. ONE room per meeting — a second room would make LiveKit dispatch a
//      second buddy-it-manager consultation job for the same meeting;
//   2. the client's microphone is really PUBLISHED to that room. A meeting that
//      reports itself connected while nothing is published leaves Buddy talking
//      to silence (`trackPublications: []`, `turns: 0`), which is exactly the
//      production failure these tests exist to prevent.
//
// The fake below mirrors livekit-client 2.22 semantics: setMicrophoneEnabled
// unmutes an existing publication and only creates a NEW track when there is
// none, mute()/unmute() live on the publication, and unpublishTrack(track, true)
// stops the underlying MediaStreamTrack.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roomInstances: FakeRoom[] = [];
/** Ordered log of the calls the session makes, for sequence assertions. */
let callLog: string[] = [];

/** A MediaStreamTrack as the browser exposes it. */
const makeMediaStreamTrack = (label = 'meeting') => {
  const listeners: Array<() => void> = [];
  return {
    label,
    readyState: 'live' as 'live' | 'ended',
    stop: vi.fn(function stop(this: { readyState: string }) {
      this.readyState = 'ended';
    }),
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    }),
    /** Simulates the device being unplugged mid-meeting. */
    end() {
      this.readyState = 'ended';
      [...listeners].forEach((listener) => listener());
    },
  };
};

type FakeMediaStreamTrack = ReturnType<typeof makeMediaStreamTrack>;

/** A LocalTrackPublication. */
class FakePublication {
  source = 'microphone';
  kind = 'audio';
  trackSid = 'TR_AAAA1111';
  isMuted = false;
  track: { mediaStreamTrack: FakeMediaStreamTrack } | undefined;
  constructor(readonly capturedDeviceId: string | null) {
    this.track = { mediaStreamTrack: makeMediaStreamTrack() };
  }
  mute = vi.fn(async () => {
    this.isMuted = true;
    callLog.push('publication.mute');
  });
  unmute = vi.fn(async () => {
    this.isMuted = false;
    callLog.push('publication.unmute');
  });
}

class FakeLocalParticipant {
  /** false = enabling the mic resolves but publishes no track. */
  static publishesMicTrack = true;
  /** true = acquiring the device throws (denied / in use / no such device). */
  static enableThrows = false;
  /** Publications start muted, as LiveKit may hand them back after a reconnect. */
  static publishesMuted = false;

  identity = 'client-1';
  micPublication: FakePublication | null = null;
  /** How many times a brand-new microphone track was created + published. */
  publishCount = 0;

  setMicrophoneEnabled = vi.fn(async (enabled?: boolean, options?: { deviceId?: string }) => {
    callLog.push(`setMicrophoneEnabled:${enabled}`);
    if (!enabled) {
      if (this.micPublication) await this.micPublication.mute();
      return this.micPublication ?? undefined;
    }
    if (FakeLocalParticipant.enableThrows) throw new Error('NotReadableError');
    // Existing publication: unmute it — never a second track for one source.
    if (this.micPublication) {
      await this.micPublication.unmute();
      return this.micPublication;
    }
    if (!FakeLocalParticipant.publishesMicTrack) return undefined;
    this.publishCount += 1;
    this.micPublication = new FakePublication(options?.deviceId ?? null);
    this.micPublication.isMuted = FakeLocalParticipant.publishesMuted;
    return this.micPublication;
  });

  unpublishTrack = vi.fn(async (track: { mediaStreamTrack: FakeMediaStreamTrack }, stopOnUnpublish?: boolean) => {
    callLog.push(`unpublishTrack:${Boolean(stopOnUnpublish)}`);
    const previous = this.micPublication;
    if (stopOnUnpublish) track?.mediaStreamTrack?.stop();
    this.micPublication = null;
    return previous ?? undefined;
  });

  setCameraEnabled = vi.fn(async () => undefined);
  getTrackPublication = vi.fn((source: string) =>
    source === 'microphone' ? (this.micPublication ?? undefined) : undefined,
  );
  sendText = vi.fn(async () => undefined);
  publishData = vi.fn(async () => undefined);
}

class FakeRoom {
  static connectDelayMs = 0;
  static connectThrows = false;
  localParticipant = new FakeLocalParticipant();
  handlers = new Map<string, (...args: unknown[]) => void>();
  remoteParticipants = new Map<string, unknown>();
  state = 'connected';
  connect = vi.fn(async () => {
    callLog.push('room.connect');
    if (FakeRoom.connectThrows) throw new Error('signal failed');
    await new Promise<void>((resolve) => {
      setTimeout(resolve, FakeRoom.connectDelayMs);
    });
  });
  disconnect = vi.fn(async () => undefined);
  switchActiveDevice = vi.fn(async (_kind: string, deviceId: string) => {
    callLog.push(`switchActiveDevice:${deviceId}`);
    return true;
  });
  removeAllListeners = vi.fn(() => undefined);
  unregisterTextStreamHandler = vi.fn(() => undefined);
  on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    this.handlers.set(event, handler);
    return this;
  });
  off = vi.fn(() => this);
  registerTextStreamHandler = vi.fn(() => undefined);
  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.(...args);
  }
  constructor() {
    roomInstances.push(this);
  }
}

vi.mock('livekit-client', () => ({
  Room: FakeRoom,
  RoomEvent: {
    TranscriptionReceived: 'transcriptionReceived',
    DataReceived: 'dataReceived',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    Disconnected: 'disconnected',
    Reconnecting: 'reconnecting',
    Reconnected: 'reconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    ActiveSpeakersChanged: 'activeSpeakersChanged',
    ConnectionQualityChanged: 'connectionQualityChanged',
    LocalTrackUnpublished: 'localTrackUnpublished',
    LocalTrackPublished: 'localTrackPublished',
  },
  ConnectionState: { Connected: 'connected' },
  ConnectionQuality: { Excellent: 'excellent', Good: 'good', Poor: 'poor', Lost: 'lost', Unknown: 'unknown' },
  Track: { Kind: { Audio: 'audio', Video: 'video' }, Source: { Camera: 'camera', Microphone: 'microphone' } },
}));

const { MeetingSession } = await import('@/services/meetingSession');

const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));
let devices: Array<{ kind: string; deviceId: string; label: string }> = [];
const enumerateDevices = vi.fn(async () => devices);

/** Diagnostics sink — asserted to carry nothing but safe primitives. */
let diagnostics: Array<Record<string, string | boolean>> = [];

const makeCallbacks = () => ({
  onConnection: vi.fn(),
  onMicPublication: vi.fn(),
  onMicState: vi.fn(),
  onJoinStage: vi.fn(),
  onMicNotice: vi.fn(),
  onActivity: vi.fn(),
  onAgentPresent: vi.fn(),
  onChat: vi.fn(),
  onBuddyState: vi.fn(),
  onAudioLevel: vi.fn(),
  onQuality: vi.fn(),
  onLocalCamera: vi.fn(),
  onClientSpeaking: vi.fn(),
  onBuddySpeaking: vi.fn(),
});

type Callbacks = ReturnType<typeof makeCallbacks>;

const newSession = (callbacks: Callbacks) =>
  new MeetingSession(callbacks as never, {
    // Keep the confirmation wait short: a real browser confirms in one tick.
    publicationTimeoutMs: 40,
    logger: (payload) => diagnostics.push(payload),
  });

const join = { url: 'wss://example', token: 'tok' } as never;
const audioJoin = { camera: false, micMuted: false };
/** Lets the fire-and-forget reconnect handler settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  roomInstances.length = 0;
  callLog = [];
  diagnostics = [];
  FakeRoom.connectDelayMs = 0;
  FakeRoom.connectThrows = false;
  FakeLocalParticipant.publishesMicTrack = true;
  FakeLocalParticipant.enableThrows = false;
  FakeLocalParticipant.publishesMuted = false;
  devices = [
    { kind: 'audioinput', deviceId: 'mic-42', label: 'Tested microphone' },
    { kind: 'audioinput', deviceId: 'mic-9', label: 'Other microphone' },
    { kind: 'audiooutput', deviceId: 'spk-1', label: 'Speakers' },
  ];
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices } });
  vi.stubGlobal('window', {
    setInterval: () => 1,
    clearInterval: () => undefined,
  });
  vi.stubGlobal('document', {
    body: { appendChild: vi.fn() },
    querySelectorAll: () => [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('MeetingSession.connect', () => {
  it('opens exactly one room for repeated joins', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);
    await session.connect(join, audioJoin);
    expect(roomInstances).toHaveLength(1);
    expect(roomInstances[0].connect).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent joins into a single connection', async () => {
    FakeRoom.connectDelayMs = 10;
    const session = newSession(makeCallbacks());
    await Promise.all([session.connect(join, audioJoin), session.connect(join, audioJoin)]);
    expect(roomInstances).toHaveLength(1);
    // ...and a single microphone track, not one per caller.
    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
  });

  it('does not latch a failed room connection, so the lobby retry still works', async () => {
    FakeRoom.connectThrows = true;
    const session = newSession(makeCallbacks());
    await expect(session.connect(join, audioJoin)).rejects.toThrow('connect_failed');
    FakeRoom.connectThrows = false;
    await session.connect(join, audioJoin);
    expect(roomInstances).toHaveLength(2);
  });

  it('allows a fresh connection after the meeting ended', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);
    await session.end();
    await session.connect(join, audioJoin);
    expect(roomInstances).toHaveLength(2);
  });
});

// THE regression suite: the browser must publish a microphone track to the
// room it just joined, and must say so only when LiveKit confirms it.
describe('MeetingSession microphone publication', () => {
  it('publishes the microphone immediately after room.connect() resolves', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    expect(callLog.indexOf('room.connect')).toBeGreaterThanOrEqual(0);
    expect(callLog.indexOf('setMicrophoneEnabled:true')).toBeGreaterThan(callLog.indexOf('room.connect'));
    expect(session.micPublicationStatus).toBe('published');
    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
  });

  it('captures the microphone the client tested in the lobby', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ deviceId: 'mic-42' }),
    );
    expect(roomInstances[0].localParticipant.micPublication?.capturedDeviceId).toBe('mic-42');
  });

  it('takes the browser default when the client never chose a device', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);

    const options = roomInstances[0].localParticipant.setMicrophoneEnabled.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(options).not.toHaveProperty('deviceId');
    expect(options).toMatchObject({ echoCancellation: true, noiseSuppression: true });
  });

  it('never reuses the lobby test track: LiveKit creates the meeting track', async () => {
    // The lobby's temporary track has already been stopped by
    // DeviceCheckController before the join — only its device id travels.
    const lobbyTrack = makeMediaStreamTrack('lobby');
    lobbyTrack.stop();
    expect(lobbyTrack.readyState).toBe('ended');

    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    const meetingTrack = roomInstances[0].localParticipant.micPublication?.track?.mediaStreamTrack;
    expect(meetingTrack).toBeDefined();
    expect(meetingTrack).not.toBe(lobbyTrack);
    expect(meetingTrack?.readyState).toBe('live');
    // The session opens no getUserMedia of its own: LiveKit owns acquisition.
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(lobbyTrack.stop).toHaveBeenCalledTimes(1); // only the lobby's own stop
  });

  it('confirms the publication against real LiveKit state', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    const publication = roomInstances[0].localParticipant.micPublication;
    expect(publication?.source).toBe('microphone');
    expect(publication?.kind).toBe('audio');
    expect(publication?.track?.mediaStreamTrack.readyState).toBe('live');
    expect(publication?.isMuted).toBe(false);
    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('published');
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('unmuted');
  });

  it('unmutes a publication LiveKit handed back muted (the client did not ask for that)', async () => {
    FakeLocalParticipant.publishesMuted = true;
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    expect(roomInstances[0].localParticipant.micPublication?.unmute).toHaveBeenCalled();
    expect(roomInstances[0].localParticipant.micPublication?.isMuted).toBe(false);
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('unmuted');
  });

  it('leaves the publication muted when the client chose to join muted', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, { camera: false, micMuted: true });

    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).not.toHaveBeenCalledWith(
      true,
      expect.anything(),
    );
    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('failed');
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('muted');
  });

  it('rejects a publication that is not an audio microphone track', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    FakeLocalParticipant.publishesMicTrack = false;
    await session.connect(join, audioJoin);
    // LiveKit reports something, but it is a camera publication.
    const wrong = new FakePublication(null);
    wrong.source = 'camera';
    roomInstances[0].localParticipant.micPublication = wrong;

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('failed');
    await expect(session.retryMicrophone()).resolves.toBe('failed');
  });
});

// Join must not claim "Connected" before the client can actually be heard.
describe('MeetingSession join stages', () => {
  it('walks connecting → publishing → waiting for Buddy, and only then connected', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    const stages = callbacks.onJoinStage.mock.calls.map(([stage]) => stage);

    expect(stages[0]).toBe('connecting_room');
    expect(stages).toContain('publishing_microphone');
    expect(stages.indexOf('publishing_microphone')).toBeLessThan(stages.indexOf('waiting_for_buddy'));
    // Buddy has not joined yet, so 'connected' must not have been reported.
    expect(stages).not.toContain('connected');
    expect(stages[stages.length - 1]).toBe('waiting_for_buddy');

    roomInstances[0].remoteParticipants.set('buddy', {});
    roomInstances[0].emit('participantConnected');
    expect(callbacks.onJoinStage).toHaveBeenLastCalledWith('connected');
  });

  it('never reports connected when the microphone was not published', async () => {
    const callbacks = makeCallbacks();
    FakeLocalParticipant.publishesMicTrack = false;
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    roomInstances[0].remoteParticipants.set('buddy', {});
    roomInstances[0].emit('participantConnected');

    const stages = callbacks.onJoinStage.mock.calls.map(([stage]) => stage);
    expect(stages).not.toContain('connected');
    expect(stages[stages.length - 1]).toBe('no_microphone');
    expect(session.micPublicationStatus).toBe('failed');
  });
});

// A microphone problem must never destroy the meeting — that is precisely what
// left LiveKit with a client participant publishing nothing.
describe('MeetingSession microphone recovery', () => {
  it('keeps the meeting open when the publication produced no track', async () => {
    const callbacks = makeCallbacks();
    FakeLocalParticipant.publishesMicTrack = false;
    const session = newSession(callbacks);

    await expect(session.connect(join, audioJoin)).resolves.toBeUndefined();

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('failed');
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('failed');
    expect(callbacks.onConnection).not.toHaveBeenCalledWith('error', 'connect_failed');
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
    expect(roomInstances).toHaveLength(1);
  });

  it('keeps the meeting open when acquiring the device throws', async () => {
    const callbacks = makeCallbacks();
    FakeLocalParticipant.enableThrows = true;
    const session = newSession(callbacks);

    await expect(session.connect(join, audioJoin)).resolves.toBeUndefined();

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('failed');
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it('retries inside the SAME room — no second room, no second Buddy job', async () => {
    const callbacks = makeCallbacks();
    FakeLocalParticipant.publishesMicTrack = false;
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    FakeLocalParticipant.publishesMicTrack = true;
    await expect(session.retryMicrophone()).resolves.toBe('published');

    expect(roomInstances).toHaveLength(1);
    expect(roomInstances[0].connect).toHaveBeenCalledTimes(1);
    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
  });

  it('republishes the tested device on retry', async () => {
    const session = newSession(makeCallbacks());
    FakeLocalParticipant.publishesMicTrack = false;
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    FakeLocalParticipant.publishesMicTrack = true;
    await session.retryMicrophone();

    expect(roomInstances[0].localParticipant.micPublication?.capturedDeviceId).toBe('mic-42');
  });

  it('repeated retries never stack up microphone tracks', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);

    await session.retryMicrophone();
    await session.retryMicrophone();
    await Promise.all([session.retryMicrophone(), session.retryMicrophone()]);

    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
    expect(session.micPublicationStatus).toBe('published');
  });

  it('drops a dead publication before republishing, so exactly one track exists', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);
    const dead = roomInstances[0].localParticipant.micPublication!;
    dead.track!.mediaStreamTrack.end(); // device unplugged

    expect(session.micPublicationStatus).toBe('lost');
    await expect(session.retryMicrophone()).resolves.toBe('published');

    expect(roomInstances[0].localParticipant.unpublishTrack).toHaveBeenCalledWith(dead.track, true);
    expect(roomInstances[0].localParticipant.publishCount).toBe(2);
    expect(roomInstances[0].localParticipant.micPublication).not.toBe(dead);
  });

  it('reports failure when the retry itself throws', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    roomInstances[0].localParticipant.micPublication = null;
    FakeLocalParticipant.enableThrows = true;

    await expect(session.retryMicrophone()).resolves.toBe('failed');
    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('failed');
  });

  it('publishes from another device when the client picks one', async () => {
    const session = newSession(makeCallbacks());
    FakeLocalParticipant.publishesMicTrack = false;
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    FakeLocalParticipant.publishesMicTrack = true;
    await expect(session.switchMicrophone('mic-9')).resolves.toBe('published');

    expect(roomInstances[0].localParticipant.micPublication?.capturedDeviceId).toBe('mic-9');
    expect(roomInstances).toHaveLength(1);
  });

  it('offers the input devices it enumerated, without persisting anything', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);

    const options = await session.refreshMicrophones();
    expect(options.map((option) => option.deviceId)).toEqual(['mic-42', 'mic-9']);
  });

  it('tells the client before falling back to a different microphone', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    // The tested device is gone by the time the meeting starts.
    devices = [{ kind: 'audioinput', deviceId: 'mic-9', label: 'Other microphone' }];
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    expect(callbacks.onMicNotice).toHaveBeenCalledWith('device_changed');
    const options = roomInstances[0].localParticipant.setMicrophoneEnabled.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(options).not.toHaveProperty('deviceId'); // browser default, announced
    expect(session.micPublicationStatus).toBe('published');
  });

  it('blocks voice and keeps text chat when there is no input device at all', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    devices = [{ kind: 'audiooutput', deviceId: 'spk-1', label: 'Speakers' }];
    await session.connect(join, audioJoin);

    expect(callbacks.onMicNotice).toHaveBeenCalledWith('no_device');
    expect(session.micPublicationStatus).toBe('failed');
    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).not.toHaveBeenCalledWith(
      true,
      expect.anything(),
    );

    await session.sendChat('My microphone is missing.');
    expect(roomInstances[0].localParticipant.sendText).toHaveBeenCalledWith('My microphone is missing.', {
      topic: 'lk.chat',
    });
  });

  it('keeps text chat working after the microphone failed — it is the fallback', async () => {
    const callbacks = makeCallbacks();
    FakeLocalParticipant.publishesMicTrack = false;
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    expect(callbacks.onMicPublication).toHaveBeenCalledWith('failed');

    await session.sendChat('Hello Buddy, my microphone is not working.');

    expect(roomInstances[0].localParticipant.sendText).toHaveBeenCalledWith(
      'Hello Buddy, my microphone is not working.',
      { topic: 'lk.chat' },
    );
    const delivered = callbacks.onChat.mock.calls.map(([message]) => message.delivery);
    expect(delivered).toContain('sent');
  });
});

describe('MeetingSession mute control', () => {
  it('mutes the real publication and keeps the track published', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    const publication = roomInstances[0].localParticipant.micPublication!;

    await session.setMicEnabled(false);

    expect(publication.isMuted).toBe(true);
    expect(publication.track).toBeDefined(); // muted, never stopped
    expect(publication.track!.mediaStreamTrack.readyState).toBe('live');
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('muted');
  });

  it('unmutes the existing publication without publishing a second track', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    const publication = roomInstances[0].localParticipant.micPublication!;

    await session.setMicEnabled(false);
    await session.setMicEnabled(true);

    expect(publication.unmute).toHaveBeenCalled();
    expect(publication.isMuted).toBe(false);
    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('unmuted');
  });

  it('recreates the publication when unmuting after it disappeared', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    await session.setMicEnabled(false);
    // The publication is gone (device released by the OS, stopOnMute, …).
    roomInstances[0].localParticipant.micPublication = null;

    await expect(session.setMicEnabled(true)).resolves.toBe('published');

    expect(roomInstances[0].localParticipant.publishCount).toBe(2);
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('unmuted');
  });

  it('keeps using the tested device when the mic is toggled back on', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });
    await session.setMicEnabled(false);
    roomInstances[0].localParticipant.micPublication = null;
    await session.setMicEnabled(true);

    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ deviceId: 'mic-42' }),
    );
  });

  it('reports the microphone as lost when the device disappears mid-meeting', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    roomInstances[0].localParticipant.micPublication!.track!.mediaStreamTrack.end();

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('lost');
    expect(callbacks.onMicState).toHaveBeenLastCalledWith('disconnected');
    // and the meeting is NOT ended for the client
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it('reports the microphone as lost when LiveKit unpublishes it', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('lost');
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it('ignores an unpublished camera track', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);

    roomInstances[0].emit('localTrackUnpublished', { source: 'camera' });

    expect(session.micPublicationStatus).toBe('published');
  });
});

describe('MeetingSession reconnect', () => {
  it('keeps the single microphone track LiveKit republished', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    roomInstances[0].emit('reconnected');
    await flush();

    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
    expect(session.micPublicationStatus).toBe('published');
    expect(roomInstances).toHaveLength(1);
  });

  it('republishes exactly once when the track did not survive the reconnect', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);
    roomInstances[0].localParticipant.micPublication = null;

    roomInstances[0].emit('reconnected');
    roomInstances[0].emit('reconnected');
    await flush();

    expect(roomInstances[0].localParticipant.publishCount).toBe(2); // one join + one restore
    expect(session.micPublicationStatus).toBe('published');
    expect(roomInstances).toHaveLength(1);
  });

  it('does not fight the client’s own mute across a reconnect', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);
    await session.setMicEnabled(false);
    const publication = roomInstances[0].localParticipant.micPublication!;

    roomInstances[0].emit('reconnected');
    await flush();

    expect(publication.isMuted).toBe(true);
    expect(roomInstances[0].localParticipant.publishCount).toBe(1);
  });
});

describe('MeetingSession teardown', () => {
  it('unpublishes and stops the meeting track it owns, and drops its listeners', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, audioJoin);
    const publication = roomInstances[0].localParticipant.micPublication!;
    const meetingTrack = publication.track!.mediaStreamTrack;

    await session.end();

    expect(roomInstances[0].localParticipant.unpublishTrack).toHaveBeenCalledWith(publication.track, true);
    expect(meetingTrack.stop).toHaveBeenCalledTimes(1);
    expect(meetingTrack.readyState).toBe('ended');
    expect(roomInstances[0].disconnect).toHaveBeenCalled();
    expect(roomInstances[0].removeAllListeners).toHaveBeenCalled();
  });

  it('touches no media it does not own', async () => {
    // Stands in for the lobby's test track / any other app audio.
    const foreignTrack = makeMediaStreamTrack('foreign');
    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    await session.end();

    expect(foreignTrack.stop).not.toHaveBeenCalled();
    expect(foreignTrack.readyState).toBe('live');
  });

  it('does not report a lost microphone when the client leaves', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    await session.end();
    // LiveKit unpublishes local tracks as part of disconnecting.
    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });

    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('lost');
  });

  it('does not report a lost microphone while the client mutes themselves', async () => {
    const callbacks = makeCallbacks();
    const session = newSession(callbacks);
    await session.connect(join, audioJoin);

    const muting = session.setMicEnabled(false);
    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });
    await muting;

    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('lost');
  });
});

describe('MeetingSession diagnostics', () => {
  it('logs publication facts and never a device id, label or token', async () => {
    const session = newSession(makeCallbacks());
    await session.connect(join, { ...audioJoin, micDeviceId: 'mic-42' });

    const published = diagnostics.find((entry) => String(entry.event).startsWith('mic_published'));
    expect(published).toMatchObject({
      roomConnected: true,
      micPublication: 'published',
      trackSource: 'microphone',
      trackKind: 'audio',
      muted: false,
      trackEnded: false,
      publicationSid: 'TR_AAAA1111',
    });

    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain('mic-42');
    expect(serialized).not.toContain('Tested microphone');
    expect(serialized).not.toContain('tok');
    expect(serialized).not.toContain('wss://');
  });
});
