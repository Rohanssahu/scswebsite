// =============================================================================
// Speaker-test sound — generated locally, in the browser, at no cost.
//
// The lobby speaker check needs a short, non-startling sound that the client
// triggers explicitly. It is synthesized here as a 16-bit mono WAV and played
// through an HTMLAudioElement (rather than straight into an AudioContext) for
// one concrete reason: only a media element can be routed to a chosen output
// device via setSinkId. No network request, no TTS provider, no paid API, and
// nothing is downloaded or stored.
//
// The spoken sentence recommended for this check is shown on screen next to
// the button ("If you can hear this message clearly, your speaker is
// working."), so the client always knows what they should be hearing.
// =============================================================================

export interface ToneNote {
  /** Frequency in Hz. */
  frequency: number;
  startMs: number;
  durationMs: number;
}

export interface ToneSpec {
  sampleRate: number;
  totalMs: number;
  /** Peak amplitude, 0..1. Kept low so the sound can never startle. */
  gain: number;
  /** Linear fade-in of each note, in ms — removes the click of a hard onset. */
  attackMs: number;
  notes: readonly ToneNote[];
}

/** A gentle two-note chime (D5 → A5), ~0.75 s, well below full scale. */
export const TEST_TONE: ToneSpec = {
  sampleRate: 44_100,
  totalMs: 750,
  gain: 0.18,
  attackMs: 18,
  notes: [
    { frequency: 587.33, startMs: 0, durationMs: 320 },
    { frequency: 880, startMs: 300, durationMs: 420 },
  ],
};

/** One mono float sample of the spec at time `t` seconds. */
function sampleAt(spec: ToneSpec, t: number): number {
  let value = 0;
  for (const note of spec.notes) {
    const start = note.startMs / 1000;
    const end = start + note.durationMs / 1000;
    if (t < start || t >= end) continue;
    const local = t - start;
    const attack = spec.attackMs / 1000;
    const envelope =
      (local < attack ? local / attack : 1) * Math.exp((-3.2 * local) / (note.durationMs / 1000));
    value += Math.sin(2 * Math.PI * note.frequency * local) * envelope;
  }
  // Two overlapping notes can sum above 1 before scaling; halve then apply gain.
  return Math.max(-1, Math.min(1, value / 2)) * spec.gain;
}

/** Renders the spec as a complete RIFF/WAVE byte stream (16-bit mono PCM). */
export function renderToneWav(spec: ToneSpec = TEST_TONE): Uint8Array {
  const frames = Math.max(1, Math.round((spec.sampleRate * spec.totalMs) / 1000));
  const dataBytes = frames * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, spec.sampleRate, true);
  view.setUint32(28, spec.sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < frames; i += 1) {
    const value = sampleAt(spec, i / spec.sampleRate);
    view.setInt16(44 + i * 2, Math.round(value * 32_767), true);
  }
  return new Uint8Array(buffer);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

let cachedUri: string | null = null;

/**
 * `data:` URI for the test tone. Cached, so repeated "Play again" clicks never
 * re-synthesize (and never allocate a second Blob URL that must be revoked).
 */
export function testToneDataUri(spec: ToneSpec = TEST_TONE): string {
  if (spec === TEST_TONE && cachedUri) return cachedUri;
  const uri = `data:audio/wav;base64,${toBase64(renderToneWav(spec))}`;
  if (spec === TEST_TONE) cachedUri = uri;
  return uri;
}
