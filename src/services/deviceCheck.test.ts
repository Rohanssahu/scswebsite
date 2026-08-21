// Pre-join device check — the rules that decide whether a client may join.
// These are the guarantees the lobby depends on, so they are tested directly:
// permission alone never passes, background noise never passes, and the Join
// button stays shut until both checks really passed.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VOICE_OPTIONS,
  VoiceEnergyDetector,
  buildChecklist,
  canJoinConsultation,
  classifyMediaError,
  describeDevices,
  deviceCheckErrorCategory,
  hasMediaDeviceSupport,
  isDeviceMissing,
  joinBlockReasons,
  micGuidanceKey,
  supportsOutputSelection,
  timeDomainLevel,
  type JoinGateInput,
  type MicTestState,
  type SpeakerTestState,
} from '@/services/deviceCheck';
import { ERROR_CATEGORIES } from '@/utils/consultationAnalytics';

// --- helpers -----------------------------------------------------------------

const gate = (overrides: Partial<JoinGateInput> = {}): JoinGateInput => ({
  meetingReady: true,
  verificationComplete: true,
  micState: 'passed',
  speakerState: 'passed',
  deviceChanged: false,
  joining: false,
  ...overrides,
});

/** A square wave whose RMS is `level / 4` — i.e. timeDomainLevel === level. */
const frameAtLevel = (level: number, size = 256): Uint8Array => {
  const amplitude = Math.round((level / 4) * 128);
  const frame = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) frame[i] = 128 + (i % 2 === 0 ? amplitude : -amplitude);
  return frame;
};

/** Feeds a constant level for `ms` at 60 fps and returns the last verdict. */
const feed = (detector: VoiceEnergyDetector, level: number, ms: number, startAt = 0): string => {
  let verdict = 'listening';
  const step = 1000 / 60;
  for (let t = startAt; t <= startAt + ms; t += step) {
    verdict = detector.push(level, t);
    if (verdict !== 'listening') return verdict;
  }
  return verdict;
};

// --- capability detection ----------------------------------------------------

describe('hasMediaDeviceSupport', () => {
  it('is false when the browser has no media-device API at all', () => {
    expect(hasMediaDeviceSupport(undefined)).toBe(false);
    expect(hasMediaDeviceSupport({})).toBe(false);
    expect(hasMediaDeviceSupport({ mediaDevices: {} })).toBe(false);
  });

  it('is true only when getUserMedia is callable', () => {
    expect(hasMediaDeviceSupport({ mediaDevices: { getUserMedia: () => undefined } })).toBe(true);
  });
});

describe('supportsOutputSelection', () => {
  it('is false on a Safari/iOS-shaped browser with no setSinkId', () => {
    expect(
      supportsOutputSelection({
        HTMLMediaElement: { prototype: { play: () => undefined } },
        navigator: { mediaDevices: { getUserMedia: () => undefined, enumerateDevices: () => undefined } },
      }),
    ).toBe(false);
  });

  it('is true when setSinkId and enumerateDevices both exist', () => {
    expect(
      supportsOutputSelection({
        HTMLMediaElement: { prototype: { setSinkId: () => undefined } },
        navigator: { mediaDevices: { getUserMedia: () => undefined, enumerateDevices: () => undefined } },
      }),
    ).toBe(true);
  });

  it('is false without enumerateDevices, so no dead picker is offered', () => {
    expect(
      supportsOutputSelection({
        HTMLMediaElement: { prototype: { setSinkId: () => undefined } },
        navigator: { mediaDevices: { getUserMedia: () => undefined } },
      }),
    ).toBe(false);
  });
});

// --- error classification ----------------------------------------------------

describe('classifyMediaError', () => {
  const cases: Array<[string, MicTestState]> = [
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'no_device'],
    ['DevicesNotFoundError', 'no_device'],
    ['OverconstrainedError', 'no_device'],
    ['NotReadableError', 'busy'],
    ['TrackStartError', 'busy'],
    ['AbortError', 'busy'],
    ['TypeError', 'unsupported'],
  ];

  it.each(cases)('maps %s to %s', (name, expected) => {
    expect(classifyMediaError({ name })).toBe(expected);
  });

  it('never guesses "denied" for an unknown failure', () => {
    expect(classifyMediaError(new Error('boom'))).toBe('busy');
    expect(classifyMediaError(undefined)).toBe('busy');
  });

  it('offers specific guidance for every failure state', () => {
    expect(micGuidanceKey('denied')).toBe('meeting.setup.mic.helpDenied');
    expect(micGuidanceKey('no_device')).toBe('meeting.setup.mic.helpNoDevice');
    expect(micGuidanceKey('no_voice')).toBe('meeting.setup.mic.helpNoAudio');
    expect(micGuidanceKey('busy')).toBe('meeting.setup.mic.helpBusy');
    expect(micGuidanceKey('passed')).toBeNull();
    expect(micGuidanceKey('listening')).toBeNull();
  });
});

// --- level maths -------------------------------------------------------------

describe('timeDomainLevel', () => {
  it('reports silence as zero', () => {
    expect(timeDomainLevel(new Uint8Array(128).fill(128))).toBe(0);
  });

  it('scales a known waveform predictably', () => {
    expect(timeDomainLevel(frameAtLevel(0.5))).toBeCloseTo(0.5, 1);
  });

  it('never exceeds 1 for a clipped signal', () => {
    const clipped = new Uint8Array(64);
    for (let i = 0; i < clipped.length; i += 1) clipped[i] = i % 2 === 0 ? 255 : 0;
    expect(timeDomainLevel(clipped)).toBe(1);
  });

  it('handles an empty frame', () => {
    expect(timeDomainLevel(new Uint8Array(0))).toBe(0);
  });
});

// --- voice detection ---------------------------------------------------------

describe('VoiceEnergyDetector', () => {
  it('passes on sustained speech-level input', () => {
    const detector = new VoiceEnergyDetector();
    expect(feed(detector, 0.5, DEFAULT_VOICE_OPTIONS.requiredVoicedMs + 200)).toBe('passed');
  });

  it('never passes on silence — permission alone is not a working microphone', () => {
    const detector = new VoiceEnergyDetector({ timeoutMs: 3000 });
    expect(feed(detector, 0, 4000)).toBe('no_voice');
    expect(detector.creditedMs).toBe(0);
  });

  it('never passes on steady background noise', () => {
    const detector = new VoiceEnergyDetector({ timeoutMs: 5000 });
    // Room hum well under the absolute speech floor, for far longer than a
    // passing amount of real speech would take.
    expect(feed(detector, 0.06, 5200)).toBe('no_voice');
    expect(detector.creditedMs).toBe(0);
  });

  it('ignores tiny background spikes that never form a real segment', () => {
    const detector = new VoiceEnergyDetector({ timeoutMs: 6000 });
    let verdict = 'listening';
    // 40 keyboard-click-sized bursts: loud, but each far shorter than a word.
    for (let burst = 0; burst < 40 && verdict === 'listening'; burst += 1) {
      const base = burst * 150;
      verdict = feed(detector, 0.9, 80, base); // 80 ms spike
      if (verdict !== 'listening') break;
      verdict = feed(detector, 0.02, 60, base + 80);
    }
    expect(verdict).not.toBe('passed');
    expect(detector.creditedMs).toBe(0);
  });

  it('credits speech only in runs long enough to be a word', () => {
    const detector = new VoiceEnergyDetector({ minSegmentMs: 250, requiredVoicedMs: 700, timeoutMs: 9000 });
    // three ~300 ms words with gaps → passes
    let verdict = 'listening';
    for (let word = 0; word < 3 && verdict === 'listening'; word += 1) {
      const base = word * 600;
      verdict = feed(detector, 0.45, 300, base);
      if (verdict !== 'listening') break;
      verdict = feed(detector, 0.01, 250, base + 300);
    }
    expect(verdict).toBe('passed');
  });

  it('rises above a noisy room floor before crediting anything', () => {
    const detector = new VoiceEnergyDetector({ timeoutMs: 8000 });
    // Loud room: the floor climbs, so quiet-but-above-absolute audio is not
    // automatically speech.
    feed(detector, 0.09, 2000);
    expect(detector.creditedMs).toBe(0);
    expect(feed(detector, 0.6, 1000, 2000)).toBe('passed');
  });

  it('cannot be passed by a throttled tab claiming huge frame gaps', () => {
    const detector = new VoiceEnergyDetector();
    detector.push(0.8, 0);
    // One frame claiming 10 s of speech is capped to maxFrameMs, so it credits
    // 120 ms — not a pass — and the test still times out as "no voice".
    expect(detector.push(0.8, 10_000)).toBe('listening');
    expect(detector.creditedMs).toBeLessThanOrEqual(DEFAULT_VOICE_OPTIONS.maxFrameMs);
    expect(detector.push(0.8, 13_000)).toBe('no_voice');
  });

  it('reports progress and peak level for the meter', () => {
    const detector = new VoiceEnergyDetector({ requiredVoicedMs: 1000, timeoutMs: 9000 });
    feed(detector, 0.4, 400);
    expect(detector.progress).toBeGreaterThan(0);
    expect(detector.progress).toBeLessThan(1);
    expect(detector.peakLevel).toBeCloseTo(0.4, 5);
  });

  it('starts clean after reset', () => {
    const detector = new VoiceEnergyDetector({ timeoutMs: 2000 });
    feed(detector, 0.5, 300);
    detector.reset();
    expect(detector.creditedMs).toBe(0);
    expect(detector.peakLevel).toBe(0);
    expect(detector.push(0, 50_000)).toBe('listening'); // clock restarts too
  });
});

// --- device lists ------------------------------------------------------------

describe('describeDevices', () => {
  const devices = [
    { kind: 'audioinput', deviceId: 'mic-1', label: 'Headset mic' },
    { kind: 'audioinput', deviceId: 'mic-2', label: '' },
    { kind: 'audioinput', deviceId: '', label: 'not yet permitted' },
    { kind: 'audiooutput', deviceId: 'out-1', label: 'Speakers' },
    { kind: 'videoinput', deviceId: 'cam-1', label: 'Camera' },
  ];

  it('keeps only the requested kind and drops id-less entries', () => {
    expect(describeDevices(devices, 'audioinput', (i) => `Microphone ${i}`)).toEqual([
      { deviceId: 'mic-1', label: 'Headset mic' },
      { deviceId: 'mic-2', label: 'Microphone 2' },
    ]);
  });

  it('handles a missing device list', () => {
    expect(describeDevices(null, 'audiooutput', () => 'x')).toEqual([]);
  });
});

describe('isDeviceMissing', () => {
  const options = [{ deviceId: 'mic-1', label: 'A' }];

  it('detects an unplugged device', () => {
    expect(isDeviceMissing('mic-2', options)).toBe(true);
  });

  it('is false for a device still present, or when nothing was chosen', () => {
    expect(isDeviceMissing('mic-1', options)).toBe(false);
    expect(isDeviceMissing(null, options)).toBe(false);
  });

  it('does not treat an empty enumeration as "everything unplugged"', () => {
    // Safari before permission returns nothing — that must not invalidate.
    expect(isDeviceMissing('mic-1', [])).toBe(false);
  });

  it('does detect the only microphone being unplugged', () => {
    // The browser DID enumerate (it still listed the speakers), and the tested
    // input is not there any more.
    expect(isDeviceMissing('mic-1', [], true)).toBe(true);
  });
});

// --- the join gate -----------------------------------------------------------

describe('canJoinConsultation', () => {
  it('allows joining only when every condition holds', () => {
    expect(canJoinConsultation(gate())).toBe(true);
    expect(joinBlockReasons(gate())).toEqual([]);
  });

  const blockedCases: Array<[string, Partial<JoinGateInput>]> = [
    ['meeting data is invalid', { meetingReady: false }],
    ['security verification is incomplete', { verificationComplete: false }],
    ['the microphone was never tested', { micState: 'not_tested' }],
    ['the microphone test is still running', { micState: 'listening' }],
    ['permission was denied', { micState: 'denied' }],
    ['no microphone was found', { micState: 'no_device' }],
    ['the microphone is busy', { micState: 'busy' }],
    ['no voice was heard', { micState: 'no_voice' }],
    ['the browser is unsupported', { micState: 'unsupported' }],
    ['the speaker was never tested', { speakerState: 'not_tested' }],
    ['the test sound is still playing', { speakerState: 'playing' }],
    ['the client has not answered yet', { speakerState: 'awaiting_answer' }],
    ['the client could not hear it', { speakerState: 'not_heard' }],
    ['playback failed', { speakerState: 'failed' }],
    ['a device changed after testing', { deviceChanged: true }],
    ['a join is already in progress', { joining: true }],
  ];

  it.each(blockedCases)('keeps Join disabled when %s', (_label, overrides) => {
    expect(canJoinConsultation(gate(overrides))).toBe(false);
  });

  it('never lets the microphone check alone unlock joining', () => {
    expect(canJoinConsultation(gate({ speakerState: 'awaiting_answer' }))).toBe(false);
  });

  it('never lets the speaker check alone unlock joining', () => {
    expect(canJoinConsultation(gate({ micState: 'no_voice' }))).toBe(false);
  });

  it('invalidates a passed microphone as soon as a device changes', () => {
    const passed = gate();
    expect(canJoinConsultation(passed)).toBe(true);
    const afterUnplug = { ...passed, deviceChanged: true };
    expect(canJoinConsultation(afterUnplug)).toBe(false);
    expect(joinBlockReasons(afterUnplug)).toContain('device_changed');
  });

  it('reports the first blocking reason for the button hint', () => {
    expect(joinBlockReasons(gate({ verificationComplete: false, micState: 'not_tested' }))).toEqual([
      'verification',
      'microphone',
    ]);
  });
});

// --- checklist ---------------------------------------------------------------

describe('buildChecklist', () => {
  it('is all pending before anything is tested', () => {
    expect(
      buildChecklist(
        gate({
          verificationComplete: false,
          micState: 'not_tested',
          speakerState: 'not_tested',
        }),
      ),
    ).toEqual([
      { id: 'mic_detected', status: 'pending' },
      { id: 'voice_confirmed', status: 'pending' },
      { id: 'speaker_confirmed', status: 'pending' },
      { id: 'verification', status: 'pending' },
    ]);
  });

  it('separates "device found" from "voice heard"', () => {
    const listening = buildChecklist(gate({ micState: 'listening' }));
    expect(listening[0].status).toBe('passed');
    expect(listening[1].status).toBe('testing');

    const noVoice = buildChecklist(gate({ micState: 'no_voice' }));
    expect(noVoice[0].status).toBe('passed');
    expect(noVoice[1].status).toBe('failed');
  });

  it('marks both microphone rows failed when the device is gone', () => {
    const denied = buildChecklist(gate({ micState: 'denied' }));
    expect(denied[0].status).toBe('failed');
    expect(denied[1].status).toBe('failed');
  });

  it('marks the microphone rows failed after a disconnect, even if it passed', () => {
    const changed = buildChecklist(gate({ deviceChanged: true }));
    expect(changed[0].status).toBe('failed');
    expect(changed[1].status).toBe('failed');
  });

  it('shows the speaker as testing until the client answers', () => {
    expect(buildChecklist(gate({ speakerState: 'awaiting_answer' }))[2].status).toBe('testing');
    expect(buildChecklist(gate({ speakerState: 'not_heard' }))[2].status).toBe('failed');
    expect(buildChecklist(gate({ speakerState: 'passed' }))[2].status).toBe('passed');
  });

  it('is all passed exactly when joining is allowed', () => {
    const ready = gate();
    expect(buildChecklist(ready).every((item) => item.status === 'passed')).toBe(
      canJoinConsultation(ready),
    );
  });
});

// --- analytics privacy -------------------------------------------------------

describe('deviceCheckErrorCategory', () => {
  it('only ever returns allowlisted coarse categories', () => {
    const states: Array<MicTestState | SpeakerTestState> = [
      'denied',
      'no_device',
      'busy',
      'no_voice',
      'unsupported',
      'failed',
      'not_heard',
    ];
    for (const state of states) {
      const category = deviceCheckErrorCategory(state);
      expect(category).not.toBeNull();
      expect(ERROR_CATEGORIES as readonly string[]).toContain(category as string);
    }
  });

  it('reports nothing for healthy or in-progress states', () => {
    for (const state of ['not_tested', 'requesting', 'listening', 'passed', 'playing'] as const) {
      expect(deviceCheckErrorCategory(state)).toBeNull();
    }
  });
});
