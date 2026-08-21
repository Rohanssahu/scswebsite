import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MicOff, VideoOff } from 'lucide-react';

interface ClientTileProps {
  name: string;
  cameraStream: MediaStream | null;
  micMuted: boolean;
  cameraEnabled: boolean;
  speaking: boolean;
  /** Picture-in-picture style on small screens. */
  pip?: boolean;
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
const ClientTile: React.FC<ClientTileProps> = ({ name, cameraStream, micMuted, cameraEnabled, speaking, pip = false }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = cameraStream;
    if (cameraStream) void video.play().catch(() => undefined);
  }, [cameraStream]);

  const showVideo = cameraEnabled && cameraStream;

  return (
    <div
      data-active-speaker={speaking}
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-navy-800 transition-shadow ${
        pip ? 'h-32 w-24 sm:h-36 sm:w-28' : 'h-full min-h-[10rem] w-full'
      } ${speaking && !micMuted ? 'ring-4 ring-emerald-400/80' : 'ring-1 ring-white/10'}`}
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
        <div className="flex flex-col items-center gap-2">
          <span
            aria-hidden="true"
            className={`flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 font-bold text-white ${
              pip ? 'h-12 w-12 text-base' : 'h-20 w-20 text-2xl'
            }`}
          >
            {initialsOf(name)}
          </span>
          {!pip && <VideoOff className="h-4 w-4 text-white/50" aria-hidden="true" />}
        </div>
      )}

      {/* name + indicators */}
      <div className="absolute bottom-1.5 start-1.5 flex max-w-[85%] items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5">
        <span className={`truncate text-white ${pip ? 'text-[10px]' : 'text-xs'}`}>
          {name || t('meeting.you')}
        </span>
        {micMuted && <MicOff className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-label={t('meeting.controls.unmute')} />}
        {!cameraEnabled && !pip && (
          <VideoOff className="h-3.5 w-3.5 shrink-0 text-white/60" aria-label={t('meeting.controls.cameraOn')} />
        )}
      </div>
    </div>
  );
};

export default ClientTile;
