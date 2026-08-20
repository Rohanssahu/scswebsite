import { BuddyReaction, BuddyReactionEvent } from '@/types/buddy';

// Conversation-event → visual-reaction mapping, plus a tiny window-event bus
// so the conversation hook can trigger reactions without owning the
// character. Reactions only change pose/face — they never alter the
// conversation, and repeats are rate-limited in useBuddyAnimation.

export const BUDDY_REACT_EVENT = 'scs-buddy-react';

export function emitBuddyReaction(type: BuddyReactionEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<{ type: BuddyReactionEvent }>(BUDDY_REACT_EVENT, { detail: { type } }));
}

export const BUDDY_REACTIONS: Record<BuddyReactionEvent, BuddyReaction> = {
  welcome: { state: 'welcoming', emotion: 'happy', durationMs: 2600 },
  'welcome-back': { state: 'waving', emotion: 'happy', durationMs: 2600 },
  'service-selected': { state: 'explaining', emotion: 'smiling', durationMs: 3000 },
  answered: { state: 'nodding', emotion: 'smiling', durationMs: 1600 },
  'step-complete': { state: 'success', emotion: 'happy', durationMs: 2400 },
  'requirement-complete': { state: 'celebrating', emotion: 'happy', durationMs: 3600 },
  unknown: { state: 'confused', emotion: 'confused', durationMs: 3000 },
  warning: { state: 'serious', emotion: 'serious', durationMs: 3200 },
  'form-error': { state: 'concerned', emotion: 'concerned', durationMs: 3000 },
  'submit-success': { state: 'happy', emotion: 'happy', durationMs: 3200 },
  joke: { state: 'laughing', emotion: 'laughing', durationMs: 3200 },
  waiting: { state: 'waiting', emotion: 'neutral', durationMs: 4000 },
};

/** Light-hearted messages that make Buddy laugh (visual only, no reply change). */
const JOKE_PATTERN = /\b(joke|funny|haha+|hehe+|lol|lmao|rofl)\b|😂|🤣|😆/i;

export function looksLikeJoke(text: string): boolean {
  return JOKE_PATTERN.test(text);
}
