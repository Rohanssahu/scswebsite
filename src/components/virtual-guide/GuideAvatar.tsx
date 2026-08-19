import React from 'react';
import { motion } from 'framer-motion';
import { AvatarState } from '@/types/virtualGuide';

// Avatar adapter for the Virtual Guide.
// This is a clean CSS/Framer Motion placeholder character. To use a Rive,
// Lottie or video avatar later, replace this component's internals — the
// props contract (state + size) stays the same.

export interface GuideAvatarProps {
  state: AvatarState;
  /** Pixel size of the round avatar stage. */
  size?: number;
  reduceMotion?: boolean;
}

const GuideAvatar = ({ state, size = 96, reduceMotion = false }: GuideAvatarProps) => {
  const animate = !reduceMotion;
  const speaking = state === 'speaking';
  const thinking = state === 'thinking';
  const listening = state === 'listening';
  const welcome = state === 'welcome';
  const pointing = state === 'pointing';
  const success = state === 'success';

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 shadow-lg shadow-pink-400/30"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`SCS Virtual Guide avatar (${state})`}
    >
      {/* Listening pulse ring */}
      {listening && (
        <motion.span
          className="absolute inset-[-6px] rounded-full border-2 border-emerald-400"
          animate={animate ? { scale: [1, 1.12, 1], opacity: [0.9, 0.3, 0.9] } : undefined}
          transition={{ duration: 1.4, repeat: Infinity }}
          aria-hidden="true"
        />
      )}

      {/* Head */}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-white/95"
        style={{ width: size * 0.72, height: size * 0.72 }}
        animate={animate && (speaking || welcome) ? { y: [0, -1.5, 0] } : { y: 0 }}
        transition={{ duration: 1.6, repeat: speaking || welcome ? Infinity : 0 }}
      >
        {/* Eyes */}
        <div className="absolute flex gap-[18%]" style={{ top: '34%', width: '56%', justifyContent: 'center' }}>
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="rounded-full bg-gray-800"
              style={{ width: size * 0.07, height: size * 0.09 }}
              animate={
                animate
                  ? thinking
                    ? { y: -size * 0.015 }
                    : { scaleY: [1, 1, 0.1, 1, 1] }
                  : undefined
              }
              transition={thinking ? { duration: 0.3 } : { duration: 4.5, times: [0, 0.9, 0.94, 0.98, 1], repeat: Infinity }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Mouth */}
        {speaking ? (
          <div className="absolute flex items-end gap-[3px]" style={{ bottom: '22%' }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-pink-600"
                style={{ height: size * 0.06 }}
                animate={animate ? { scaleY: [0.4, 1.4, 0.6, 1.1, 0.4] } : undefined}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </div>
        ) : (
          <motion.span
            className="absolute rounded-full bg-pink-600"
            style={{
              bottom: '24%',
              width: success || welcome ? size * 0.2 : size * 0.13,
              height: size * 0.045,
              borderRadius: '0 0 999px 999px',
            }}
            animate={animate && listening ? { scaleX: [1, 0.7, 1] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity }}
            aria-hidden="true"
          />
        )}

        {/* Headset hint — video-call feel */}
        <span
          className="absolute rounded-full border-2 border-purple-400/70"
          style={{ width: size * 0.16, height: size * 0.16, left: '-6%', bottom: '30%', borderRightColor: 'transparent', borderTopColor: 'transparent' }}
          aria-hidden="true"
        />
      </motion.div>

      {/* Waving hand */}
      {welcome && (
        <motion.span
          className="absolute select-none"
          style={{ right: '-8%', bottom: '-2%', fontSize: size * 0.32 }}
          animate={animate ? { rotate: [0, 22, -8, 22, 0] } : undefined}
          transition={{ duration: 1.4, repeat: 1 }}
          aria-hidden="true"
        >
          👋
        </motion.span>
      )}

      {/* Pointing hand */}
      {pointing && (
        <motion.span
          className="absolute select-none"
          style={{ right: '-12%', top: '30%', fontSize: size * 0.3 }}
          animate={animate ? { x: [0, 5, 0] } : undefined}
          transition={{ duration: 1.1, repeat: Infinity }}
          aria-hidden="true"
        >
          👉
        </motion.span>
      )}

      {/* Thinking dots */}
      {thinking && (
        <div className="absolute -top-1 right-0 flex gap-[3px] rounded-full bg-white px-1.5 py-1 shadow" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1 w-1 rounded-full bg-purple-500"
              animate={animate ? { opacity: [0.3, 1, 0.3] } : undefined}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {/* Success badge */}
      {success && (
        <motion.span
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow"
          initial={animate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          aria-hidden="true"
        >
          ✓
        </motion.span>
      )}
    </div>
  );
};

export default GuideAvatar;
