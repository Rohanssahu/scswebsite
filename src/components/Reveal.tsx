import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * True during the build-time prerender, where there is no window.
 *
 * It matters for SEO: `whileInView` starts the wrapper at `opacity: 0`, so a
 * server-rendered page would ship all of its copy invisible. Rendering a plain
 * div instead means the prerendered HTML a crawler reads is fully visible text;
 * the browser still gets the animation because the client re-renders.
 */
const IS_SERVER = typeof window === 'undefined';

/** Lightweight scroll-reveal wrapper. Renders statically when the user prefers reduced motion. */
const Reveal = ({ children, delay = 0, className }: RevealProps) => {
  const reduceMotion = useReducedMotion();

  if (IS_SERVER || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
