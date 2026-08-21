// =============================================================================
// Pre-join device check — pure rules (no browser APIs, no side effects).
//
// This module owns every decision the mandatory microphone + speaker check
// makes, so the rules are unit-tested without a DOM:
//   * how a getUserMedia rejection maps to a client-facing state,
//   * when a stream of input levels counts as a real human voice rather than
//     background noise or a single spike,
//   * exactly when "Join consultation" may be enabled,
//   * what the pre-join checklist shows.
//
// PRIVACY: nothing here accepts or returns a raw device id for storage. Device
// ids live in browser memory only (DeviceCheckController) and are used solely
// to constrain getUserMedia / LiveKit capture. `deviceCheckErrorCategory` is
// the ONLY value derived from a device check that may reach analytics, and it
// is a fixed coarse enum.
// =============================================================================

import type { ErrorCategory } from '@/utils/consultationAnalytics';

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

/** Microphone-test states. Mirrors the client-facing copy 1:1. */
export type MicTestState =
  | 'not_tested'
  | 'requesting' // permission prompt is open
  | 'listening' // permission granted, waiting to hear a voice
  | 'passed' // meaningful voice energy heard
  | 'no_device' // no audio input present (or the chosen one vanished)
  | 'denied' // permission blocked
  | 'busy' // device present but not readable (in use by another app)
  | 'no_voice' // device works, nothing audible was said
  | 'unsupported'; // browser has no mediaDevices/getUserMedia

/**
 * Speaker-test states. A browser cannot prove the client physically heard the
 * tone, so 'passed' is only ever reached through an explicit human answer.
 */
export type SpeakerTestState =
  | 'not_tested'
  | 'playing'
  | 'awaiting_answer' // playback finished, waiting for yes/no
  | 'passed' // client answered "Yes, I can hear it"
  | 'not_heard' // client answered "No, I cannot hear it"
  | 'failed'; // playback itself failed (blocked/decode error)

/** Mic states that mean the test did not succeed and needs a retry. */
export const MIC_FAILURE_STATES: readonly MicTestState[] = [
  'no_device',
  'denied',
  'busy',
  'no_voice',
  'unsupported',
];

export const isMicFailure = (state: MicTestState): boolean => MIC_FAILURE_STATES.includes(state);

/** Speaker states that mean the client should try the sound again. */
export const isSpeakerFailure = (state: SpeakerTestState): boolean =>
  state === 'failed' || state === 'not_heard';

// -----------------------------------------------------------------------------
// Capability + error classification
// -----------------------------------------------------------------------------

/** Minimal shape we need from `navigator` — keeps this module DOM-free. */
export interface MediaCapableNavigator {
  mediaDevices?: {
    getUserMedia?: unknown;
    enumerateDevices?: unknown;
    addEventListener?: unknown;
  };
}

/** True when this browser exposes navigator.mediaDevices.getUserMedia. */
export function hasMediaDeviceSupport(nav: MediaCapableNavigator | undefined | null): boolean {
  return typeof nav?.mediaDevices?.getUserMedia === 'function';
}

/** True when device enumeration (and therefore a device picker) is possible. */
export function hasEnumerateSupport(nav: MediaCapableNavigator | undefined | null): boolean {
  return typeof nav?.mediaDevices?.enumerateDevices === 'function';
}

/**
 * Maps a getUserMedia rejection to a client-facing microphone state.
 *
 * The unknown fallback is 'busy' ("in use or unavailable") rather than
 * 'denied': claiming the client blocked permission when they did not sends
 * them into browser settings for nothing.
 */
export function classifyMediaError(error: unknown): Extract<MicTestState, 'denied' | 'no_device' | 'busy' | 'unsupported'> {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name: unknown }).name)
      : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    // Overconstrained means the exact deviceId we asked for is gone — from the
    // client's point of view, the microphone they tested is no longer there.
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'no_device';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    case 'TypeError':
      return 'unsupported';
    default:
      return 'busy';
  }
}

/** i18n key holding the guidance paragraph for a failed microphone state. */
export function micGuidanceKey(state: MicTestState): string | null {
  switch (state) {
    case 'denied':
      return 'meeting.setup.mic.helpDenied';
    case 'no_device':
      return 'meeting.setup.mic.helpNoDevice';
    case 'no_voice':
      return 'meeting.setup.mic.helpNoAudio';
    case 'busy':
      return 'meeting.setup.mic.helpBusy';
    case 'unsupported':
      return 'meeting.setup.mic.helpUnsupported';
    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// Voice-energy detection
// -----------------------------------------------------------------------------

export interface VoiceDetectorOptions {
  /** Absolute level (0..1) below which audio is never treated as speech. */
  speechLevel: number;
  /** How far above the measured noise floor a frame must sit to count. */
  noiseMargin: number;
  /** A qualifying run shorter than this is a spike (door, keyboard, click). */
  minSegmentMs: number;
  /** Total qualifying speech required before the test passes. */
  requiredVoicedMs: number;
  /** Give up and report 'no_voice' after this long without enough speech. */
  timeoutMs: number;
  /** Cap applied to a single frame's dt, so a throttled tab cannot pass. */
  maxFrameMs: number;
}

export const DEFAULT_VOICE_OPTIONS: VoiceDetectorOptions = {
  speechLevel: 0.1,
  noiseMargin: 0.05,
  minSegmentMs: 250,
  requiredVoicedMs: 700,
  timeoutMs: 12_000,
  maxFrameMs: 120,
};

export type VoiceVerdict = 'listening' | 'passed' | 'no_voice';

/**
 * Decides whether what the analyser hears is a real voice.
 *
 * Rules, in order of importance:
 *   1. a frame only counts when it is BOTH above an absolute floor and clearly
 *      above the room's own noise floor (tracked as an EMA of quiet frames);
 *   2. qualifying frames only count in runs of at least `minSegmentMs`, so
 *      isolated noise spikes accumulate nothing;
 *   3. enough total speech (`requiredVoicedMs`) must be heard;
 *   4. after `timeoutMs` the verdict is 'no_voice' — never 'passed'.
 *
 * Permission alone can therefore never pass the test.
 */
export class VoiceEnergyDetector {
  private readonly options: VoiceDetectorOptions;
  private startedAt: number | null = null;
  private lastAt: number | null = null;
  private noiseFloor = 0;
  private segmentMs = 0;
  private voicedMs = 0;
  private peak = 0;

  constructor(options: Partial<VoiceDetectorOptions> = {}) {
    this.options = { ...DEFAULT_VOICE_OPTIONS, ...options };
  }

  /** Total speech credited so far, in ms (completed runs only). */
  get creditedMs(): number {
    return this.voicedMs;
  }

  /** Loudest level seen — drives the "check the input level" hint. */
  get peakLevel(): number {
    return this.peak;
  }

  /** 0..1 progress towards passing, for the meter's secondary indicator. */
  get progress(): number {
    const total = this.voicedMs + (this.segmentMs >= this.options.minSegmentMs ? this.segmentMs : 0);
    return Math.min(1, total / this.options.requiredVoicedMs);
  }

  reset(): void {
    this.startedAt = null;
    this.lastAt = null;
    this.noiseFloor = 0;
    this.segmentMs = 0;
    this.voicedMs = 0;
    this.peak = 0;
  }

  /** Feeds one analyser frame. `level` is 0..1, `atMs` a monotonic timestamp. */
  push(level: number, atMs: number): VoiceVerdict {
    const safeLevel = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
    if (this.startedAt === null) {
      this.startedAt = atMs;
      this.lastAt = atMs;
      return 'listening';
    }
    const dt = Math.min(this.options.maxFrameMs, Math.max(0, atMs - (this.lastAt ?? atMs)));
    this.lastAt = atMs;
    this.peak = Math.max(this.peak, safeLevel);

    // Quiet frames teach us the room's noise floor; loud frames never do.
    if (safeLevel < this.options.speechLevel) {
      this.noiseFloor = this.noiseFloor * 0.9 + safeLevel * 0.1;
    }
    const threshold = Math.max(this.options.speechLevel, this.noiseFloor + this.options.noiseMargin);

    if (safeLevel >= threshold) {
      this.segmentMs += dt;
    } else if (this.segmentMs > 0) {
      if (this.segmentMs >= this.options.minSegmentMs) this.voicedMs += this.segmentMs;
      this.segmentMs = 0;
    }

    const credited =
      this.voicedMs + (this.segmentMs >= this.options.minSegmentMs ? this.segmentMs : 0);
    if (credited >= this.options.requiredVoicedMs) return 'passed';
    if (atMs - this.startedAt >= this.options.timeoutMs) return 'no_voice';
    return 'listening';
  }
}

/**
 * RMS of one time-domain analyser frame (Uint8, 128 = silence), scaled so
 * normal speech lands around 0.2–0.6 and clipping approaches 1.
 */
export function timeDomainLevel(frame: Uint8Array | ArrayLike<number>): number {
  const length = frame.length;
  if (!length) return 0;
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const sample = (Number(frame[i]) - 128) / 128;
    sum += sample * sample;
  }
  return Math.min(1, Math.sqrt(sum / length) * 4);
}

// -----------------------------------------------------------------------------
// Device lists (labels/ids stay in memory — never persisted or logged)
// -----------------------------------------------------------------------------

export interface DeviceOption {
  deviceId: string;
  /** Display-only label. Never logged, never sent anywhere. */
  label: string;
}

export interface RawDeviceInfo {
  kind: string;
  deviceId: string;
  label: string;
}

/**
 * Filters + labels the devices of one kind. Entries with an empty deviceId
 * (browsers hand those out before permission) are dropped, and unnamed
 * devices get a positional fallback label so the picker is never blank.
 */
export function describeDevices(
  devices: readonly RawDeviceInfo[] | null | undefined,
  kind: 'audioinput' | 'audiooutput',
  fallbackLabel: (index: number) => string,
): DeviceOption[] {
  if (!devices) return [];
  return devices
    .filter((device) => device.kind === kind && Boolean(device.deviceId))
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label.trim() || fallbackLabel(index + 1),
    }));
}

/**
 * True when the previously tested device is no longer in the device list.
 *
 * `enumerationKnown` separates the two reasons an empty list can happen:
 * "enumeration told us nothing" (Safari before permission — never invalidate)
 * from "the browser listed its devices and this one is not among them" (the
 * only microphone was unplugged — do invalidate). Callers holding the raw
 * enumeration pass `raw.length > 0`; the default is the safe reading.
 */
export function isDeviceMissing(
  deviceId: string | null,
  options: readonly DeviceOption[],
  enumerationKnown: boolean = options.length > 0,
): boolean {
  if (!deviceId || !enumerationKnown) return false;
  return !options.some((option) => option.deviceId === deviceId);
}

/**
 * Feature-detects per-element output routing. Safari/iOS ships neither
 * setSinkId nor selectAudioOutput, so the UI must say output selection is
 * managed by the device instead of showing a dead picker.
 */
export function supportsOutputSelection(scope: {
  HTMLMediaElement?: { prototype?: object } | undefined;
  navigator?: MediaCapableNavigator & { mediaDevices?: { selectAudioOutput?: unknown } };
}): boolean {
  const proto = scope.HTMLMediaElement?.prototype;
  const hasSinkId = Boolean(proto) && typeof proto === 'object' && 'setSinkId' in (proto as object);
  const hasEnumerate = hasEnumerateSupport(scope.navigator);
  return hasSinkId && hasEnumerate;
}

// -----------------------------------------------------------------------------
// Join gating
// -----------------------------------------------------------------------------

export interface JoinGateInput {
  /** Meeting resolved, joinable and access-proven. */
  meetingReady: boolean;
  /** Turnstile (or whichever security check is required) produced a token. */
  verificationComplete: boolean;
  micState: MicTestState;
  speakerState: SpeakerTestState;
  /** A device was unplugged/changed after the microphone test passed. */
  deviceChanged: boolean;
  /** A join request is already running. */
  joining: boolean;
}

export type JoinBlockReason =
  | 'meeting'
  | 'verification'
  | 'microphone'
  | 'speaker'
  | 'device_changed'
  | 'joining';

/**
 * THE join gate. Every condition must hold; there is no bypass, and camera
 * state is deliberately absent — video never blocks joining.
 */
export function joinBlockReasons(input: JoinGateInput): JoinBlockReason[] {
  const reasons: JoinBlockReason[] = [];
  if (!input.meetingReady) reasons.push('meeting');
  if (!input.verificationComplete) reasons.push('verification');
  if (input.micState !== 'passed') reasons.push('microphone');
  if (input.speakerState !== 'passed') reasons.push('speaker');
  if (input.deviceChanged) reasons.push('device_changed');
  if (input.joining) reasons.push('joining');
  return reasons;
}

export function canJoinConsultation(input: JoinGateInput): boolean {
  return joinBlockReasons(input).length === 0;
}

// -----------------------------------------------------------------------------
// Checklist
// -----------------------------------------------------------------------------

export type ChecklistStatus = 'pending' | 'testing' | 'passed' | 'failed';

export type ChecklistItemId = 'mic_detected' | 'voice_confirmed' | 'speaker_confirmed' | 'verification';

export interface ChecklistItem {
  id: ChecklistItemId;
  status: ChecklistStatus;
}

export const CHECKLIST_ORDER: readonly ChecklistItemId[] = [
  'mic_detected',
  'voice_confirmed',
  'speaker_confirmed',
  'verification',
];

function micDetectedStatus(state: MicTestState, deviceChanged: boolean): ChecklistStatus {
  if (deviceChanged) return 'failed';
  switch (state) {
    case 'not_tested':
      return 'pending';
    case 'requesting':
      return 'testing';
    case 'listening':
    case 'passed':
    case 'no_voice':
      return 'passed'; // a device was found and opened
    default:
      return 'failed';
  }
}

function voiceStatus(state: MicTestState, deviceChanged: boolean): ChecklistStatus {
  if (deviceChanged) return 'failed';
  switch (state) {
    case 'passed':
      return 'passed';
    case 'listening':
      return 'testing';
    case 'not_tested':
      return 'pending';
    case 'requesting':
      return 'testing';
    default:
      return 'failed';
  }
}

function speakerStatus(state: SpeakerTestState): ChecklistStatus {
  switch (state) {
    case 'passed':
      return 'passed';
    case 'playing':
    case 'awaiting_answer':
      return 'testing';
    case 'not_tested':
      return 'pending';
    default:
      return 'failed';
  }
}

/** Row statuses for the checklist rendered beside the Join button. */
export function buildChecklist(input: JoinGateInput): ChecklistItem[] {
  return [
    { id: 'mic_detected', status: micDetectedStatus(input.micState, input.deviceChanged) },
    { id: 'voice_confirmed', status: voiceStatus(input.micState, input.deviceChanged) },
    { id: 'speaker_confirmed', status: speakerStatus(input.speakerState) },
    { id: 'verification', status: input.verificationComplete ? 'passed' : 'pending' },
  ];
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------

/**
 * The ONLY device-check value allowed to leave the browser: a coarse category
 * from the analytics allowlist. Never a label, never a device id.
 */
export function deviceCheckErrorCategory(state: MicTestState | SpeakerTestState): ErrorCategory | null {
  switch (state) {
    case 'denied':
      return 'mic_denied';
    case 'no_device':
    case 'busy':
      return 'mic_unavailable';
    case 'no_voice':
      return 'mic_no_voice';
    case 'unsupported':
      return 'unsupported_browser';
    case 'failed':
    case 'not_heard':
      return 'speaker_unconfirmed';
    default:
      return null;
  }
}
