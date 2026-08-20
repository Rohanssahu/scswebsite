import React from 'react';
import { Pivot } from './BuddyBody';
import BuddyHand from './BuddyHands';
import { HandPose, LimbPose } from '@/types/buddy';

// One arm (shoulder-pivoted) carrying its independently animated hand.
// Rendered in body-local coordinates (torso pivot at 0,0 bottom-center):
// shoulders sit at (±18, -40).

const ARM = '#7e22ce';

interface BuddyArmProps {
  side: 'left' | 'right';
  pose: LimbPose;
  hand: HandPose;
  cycle: number;
  animate: boolean;
}

export const BuddyArm = ({ side, pose, hand, cycle, animate }: BuddyArmProps) => (
  <Pivot x={side === 'left' ? -19 : 19} y={-40} extent={46} rotate={pose.rotate} cycle={cycle} animate={animate}>
    {/* Upper arm from the shoulder down to the wrist */}
    <path d="M 0 0 L 0 24" fill="none" stroke={ARM} strokeWidth={8.5} strokeLinecap="round" />
    {/* Shoulder cap */}
    <circle r={5} fill={ARM} />
    <BuddyHand pose={hand} cycle={cycle} animate={animate} />
  </Pivot>
);

export default BuddyArm;
