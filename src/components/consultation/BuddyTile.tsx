import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, SignalHigh, SignalLow, SignalMedium, WifiOff } from 'lucide-react';
import { BUDDY_AVATAR_URL } from './buddyAvatar';
import type { BuddyActivity, ConnectionQuality } from '@/services/consultationCore';

interface BuddyTileProps {
  activity: BuddyActivity;
  agentPresent: boolean;
  reconnecting: boolean;
  quality: ConnectionQuality;
  /** 0..1 remote audio level — drives the speaking pulse. */
  audioLevel: number;
  reduceMotion?: boolean;
}

const QualityIcon = ({ quality }: { quality: ConnectionQuality }) => {
  const cls = 'h-4 w-4';
  switch (quality) {
    case 'excellent':
      return <SignalHigh className={`${cls} text-emerald-400`} aria-hidden="true" />;
    case 'good':
      return <SignalMedium className={`${cls} text-emerald-400`} aria-hidden="true" />;
    case 'poor':
      return <SignalLow className={`${cls} text-amber-400`} aria-hidden="true" />;
    case 'lost':
      return <WifiOff className={`${cls} text-rose-400`} aria-hidden="true" />;
    default:
      return null;
  }
};

/**
 * Buddy's participant tile. The speaking ring / pulse animates ONLY while
 * Buddy audio is actually active; Listening/Thinking are shown only once the
 * agent participant has joined (enforced upstream by deriveBuddyActivity).
 * No fake lip-sync — a subtle audio-driven pulse instead.
 */
const BuddyTile: React.FC<BuddyTileProps> = ({
  activity,
  agentPresent,
  reconnecting,
  quality,
  audioLevel,
  reduceMotion = false,
}) => {
  const { t } = useTranslation();
  const speaking = activity === 'speaking';
  const stateLabel = reconnecting
    ? t('meeting.states.reconnecting')
    : agentPresent
      ? t(`meeting.states.${activity}`)
      : t('meeting.states.connecting');

  const ringScale = speaking && !reduceMotion ? 1 + Math.min(0.12, audioLevel * 0.3) : 1;

  return (
    <div
      data-active-speaker={speaking}
      className={`relative flex h-full min-h-[16rem] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-purple-950 p-6 transition-shadow ${
        speaking ? 'ring-4 ring-pink-500/80 shadow-[0_0_40px_-8px_rgba(236,72,153,0.6)]' : 'ring-1 ring-white/10'
      }`}
    >
      {/* speaking ring */}
      <div className="relative" aria-hidden="true">
        <div
          className={`absolute inset-0 -m-3 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 blur-md transition-opacity duration-200 ${
            speaking ? 'opacity-80' : 'opacity-0'
          } ${speaking && !reduceMotion ? 'animate-pulse' : ''}`}
          style={{ transform: `scale(${ringScale})` }}
        />
        <div
          className={`relative rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 p-1 transition-transform duration-150`}
          style={{ transform: `scale(${ringScale})` }}
        >
          <img
            src={BUDDY_AVATAR_URL}
            alt=""
            className="h-32 w-32 rounded-full bg-white object-cover sm:h-40 sm:w-40"
            draggable={false}
          />
        </div>
        {/* subtle mouth/pulse dot while speaking (no fake lip-sync) */}
        {speaking && !reduceMotion && (
          <span className="absolute bottom-2 start-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/90 animate-ping" />
        )}
        {!agentPresent && (
          <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-navy-900/90 p-1.5">
            <Loader2 className={`h-5 w-5 text-pink-400 ${reduceMotion ? '' : 'animate-spin'}`} aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="mt-4 text-lg font-semibold text-white">{t('meeting.buddyName')}</p>
      <p className="text-sm text-pink-200">{t('meeting.buddyRole')}</p>

      {/* live state, announced to screen readers */}
      <p aria-live="polite" className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
        {activity === 'thinking' && agentPresent && !reduceMotion && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        )}
        {stateLabel}
      </p>

      {/* connection quality */}
      <div className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-1">
        <QualityIcon quality={quality} />
        <span className="sr-only">{t(`meeting.quality.${quality}`)}</span>
      </div>

      {/* AI disclosure — always visible */}
      <p className="absolute bottom-2 start-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-full bg-black/30 px-3 py-1 text-center text-[11px] text-white/80">
        {t('meeting.aiBadge')}
      </p>
    </div>
  );
};

export default BuddyTile;
