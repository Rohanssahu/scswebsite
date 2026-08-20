import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BuddyHomePhase } from '@/types/buddy';
import BuddyDoor from './BuddyDoor';

// Buddy's small animated home: roof, wall, door (with handle), a round
// window with a warm light, and a "Buddy" nameplate. When Buddy is inside,
// the whole home becomes a ≥44px accessible door-knock button.

interface BuddyHomeProps {
  phase: BuddyHomePhase;
  /** Width in px (height scales with the 100:110 aspect ratio). */
  size: number;
  animate: boolean;
  onKnock: () => void;
  className?: string;
}

const DOOR_OPEN_PHASES: BuddyHomePhase[] = ['entering', 'peeking', 'walkingBack'];
const LIGHT_ON_PHASES: BuddyHomePhase[] = ['entering', 'inside', 'knocking', 'peeking', 'walkingBack'];

const BuddyHome = ({ phase, size, animate, onKnock, className }: BuddyHomeProps) => {
  const { t } = useTranslation();
  const uid = useId();
  const inside = phase === 'inside';
  const doorOpen = DOOR_OPEN_PHASES.includes(phase);
  const lightOn = LIGHT_ON_PHASES.includes(phase);
  const peeking = phase === 'peeking';
  const knocking = phase === 'knocking';
  const sleeping = inside;
  const height = size * 1.1;

  const svg = (
    <svg viewBox="0 0 100 110" width={size} height={height} aria-hidden="true" focusable="false" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`buddy-roof-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
      </defs>

      {/* Warm glow while the light is on */}
      {lightOn && (
        <motion.ellipse
          cx={26}
          cy={64}
          rx={16}
          ry={14}
          fill="#fde047"
          initial={false}
          animate={animate ? { opacity: [0.25, 0.45, 0.25] } : { opacity: 0.3 }}
          transition={{ duration: 2.4, repeat: animate ? Infinity : 0, ease: 'easeInOut' }}
        />
      )}

      {/* Wall */}
      <rect x={12} y={44} width={76} height={60} rx={6} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} />
      {/* Roof */}
      <polygon points="4,46 50,8 96,46" fill={`url(#buddy-roof-${uid})`} stroke="#7E22CE" strokeWidth={2} strokeLinejoin="round" />
      {/* Chimney */}
      <rect x={70} y={20} width={9} height={16} rx={2} fill="#9333EA" />

      {/* Round window */}
      <circle cx={26} cy={64} r={9} fill={lightOn ? '#fde047' : '#bae6fd'} stroke="#f59e0b" strokeWidth={2} />
      <line x1={17} y1={64} x2={35} y2={64} stroke="#f59e0b" strokeWidth={1.4} />
      <line x1={26} y1={55} x2={26} y2={73} stroke="#f59e0b" strokeWidth={1.4} />

      {/* Buddy peeking through the window */}
      {peeking && (
        <motion.g initial={animate ? { opacity: 0, y: 3 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <circle cx={26} cy={64} r={6.5} fill="#FDFCFF" />
          <rect x={20.5} y={59.5} width={11} height={8.5} rx={4} fill="#2E1065" />
          <circle cx={23.5} cy={63} r={1.3} fill="#F9A8D4" />
          <circle cx={28.5} cy={63} r={1.3} fill="#F9A8D4" />
          <path d="M 23.5 66 Q 26 68 28.5 66" fill="none" stroke="#F9A8D4" strokeWidth={1.2} strokeLinecap="round" />
        </motion.g>
      )}

      {/* Nameplate above the door */}
      <rect x={35} y={49} width={30} height={10} rx={2.5} fill="#ffffff" stroke="#d97706" strokeWidth={1.2} />
      <text x={50} y={56.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="#DB2777" fontFamily="inherit">
        {t('guide.name')}
      </text>

      <BuddyDoor open={doorOpen} knocking={knocking} animate={animate} />

      {/* Sleeping zZ while Buddy rests inside */}
      {sleeping && animate && (
        <motion.text
          x={84}
          y={40}
          fontSize={9}
          fontWeight={700}
          fill="#C084FC"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0], y: [42, 34, 30] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          zZ
        </motion.text>
      )}
    </svg>
  );

  if (!inside && !knocking && !peeking) {
    // Decorative while Buddy is outside — subtly visible, never a focus stop.
    return (
      <div className={className} aria-hidden="true" style={{ opacity: 0.92 }}>
        {svg}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onKnock}
        aria-label={t('guide.buddy.knockLabel')}
        title={t('guide.buddy.knockLabel')}
        className="pointer-events-auto block min-h-11 min-w-11 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        {svg}
      </button>
    </div>
  );
};

export default BuddyHome;
