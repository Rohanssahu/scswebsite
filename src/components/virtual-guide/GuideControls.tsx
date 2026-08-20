import React from 'react';
import {
  Map,
  Pause,
  Phone,
  Play,
  Volume2,
  VolumeX,
  AudioLines,
  Languages,
  Minus,
  X,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';

// Video-call style control strip: tour, pause/resume, voice on/off, mute,
// language & speech settings, restart, minimize and close.
// Every control is keyboard accessible.

interface GuideControlsProps {
  guide: VirtualGuideApi;
}

const btn =
  'flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

const GuideControls = ({ guide }: GuideControlsProps) => {
  const { t } = useTranslation();
  const tourActive = guide.tour.active;
  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label={t('guide.controls.toolbar')}>
      <button
        type="button"
        className={`${btn} ${guide.settingsMode === 'voice' ? 'bg-white/15' : ''}`}
        aria-label={t('voice.talkButton')}
        aria-pressed={guide.settingsMode === 'voice'}
        title={t('voice.talkButton')}
        onClick={guide.settingsMode === 'voice' ? guide.closeVoice : guide.openVoice}
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
      </button>

      {!tourActive ? (
        <button type="button" className={btn} aria-label={t('guide.controls.startTour')} title={t('guide.controls.startTour')} onClick={guide.startTour}>
          <Map className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={btn} aria-label={t('guide.controls.skipTour')} title={t('guide.controls.skipTour')} onClick={guide.tourSkip}>
          <SkipForward className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      )}

      {guide.paused ? (
        <button type="button" className={btn} aria-label={t('guide.controls.resume')} title={t('guide.controls.resume')} onClick={guide.resume}>
          <Play className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={btn} aria-label={t('guide.controls.pause')} title={t('guide.controls.pause')} onClick={guide.pause}>
          <Pause className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {guide.ttsSupported && (
        <button
          type="button"
          className={`${btn} ${guide.voiceEnabled ? 'bg-white/15' : ''}`}
          aria-label={guide.voiceEnabled ? t('guide.controls.voiceOff') : t('guide.controls.voiceOn')}
          aria-pressed={guide.voiceEnabled}
          title={guide.voiceEnabled ? t('guide.controls.voiceOff') : t('guide.controls.voiceOn')}
          onClick={guide.toggleVoice}
        >
          <AudioLines className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {guide.ttsSupported && guide.voiceEnabled && (
        <button
          type="button"
          className={btn}
          aria-label={guide.muted ? t('guide.controls.unmute') : t('guide.controls.mute')}
          aria-pressed={guide.muted}
          title={guide.muted ? t('guide.controls.unmute') : t('guide.controls.mute')}
          onClick={guide.toggleMute}
        >
          {guide.muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}

      <button
        type="button"
        className={`${btn} ${guide.settingsMode === 'settings' ? 'bg-white/15' : ''}`}
        aria-label={t('guide.controls.settings')}
        aria-pressed={guide.settingsMode === 'settings'}
        title={t('guide.controls.settings')}
        onClick={guide.settingsMode === 'settings' ? guide.closeSettings : guide.openSettings}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
      </button>

      <button type="button" className={btn} aria-label={t('guide.controls.restart')} title={t('guide.controls.restart')} onClick={guide.restartConversation}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>

      <button type="button" className={btn} aria-label={t('guide.controls.minimize')} title={t('guide.controls.minimize')} onClick={guide.minimize}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <button type="button" className={btn} aria-label={t('guide.controls.close')} title={t('guide.controls.close')} onClick={guide.closePanel}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default GuideControls;
