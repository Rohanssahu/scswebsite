import React from 'react';
import { motion } from 'framer-motion';
import { poseTarget, poseTransition } from '@/data/buddyAnimations';
import { HandPose, HandShape } from '@/types/buddy';

// One independently posed hand. Local coordinates: (0,0) is the wrist and
// +y continues along the arm direction, so a pointing finger extends the
// way the whole arm is aimed.

const GLOVE = '#ffffff';
const GLOVE_EDGE = '#7e22ce';

const shapeShapes: Record<HandShape, React.ReactNode> = {
  relaxed: (
    <g>
      <circle r={5} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
      <circle cx={4} cy={-1} r={1.8} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.2} />
    </g>
  ),
  fist: (
    <g>
      <circle r={5.4} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
      <path d="M -3 1.5 Q 0 3 3 1.5" fill="none" stroke={GLOVE_EDGE} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  ),
  open: (
    <g>
      {[-26, -9, 9, 26].map((a) => (
        <rect key={a} x={-1.2} y={2.5} width={2.4} height={7.5} rx={1.2} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1} transform={`rotate(${a})`} />
      ))}
      <rect x={-1.3} y={-1} width={2.6} height={6} rx={1.3} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1} transform="rotate(64)" />
      <circle r={4.8} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
    </g>
  ),
  point: (
    <g>
      <rect x={-1.4} y={2} width={2.8} height={10.5} rx={1.4} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.1} />
      <circle r={4.6} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
    </g>
  ),
  thumbsUp: (
    <g>
      <rect x={-1.3} y={-13.5} width={2.6} height={9.5} rx={1.3} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.1} />
      <circle r={5.2} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
      <path d="M -3 0 Q 0 1.6 3 0" fill="none" stroke={GLOVE_EDGE} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  ),
  flat: (
    <g>
      <rect x={-5.6} y={-3} width={11.2} height={8.2} rx={3.4} fill={GLOVE} stroke={GLOVE_EDGE} strokeWidth={1.4} />
    </g>
  ),
};

interface BuddyHandProps {
  pose: HandPose;
  cycle: number;
  animate: boolean;
}

export const BuddyHand = ({ pose, cycle, animate }: BuddyHandProps) => (
  <g transform="translate(0 27)">
    <motion.g
      style={{ originX: 0.5, originY: 0.5 }}
      animate={{ rotate: poseTarget(pose.rotate, animate) }}
      transition={poseTransition(pose.rotate, cycle, animate)}
    >
      <rect x={-15} y={-15} width={30} height={30} fill="none" stroke="none" />
      <motion.g
        key={pose.shape}
        initial={animate ? { scale: 0.6, opacity: 0.4 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {shapeShapes[pose.shape]}
      </motion.g>
    </motion.g>
  </g>
);

export default BuddyHand;
