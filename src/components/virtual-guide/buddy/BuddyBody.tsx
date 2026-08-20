import React from 'react';
import { motion } from 'framer-motion';
import { poseTarget, poseTransition } from '@/data/buddyAnimations';
import { BUDDY_SPRING } from '@/data/buddyTiming';
import { PoseValue } from '@/types/buddy';

// Buddy's torso, plus the shared `Pivot` rig used by every animated part.

interface PivotProps {
  /** Pivot position in the parent's coordinate space. */
  x: number;
  y: number;
  /**
   * Half-size of an invisible square drawn around the pivot. It fixes the
   * group's bounding box so Framer Motion's SVG transform-origin (bbox-based)
   * lands exactly on the pivot regardless of the pose. Must contain all
   * child geometry.
   */
  extent?: number;
  rotate?: PoseValue;
  /** Vertical offset (bounce, slump). */
  dy?: PoseValue;
  /** Adds the slow breathing loop (used by the torso). */
  breathe?: boolean;
  cycle: number;
  animate: boolean;
  children: React.ReactNode;
}

export const Pivot = ({ x, y, extent = 46, rotate = 0, dy = 0, breathe = false, cycle, animate, children }: PivotProps) => (
  <g transform={`translate(${x} ${y})`}>
    <motion.g
      style={{ originX: 0.5, originY: 0.5 }}
      animate={{
        rotate: poseTarget(rotate, animate),
        y: poseTarget(dy, animate),
        scaleY: breathe && animate ? [1, 1.022, 1] : 1,
      }}
      transition={{
        rotate: poseTransition(rotate, cycle, animate),
        y: poseTransition(dy, cycle, animate),
        scaleY: breathe && animate ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : BUDDY_SPRING,
      }}
    >
      <rect x={-extent} y={-extent} width={extent * 2} height={extent * 2} fill="none" stroke="none" />
      {children}
    </motion.g>
  </g>
);

interface BuddyBodyProps {
  /** Gradient/paint reference for the torso. */
  fill: string;
}

/** Torso drawn upward from its bottom-center pivot at local (0, 0). */
const BuddyBody = ({ fill }: BuddyBodyProps) => (
  <g>
    {/* White robot shell */}
    <rect x={-22} y={-50} width={44} height={51} rx={19} fill={fill} stroke="#EDE4F7" strokeWidth={1.6} />
    {/* Top sheen */}
    <ellipse cx={-5} cy={-42} rx={11} ry={4} fill="#ffffff" opacity={0.7} />
    {/* Belly seam with a small button */}
    <path d="M -21 -17 Q 0 -12 21 -17" fill="none" stroke="#E2D5F0" strokeWidth={1.8} strokeLinecap="round" />
    <circle cx={0} cy={-14} r={2.6} fill="#DDD0F0" stroke="#B49CD8" strokeWidth={1} />
  </g>
);

export default BuddyBody;
