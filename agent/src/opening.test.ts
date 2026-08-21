import { describe, expect, it, vi } from 'vitest';
import {
  MAX_OPENING_CLARIFICATIONS,
  OPENING_PURPOSE,
  OPENING_REPLY_EXISTING,
  OPENING_REPLY_NEW,
  OPENING_REPLY_UNCLEAR,
  PROJECT_TYPE_QUESTION,
  WELLBEING_ACK_NEGATIVE,
  WELLBEING_ACK_NEUTRAL,
  WELLBEING_ACK_POSITIVE,
  WELLBEING_ACK_RECIPROCAL,
  asksBuddyBack,
  classifyOpeningChoice,
  classifyWellbeing,
  createOpeningRouter,
  intentForChoice,
  openingReply,
  scriptedReply,
  wellbeingReply,
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
    // The project question is stage TWO; these specs drive it directly. The
    // stage-one ("how are you") specs below use the router's own default.
    startAt: 'project_type',
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
    expect(outcome).toEqual({
      handled: true,
      phase: 'project_type',
      choice: 'new_project',
      reply: OPENING_REPLY_NEW,
      spoken: OPENING_REPLY_NEW,
    });
    expect(say).toHaveBeenCalledWith(OPENING_REPLY_NEW);
    expect(setIntent).toHaveBeenCalledWith('new_project');
    expect(router.active).toBe(false);
    expect(router.choice).toBe('new_project');
  });

  it('answers an existing-project choice with the scripted line and records the intent', async () => {
    const { router, say, setIntent } = routerWith();
    const outcome = await router.handleClientTurn('I already have a website that needs fixing');
    expect(outcome).toEqual({
      handled: true,
      phase: 'project_type',
      choice: 'existing_project',
      reply: OPENING_REPLY_EXISTING,
      spoken: OPENING_REPLY_EXISTING,
    });
    expect(say).toHaveBeenCalledWith(OPENING_REPLY_EXISTING);
    expect(setIntent).toHaveBeenCalledWith('improve_existing');
    expect(router.choice).toBe('existing_project');
  });

  it('asks the clarification question on an unclear answer and stays on the opening', async () => {
    const { router, say, setIntent } = routerWith();
    const outcome = await router.handleClientTurn('hmm');
    expect(outcome).toEqual({
      handled: true,
      phase: 'project_type',
      choice: 'unclear',
      reply: OPENING_REPLY_UNCLEAR,
      spoken: OPENING_REPLY_UNCLEAR,
    });
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

// ---------------------------------------------------------------------------
// Stage 1 — "How are you today?"
// ---------------------------------------------------------------------------

describe('classifyWellbeing', () => {
  it('reads a positive answer', () => {
    for (const answer of [
      'good',
      "I'm good, thanks",
      'I am doing well',
      'fine thank you',
      'all good',
      'pretty good',
      'great!',
      "can't complain",
      'yeah okay',
    ]) {
      expect(classifyWellbeing(answer), answer).toBe('positive');
    }
  });

  it('reads a negative answer, and never mistakes "not good" for "good"', () => {
    for (const answer of [
      'not good',
      'not so great',
      "I'm not doing well",
      'could be better',
      'a bit tired honestly',
      'having a rough day',
      'I am unwell',
    ]) {
      expect(classifyWellbeing(answer), answer).toBe('negative');
    }
  });

  it('falls back to neutral instead of guessing — small talk is never clarified', () => {
    for (const answer of ['', '  ', 'hmm', 'as usual', 'you tell me', 'busy morning here']) {
      expect(classifyWellbeing(answer), JSON.stringify(answer)).toBe('neutral');
    }
  });

  it('notices when the client asks Buddy back', () => {
    for (const answer of ['I am good, and you?', 'fine, how about you', 'good, what about you?']) {
      expect(asksBuddyBack(answer), answer).toBe(true);
    }
    expect(asksBuddyBack('I am good thanks')).toBe(false);
  });
});

describe('wellbeingReply', () => {
  it('acknowledges the answer, then asks the project question — one question only', () => {
    const { scripted, choice } = wellbeingReply('I am good, thanks');
    expect(choice).toBe('unclear');
    expect(scripted.reply).toBe(
      [WELLBEING_ACK_POSITIVE, OPENING_PURPOSE, PROJECT_TYPE_QUESTION].join(' '),
    );
    expect(scripted.reply.match(/\?/g)).toHaveLength(1);
  });

  it('answers a client who is not doing well with sympathy, not cheer', () => {
    const { scripted } = wellbeingReply('not great, rough day');
    expect(scripted.reply.startsWith(WELLBEING_ACK_NEGATIVE)).toBe(true);
    expect(scripted.reply).not.toContain(WELLBEING_ACK_POSITIVE);
  });

  it('answers the reciprocal question before moving on', () => {
    const { scripted } = wellbeingReply('good, and you?');
    expect(scripted.reply).toBe(
      [WELLBEING_ACK_POSITIVE, WELLBEING_ACK_RECIPROCAL, OPENING_PURPOSE, PROJECT_TYPE_QUESTION].join(' '),
    );
  });

  it('uses the neutral acknowledgement for an answer it cannot read', () => {
    expect(wellbeingReply('hmm').scripted.reply.startsWith(WELLBEING_ACK_NEUTRAL)).toBe(true);
  });

  it('skips the project question when that answer already contains it', () => {
    const { scripted, choice } = wellbeingReply('I am fine. I want to build a new app.');
    expect(choice).toBe('new_project');
    expect(scripted.reply).toBe([WELLBEING_ACK_POSITIVE, OPENING_REPLY_NEW].join(' '));
    expect(scripted.reply).not.toContain(PROJECT_TYPE_QUESTION);
  });

  it('paces playout with a paragraph break per sentence, same words', () => {
    const { scripted } = wellbeingReply('good');
    expect(scripted.spoken.split('\n\n')).toEqual([
      WELLBEING_ACK_POSITIVE,
      OPENING_PURPOSE,
      PROJECT_TYPE_QUESTION,
    ]);
    expect(scripted.spoken.replace(/\n\n/g, ' ')).toBe(scripted.reply);
  });

  it('drops empty parts rather than leaving double spaces', () => {
    expect(scriptedReply('One.', '', 'Two.')).toEqual({ reply: 'One. Two.', spoken: 'One.\n\nTwo.' });
  });
});

describe('opening router — the two scripted stages in order', () => {
  const twoStage = (over: Partial<OpeningRouterDeps> = {}) =>
    routerWith({ startAt: 'wellbeing', ...over });

  it('starts on the wellbeing answer, because that is what the greeting asked', () => {
    const { router } = twoStage();
    expect(router.phase).toBe('wellbeing');
    expect(router.active).toBe(true);
  });

  it('answers the client\u2019s first words, then asks new-versus-existing, then acknowledges it', async () => {
    const { router, say, setIntent } = twoStage();

    const first = await router.handleClientTurn('I am good, thank you');
    expect(first).toMatchObject({ handled: true, phase: 'wellbeing', choice: 'unclear' });
    expect(setIntent).not.toHaveBeenCalled();
    expect(router.phase).toBe('project_type');

    const second = await router.handleClientTurn('I already have a website that needs fixing');
    expect(second).toMatchObject({ handled: true, phase: 'project_type', choice: 'existing_project' });
    expect(setIntent).toHaveBeenCalledWith('improve_existing');
    expect(router.active).toBe(false);

    expect(say.mock.calls.map((c) => c[0])).toEqual([
      [WELLBEING_ACK_POSITIVE, OPENING_PURPOSE, PROJECT_TYPE_QUESTION].join('\n\n'),
      OPENING_REPLY_EXISTING,
    ]);
  });

  it('never leaves the first turn unanswered, whatever the client said', async () => {
    for (const first of ['', 'hmm', 'not so good', 'who is this?', 'good yaar']) {
      const { router, say } = twoStage();
      await expect(router.handleClientTurn(first)).resolves.toMatchObject({ handled: true });
      expect(say, JSON.stringify(first)).toHaveBeenCalledTimes(1);
      expect(say.mock.calls[0]?.[0]).toContain(PROJECT_TYPE_QUESTION);
    }
  });

  it('resolves in ONE turn when the first answer already names the project type', async () => {
    const { router, say, setIntent } = twoStage();
    const outcome = await router.handleClientTurn('I am fine. I want to build a new app.');
    expect(outcome).toMatchObject({ handled: true, phase: 'wellbeing', choice: 'new_project' });
    expect(setIntent).toHaveBeenCalledWith('new_project');
    expect(router.active).toBe(false);
    expect(say.mock.calls[0]?.[0]).not.toContain(PROJECT_TYPE_QUESTION);
  });

  it('asks the wellbeing question\u2019s follow-up only once, never twice', async () => {
    const { router, say } = twoStage();
    await router.handleClientTurn('good');
    await router.handleClientTurn('hmm');
    await router.handleClientTurn('a new project');
    expect(say.mock.calls.map((c) => c[0])).toEqual([
      [WELLBEING_ACK_POSITIVE, OPENING_PURPOSE, PROJECT_TYPE_QUESTION].join('\n\n'),
      OPENING_REPLY_UNCLEAR,
      OPENING_REPLY_NEW,
    ]);
  });

  it('attempts no speech at all on a session that cannot speak', async () => {
    const { router, say } = twoStage({ canSpeak: () => false });
    await expect(router.handleClientTurn('good')).resolves.toEqual({ handled: false });
    expect(say).not.toHaveBeenCalled();
    expect(router.active).toBe(false);
  });
});
