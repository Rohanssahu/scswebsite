import { describe, expect, it, vi } from 'vitest';
import { SILENCE_REMINDER_TEXT, createSilenceReminder, type SilenceReminderDeps } from './silence.js';

/** Deterministic timer seam: nothing fires until `advance()` is called. */
function fakeClock() {
  let next = 1;
  const timers = new Map<number, { fn: () => void; at: number }>();
  let now = 0;
  return {
    setTimer: (fn: () => void, ms: number) => {
      const id = next++;
      timers.set(id, { fn, at: now + ms });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (handle: ReturnType<typeof setTimeout>) => {
      timers.delete(handle as unknown as number);
    },
    advance: (ms: number) => {
      now += ms;
      for (const [id, timer] of [...timers.entries()]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.fn();
        }
      }
    },
    get count() {
      return timers.size;
    },
  };
}

const reminderWith = (over: Partial<SilenceReminderDeps> = {}) => {
  const clock = fakeClock();
  const say = over.say ?? vi.fn();
  const reminder = createSilenceReminder({
    delayMs: 10_000,
    canSpeak: () => true,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    ...over,
    say,
  });
  return { reminder, clock, say: say as ReturnType<typeof vi.fn> };
};

describe('silence reminder', () => {
  it('says nothing during a short pause', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(9_999);
    expect(say).not.toHaveBeenCalled();
  });

  it('offers the nudge once after ten seconds of genuine silence', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(10_000);
    expect(say).toHaveBeenCalledTimes(1);
    expect(say).toHaveBeenCalledWith(SILENCE_REMINDER_TEXT);
    expect(reminder.spokenCount).toBe(1);
  });

  it('never repeats continuously, however long the client stays quiet', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(10_000);
    for (let i = 0; i < 6; i += 1) {
      reminder.waitForClient();
      clock.advance(10_000);
    }
    expect(say).toHaveBeenCalledTimes(1);
  });

  it('re-arms only after the client actually speaks', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(10_000);
    expect(say).toHaveBeenCalledTimes(1);

    reminder.clientSpoke();
    reminder.waitForClient();
    clock.advance(10_000);
    expect(say).toHaveBeenCalledTimes(2);
  });

  it('cancels the pending nudge as soon as the client speaks', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(5_000);
    reminder.clientSpoke();
    clock.advance(60_000);
    expect(say).not.toHaveBeenCalled();
  });

  it('stays silent while Buddy holds the floor', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    clock.advance(5_000);
    reminder.hold();
    clock.advance(60_000);
    expect(say).not.toHaveBeenCalled();
    expect(reminder.pending).toBe(false);
  });

  it('never speaks on a session that started closing while the timer ran', () => {
    let closing = false;
    const { reminder, clock, say } = reminderWith({ canSpeak: () => !closing });
    reminder.waitForClient();
    closing = true;
    clock.advance(10_000);
    expect(say).not.toHaveBeenCalled();
  });

  it('attempts no speech at all after dispose()', () => {
    const { reminder, clock, say } = reminderWith();
    reminder.waitForClient();
    reminder.dispose();
    clock.advance(60_000);
    expect(say).not.toHaveBeenCalled();

    // ...and cannot be re-armed by a late event during teardown.
    reminder.clientSpoke();
    reminder.waitForClient();
    clock.advance(60_000);
    expect(say).not.toHaveBeenCalled();
    expect(clock.count).toBe(0);
  });

  it('swallows a failed nudge instead of throwing into the session', () => {
    const say = vi.fn(() => {
      throw new Error('tts exploded');
    });
    const { reminder, clock } = reminderWith({ say });
    reminder.waitForClient();
    expect(() => clock.advance(10_000)).not.toThrow();
  });
});
