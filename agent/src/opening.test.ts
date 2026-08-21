import { describe, expect, it, vi } from 'vitest';
import {
  MAX_OPENING_CLARIFICATIONS,
  OPENING_REPLY_EXISTING,
  OPENING_REPLY_NEW,
  OPENING_REPLY_UNCLEAR,
  classifyOpeningChoice,
  createOpeningRouter,
  intentForChoice,
  openingReply,
  type OpeningRouterDeps,
} from './opening.js';

describe('classifyOpeningChoice', () => {
  it('classifies new-project answers', () => {
    for (const answer of [
      'A new project.',
      'new one',
      'I want to build a new mobile app',
      'We need to create something for our warehouse team',
      'Starting from scratch, nothing exists yet',
      'I would like to develop an online store',
      'greenfield, we have nothing yet',
      "I don't have a project yet",
      'the first',
      'option 1',
    ]) {
      expect(classifyOpeningChoice(answer), answer).toBe('new_project');
    }
  });

  it('classifies existing-project answers', () => {
    for (const answer of [
      'An existing project.',
      'existing',
      'I already have a website but it is slow',
      'We have a platform that needs improvement',
      'My app keeps crashing, I need it fixed',
      'Our current system is legacy and we want to migrate',
      'I need help repairing a broken checkout',
      'we want to add a new feature to our portal',
      'the second',
      'option two',
    ]) {
      expect(classifyOpeningChoice(answer), answer).toBe('existing_project');
    }
  });

  it('treats "rebuild my old site as a new app" as an existing project, not a new one', () => {
    expect(classifyOpeningChoice('I want to rebuild my old site as a new app')).toBe('existing_project');
    expect(classifyOpeningChoice('my existing store needs a new checkout')).toBe('existing_project');
  });

  it('never guesses: anything ambiguous, empty or noise is unclear', () => {
    for (const answer of ['', '   ', 'a', 'hmm', 'uh', 'yes', 'okay sure', 'Hello?', '???', 'I am not sure yet']) {
      expect(classifyOpeningChoice(answer), JSON.stringify(answer)).toBe('unclear');
    }
  });
});

describe('openingReply', () => {
  it('returns the exact scripted line for each path', () => {
    expect(openingReply('new_project')).toBe(OPENING_REPLY_NEW);
    expect(openingReply('existing_project')).toBe(OPENING_REPLY_EXISTING);
    expect(openingReply('unclear')).toBe(OPENING_REPLY_UNCLEAR);
  });

  it('asks exactly one main question per scripted reply', () => {
    // The new/existing acknowledgements invite an answer without stacking a
    // second question on top of it.
    expect(OPENING_REPLY_NEW.match(/\?/g)).toBeNull();
    expect(OPENING_REPLY_EXISTING.match(/\?/g)).toBeNull();
    expect(OPENING_REPLY_UNCLEAR.match(/\?/g)).toHaveLength(1);
  });

  it('maps resolved choices onto requirement-state intents', () => {
    expect(intentForChoice('new_project')).toBe('new_project');
    expect(intentForChoice('existing_project')).toBe('improve_existing');
  });
});

const routerWith = (over: Partial<OpeningRouterDeps> = {}) => {
  const say = over.say ?? vi.fn(async () => undefined);
  const setIntent = over.setIntent ?? vi.fn();
  const router = createOpeningRouter({
    canSpeak: () => true,
    ...over,
    say,
    setIntent,
  });
  return { router, say: say as ReturnType<typeof vi.fn>, setIntent: setIntent as ReturnType<typeof vi.fn> };
};

describe('opening router', () => {
  it('answers a new-project choice with the scripted line and records the intent', async () => {
    const { router, say, setIntent } = routerWith();
    const outcome = await router.handleClientTurn('I want to build a new app');
    expect(outcome).toEqual({ handled: true, choice: 'new_project', reply: OPENING_REPLY_NEW });
    expect(say).toHaveBeenCalledWith(OPENING_REPLY_NEW);
    expect(setIntent).toHaveBeenCalledWith('new_project');
    expect(router.active).toBe(false);
    expect(router.choice).toBe('new_project');
  });

  it('answers an existing-project choice with the scripted line and records the intent', async () => {
    const { router, say, setIntent } = routerWith();
    const outcome = await router.handleClientTurn('I already have a website that needs fixing');
    expect(outcome).toEqual({ handled: true, choice: 'existing_project', reply: OPENING_REPLY_EXISTING });
    expect(say).toHaveBeenCalledWith(OPENING_REPLY_EXISTING);
    expect(setIntent).toHaveBeenCalledWith('improve_existing');
    expect(router.choice).toBe('existing_project');
  });

  it('asks the clarification question on an unclear answer and stays on the opening', async () => {
    const { router, say, setIntent } = routerWith();
    const outcome = await router.handleClientTurn('hmm');
    expect(outcome).toEqual({ handled: true, choice: 'unclear', reply: OPENING_REPLY_UNCLEAR });
    expect(say).toHaveBeenCalledWith(OPENING_REPLY_UNCLEAR);
    expect(setIntent).not.toHaveBeenCalled();
    expect(router.active).toBe(true);
    expect(router.clarifications).toBe(1);
  });

  it('resolves after a clarification, so the client can still pick either path', async () => {
    const { router, say } = routerWith();
    await router.handleClientTurn('not sure');
    await router.handleClientTurn('the existing one');
    expect(say.mock.calls.map((c) => c[0])).toEqual([OPENING_REPLY_UNCLEAR, OPENING_REPLY_EXISTING]);
    expect(router.choice).toBe('existing_project');
  });

  it('stops repeating the clarification and hands the turn to the LLM', async () => {
    const { router, say } = routerWith();
    for (let i = 0; i < MAX_OPENING_CLARIFICATIONS; i += 1) {
      await expect(router.handleClientTurn('hmm')).resolves.toMatchObject({ handled: true });
    }
    await expect(router.handleClientTurn('hmm')).resolves.toEqual({ handled: false });
    expect(say).toHaveBeenCalledTimes(MAX_OPENING_CLARIFICATIONS);
    expect(router.active).toBe(false);
  });

  it('hands every later turn to the LLM once the choice is resolved', async () => {
    const { router, say } = routerWith();
    await router.handleClientTurn('a new project');
    await expect(router.handleClientTurn('it should handle invoices')).resolves.toEqual({ handled: false });
    expect(say).toHaveBeenCalledTimes(1);
  });

  it('never speaks on a session that cannot schedule speech', async () => {
    const { router, say, setIntent } = routerWith({ canSpeak: () => false });
    await expect(router.handleClientTurn('a new project')).resolves.toEqual({ handled: false });
    expect(say).not.toHaveBeenCalled();
    expect(setIntent).not.toHaveBeenCalled();
    expect(router.active).toBe(false);
  });

  it('never speaks after deactivate() — a closing meeting attempts no speech', async () => {
    const { router, say } = routerWith();
    router.deactivate();
    await expect(router.handleClientTurn('a new project')).resolves.toEqual({ handled: false });
    expect(say).not.toHaveBeenCalled();
  });

  it('reports a failed speech as unhandled instead of throwing, so the LLM still replies', async () => {
    const say = vi.fn(async () => {
      throw new Error('tts exploded');
    });
    const { router } = routerWith({ say });
    await expect(router.handleClientTurn('a new project')).resolves.toEqual({ handled: false });
    expect(router.active).toBe(false);
  });
});
