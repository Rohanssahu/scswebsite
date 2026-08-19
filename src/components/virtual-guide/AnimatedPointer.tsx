import React from 'react';
import { motion } from 'framer-motion';

// Animated hand pointer used by the tour overlay to point at highlighted content.

interface AnimatedPointerProps {
  x: number;
  y: number;
  /** Point up when the hand sits below the target, down when above. */
  direction: 'up' | 'down';
  reduceMotion?: boolean;
}

const AnimatedPointer = ({ x, y, direction, reduceMotion = false }: AnimatedPointerProps) => (
  <motion.span
    className="pointer-events-none fixed z-[75] select-none text-3xl drop-shadow-lg"
    style={{ left: x, top: y }}
    initial={reduceMotion ? { x: '-50%' } : { opacity: 0, scale: 0.6, x: '-50%' }}
    animate={
      reduceMotion
        ? { opacity: 1, x: '-50%' }
        : { opacity: 1, scale: 1, x: '-50%', y: direction === 'up' ? [0, 8, 0] : [0, -8, 0] }
    }
    transition={{ y: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.25 } }}
    aria-hidden="true"
  >
    {direction === 'up' ? '👆' : '👇'}
  </motion.span>
);

export default AnimatedPointer;
