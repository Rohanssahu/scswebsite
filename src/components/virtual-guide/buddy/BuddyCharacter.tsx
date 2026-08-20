import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { getBuddyPose } from '@/data/buddyAnimations';
import { BUDDY_SPRING } from '@/data/buddyTiming';
import { BuddyAnimationState, BuddyEmotion } from '@/types/buddy';
import BuddyArm from './BuddyArms';
import BuddyBody, { Pivot } from './BuddyBody';
import BuddyFace from './BuddyFace';
import BuddyLeg from './BuddyLegs';

// Buddy's full-body character: an original SVG mascot built from separately
// controllable parts (head, face, body, two arms/hands, two legs/feet), all
// animated with transform-only Framer Motion springs. The pose for each
// named animation state lives in src/data/buddyAnimations.ts.

export interface BuddyCharacterProps {
  state: BuddyAnimationState;
  /** Facial emotion overlay — never interferes with limb animation. */
  emotion?: BuddyEmotion;
  /** Force the talking mouth (live speech) regardless of pose. */
  talking?: boolean;
  /** Character height in px. */
  size?: number;
  /** 1 = default orientation, -1 = mirrored (walking the other way / RTL). */
  facing?: 1 | -1;
  /** false freezes all loops (reduced motion, paused, hidden tab). */
  animate?: boolean;
  className?: string;
}

const BuddyCharacter = ({
  state,
  emotion = 'neutral',
  talking,
  size = 96,
  facing = 1,
  animate = true,
  className,
}: BuddyCharacterProps) => {
  const uid = useId();
  const pose = getBuddyPose(state, emotion);
  const bodyGradient = `buddy-body-${uid}`;
  const width = size * (120 / 150);

  return (
    <motion.svg
      viewBox="0 0 120 150"
      width={width}
      height={size}
      className={className}
      style={{ overflow: 'visible', originX: 0.5, originY: 0.5 }}
      initial={false}
      animate={{ scaleX: facing }}
      transition={BUDDY_SPRING}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={bodyGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={60} cy={139} rx={26} ry={4} fill="#0f172a" opacity={0.12} />

      {/* Legs + feet (behind the torso) */}
      <BuddyLeg side="left" pose={pose.leftLeg} cycle={pose.cycle} animate={animate} />
      <BuddyLeg side="right" pose={pose.rightLeg} cycle={pose.cycle} animate={animate} />

      {/* Torso pivot (bottom-center) with natural breathing; arms and head
          ride along so bounces stay coherent. */}
      <Pivot x={60} y={110} extent={114} rotate={pose.body.rotate} dy={pose.body.y} breathe cycle={pose.cycle} animate={animate}>
        <BuddyBody fill={`url(#${bodyGradient})`} />

        <BuddyArm side="left" pose={pose.leftArm} hand={pose.leftHand} cycle={pose.cycle} animate={animate} />
        <BuddyArm side="right" pose={pose.rightArm} hand={pose.rightHand} cycle={pose.cycle} animate={animate} />

        {/* Head pivot at the neck */}
        <Pivot x={0} y={-48} extent={66} rotate={pose.head.rotate} dy={pose.head.y} cycle={pose.cycle} animate={animate}>
          {/* Antenna */}
          <line x1={0} y1={-51} x2={0} y2={-57} stroke="#9333ea" strokeWidth={2} strokeLinecap="round" />
          <circle cx={0} cy={-59} r={2.6} fill="#ec4899" />
          {/* Head */}
          <circle cx={0} cy={-26} r={25} fill="#ffffff" stroke="#f3e8ff" strokeWidth={2} />
          {/* Headset hint (video-call feel, kept from the original avatar) */}
          <path d="M -25 -30 A 8 8 0 0 0 -19 -14" fill="none" stroke="#a855f7" strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={-18} cy={-13} r={2.2} fill="#a855f7" />
          <BuddyFace face={pose.face} talking={talking ?? pose.talking ?? false} animate={animate} />
        </Pivot>
      </Pivot>
    </motion.svg>
  );
};

export default BuddyCharacter;
