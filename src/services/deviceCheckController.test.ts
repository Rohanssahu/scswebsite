// DeviceCheckController — the lobby's microphone + speaker check driven
// against fake browser APIs, so every branch a real client can hit is covered:
// no media API, no device, granted, denied, busy, silence, real speech,
// disconnects, repeated clicks, playback failure and full cleanup.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeviceCheckController,
  type AudioContextLike,
  type AudioElementLike,
  type DeviceCheckDeps,
  type DeviceCheckSnapshot,
} from '@/services/deviceCheckController';
import type { RawDeviceInfo } from '@/services/deviceCheck';

// -----------------------------------------------------------------------------
// Fakes
// -----------------------------------------------------------------------------

class FakeTrack {
  kind = 'audio';
  stopped = 0;
  private listeners: Array<() => void> = [];

  constructor(
    private readonly deviceId: string,
    public label: string,
  ) {}

  stop(): void {
    this.stopped += 1;
  }

  getSettings(): { deviceId?: string } {
    return { deviceId: this.deviceId };
  }

  addEventListener(_type: 'ended', listener: () => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'ended', listener: () => void): void {
    this.listeners = this.listeners.filter((entry) => entry !== listener);
  }

  get listenerCount(): number {
    return this.listeners.length;
  }

  /** Simulates the device being unplugged mid-test. */
  end(): void {
    [...this.listeners].forEach((listener) => listener());
  }
}

class FakeStream {
  constructor(public track: FakeTrack) {}
  getTracks(): FakeTrack[] {
    return [this.track];
  }
  getAudioTracks(): FakeTrack[] {
    return [this.track];
  }
}

class FakeAnalyser {
  fftSize = 2048;
  smoothingTimeConstant = 0;
  disconnected = 0;

  constructor(private readonly level: () => number) {}

  get frequencyBinCount(): number {
    return this.fftSize / 2;
  }

  /** Writes a square wave whose timeDomainLevel equals the harness level. */
  getByteTimeDomainData(array: Uint8Array): void {
    const amplitude = Math.round((this.level() / 4) * 128);
    for (let i = 0; i < array.length; i += 1) {
      array[i] = 128 + (i % 2 === 0 ? amplitude : -amplitude);
    }
  }

  disconnect(): void {
    this.disconnected += 1;
  }
}

class FakeAudioContext implements AudioContextLike {
  state = 'running';
  closed = 0;
  resumed = 0;
  sources: Array<{ connected: number; disconnected: number }> = [];
  analysers: FakeAnalyser[] = [];

  constructor(
    private readonly level: () => number,
    initialState = 'running',
  ) {
    this.state = initialState;
  }

  async resume(): Promise<void> {
    this.resumed += 1;
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.closed += 1;
    this.state = 'closed';
  }

  createAnalyser(): FakeAnalyser {
    const analyser = new FakeAnalyser(this.level);
    this.analysers.push(analyser);
    return analyser;
  }

  createMediaStreamSource(): { connect: () => void; disconnect: () => void } {
    const record = { connected: 0, disconnected: 0 };
    this.sources.push(record);
    return {
      connect: () => {
        record.connected += 1;
      },
      disconnect: () => {
        record.disconnected += 1;
      },
    };
  }
}

class FakeAudioElement implements AudioElementLike {
  src = '';
  currentTime = 0;
  playCalls = 0;
  pauseCalls = 0;
  removed = 0;
  sinkIds: string[] = [];
  playBehaviour: 'resolve' | 'reject' = 'resolve';
  supportsSinkId = true;
  private listeners = new Map<string, Array<() => void>>();

  play(): Promise<void> {
    this.playCalls += 1;
    return this.playBehaviour === 'resolve' ? Promise.resolve() : Promise.reject(new Error('blocked'));
  }

  pause(): void {
    this.pauseCalls += 1;
  }

  remove(): void {
    this.removed += 1;
  }

  setSinkId(id: string): Promise<void> {
    if (!this.supportsSinkId) return Promise.reject(new Error('unsupported'));
    this.sinkIds.push(id);
    return Promise.resolve();
  }

  addEventListener(type: string, listener: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }

  emit(type: string): void {
    [...(this.listeners.get(type) ?? [])].forEach((listener) => listener());
  }

  get listenerCount(): number {
    return [...this.listeners.values()].reduce((total, list) => total + list.length, 0);
  }
}

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

interface Harness {
  controller: DeviceCheckController;
  snapshots: DeviceCheckSnapshot[];
  snapshot: () => DeviceCheckSnapshot;
  /** Current fake input level, 0..1. */
  setLevel: (level: number) => void;
  /** Advances the fake clock and runs the pending animation frame. */
  runFrames: (count: number, stepMs?: number) => void;
  runTimers: () => void;
  contexts: FakeAudioContext[];
  element: FakeAudioElement;
  getUserMedia: ReturnType<typeof vi.fn>;
  tracks: FakeTrack[];
  setDevices: (devices: RawDeviceInfo[]) => void;
  fireDeviceChange: () => Promise<void>;
  deviceChangeListeners: number;
  now: () => number;
}

interface HarnessOptions {
  mediaDevices?: boolean;
  enumerate?: boolean;
  devices?: RawDeviceInfo[];
  gumError?: { name: string };
  audioContext?: boolean;
  contextState?: string;
  audioElement?: boolean;
  outputSelectionSupported?: boolean;
  trackLabel?: string;
  trackDeviceId?: string;
}

const DEFAULT_DEVICES: RawDeviceInfo[] = [
  { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
  { kind: 'audiooutput', deviceId: 'out-1', label: 'Built-in speakers' },
];

function makeHarness(options: HarnessOptions = {}): Harness {
  const {
    mediaDevices = true,
    enumerate = true,
    audioContext = true,
    contextState = 'running',
    audioElement = true,
    outputSelectionSupported = true,
    trackLabel = 'Built-in microphone',
    trackDeviceId = 'mic-1',
  } = options;

  let level = 0;
  let clock = 1000;
  let devices = options.devices ?? DEFAULT_DEVICES;
  const frameQueue: Array<() => void> = [];
  const timerQueue: Array<() => void> = [];
  const contexts: FakeAudioContext[] = [];
  const tracks: FakeTrack[] = [];
  const deviceChangeHandlers: Array<() => void> = [];
  const element = new FakeAudioElement();

  const getUserMedia = vi.fn(async (constraints: unknown) => {
    if (options.gumError) throw options.gumError;
    const requested = (constraints as { audio?: { deviceId?: { exact?: string } } })?.audio?.deviceId?.exact;
    const track = new FakeTrack(requested ?? trackDeviceId, trackLabel);
    tracks.push(track);
    return new FakeStream(track);
  });

  const deps: DeviceCheckDeps = {
    mediaDevices: mediaDevices
      ? {
          getUserMedia: getUserMedia as unknown as DeviceCheckDeps['mediaDevices']['getUserMedia'],
          ...(enumerate ? { enumerateDevices: async () => devices } : {}),
          addEventListener: (_type: 'devicechange', listener: () => void) => {
            deviceChangeHandlers.push(listener);
          },
          removeEventListener: (_type: 'devicechange', listener: () => void) => {
            const index = deviceChangeHandlers.indexOf(listener);
            if (index >= 0) deviceChangeHandlers.splice(index, 1);
          },
        }
      : null,
    createAudioContext: audioContext
      ? () => {
          const context = new FakeAudioContext(() => level, contextState);
          contexts.push(context);
          return context;
        }
      : null,
    createAudioElement: () => (audioElement ? element : null),
    now: () => clock,
    scheduleFrame: (callback) => {
      frameQueue.push(callback);
      return frameQueue.length;
    },
    cancelFrame: () => {
      frameQueue.length = 0;
    },
    setTimer: (callback) => {
      timerQueue.push(callback);
      return timerQueue.length;
    },
    clearTimer: () => {
      timerQueue.length = 0;
    },
    outputSelectionSupported,
    // Short, deterministic thresholds: ~600 ms of speech passes, silence gives
    // up after ~2 s, so tests stay fast without changing the rules.
    voiceOptions: { requiredVoicedMs: 600, timeoutMs: 2000, minSegmentMs: 250 },
  };

  const snapshots: DeviceCheckSnapshot[] = [];
  const controller = new DeviceCheckController(deps, (snapshot) => snapshots.push(snapshot));

  return {
    controller,
    snapshots,
    snapshot: () => controller.getSnapshot(),
    setLevel: (next) => {
      level = next;
    },
    runFrames: (count, stepMs = 16) => {
      for (let i = 0; i < count; i += 1) {
        const pending = frameQueue.shift();
        if (!pending) return;
        clock += stepMs;
        pending();
      }
    },
    runTimers: () => {
      const pending = [...timerQueue];
      timerQueue.length = 0;
      pending.forEach((callback) => callback());
    },
    contexts,
    element,
    getUserMedia,
    tracks,
    setDevices: (next) => {
      devices = next;
    },
    fireDeviceChange: async () => {
      deviceChangeHandlers.forEach((listener) => listener());
      // let refreshDevices' promises settle
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
    get deviceChangeListeners() {
      return deviceChangeHandlers.length;
    },
    now: () => clock,
  };
}

/** Speaks at a normal level until the microphone test resolves. */
const speakUntilSettled = (harness: Harness, level = 0.5, maxFrames = 200): void => {
  harness.setLevel(level);
  for (let i = 0; i < maxFrames; i += 1) {
    if (harness.snapshot().micState !== 'listening') return;
    harness.runFrames(1);
  }
};

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// Microphone detection
// -----------------------------------------------------------------------------

describe('microphone test — capability and permission', () => {
  it('reports an unsupported browser when there is no media-device API', async () => {
    const harness = makeHarness({ mediaDevices: false });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('unsupported');
  });

  it('reports no microphone without prompting when no audio input exists', async () => {
    const harness = makeHarness({
      devices: [{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera' }],
    });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('no_device');
    expect(harness.getUserMedia).not.toHaveBeenCalled();
  });

  it('listens and shows the microphone name once permission is granted', async () => {
    const harness = makeHarness({ trackLabel: 'Headset microphone' });
    await harness.controller.testMicrophone();
    expect(harness.getUserMedia).toHaveBeenCalledTimes(1);
    expect(harness.snapshot().micState).toBe('listening');
    expect(harness.snapshot().micLabel).toBe('Headset microphone');
    expect(harness.snapshot().micInputs).toEqual([
      { deviceId: 'mic-1', label: 'Built-in microphone' },
    ]);
    // 'requesting' is a real, visible step
    expect(harness.snapshots.map((snapshot) => snapshot.micState)).toContain('requesting');
  });

  it('does not pass merely because permission was granted', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('listening');
    expect(harness.snapshot().micState).not.toBe('passed');
  });

  it('reports a denied permission and releases nothing it never opened', async () => {
    const harness = makeHarness({ gumError: { name: 'NotAllowedError' } });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('denied');
    expect(harness.contexts).toHaveLength(0);
  });

  it('reports a busy device when the microphone cannot be read', async () => {
    const harness = makeHarness({ gumError: { name: 'NotReadableError' } });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('busy');
  });

  it('reports a missing device when the chosen microphone is gone', async () => {
    const harness = makeHarness({ gumError: { name: 'NotFoundError' } });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('no_device');
  });

  it('cannot pass without Web Audio, since no voice could be measured', async () => {
    const harness = makeHarness({ audioContext: false });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().micState).toBe('unsupported');
    expect(harness.tracks[0].stopped).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// Voice detection
// -----------------------------------------------------------------------------

describe('microphone test — voice detection', () => {
  it('passes once real speech is heard, then releases the stream', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);

    expect(harness.snapshot().micState).toBe('passed');
    expect(harness.snapshot().micProgress).toBe(1);
    // temporary media released the moment the test finished
    expect(harness.tracks[0].stopped).toBe(1);
    expect(harness.contexts[0].closed).toBe(1);
    expect(harness.snapshot().micLevel).toBe(0);
  });

  it('keeps the microphone name visible after passing', async () => {
    const harness = makeHarness({ trackLabel: 'USB microphone' });
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);
    expect(harness.snapshot().micLabel).toBe('USB microphone');
  });

  it('reports no voice detected after silence, and cleans up', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.setLevel(0);
    for (let i = 0; i < 300 && harness.snapshot().micState === 'listening'; i += 1) {
      harness.runFrames(1);
    }
    expect(harness.snapshot().micState).toBe('no_voice');
    expect(harness.tracks[0].stopped).toBe(1);
    expect(harness.contexts[0].closed).toBe(1);
  });

  it('does not let background noise falsely pass the test', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.setLevel(0.06); // room hum
    for (let i = 0; i < 300 && harness.snapshot().micState === 'listening'; i += 1) {
      harness.runFrames(1);
    }
    expect(harness.snapshot().micState).toBe('no_voice');
  });

  it('reports a live level while listening', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.setLevel(0.3);
    harness.runFrames(8, 60); // > the 50 ms emit interval
    const levels = harness.snapshots.map((snapshot) => snapshot.micLevel);
    expect(Math.max(...levels)).toBeGreaterThan(0.2);
  });
});

// -----------------------------------------------------------------------------
// Repeated tests and cleanup
// -----------------------------------------------------------------------------

describe('microphone test — resource discipline', () => {
  it('does not open a second stream when the button is clicked repeatedly', async () => {
    const harness = makeHarness();
    const first = harness.controller.testMicrophone();
    const second = harness.controller.testMicrophone();
    const third = harness.controller.testMicrophone();
    await Promise.all([first, second, third]);
    expect(harness.getUserMedia).toHaveBeenCalledTimes(1);
    expect(harness.tracks).toHaveLength(1);
    expect(harness.contexts).toHaveLength(1);
  });

  it('closes the previous AudioContext before a retry opens a new one', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);

    expect(harness.contexts).toHaveLength(2);
    expect(harness.contexts.every((context) => context.state !== 'running' || context.closed > 0)).toBe(
      true,
    );
    // no duplicate live contexts: every retired context is closed
    expect(harness.contexts.filter((context) => context.closed === 0)).toHaveLength(0);
    expect(harness.tracks.every((track) => track.stopped > 0)).toBe(true);
  });

  it('resumes a suspended AudioContext instead of metering a dead one', async () => {
    const harness = makeHarness({ contextState: 'suspended' });
    await harness.controller.testMicrophone();
    expect(harness.contexts[0].resumed).toBe(1);
    speakUntilSettled(harness);
    expect(harness.snapshot().micState).toBe('passed');
  });

  it('releases every temporary resource on dispose', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.runFrames(2);
    expect(harness.deviceChangeListeners).toBe(1);

    harness.controller.dispose();

    expect(harness.tracks[0].stopped).toBe(1);
    expect(harness.tracks[0].listenerCount).toBe(0);
    expect(harness.contexts[0].closed).toBe(1);
    expect(harness.contexts[0].sources[0].disconnected).toBe(1);
    expect(harness.deviceChangeListeners).toBe(0);
  });

  it('ignores actions after dispose', async () => {
    const harness = makeHarness();
    harness.controller.dispose();
    await harness.controller.testMicrophone();
    await harness.controller.playTestSound();
    expect(harness.getUserMedia).not.toHaveBeenCalled();
    expect(harness.element.playCalls).toBe(0);
  });

  it('stops the old stream when the client switches microphone', async () => {
    const harness = makeHarness({
      devices: [
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
        { kind: 'audioinput', deviceId: 'mic-2', label: 'Headset microphone' },
      ],
    });
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);
    expect(harness.snapshot().micState).toBe('passed');

    await harness.controller.selectMicrophone('mic-2');
    expect(harness.snapshot().selectedMicId).toBe('mic-2');
    expect(harness.tracks[0].stopped).toBe(1);
    // the chosen device is requested exactly, never silently substituted
    expect(harness.getUserMedia).toHaveBeenLastCalledWith(
      expect.objectContaining({ audio: expect.objectContaining({ deviceId: { exact: 'mic-2' } }) }),
    );
    // and the new device has to prove itself again
    expect(harness.snapshot().micState).toBe('listening');
  });
});

// -----------------------------------------------------------------------------
// Device changes
// -----------------------------------------------------------------------------

describe('device changes', () => {
  it('invalidates a passed test when the tested microphone is unplugged', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);
    expect(harness.snapshot().micState).toBe('passed');

    harness.setDevices([{ kind: 'audiooutput', deviceId: 'out-1', label: 'Built-in speakers' }]);
    await harness.fireDeviceChange();

    expect(harness.snapshot().micState).toBe('not_tested');
    expect(harness.snapshot().deviceChanged).toBe(true);
  });

  it('does not switch the client to another microphone on its own', async () => {
    const harness = makeHarness({
      devices: [
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' },
        { kind: 'audioinput', deviceId: 'mic-2', label: 'Headset microphone' },
      ],
    });
    await harness.controller.selectMicrophone('mic-2');
    speakUntilSettled(harness);
    expect(harness.snapshot().micState).toBe('passed');
    const callsBefore = harness.getUserMedia.mock.calls.length;

    harness.setDevices([{ kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in microphone' }]);
    await harness.fireDeviceChange();

    expect(harness.snapshot().micState).toBe('not_tested');
    expect(harness.snapshot().deviceChanged).toBe(true);
    expect(harness.snapshot().selectedMicId).toBeNull(); // back to "ask me"
    expect(harness.getUserMedia.mock.calls).toHaveLength(callsBefore); // no auto-switch
  });

  it('keeps a passed test when unrelated devices come and go', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    speakUntilSettled(harness);

    harness.setDevices([
      ...DEFAULT_DEVICES,
      { kind: 'videoinput', deviceId: 'cam-9', label: 'New webcam' },
    ]);
    await harness.fireDeviceChange();

    expect(harness.snapshot().micState).toBe('passed');
    expect(harness.snapshot().deviceChanged).toBe(false);
  });

  it('invalidates the test when the live track ends mid-listening', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.runFrames(2);
    harness.tracks[0].end();
    expect(harness.snapshot().micState).toBe('not_tested');
    expect(harness.snapshot().deviceChanged).toBe(true);
    expect(harness.contexts[0].closed).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// Speaker test
// -----------------------------------------------------------------------------

describe('speaker test', () => {
  it('plays a locally generated tone only when asked', async () => {
    const harness = makeHarness();
    expect(harness.element.playCalls).toBe(0); // nothing autoplays

    await harness.controller.playTestSound();
    expect(harness.element.playCalls).toBe(1);
    expect(harness.element.src.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(harness.snapshot().speakerState).toBe('playing');
  });

  it('asks for confirmation after playback and never passes on its own', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    harness.element.emit('ended');

    expect(harness.snapshot().speakerState).toBe('awaiting_answer');
    expect(harness.snapshot().speakerState).not.toBe('passed');
  });

  it('passes only on an explicit "yes, I can hear it"', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    harness.element.emit('ended');
    harness.controller.confirmSpeaker(true);
    expect(harness.snapshot().speakerState).toBe('passed');
  });

  it('records a "no, I cannot hear it" answer with guidance', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    harness.element.emit('ended');
    harness.controller.confirmSpeaker(false);
    expect(harness.snapshot().speakerState).toBe('not_heard');
    expect(harness.snapshot().speakerErrorKey).toBe('meeting.setup.speaker.helpNotHeard');
  });

  it('reports a playback failure and stays unconfirmed', async () => {
    const harness = makeHarness();
    harness.element.playBehaviour = 'reject';
    await harness.controller.playTestSound();
    expect(harness.snapshot().speakerState).toBe('failed');
    expect(harness.snapshot().speakerErrorKey).toBe('meeting.setup.speaker.errPlayback');
  });

  it('reports a failure when no audio element can be created', async () => {
    const harness = makeHarness({ audioElement: false });
    await harness.controller.playTestSound();
    expect(harness.snapshot().speakerState).toBe('failed');
  });

  it('asks for an answer even if the browser never fires "ended"', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    expect(harness.snapshot().speakerState).toBe('playing');
    harness.runTimers();
    expect(harness.snapshot().speakerState).toBe('awaiting_answer');
  });

  it('reuses one element and one src for "play again"', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    harness.element.emit('ended');
    const firstSrc = harness.element.src;
    await harness.controller.playTestSound();
    harness.element.emit('ended');

    expect(harness.element.playCalls).toBe(2);
    expect(harness.element.src).toBe(firstSrc);
    // no leaked listeners across replays
    expect(harness.element.listenerCount).toBe(0);
  });

  it('ignores a second click while the tone is still playing', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    await harness.controller.playTestSound();
    expect(harness.element.playCalls).toBe(1);
  });

  it('routes to the chosen output when the browser supports it', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone(); // populates the output list
    harness.controller.selectOutput('out-1');
    await harness.controller.playTestSound();
    expect(harness.element.sinkIds).toEqual(['out-1']);
  });

  it('still plays when setSinkId rejects', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.controller.selectOutput('out-1');
    harness.element.supportsSinkId = false;
    await harness.controller.playTestSound();
    expect(harness.element.playCalls).toBe(1);
    expect(harness.snapshot().speakerState).toBe('playing');
  });

  it('offers no output picker on Safari/iOS and never calls setSinkId', async () => {
    const harness = makeHarness({ outputSelectionSupported: false });
    await harness.controller.testMicrophone();
    expect(harness.snapshot().outputSelectionSupported).toBe(false);
    expect(harness.snapshot().outputs).toEqual([]);

    harness.controller.selectOutput('out-1'); // ignored
    expect(harness.snapshot().selectedOutputId).toBeNull();

    await harness.controller.playTestSound();
    expect(harness.element.sinkIds).toEqual([]);
    expect(harness.element.playCalls).toBe(1);
  });

  it('re-asks for confirmation after the output device is changed', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    await harness.controller.playTestSound();
    harness.element.emit('ended');
    harness.controller.confirmSpeaker(true);
    expect(harness.snapshot().speakerState).toBe('passed');

    harness.controller.selectOutput('out-1');
    expect(harness.snapshot().speakerState).toBe('not_tested');
  });

  it('keeps the test tone out of the microphone metre', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    // The speaker is loud enough to bleed into the mic…
    harness.setLevel(0.9);
    await harness.controller.playTestSound();
    // …but while it plays, nothing is credited towards the voice test.
    harness.runFrames(30, 16);
    expect(harness.snapshot().micState).toBe('listening');
    expect(harness.snapshot().micProgress).toBe(0);
  });

  it('never publishes anything to LiveKit — it only touches its own element', async () => {
    const harness = makeHarness();
    await harness.controller.playTestSound();
    harness.controller.dispose();
    expect(harness.element.removed).toBe(1);
    expect(harness.element.src).toBe('');
  });
});

// -----------------------------------------------------------------------------
// Reset
// -----------------------------------------------------------------------------

describe('resetMicrophone', () => {
  it('returns to "not tested" and frees the stream', async () => {
    const harness = makeHarness();
    await harness.controller.testMicrophone();
    harness.controller.resetMicrophone();
    expect(harness.snapshot().micState).toBe('not_tested');
    expect(harness.snapshot().micLabel).toBeNull();
    expect(harness.tracks[0].stopped).toBe(1);
    expect(harness.contexts[0].closed).toBe(1);
  });
});
