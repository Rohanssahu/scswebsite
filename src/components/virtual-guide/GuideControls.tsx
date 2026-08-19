import React from 'react';
import {
  Map,
  Pause,
  Play,
  Volume2,
  VolumeX,
  AudioLines,
  Minus,
  X,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';

// Video-call style control strip: tour, pause/resume, mute, voice on/off,
// restart, minimize and close. Every control is keyboard accessible.

interface GuideControlsProps {
  guide: VirtualGuideApi;
}

const btn =
  'flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

const GuideControls = ({ guide }: GuideControlsProps) => {
  const tourActive = guide.tour.active;
  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label="Guide controls">
      {!tourActive ? (
        <button type="button" className={btn} aria-label="Start website tour" title="Start website tour" onClick={guide.startTour}>
          <Map className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={btn} aria-label="Skip tour" title="Skip tour" onClick={guide.tourSkip}>
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {guide.paused ? (
        <button type="button" className={btn} aria-label="Resume guide" title="Resume" onClick={guide.resume}>
          <Play className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={btn} aria-label="Pause guide" title="Pause" onClick={guide.pause}>
          <Pause className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {guide.ttsSupported && (
        <button
          type="button"
          className={`${btn} ${guide.voiceEnabled ? 'bg-white/15' : ''}`}
          aria-label={guide.voiceEnabled ? 'Disable voice narration' : 'Enable voice narration'}
          aria-pressed={guide.voiceEnabled}
          title={guide.voiceEnabled ? 'Disable voice' : 'Enable voice'}
          onClick={guide.toggleVoice}
        >
          <AudioLines className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {guide.ttsSupported && guide.voiceEnabled && (
        <button
          type="button"
          className={btn}
          aria-label={guide.muted ? 'Unmute' : 'Mute'}
          aria-pressed={guide.muted}
          title={guide.muted ? 'Unmute' : 'Mute'}
          onClick={guide.toggleMute}
        >
          {guide.muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}

      <button type="button" className={btn} aria-label="Restart conversation" title="Restart conversation" onClick={guide.restartConversation}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>

      <button type="button" className={btn} aria-label="Minimize guide" title="Minimize" onClick={guide.minimize}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <button type="button" className={btn} aria-label="Close guide" title="Close" onClick={guide.closePanel}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default GuideControls;
