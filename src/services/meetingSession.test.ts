// Guards the "one room per meeting" rule: a second room would make LiveKit
// dispatch a second buddy-it-manager consultation job for the same meeting.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roomInstances: FakeRoom[] = [];

/** A local audio track as livekit-client exposes it. */
const makeMediaStreamTrack = () => {
  const listeners: Array<() => void> = [];
  return {
    readyState: 'live',
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

class FakeLocalParticipant {
  /** false = enabling the mic resolves but publishes no track. */
  static publishesMicTrack = true;
  identity = 'client-1';
  micPublication: { source: string; track: { mediaStreamTrack: ReturnType<typeof makeMediaStreamTrack> } } | null =
    FakeLocalParticipant.publishesMicTrack
      ? { source: 'microphone', track: { mediaStreamTrack: makeMediaStreamTrack() } }
      : null;
  setMicrophoneEnabled = vi.fn(async (_enabled?: boolean, _options?: unknown) => undefined);
  setCameraEnabled = vi.fn(async () => undefined);
  getTrackPublication = vi.fn((source: string) =>
    source === 'microphone' ? (this.micPublication ?? undefined) : undefined,
  );
  sendText = vi.fn(async () => undefined);
  publishData = vi.fn(async () => undefined);
}

class FakeRoom {
  static connectDelayMs = 0;
  localParticipant = new FakeLocalParticipant();
  handlers = new Map<string, (...args: unknown[]) => void>();
  remoteParticipants = new Map<string, unknown>();
  state = 'connected';
  connect = vi.fn(
    async () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, FakeRoom.connectDelayMs);
      }),
  );
  disconnect = vi.fn(async () => undefined);
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
  },
  ConnectionState: { Connected: 'connected' },
  ConnectionQuality: { Excellent: 'excellent', Good: 'good', Poor: 'poor', Lost: 'lost', Unknown: 'unknown' },
  Track: { Kind: { Audio: 'audio', Video: 'video' }, Source: { Camera: 'camera', Microphone: 'microphone' } },
}));

const { MeetingSession } = await import('@/services/meetingSession');

const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));

const makeCallbacks = () => ({
  onConnection: vi.fn(),
  onMicPublication: vi.fn(),
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

const join = { url: 'wss://example', token: 'tok' } as never;

beforeEach(() => {
  roomInstances.length = 0;
  FakeRoom.connectDelayMs = 0;
  FakeLocalParticipant.publishesMicTrack = true;
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
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
    const session = new MeetingSession(makeCallbacks() as never);
    await session.connect(join, { camera: false, micMuted: false });
    await session.connect(join, { camera: false, micMuted: false });
    expect(roomInstances).toHaveLength(1);
    expect(roomInstances[0].connect).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent joins into a single connection', async () => {
    FakeRoom.connectDelayMs = 10;
    const session = new MeetingSession(makeCallbacks() as never);
    await Promise.all([
      session.connect(join, { camera: false, micMuted: false }),
      session.connect(join, { camera: false, micMuted: false }),
    ]);
    expect(roomInstances).toHaveLength(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('does not latch a failed attempt, so the lobby retry still works', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('denied'));
    const session = new MeetingSession(makeCallbacks() as never);
    await expect(session.connect(join, { camera: false, micMuted: false })).rejects.toThrow('mic_denied');
    await session.connect(join, { camera: false, micMuted: false });
    expect(roomInstances).toHaveLength(1);
  });

  it('allows a fresh connection after the meeting ended', async () => {
    const session = new MeetingSession(makeCallbacks() as never);
    await session.connect(join, { camera: false, micMuted: false });
    await session.end();
    await session.connect(join, { camera: false, micMuted: false });
    expect(roomInstances).toHaveLength(2);
  });
});

// The lobby's mandatory microphone check is only worth anything if the meeting
// then captures THAT device and tells the client when it is not being sent.
describe('MeetingSession microphone', () => {
  it('reuses the microphone the client tested in the lobby', async () => {
    const session = new MeetingSession(makeCallbacks() as never);
    await session.connect(join, { camera: false, micMuted: false, micDeviceId: 'mic-42' });

    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ deviceId: 'mic-42' }),
    );
  });

  it('takes the browser default when the client never chose a device', async () => {
    const session = new MeetingSession(makeCallbacks() as never);
    await session.connect(join, { camera: false, micMuted: false });

    const options = roomInstances[0].localParticipant.setMicrophoneEnabled.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(options).not.toHaveProperty('deviceId');
    expect(options).toMatchObject({ echoCancellation: true, noiseSuppression: true });
  });

  it('keeps using the tested device when the mic is toggled back on', async () => {
    const session = new MeetingSession(makeCallbacks() as never);
    await session.connect(join, { camera: false, micMuted: false, micDeviceId: 'mic-42' });
    await session.setMicEnabled(false);
    await session.setMicEnabled(true);

    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ deviceId: 'mic-42' }),
    );
  });

  it('confirms the local microphone track is really published', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    expect(callbacks.onMicPublication).toHaveBeenCalledWith('published');
    expect(session.micPublicationStatus).toBe('published');
  });

  it('reports a failure when enabling the mic produced no track', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    // Publishing "succeeds" but no track exists — the silent-client case.
    FakeLocalParticipant.publishesMicTrack = false;
    await session.connect(join, { camera: false, micMuted: false });

    expect(callbacks.onMicPublication).toHaveBeenCalledWith('failed');
  });

  it('does not cry failure when the client deliberately joined muted', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: true });

    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('failed');
    expect(session.micPublicationStatus).toBe('unknown');
  });

  it('reports the microphone as lost when the device disappears mid-meeting', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    roomInstances[0].localParticipant.micPublication!.track.mediaStreamTrack.end();

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('lost');
    // and the meeting is NOT ended for the client
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it('reports the microphone as lost when LiveKit unpublishes it', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });

    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('lost');
    expect(roomInstances[0].disconnect).not.toHaveBeenCalled();
  });

  it('ignores an unpublished camera track', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    roomInstances[0].emit('localTrackUnpublished', { source: 'camera' });

    expect(session.micPublicationStatus).toBe('published');
  });

  it('republishes the same tested device on "Retry microphone"', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false, micDeviceId: 'mic-42' });
    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });

    await expect(session.retryMicrophone()).resolves.toBe('published');
    expect(roomInstances[0].localParticipant.setMicrophoneEnabled).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ deviceId: 'mic-42' }),
    );
  });

  it('reports failure when the retry itself throws', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });
    roomInstances[0].localParticipant.setMicrophoneEnabled.mockRejectedValueOnce(new Error('nope'));

    await expect(session.retryMicrophone()).resolves.toBe('failed');
    expect(callbacks.onMicPublication).toHaveBeenLastCalledWith('failed');
  });

  it('keeps text chat working after the microphone failed — it is the fallback', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    FakeLocalParticipant.publishesMicTrack = false;
    await session.connect(join, { camera: false, micMuted: false });
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

describe('MeetingSession teardown', () => {
  it('does not report a lost microphone when the client leaves', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    await session.end();
    // LiveKit unpublishes local tracks as part of disconnecting.
    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });

    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('lost');
  });

  it('does not report a lost microphone while the client mutes themselves', async () => {
    const callbacks = makeCallbacks();
    const session = new MeetingSession(callbacks as never);
    await session.connect(join, { camera: false, micMuted: false });

    const muting = session.setMicEnabled(false);
    roomInstances[0].emit('localTrackUnpublished', { source: 'microphone' });
    await muting;

    expect(callbacks.onMicPublication).not.toHaveBeenCalledWith('lost');
  });
});
