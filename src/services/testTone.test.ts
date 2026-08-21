// The lobby's speaker-test sound: generated locally, so no paid API, no
// network request and no downloaded asset is involved.
import { describe, expect, it } from 'vitest';
import { TEST_TONE, renderToneWav, testToneDataUri } from '@/services/testTone';

const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

describe('renderToneWav', () => {
  const wav = renderToneWav();

  it('produces a well-formed 16-bit mono WAV', () => {
    expect(ascii(wav, 0, 4)).toBe('RIFF');
    expect(ascii(wav, 8, 4)).toBe('WAVE');
    expect(ascii(wav, 36, 4)).toBe('data');
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(TEST_TONE.sampleRate);
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);
  });

  it('is short and small enough to inline', () => {
    const frames = (wav.byteLength - 44) / 2;
    expect(frames).toBe(Math.round((TEST_TONE.sampleRate * TEST_TONE.totalMs) / 1000));
    expect(TEST_TONE.totalMs).toBeLessThanOrEqual(1500);
    expect(wav.byteLength).toBeLessThan(200_000);
  });

  it('stays well below full scale, so it can never startle', () => {
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    let peak = 0;
    for (let offset = 44; offset < wav.byteLength; offset += 2) {
      peak = Math.max(peak, Math.abs(view.getInt16(offset, true)));
    }
    expect(peak).toBeGreaterThan(0); // it is audible
    expect(peak / 32_767).toBeLessThanOrEqual(TEST_TONE.gain + 0.01);
  });

  it('starts from silence, so there is no onset click', () => {
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(Math.abs(view.getInt16(44, true))).toBe(0);
  });
});

describe('testToneDataUri', () => {
  it('is a self-contained data URI — never a network fetch', () => {
    const uri = testToneDataUri();
    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(uri).not.toMatch(/https?:/);
  });

  it('is cached, so "play again" does not re-synthesize', () => {
    expect(testToneDataUri()).toBe(testToneDataUri());
  });
});
