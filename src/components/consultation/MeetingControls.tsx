import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Send,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface MeetingControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  panelOpen: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onToggleChat: () => void;
  onToggleContext: () => void;
  onLeave: () => void;
  onEndAndSubmit: () => void;
}

const baseBtn =
  'inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:cursor-not-allowed disabled:opacity-50';
const onCls = `${baseBtn} bg-white/10 text-white hover:bg-white/20`;
const offCls = `${baseBtn} bg-rose-500/90 text-white hover:bg-rose-500`;

/** Bottom meeting control bar. Screen share is disabled with a "Coming soon"
 * label: it is intentionally not wired up in this step. */
const MeetingControls: React.FC<MeetingControlsProps> = ({
  micEnabled,
  cameraEnabled,
  speakerEnabled,
  panelOpen,
  canSubmit,
  submitting,
  onToggleMic,
  onToggleCamera,
  onToggleSpeaker,
  onToggleChat,
  onToggleContext,
  onLeave,
  onEndAndSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="toolbar"
      aria-label={t('meeting.controls.toolbar')}
      className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-navy-900/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:gap-3 sm:p-3"
    >
      <button type="button" onClick={onToggleMic} aria-pressed={!micEnabled} className={micEnabled ? onCls : offCls}>
        {micEnabled ? <Mic className="h-5 w-5" aria-hidden="true" /> : <MicOff className="h-5 w-5" aria-hidden="true" />}
        <span>{micEnabled ? t('meeting.controls.mute') : t('meeting.controls.unmute')}</span>
      </button>

      <button type="button" onClick={onToggleCamera} aria-pressed={cameraEnabled} className={cameraEnabled ? onCls : offCls}>
        {cameraEnabled ? <Video className="h-5 w-5" aria-hidden="true" /> : <VideoOff className="h-5 w-5" aria-hidden="true" />}
        <span>{cameraEnabled ? t('meeting.controls.cameraOff') : t('meeting.controls.cameraOn')}</span>
      </button>

      <button type="button" onClick={onToggleSpeaker} aria-pressed={!speakerEnabled} className={speakerEnabled ? onCls : offCls}>
        {speakerEnabled ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
        <span>{speakerEnabled ? t('meeting.controls.muteBuddy') : t('meeting.controls.unmuteBuddy')}</span>
      </button>

      <button type="button" onClick={onToggleChat} aria-pressed={panelOpen} className={onCls}>
        <MessageSquare className="h-5 w-5" aria-hidden="true" />
        <span>{t('meeting.controls.chat')}</span>
      </button>

      <button type="button" onClick={onToggleContext} className={onCls}>
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
        <span>{t('meeting.controls.context')}</span>
      </button>

      <button
        type="button"
        disabled
        title={t('meeting.controls.comingSoon')}
        aria-label={`${t('meeting.controls.share')} — ${t('meeting.controls.comingSoon')}`}
        className={`${baseBtn} bg-white/5 text-white/50`}
      >
        <MonitorUp className="h-5 w-5" aria-hidden="true" />
        <span>{t('meeting.controls.comingSoon')}</span>
      </button>

      <button type="button" onClick={onLeave} className={`${baseBtn} bg-white/10 text-white hover:bg-white/20`}>
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span>{t('meeting.controls.leave')}</span>
      </button>

      <button
        type="button"
        onClick={onEndAndSubmit}
        disabled={!canSubmit || submitting}
        className={`${baseBtn} bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white hover:brightness-110`}
      >
        <Send className="h-5 w-5" aria-hidden="true" />
        <span>{t('meeting.controls.endSubmit')}</span>
      </button>
    </div>
  );
};

export default MeetingControls;
