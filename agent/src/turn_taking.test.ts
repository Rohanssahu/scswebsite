import { describe, expect, it } from 'vitest';
import { loadConsultationTurnTaking } from './config.js';
import { buildConsultationTurnHandling, isConfirmedClientTurn } from './turn_taking.js';

describe('isConfirmedClientTurn', () => {
  it('never reacts to an interim transcript, however complete it looks', () => {
    expect(isConfirmedClientTurn({ isFinal: false, transcript: 'I want to build' })).toBe(false);
    expect(isConfirmedClientTurn({ isFinal: false, transcript: 'I want to build a new app.' })).toBe(false);
  });

  it('accepts a confirmed end-of-turn transcript', () => {
    expect(isConfirmedClientTurn({ isFinal: true, transcript: 'I want to build a new app.' })).toBe(true);
  });

  it('ignores a final result with no words — a noise burst, not a turn', () => {
    for (const transcript of ['', ' ', '\n', '\t  ']) {
      expect(isConfirmedClientTurn({ isFinal: true, transcript })).toBe(false);
    }
  });

  it('does not fire on the stream of interims that precede one real turn', () => {
    const stream = [
      { isFinal: false, transcript: 'I' },
      { isFinal: false, transcript: 'I already' },
      { isFinal: false, transcript: 'I already have' },
      { isFinal: false, transcript: 'I already have a site' },
      { isFinal: true, transcript: 'I already have a site.' },
    ];
    expect(stream.filter(isConfirmedClientTurn)).toHaveLength(1);
  });
});

describe('buildConsultationTurnHandling', () => {
  const handling = buildConsultationTurnHandling(loadConsultationTurnTaking());

  it('never lets the LLM run on interim text', () => {
    // Framework default is `enabled: true`, which starts inference from
    // interim transcripts.
    expect(handling.preemptiveGeneration).toEqual({ enabled: false });
  });

  it('holds a client pause well past the framework default before answering', () => {
    // Framework defaults are 500 / 3000 ms.
    expect(handling.endpointing.minDelay).toBeGreaterThanOrEqual(900);
    expect(handling.endpointing.minDelay).toBeLessThanOrEqual(1200);
    expect(handling.endpointing.maxDelay).toBeGreaterThanOrEqual(4000);
    expect(handling.endpointing.maxDelay).toBeLessThanOrEqual(5000);
  });

  it('preserves natural interruption while ignoring tiny noise bursts', () => {
    expect(handling.interruption.enabled).toBe(true);
    expect(handling.interruption.minDuration).toBeGreaterThan(500);
  });

  it('passes only keys the installed @livekit/agents turn-handling API accepts', () => {
    expect(Object.keys(handling).sort()).toEqual(['endpointing', 'interruption', 'preemptiveGeneration']);
    expect(Object.keys(handling.endpointing).sort()).toEqual(['maxDelay', 'minDelay']);
    expect(Object.keys(handling.interruption).sort()).toEqual(['enabled', 'minDuration']);
  });
});
