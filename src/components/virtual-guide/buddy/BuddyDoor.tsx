import React from 'react';
import { motion } from 'framer-motion';

// The visual door of Buddy's home (rendered inside BuddyHome's SVG).
// The clickable/keyboard-accessible knock target is an HTML button overlay
// in BuddyHome — this component only draws and animates the door.

interface BuddyDoorProps {
  open: boolean;
  /** Plays the gentle knock shake. */
  knocking: boolean;
  animate: boolean;
}

const BuddyDoor = ({ open, knocking, animate }: BuddyDoorProps) => (
  <g>
    {/* Dark doorway behind the door panel */}
    <rect x={38} y={62} width={24} height={41} rx={3} fill="#312e81" />
    {/* Door panel, hinged on its start edge; opening scales it toward the hinge */}
    <g transform="translate(38 0)">
      <motion.g
        style={{ originX: 0.5, originY: 0.5 }}
        initial={false}
        animate={{
          scaleX: open ? 0.12 : 1,
          rotate: animate && knocking ? [0, -1.6, 1.6, -1.2, 1.2, 0] : 0,
        }}
        transition={{
          scaleX: { duration: animate ? 0.4 : 0, ease: 'easeInOut' },
          rotate: knocking ? { duration: 0.6, ease: 'easeInOut' } : { duration: 0.2 },
        }}
      >
        {/* Symmetric anchor keeps the transform origin exactly on the hinge (x=0). */}
        <rect x={-24} y={62} width={48} height={41} fill="none" stroke="none" />
        <rect x={0} y={62} width={24} height={41} rx={3} fill="#9333EA" stroke="#7E22CE" strokeWidth={1.5} />
        <rect x={3.5} y={66} width={17} height={16} rx={2} fill="none" stroke="#E9D5FF" strokeWidth={1.2} />
        <rect x={3.5} y={85} width={17} height={14} rx={2} fill="none" stroke="#E9D5FF" strokeWidth={1.2} />
        {/* Door handle */}
        <circle cx={20} cy={84} r={1.9} fill="#fbbf24" stroke="#b45309" strokeWidth={0.8} />
      </motion.g>
    </g>
  </g>
);

export default BuddyDoor;
