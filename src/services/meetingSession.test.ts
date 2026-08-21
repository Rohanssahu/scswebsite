// Guards the "one room per meeting" rule: a second room would make LiveKit
// dispatch a second buddy-it-manager consultation job for the same meeting.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roomInstances: FakeRoom[] = [];

class FakeLocalParticipant {
  identity = 'client-1';
  setMicrophoneEnabled = vi.fn(async () => undefined);
  setCameraEnabled = vi.fn(async () => undefined);
  getTrackPublication = vi.fn(() => undefined);
  sendText = vi.fn(async () => undefined);
  publishData = vi.fn(async () => undefined);
}

class FakeRoom {
  static connectDelayMs = 0;
  localParticipant = new FakeLocalParticipant();
  remoteParticipants = new Map<string, unknown>();
  state = 'connected';
  connect = vi.fn(
    async () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, FakeRoom.connectDelayMs);
      }),
  );
  disconnect = vi.fn(async () => undefined);
  on = vi.fn(() => this);
  off = vi.fn(() => this);
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
  },
  ConnectionState: { Connected: 'connected' },
  ConnectionQuality: { Excellent: 'excellent', Good: 'good', Poor: 'poor', Lost: 'lost', Unknown: 'unknown' },
  Track: { Kind: { Audio: 'audio', Video: 'video' }, Source: { Camera: 'camera' } },
}));

const { MeetingSession } = await import('@/services/meetingSession');

const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));

const makeCallbacks = () => ({
  onConnection: vi.fn(),
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
