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
        <linearGradient id={bodyGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F3EDFA" />
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
          {/* Antenna nub */}
          <line x1={0} y1={-51} x2={0} y2={-56} stroke="#CFC0E8" strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={0} cy={-58.5} r={2.8} fill="#F97316" stroke="#C2410C" strokeWidth={1} />
          {/* White rounded helmet head */}
          <rect x={-24} y={-50} width={48} height={47} rx={19} fill="#FDFCFF" stroke="#EDE4F7" strokeWidth={2} />
          {/* Ear discs */}
          <circle cx={-24} cy={-26} r={4.5} fill="#9333EA" stroke="#7E22CE" strokeWidth={1.2} />
          <circle cx={24} cy={-26} r={4.5} fill="#9333EA" stroke="#7E22CE" strokeWidth={1.2} />
          {/* Deep-violet visor face plate (eyes + mouth glow inside it) */}
          <rect x={-19.5} y={-43} width={39} height={32} rx={13} fill="#2E1065" stroke="#1E0A47" strokeWidth={1.4} />
          {/* Visor gloss */}
          <ellipse cx={-6} cy={-38} rx={10} ry={3.5} fill="#ffffff" opacity={0.08} />
          <BuddyFace face={pose.face} talking={talking ?? pose.talking ?? false} animate={animate} />
        </Pivot>
      </Pivot>
    </motion.svg>
  );
};

export default BuddyCharacter;
