import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MicOff, VideoOff } from 'lucide-react';
import TileFrame from './TileFrame';

interface ClientTileProps {
  name: string;
  cameraStream: MediaStream | null;
  micMuted: boolean;
  cameraEnabled: boolean;
  /** LiveKit active-speaker state for the local participant. */
  speaking: boolean;
  reduceMotion?: boolean;
  /** Layout classes supplied by the meeting stage. */
  className?: string;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** The client's own tile: camera feed or initials fallback, active-speaker
 * border, mic-muted and camera-off indicators. */
const ClientTile: React.FC<ClientTileProps> = ({
  name,
  cameraStream,
  micMuted,
  cameraEnabled,
  speaking,
  reduceMotion = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = cameraStream;
    if (cameraStream) void video.play().catch(() => undefined);
  }, [cameraStream]);

  const showVideo = cameraEnabled && cameraStream;
  // A muted microphone can never be an active speaker — never imply speech.
  const active = speaking && !micMuted;

  return (
    <TileFrame
      accent="client"
      active={active}
      reduceMotion={reduceMotion}
      className={className}
      innerClassName="bg-gradient-to-br from-navy-800 via-navy-900 to-navy-800"
    >
      {showVideo ? (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          aria-label={t('meeting.lobby.cameraPreview')}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="relative">
            {active && (
              <span
                aria-hidden="true"
                className={`absolute inset-0 -m-1.5 rounded-full bg-emerald-400/40 ${
                  reduceMotion ? '' : 'animate-audio-pulse'
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-2xl font-bold text-white sm:h-24 sm:w-24 sm:text-3xl"
            >
              {initialsOf(name)}
            </span>
          </span>
        </div>
      )}

      {/* name + indicators */}
      <div className="absolute bottom-2.5 start-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
        <span className="truncate text-xs font-medium text-white">{name || t('meeting.you')}</span>
        {micMuted && (
          <MicOff className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-label={t('meeting.controls.unmute')} />
        )}
        {!cameraEnabled && (
          <VideoOff className="h-3.5 w-3.5 shrink-0 text-white/60" aria-label={t('meeting.controls.cameraOn')} />
        )}
      </div>
    </TileFrame>
  );
};

export default ClientTile;
