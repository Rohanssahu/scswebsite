import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useBuddyReaction } from '@/hooks/useBuddyAnimation';
import { AvatarState } from '@/types/virtualGuide';
import { BuddyAnimationState, BuddyEmotion } from '@/types/buddy';
import BuddyCharacter from './buddy/BuddyCharacter';

// Avatar adapter for Buddy — Your SCS Guide. The props contract (state +
// size) is unchanged; internally it now renders the full-body animated
// BuddyCharacter and mirrors live conversation reactions (nods, thumbs-up,
// confusion, laughter) inside the panel stage.

export interface GuideAvatarProps {
  state: AvatarState;
  /** Pixel size of the square avatar stage. */
  size?: number;
  reduceMotion?: boolean;
  /** Live voice-session audio level (0–1); scales the pulse ring. */
  level?: number;
}

const STATE_MAP: Record<Exclude<AvatarState, 'pointing'>, BuddyAnimationState> = {
  idle: 'idle',
  welcome: 'welcoming',
  speaking: 'speaking',
  listening: 'listening',
  thinking: 'thinking',
  success: 'celebrating',
  minimized: 'smiling',
};

const EMOTION_MAP: Partial<Record<AvatarState, BuddyEmotion>> = {
  welcome: 'happy',
  success: 'happy',
  minimized: 'smiling',
  pointing: 'smiling',
};

const GuideAvatar = ({ state, size = 96, reduceMotion = false, level = 0 }: GuideAvatarProps) => {
  const { t, i18n } = useTranslation();
  // In RTL Buddy sits at the start (left) side, so it points toward the page
  // content on its right; in LTR it points left toward the content.
  const rtl = i18n.dir() === 'rtl';
  const reaction = useBuddyReaction();

  const base: BuddyAnimationState = state === 'pointing' ? (rtl ? 'pointingRight' : 'pointingLeft') : STATE_MAP[state];
  const characterState = reaction ? reaction.state : base;
  const emotion: BuddyEmotion = reaction ? reaction.emotion : (EMOTION_MAP[state] ?? 'neutral');
  const listening = state === 'listening';
  // Live audio level (voice sessions) scales the ring in real time.
  const levelScale = 1 + Math.min(0.12, level * 0.12);

  return (
    <div
      className="relative flex items-end justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 shadow-lg shadow-pink-400/30"
      style={{ width: size, height: size }}
      role="img"
      aria-label={t('guide.avatarLabel', { state: t(`guide.states.${state}`) })}
    >
      {/* Listening pulse ring */}
      {listening && !reduceMotion && (
        <motion.span
          className="absolute inset-[-5px] rounded-2xl border-2 border-emerald-400"
          animate={{ scale: [1, 1.06, 1], opacity: [0.9, 0.3, 0.9] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          aria-hidden="true"
        />
      )}
      {/* Live audio-level ring (voice sessions): tracks who is talking */}
      {level > 0.02 && !reduceMotion && (
        <span
          className={`absolute inset-[-8px] rounded-2xl border-2 transition-transform duration-100 ${
            state === 'speaking' ? 'border-pink-400/80' : 'border-emerald-400/80'
          }`}
          style={{ transform: `scale(${levelScale})`, opacity: 0.4 + level * 0.6 }}
          aria-hidden="true"
        />
      )}
      <BuddyCharacter
        state={characterState}
        emotion={emotion}
        size={size * 0.92}
        animate={!reduceMotion}
      />
    </div>
  );
};

export default GuideAvatar;
