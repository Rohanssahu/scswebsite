import React from 'react';

export type TileAccent = 'client' | 'buddy';

/** Active-speaker accents: green/cyan for the client, SCS orange→magenta for Buddy. */
const ACCENT_BORDER: Record<TileAccent, string> = {
  client: 'linear-gradient(115deg,#34d399,#22d3ee,#34d399,#22d3ee)',
  buddy: 'linear-gradient(115deg,#f97316,#ec4899,#a855f7,#ec4899,#f97316)',
};

const ACCENT_GLOW: Record<TileAccent, string> = {
  client: '0 0 34px -12px rgba(52,211,153,0.75)',
  buddy: '0 0 34px -12px rgba(236,72,153,0.8)',
};

interface TileFrameProps {
  accent: TileAccent;
  /** True only while this participant is the REAL active speaker. */
  active: boolean;
  reduceMotion?: boolean;
  /** Layout classes for the frame (grid/flex sizing). */
  className?: string;
  /** Classes for the inner surface (background). */
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared participant-tile frame. The 2px border is neutral by default and
 * cross-fades into the animated accent gradient while `active` is true, so
 * only the participant who is actually speaking is highlighted.
 */
const TileFrame: React.FC<TileFrameProps> = ({
  accent,
  active,
  reduceMotion = false,
  className = '',
  innerClassName = 'bg-navy-900',
  children,
}) => (
  <div
    data-active-speaker={active}
    className={`relative min-h-0 min-w-0 rounded-[20px] bg-white/10 p-[2px] transition-shadow duration-300 ${className}`}
    style={active ? { boxShadow: ACCENT_GLOW[accent] } : undefined}
  >
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[20px] bg-[length:250%_250%] transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-0'
      } ${active && !reduceMotion ? 'animate-gradient-pan' : ''}`}
      style={{ backgroundImage: ACCENT_BORDER[accent] }}
    />
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] ${innerClassName}`}
    >
      {children}
    </div>
  </div>
);

export default TileFrame;
