// =============================================================================
// DeviceCheckController — the lobby's microphone + speaker check.
//
// Owns every temporary media resource the pre-join check needs and guarantees
// each one is released: MediaStream tracks, the AudioContext, the analyser,
// the animation frame, the test-sound element and the devicechange listener.
//
// Hard rules encoded here:
//   * microphone permission is only ever requested from an explicit client
//     action — never on mount;
//   * one test at a time: repeated clicks join the running test instead of
//     opening a second stream;
//   * an AudioContext is created only inside that user gesture, is resumed if
//     the browser hands it back suspended, and is closed on every exit path;
//   * "permission granted" is NOT a pass — VoiceEnergyDetector must hear a
//     real voice (see deviceCheck.ts);
//   * nothing is recorded, uploaded or persisted. Levels are numbers in
//     memory; device ids and labels never leave this object.
//
// Every browser API is injected, so the whole state machine is unit-testable
// without a DOM (see deviceCheckController.test.ts).
// =============================================================================

import {
  DEFAULT_VOICE_OPTIONS,
  VoiceEnergyDetector,
  classifyMediaError,
  describeDevices,
  isDeviceMissing,
  timeDomainLevel,
  type DeviceOption,
  type MicTestState,
  type RawDeviceInfo,
  type SpeakerTestState,
  type VoiceDetectorOptions,
} from '@/services/deviceCheck';
import { TEST_TONE, testToneDataUri } from '@/services/testTone';

// -----------------------------------------------------------------------------
// Minimal structural types for the browser objects we touch
// -----------------------------------------------------------------------------

export interface MediaTrackLike {
  readonly kind?: string;
  readonly label?: string;
  stop(): void;
  getSettings?(): { deviceId?: string };
  addEventListener?(type: 'ended', listener: () => void): void;
  removeEventListener?(type: 'ended', listener: () => void): void;
}

export interface MediaStreamLike {
  getTracks(): MediaTrackLike[];
  getAudioTracks?(): MediaTrackLike[];
}

export interface AnalyserLike {
  fftSize: number;
  readonly frequencyBinCount: number;
  smoothingTimeConstant?: number;
  getByteTimeDomainData(array: Uint8Array): void;
  disconnect?(): void;
}

export interface AudioSourceLike {
  connect(destination: unknown): unknown;
  disconnect(): void;
}

export interface AudioContextLike {
  readonly state: string;
  resume(): Promise<void>;
  close(): Promise<void>;
  createAnalyser(): AnalyserLike;
  createMediaStreamSource(stream: MediaStreamLike): AudioSourceLike;
}

export interface AudioElementLike {
  src: string;
  currentTime?: number;
  play(): Promise<void> | void;
  pause?(): void;
  remove?(): void;
  setSinkId?(id: string): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface MediaDevicesLike {
  getUserMedia(constraints: unknown): Promise<MediaStreamLike>;
  enumerateDevices?(): Promise<RawDeviceInfo[]>;
  addEventListener?(type: 'devicechange', listener: () => void): void;
  removeEventListener?(type: 'devicechange', listener: () => void): void;
}

export interface DeviceCheckDeps {
  mediaDevices: MediaDevicesLike | null;
  /** Null when the browser has no AudioContext — the mic test cannot metre. */
  createAudioContext: (() => AudioContextLike) | null;
  /** Returns a media element for the test sound, or null when impossible. */
  createAudioElement: () => AudioElementLike | null;
  now: () => number;
  scheduleFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  setTimer: (callback: () => void, ms: number) => number;
  clearTimer: (handle: number) => void;
  outputSelectionSupported: boolean;
  voiceOptions?: Partial<VoiceDetectorOptions>;
}

// -----------------------------------------------------------------------------
// Snapshot
// -----------------------------------------------------------------------------

export interface DeviceCheckSnapshot {
  micState: MicTestState;
  /** 0..1 live input level. Display only; never stored. */
  micLevel: number;
  /** 0..1 progress towards "enough voice heard". */
  micProgress: number;
  /** Label of the microphone actually in use. Display only; never logged. */
  micLabel: string | null;
  micInputs: DeviceOption[];
  /** Explicit client choice, or null for "browser default". */
  selectedMicId: string | null;
  speakerState: SpeakerTestState;
  /** i18n key for a playback failure, if any. */
  speakerErrorKey: string | null;
  outputs: DeviceOption[];
  selectedOutputId: string | null;
  outputSelectionSupported: boolean;
  /** A device was unplugged or swapped after the microphone test passed. */
  deviceChanged: boolean;
}

/** First-render snapshot: nothing tested, nothing requested. */
export const INITIAL_DEVICE_CHECK_SNAPSHOT: DeviceCheckSnapshot = {
  micState: 'not_tested',
  micLevel: 0,
  micProgress: 0,
  micLabel: null,
  micInputs: [],
  selectedMicId: null,
  speakerState: 'not_tested',
  speakerErrorKey: null,
  outputs: [],
  selectedOutputId: null,
  outputSelectionSupported: false,
  deviceChanged: false,
};

/** Emit at most one level update per 50 ms — a full-rate rAF would re-render
 * the lobby ~60×/s for a meter that cannot show that detail anyway. */
const LEVEL_EMIT_INTERVAL_MS = 50;

/** Extra grace after the tone's own length before we stop waiting for 'ended'. */
const PLAYBACK_GRACE_MS = 2_000;

export class DeviceCheckController {
  private snapshot: DeviceCheckSnapshot;
  private readonly deps: DeviceCheckDeps;
  private readonly onChange: (snapshot: DeviceCheckSnapshot) => void;

  // --- microphone-test resources (all released together) ---
  private stream: MediaStreamLike | null = null;
  private track: MediaTrackLike | null = null;
  private trackEndedListener: (() => void) | null = null;
  private audioContext: AudioContextLike | null = null;
  private source: AudioSourceLike | null = null;
  private analyser: AnalyserLike | null = null;
  private frameHandle: number | null = null;
  private buffer: Uint8Array | null = null;
  private detector: VoiceEnergyDetector;
  private lastLevelEmit = 0;
  /** Device id of the microphone the current/last pass was measured on. */
  private testedMicId: string | null = null;
  /** Bumped on every start/stop so stale async continuations bail out. */
  private generation = 0;
  /** The in-flight test — repeated clicks await this instead of starting one. */
  private micRun: Promise<void> | null = null;

  // --- speaker-test resources ---
  private audioElement: AudioElementLike | null = null;
  private playbackTimer: number | null = null;
  private playbackCleanup: (() => void) | null = null;
  /** While set, analyser frames are ignored so the tone cannot pass the mic
   * test through speaker→microphone feedback. */
  private suppressMeterUntil = 0;

  private deviceChangeListener: (() => void) | null = null;
  private disposed = false;

  constructor(deps: DeviceCheckDeps, onChange: (snapshot: DeviceCheckSnapshot) => void) {
    this.deps = deps;
    this.onChange = onChange;
    this.detector = new VoiceEnergyDetector(deps.voiceOptions);
    this.snapshot = {
      ...INITIAL_DEVICE_CHECK_SNAPSHOT,
      outputSelectionSupported: deps.outputSelectionSupported,
    };
    this.attachDeviceChange();
  }

  getSnapshot(): DeviceCheckSnapshot {
    return this.snapshot;
  }

  // ---------------------------------------------------------------------------
  // Microphone
  // ---------------------------------------------------------------------------

  /**
   * Runs the microphone test. Only ever called from a client action.
   * A second call while a test is running returns the same promise, so
   * impatient clicking can never open two streams or two AudioContexts.
   */
  testMicrophone(deviceId?: string | null): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.micRun) return this.micRun;
    const run = this.runMicTest(deviceId === undefined ? this.snapshot.selectedMicId : deviceId).finally(
      () => {
        this.micRun = null;
      },
    );
    this.micRun = run;
    return run;
  }

  private async runMicTest(deviceId: string | null): Promise<void> {
    this.releaseMicResources();
    const generation = this.generation;
    const mediaDevices = this.deps.mediaDevices;

    if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
      this.patch({ micState: 'unsupported', micLevel: 0, micProgress: 0, deviceChanged: false });
      return;
    }

    // Cheap pre-check: if enumeration reports devices but not a single audio
    // input, there is nothing to prompt for.
    if (typeof mediaDevices.enumerateDevices === 'function') {
      const devices = await mediaDevices.enumerateDevices().catch(() => null);
      if (generation !== this.generation) return;
      if (devices && devices.length > 0 && !devices.some((device) => device.kind === 'audioinput')) {
        this.patch({ micState: 'no_device', micLevel: 0, micProgress: 0, deviceChanged: false });
        return;
      }
    }

    this.patch({
      micState: 'requesting',
      micLevel: 0,
      micProgress: 0,
      micLabel: null,
      deviceChanged: false,
    });

    let stream: MediaStreamLike;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: {
          // Exact only when the client explicitly picked a device: a silent
          // fallback to another microphone would be a device switch they never
          // agreed to. Without a choice we take the browser default.
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (error) {
      if (generation !== this.generation) return;
      this.patch({ micState: classifyMediaError(error), micLevel: 0, micProgress: 0 });
      await this.refreshDevices();
      return;
    }

    if (generation !== this.generation || this.disposed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const track = (stream.getAudioTracks?.() ?? stream.getTracks()).find(
      (candidate) => candidate.kind === undefined || candidate.kind === 'audio',
    );
    if (!track) {
      stream.getTracks().forEach((candidate) => candidate.stop());
      this.patch({ micState: 'no_device', micLevel: 0, micProgress: 0 });
      return;
    }

    this.stream = stream;
    this.track = track;
    this.testedMicId = track.getSettings?.().deviceId ?? deviceId ?? null;

    // The device can vanish mid-test (unplugged headset) — the browser ends
    // the track rather than erroring, so watch for it explicitly.
    if (typeof track.addEventListener === 'function') {
      const listener = () => this.handleDeviceLoss();
      this.trackEndedListener = listener;
      track.addEventListener('ended', listener);
    }

    this.patch({
      micState: 'listening',
      micLabel: track.label?.trim() ? track.label.trim() : null,
      selectedMicId: deviceId ?? this.snapshot.selectedMicId,
      micLevel: 0,
      micProgress: 0,
    });
    // Labels are only readable once permission has been granted.
    await this.refreshDevices();
    if (generation !== this.generation) return;

    this.startMetering(generation);
  }

  private startMetering(generation: number): void {
    const createContext = this.deps.createAudioContext;
    if (!createContext) {
      // No Web Audio: we cannot prove a voice was heard, and permission alone
      // must never pass the test.
      this.releaseMicResources();
      this.patch({ micState: 'unsupported' });
      return;
    }

    let context: AudioContextLike;
    try {
      context = createContext();
    } catch {
      this.releaseMicResources();
      this.patch({ micState: 'unsupported' });
      return;
    }
    this.audioContext = context;

    // Autoplay policies hand back a suspended context; resume inside the
    // gesture that started the test.
    if (context.state === 'suspended') {
      void Promise.resolve(context.resume()).catch(() => undefined);
    }

    try {
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      if ('smoothingTimeConstant' in analyser) analyser.smoothingTimeConstant = 0.4;
      const source = context.createMediaStreamSource(this.stream as MediaStreamLike);
      source.connect(analyser);
      this.analyser = analyser;
      this.source = source;
      this.buffer = new Uint8Array(analyser.fftSize);
    } catch {
      this.releaseMicResources();
      this.patch({ micState: 'busy' });
      return;
    }

    this.detector = new VoiceEnergyDetector(this.deps.voiceOptions);
    this.lastLevelEmit = 0;

    const tick = () => {
      if (this.disposed || generation !== this.generation) return;
      const analyser = this.analyser;
      const buffer = this.buffer;
      if (!analyser || !buffer) return;

      analyser.getByteTimeDomainData(buffer);
      const now = this.deps.now();
      const suppressed = now < this.suppressMeterUntil;
      const level = suppressed ? 0 : timeDomainLevel(buffer);

      // While the test sound plays we neither metre nor credit anything, so
      // speaker→mic bleed can never pass the microphone test.
      const verdict = suppressed ? 'listening' : this.detector.push(level, now);

      if (verdict === 'passed') {
        const label = this.snapshot.micLabel;
        this.releaseMicResources();
        this.patch({ micState: 'passed', micLevel: 0, micProgress: 1, micLabel: label });
        return;
      }
      if (verdict === 'no_voice') {
        const label = this.snapshot.micLabel;
        this.releaseMicResources();
        this.patch({ micState: 'no_voice', micLevel: 0, micProgress: 0, micLabel: label });
        return;
      }

      if (now - this.lastLevelEmit >= LEVEL_EMIT_INTERVAL_MS) {
        this.lastLevelEmit = now;
        this.patch({ micLevel: level, micProgress: this.detector.progress });
      }
      this.frameHandle = this.deps.scheduleFrame(tick);
    };

    this.frameHandle = this.deps.scheduleFrame(tick);
  }

  /**
   * Explicit device choice. The previous pass is invalidated and the test is
   * re-run immediately — the client asked for this device, so they are told
   * (through the state going back to "listening") what is being used.
   */
  selectMicrophone(deviceId: string | null): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (deviceId === this.snapshot.selectedMicId && this.snapshot.micState === 'passed') {
      return Promise.resolve();
    }
    this.releaseMicResources();
    this.patch({
      selectedMicId: deviceId,
      micState: 'not_tested',
      micLevel: 0,
      micProgress: 0,
      micLabel: null,
      deviceChanged: false,
    });
    return this.testMicrophone(deviceId);
  }

  /** Drops a passed/failed result back to "not tested" for a clean retry. */
  resetMicrophone(): void {
    this.releaseMicResources();
    this.patch({
      micState: 'not_tested',
      micLevel: 0,
      micProgress: 0,
      micLabel: null,
      deviceChanged: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Speaker
  // ---------------------------------------------------------------------------

  /**
   * Plays the locally generated test tone. Never autoplays: only this method
   * starts audio, and only the client's click calls it.
   */
  async playTestSound(): Promise<void> {
    if (this.disposed || this.snapshot.speakerState === 'playing') return;

    this.teardownPlayback();
    const element = this.audioElement ?? this.deps.createAudioElement();
    if (!element) {
      this.patch({ speakerState: 'failed', speakerErrorKey: 'meeting.setup.speaker.errPlayback' });
      return;
    }
    this.audioElement = element;

    this.patch({ speakerState: 'playing', speakerErrorKey: null });
    // Keep the tone out of the microphone metre for its whole length.
    this.suppressMeterUntil = this.deps.now() + TEST_TONE.totalMs + 250;

    if (
      this.snapshot.outputSelectionSupported &&
      this.snapshot.selectedOutputId &&
      typeof element.setSinkId === 'function'
    ) {
      // A rejected setSinkId is not a test failure — playback simply stays on
      // the system default output.
      await Promise.resolve(element.setSinkId(this.snapshot.selectedOutputId)).catch(() => undefined);
      if (this.disposed) return;
    }

    const finish = (next: SpeakerTestState, errorKey: string | null = null) => {
      this.teardownPlayback();
      if (this.disposed) return;
      this.patch({ speakerState: next, speakerErrorKey: errorKey });
    };

    const onEnded = () => finish('awaiting_answer');
    const onError = () => finish('failed', 'meeting.setup.speaker.errPlayback');
    element.addEventListener('ended', onEnded);
    element.addEventListener('error', onError);
    this.playbackCleanup = () => {
      element.removeEventListener('ended', onEnded);
      element.removeEventListener('error', onError);
    };
    // Some browsers never fire 'ended' for a data: URI — ask for the answer
    // anyway rather than leaving the client stuck on "playing".
    this.playbackTimer = this.deps.setTimer(() => {
      if (this.snapshot.speakerState === 'playing') finish('awaiting_answer');
    }, TEST_TONE.totalMs + PLAYBACK_GRACE_MS);

    try {
      element.src = testToneDataUri();
      if (element.currentTime !== undefined) element.currentTime = 0;
      await element.play();
    } catch {
      finish('failed', 'meeting.setup.speaker.errPlayback');
    }
  }

  /**
   * The only way the speaker test can pass: an explicit client answer. No
   * browser signal is treated as proof that the sound was heard.
   */
  confirmSpeaker(heard: boolean): void {
    if (this.disposed) return;
    this.teardownPlayback();
    this.patch({
      speakerState: heard ? 'passed' : 'not_heard',
      speakerErrorKey: heard ? null : 'meeting.setup.speaker.helpNotHeard',
    });
  }

  selectOutput(deviceId: string | null): void {
    if (this.disposed || !this.snapshot.outputSelectionSupported) return;
    // Changing the output invalidates the previous confirmation: the client
    // has not heard anything on the new device yet.
    this.patch({
      selectedOutputId: deviceId,
      speakerState: 'not_tested',
      speakerErrorKey: null,
    });
  }

  // ---------------------------------------------------------------------------
  // Device changes
  // ---------------------------------------------------------------------------

  private attachDeviceChange(): void {
    const mediaDevices = this.deps.mediaDevices;
    if (!mediaDevices) return;
    const listener = () => void this.handleDeviceChange();
    if (typeof mediaDevices.addEventListener === 'function') {
      mediaDevices.addEventListener('devicechange', listener);
      this.deviceChangeListener = listener;
    }
  }

  /**
   * Re-reads the device lists without touching any test state. Returns the raw
   * enumeration so callers can tell "no devices listed" from "not listed".
   */
  async refreshDevices(): Promise<RawDeviceInfo[] | null> {
    const mediaDevices = this.deps.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') return null;
    const devices = await mediaDevices.enumerateDevices().catch(() => null);
    if (!devices || this.disposed) return null;
    const micInputs = describeDevices(devices, 'audioinput', (index) => `Microphone ${index}`);
    const outputs = this.snapshot.outputSelectionSupported
      ? describeDevices(devices, 'audiooutput', (index) => `Speaker ${index}`)
      : [];
    const known = devices.length > 0;
    const selectedOutputId = isDeviceMissing(this.snapshot.selectedOutputId, outputs, known)
      ? null
      : this.snapshot.selectedOutputId;
    this.patch({ micInputs, outputs, selectedOutputId });
    return devices;
  }

  private async handleDeviceChange(): Promise<void> {
    if (this.disposed) return;
    const devices = await this.refreshDevices();
    if (this.disposed || !devices) return;
    const known = devices.length > 0;

    const inputs = this.snapshot.micInputs;
    const chosenGone = isDeviceMissing(this.snapshot.selectedMicId, inputs, known);
    const testedGone = isDeviceMissing(this.testedMicId, inputs, known);
    if (!chosenGone && !testedGone) return;

    // Never silently fall back to a device the client did not choose: drop the
    // selection and make them run the test again.
    this.invalidateMicPass(chosenGone ? null : this.snapshot.selectedMicId);
  }

  /** The active track ended — the microphone was unplugged or taken away. */
  private handleDeviceLoss(): void {
    if (this.disposed) return;
    this.invalidateMicPass(this.snapshot.selectedMicId);
    void this.refreshDevices();
  }

  /**
   * Invalidates a previous microphone pass. The Join button is gated on
   * micState === 'passed' plus !deviceChanged, so this disables it at once and
   * asks the client to test again. No device is silently switched in.
   */
  private invalidateMicPass(nextSelectedId: string | null): void {
    this.releaseMicResources();
    this.testedMicId = null;
    this.patch({
      micState: 'not_tested',
      micLevel: 0,
      micProgress: 0,
      micLabel: null,
      selectedMicId: nextSelectedId,
      deviceChanged: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Releases every temporary microphone resource. Idempotent, and safe to call
   * from any state — finish, failure, restart, device loss and unmount all end
   * up here.
   */
  private releaseMicResources(): void {
    this.generation += 1;

    if (this.frameHandle !== null) {
      this.deps.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
    if (this.track && this.trackEndedListener && typeof this.track.removeEventListener === 'function') {
      this.track.removeEventListener('ended', this.trackEndedListener);
    }
    this.trackEndedListener = null;
    try {
      this.source?.disconnect();
    } catch {
      // already disconnected
    }
    try {
      this.analyser?.disconnect?.();
    } catch {
      // analysers have no required disconnect
    }
    this.source = null;
    this.analyser = null;
    this.buffer = null;

    const context = this.audioContext;
    this.audioContext = null;
    if (context && context.state !== 'closed') {
      void Promise.resolve(context.close()).catch(() => undefined);
    }

    this.stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // a track that already ended throws on some browsers
      }
    });
    this.stream = null;
    this.track = null;
    this.detector.reset();
  }

  private teardownPlayback(): void {
    if (this.playbackTimer !== null) {
      this.deps.clearTimer(this.playbackTimer);
      this.playbackTimer = null;
    }
    this.playbackCleanup?.();
    this.playbackCleanup = null;
    try {
      this.audioElement?.pause?.();
    } catch {
      // pausing a never-started element is fine
    }
  }

  /** Full teardown — call on unmount and before joining the meeting. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseMicResources();
    this.teardownPlayback();
    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement.remove?.();
      this.audioElement = null;
    }
    const mediaDevices = this.deps.mediaDevices;
    if (mediaDevices && this.deviceChangeListener && typeof mediaDevices.removeEventListener === 'function') {
      mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
    }
    this.deviceChangeListener = null;
  }

  private patch(partial: Partial<DeviceCheckSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.onChange(this.snapshot);
  }
}

// -----------------------------------------------------------------------------
// Real-browser dependencies
// -----------------------------------------------------------------------------

/** Wires the controller to the actual browser APIs, feature-detecting each. */
export function browserDeviceCheckDeps(
  voiceOptions: Partial<VoiceDetectorOptions> = {},
): DeviceCheckDeps {
  const mediaDevices =
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? (navigator.mediaDevices as unknown as MediaDevicesLike)
      : null;

  const AudioContextCtor =
    typeof window !== 'undefined'
      ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        null)
      : null;

  return {
    mediaDevices,
    createAudioContext: AudioContextCtor
      ? () => new AudioContextCtor() as unknown as AudioContextLike
      : null,
    createAudioElement: () => {
      if (typeof document === 'undefined') return null;
      const element = document.createElement('audio');
      element.preload = 'auto';
      element.style.display = 'none';
      element.setAttribute('data-device-test-audio', 'true');
      document.body.appendChild(element);
      return element as unknown as AudioElementLike;
    },
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    scheduleFrame: (callback) =>
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => callback())
        : (window.setTimeout(callback, 1000 / 30) as unknown as number),
    cancelFrame: (handle) => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
      else window.clearTimeout(handle);
    },
    setTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearTimer: (handle) => window.clearTimeout(handle),
    outputSelectionSupported:
      typeof window !== 'undefined' &&
      typeof HTMLMediaElement !== 'undefined' &&
      'setSinkId' in HTMLMediaElement.prototype &&
      typeof navigator?.mediaDevices?.enumerateDevices === 'function',
    voiceOptions: { ...DEFAULT_VOICE_OPTIONS, ...voiceOptions },
  };
}
