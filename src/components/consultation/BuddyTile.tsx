import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, SignalHigh, SignalLow, SignalMedium, VolumeX, WifiOff } from 'lucide-react';
import { BUDDY_AVATAR_URL } from './buddyAvatar';
import TileFrame from './TileFrame';
import type { BuddyActivity, ConnectionQuality } from '@/services/consultationCore';

interface BuddyTileProps {
  activity: BuddyActivity;
  agentPresent: boolean;
  reconnecting: boolean;
  quality: ConnectionQuality;
  /** 0..1 remote audio level — drives the speaking pulse. */
  audioLevel: number;
  /** Buddy's audio is muted locally (speaker toggle). */
  speakerMuted?: boolean;
  reduceMotion?: boolean;
  /** Layout classes supplied by the meeting stage. */
  className?: string;
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
 * Buddy's participant tile. The speaking border / pulse animates ONLY while
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
  speakerMuted = false,
  reduceMotion = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const speaking = activity === 'speaking' && !reconnecting;
  const thinking = activity === 'thinking' && agentPresent && !reconnecting;
  const stateLabel = reconnecting
    ? t('meeting.states.reconnecting')
    : agentPresent
      ? t(`meeting.states.${activity}`)
      : t('meeting.states.connecting');

  // Real remote audio level (LiveKit) drives the pulse — never synthesized.
  const ringScale = speaking && !reduceMotion ? 1 + Math.min(0.1, audioLevel * 0.28) : 1;

  return (
    <TileFrame
      accent="buddy"
      active={speaking}
      reduceMotion={reduceMotion}
      className={className}
      innerClassName="bg-gradient-to-br from-navy-900 via-navy-800 to-purple-950"
    >
      <div className="flex min-h-0 flex-col items-center justify-center gap-2 px-4 py-3 text-center">
        {/* avatar + audio pulse */}
        <div className="relative shrink-0" aria-hidden="true">
          {speaking && (
            <span
              className={`absolute inset-0 -m-2 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 blur-md ${
                reduceMotion ? 'opacity-40' : 'animate-audio-pulse'
              }`}
            />
          )}
          <div
            className="relative rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 p-[3px] transition-transform duration-150"
            style={{ transform: `scale(${ringScale})` }}
          >
            <img
              src={BUDDY_AVATAR_URL}
              alt=""
              className="h-[clamp(4.5rem,14vh,8rem)] w-[clamp(4.5rem,14vh,8rem)] rounded-full bg-white object-cover"
              draggable={false}
            />
          </div>
          {!agentPresent && !reconnecting && (
            <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 rounded-full bg-navy-900/90 p-1.5">
              <Loader2 className={`h-4 w-4 text-pink-400 ${reduceMotion ? '' : 'animate-spin'}`} aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight text-white sm:text-lg">{t('meeting.buddyName')}</p>
          <p className="text-xs leading-tight text-pink-200 sm:text-sm">{t('meeting.buddyRole')}</p>
        </div>

        {/* live state, announced to screen readers */}
        <p
          aria-live="polite"
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            speaking ? 'bg-pink-500/25 text-pink-50' : 'bg-white/10 text-white'
          }`}
        >
          {thinking && <Loader2 className={`h-3.5 w-3.5 shrink-0 ${reduceMotion ? '' : 'animate-spin'}`} aria-hidden="true" />}
          {speaking && (
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full bg-pink-300 ${reduceMotion ? '' : 'animate-pulse'}`}
            />
          )}
          <span className="truncate">{stateLabel}</span>
        </p>

        {/* AI disclosure — always visible */}
        <p className="max-w-[95%] text-[11px] leading-tight text-white/55">{t('meeting.aiBadge')}</p>
      </div>

      {/* connection quality */}
      <div className="absolute end-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
        <QualityIcon quality={quality} />
        <span className="sr-only">{t(`meeting.quality.${quality}`)}</span>
      </div>

      {/* locally muted indicator */}
      {speakerMuted && (
        <div className="absolute bottom-2.5 start-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
          <VolumeX className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
          <span className="text-xs font-medium text-white">{t('meeting.states.buddyMuted')}</span>
        </div>
      )}
    </TileFrame>
  );
};

export default BuddyTile;
