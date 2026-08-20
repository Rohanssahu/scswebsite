import React from 'react';
import { motion } from 'framer-motion';
import { BUDDY_SPRING } from '@/data/buddyTiming';
import { FacePose } from '@/types/buddy';

// Buddy's expressive face: two glowing eyes, two eyebrows and a morphing
// mouth, drawn inside the robot's dark visor plate.
// Rendered in head-local coordinates (neck pivot at 0,0; head center 0,-26).

const EYE = '#F9A8D4';
const BROW = '#FBCFE8';
const MOUTH = '#F472B6';
const MOUTH_INNER = '#BE185D';

interface BuddyFaceProps {
  face: FacePose;
  /** Run the talking mouth loop (speaking state / live TTS). */
  talking: boolean;
  animate: boolean;
}

const BuddyFace = ({ face, talking, animate }: BuddyFaceProps) => {
  const blink = animate && face.eyeOpen > 0.5;
  const half = face.mouthWidth / 2;
  const mouthD = `M ${-half} 0 Q 0 ${face.mouthCurve} ${half} 0`;
  const openRy = face.mouthOpen * 5;

  return (
    <g>
      {/* Eyebrows */}
      {([-1, 1] as const).map((s) => (
        <motion.rect
          key={`brow-${s}`}
          x={-4}
          y={-1}
          width={8}
          height={1.9}
          rx={1}
          fill={BROW}
          style={{ originX: 0.5, originY: 0.5 }}
          initial={false}
          animate={{
            x: s * 9.5,
            y: -38.5 + face.browY,
            rotate: s === -1 ? face.browRotateLeft : face.browRotateRight,
          }}
          transition={BUDDY_SPRING}
        />
      ))}

      {/* Eyes (with periodic blink when open) */}
      {([-1, 1] as const).map((s) => (
        <g key={`eye-${s}`} transform={`translate(${s * 9.5} -30)`}>
          <motion.g
            style={{ originX: 0.5, originY: 0.5 }}
            initial={false}
            animate={{ scaleY: blink ? [face.eyeOpen, face.eyeOpen, 0.12, face.eyeOpen] : face.eyeOpen }}
            transition={
              blink
                ? { duration: 4.6, times: [0, 0.9, 0.95, 1], repeat: Infinity, ease: 'easeInOut' }
                : BUDDY_SPRING
            }
          >
            {/* Soft glow halo behind each eye */}
            <ellipse rx={4} ry={4.8} fill={EYE} opacity={0.25} />
            <ellipse rx={2.8} ry={3.7} fill={EYE} />
            <circle cx={0.9} cy={-1.2} r={0.9} fill="#ffffff" />
          </motion.g>
        </g>
      ))}

      {/* Soft blush dots on the helmet, outside the visor */}
      <circle cx={-16.5} cy={-8} r={2.2} fill="#F9A8D4" opacity={0.55} />
      <circle cx={16.5} cy={-8} r={2.2} fill="#F9A8D4" opacity={0.55} />

      {/* Mouth: curve line + open-mouth ellipse (speaking, laughing, surprise) */}
      <g transform="translate(0 -15)">
        <motion.ellipse
          cx={0}
          cy={2}
          fill={MOUTH_INNER}
          initial={false}
          animate={{
            rx: Math.max(face.mouthWidth * 0.3, 2.5),
            ry: animate && talking ? [1, 4.5, 2, 5, 1] : Math.max(openRy, 0.01),
          }}
          // Tweens only: a spring would overshoot ry below 0, which is
          // invalid for SVG ellipses.
          transition={
            animate && talking
              ? { ry: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }, rx: { duration: 0.25, ease: 'easeOut' } }
              : { duration: 0.25, ease: 'easeOut' }
          }
        />
        <motion.path
          fill="none"
          stroke={MOUTH}
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={false}
          animate={{ d: mouthD }}
          transition={BUDDY_SPRING}
        />
      </g>
    </g>
  );
};

export default BuddyFace;
