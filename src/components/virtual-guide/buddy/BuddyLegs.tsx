import React from 'react';
import { Pivot } from './BuddyBody';
import { LimbPose } from '@/types/buddy';

// One hip-pivoted leg with its foot. Rendered in character coordinates
// (viewBox 0 0 120 150); hips sit at (52,106) and (68,106).

const LEG = '#CFC0E8';
const SHOE = '#F97316';

interface BuddyLegProps {
  side: 'left' | 'right';
  pose: LimbPose;
  cycle: number;
  animate: boolean;
}

export const BuddyLeg = ({ side, pose, cycle, animate }: BuddyLegProps) => (
  <Pivot x={side === 'left' ? 52 : 68} y={106} extent={34} rotate={pose.rotate} cycle={cycle} animate={animate}>
    <path d="M 0 0 L 0 20" fill="none" stroke={LEG} strokeWidth={9} strokeLinecap="round" />
    {/* Foot / shoe */}
    <ellipse cx={0} cy={24.5} rx={7.2} ry={4.6} fill={SHOE} />
    <ellipse cx={0} cy={23} rx={5} ry={2.4} fill="#ffffff" opacity={0.35} />
  </Pivot>
);

export default BuddyLeg;
