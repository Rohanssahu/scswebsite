import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Text bubble above Buddy / the home. Two looks:
// - 'speech': classic rounded bubble with a tail (Buddy talking to you)
// - 'thought': comic-style cloud with trailing dots rising from Buddy's head
// Always plain text (no audio is ever autoplayed), announced politely.

interface BuddySpeechBubbleProps {
  text: string | null;
  animate: boolean;
  variant?: 'speech' | 'thought';
}

const BuddySpeechBubble = ({ text, animate, variant = 'speech' }: BuddySpeechBubbleProps) => (
  <AnimatePresence>
    {text && (
      <motion.div
        key={`${variant}-${text}`}
        role="status"
        initial={animate ? { opacity: 0, y: 6, scale: 0.92 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={animate ? { opacity: 0, y: 4, scale: 0.95 } : undefined}
        transition={{ duration: 0.25 }}
        className={
          variant === 'thought'
            ? 'pointer-events-none relative max-w-[210px] rounded-[1.6rem] border border-purple-200 bg-white/95 px-3.5 py-2.5 text-xs leading-snug text-gray-800 shadow-lg shadow-purple-300/30'
            : 'pointer-events-none relative max-w-[210px] rounded-2xl border border-pink-200 bg-white/95 px-3 py-2 text-xs leading-snug text-gray-800 shadow-lg shadow-pink-300/30'
        }
      >
        {variant === 'thought' && (
          <>
            {/* Cloud lobes on the top edge */}
            <span aria-hidden="true" className="absolute -top-2 start-4 h-4 w-7 rounded-full border border-purple-200 bg-white/95" />
            <span aria-hidden="true" className="absolute -top-2.5 start-10 h-5 w-9 rounded-full border border-purple-200 bg-white/95" />
            <span aria-hidden="true" className="absolute -top-1.5 start-[4.6rem] h-3.5 w-6 rounded-full border border-purple-200 bg-white/95" />
          </>
        )}
        <span className="relative">{text}</span>
        {variant === 'thought' ? (
          <>
            {/* Trailing thought dots toward Buddy's head */}
            <span aria-hidden="true" className="absolute -bottom-2.5 start-5 h-2.5 w-2.5 rounded-full border border-purple-200 bg-white/95" />
            <span aria-hidden="true" className="absolute -bottom-[1.15rem] start-3 h-1.5 w-1.5 rounded-full border border-purple-200 bg-white/95" />
          </>
        ) : (
          <span
            aria-hidden="true"
            className="absolute -bottom-1 start-6 h-2.5 w-2.5 rotate-45 border-b border-e border-pink-200 bg-white/95"
          />
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

export default BuddySpeechBubble;
