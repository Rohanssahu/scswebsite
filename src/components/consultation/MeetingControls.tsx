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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 disabled:cursor-not-allowed disabled:opacity-50';
/** neutral / "on" state */
const onCls = `${baseBtn} bg-white/10 text-white hover:bg-white/20`;
/** destructive / "off" state (mic muted, camera off, Buddy muted) */
const offCls = `${baseBtn} bg-rose-500/90 text-white hover:bg-rose-500`;
/** active toggle (panel open) */
const activeCls = `${baseBtn} bg-pink-500/25 text-pink-50 ring-1 ring-inset ring-pink-400/60 hover:bg-pink-500/35`;

/** One icon control with an accessible label and a tooltip. */
const ControlButton: React.FC<{
  label: string;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}> = ({ label, className, onClick, disabled, pressed, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        className={`${className} shrink-0`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

/** Bottom meeting control dock. Screen share is a disabled placeholder: it is
 * intentionally not wired up in this step. */
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
      className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-navy-900/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-4"
    >
      {/* main controls — centered on desktop, horizontally scrollable on mobile */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center">
        <ControlButton
          label={micEnabled ? t('meeting.controls.mute') : t('meeting.controls.unmute')}
          className={micEnabled ? onCls : offCls}
          onClick={onToggleMic}
          pressed={!micEnabled}
        >
          {micEnabled ? <Mic className="h-5 w-5" aria-hidden="true" /> : <MicOff className="h-5 w-5" aria-hidden="true" />}
        </ControlButton>

        <ControlButton
          label={cameraEnabled ? t('meeting.controls.cameraOff') : t('meeting.controls.cameraOn')}
          className={cameraEnabled ? onCls : offCls}
          onClick={onToggleCamera}
          pressed={cameraEnabled}
        >
          {cameraEnabled ? (
            <Video className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VideoOff className="h-5 w-5" aria-hidden="true" />
          )}
        </ControlButton>

        <ControlButton
          label={speakerEnabled ? t('meeting.controls.muteBuddy') : t('meeting.controls.unmuteBuddy')}
          className={speakerEnabled ? onCls : offCls}
          onClick={onToggleSpeaker}
          pressed={!speakerEnabled}
        >
          {speakerEnabled ? (
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-5 w-5" aria-hidden="true" />
          )}
        </ControlButton>

        <ControlButton
          label={t('meeting.controls.chat')}
          className={panelOpen ? activeCls : onCls}
          onClick={onToggleChat}
          pressed={panelOpen}
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </ControlButton>

        <ControlButton label={t('meeting.controls.context')} className={onCls} onClick={onToggleContext}>
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </ControlButton>

        <ControlButton
          label={`${t('meeting.controls.share')} — ${t('meeting.controls.comingSoon')}`}
          className={`${baseBtn} bg-white/5 text-white/50`}
          disabled
        >
          <MonitorUp className="h-5 w-5" aria-hidden="true" />
        </ControlButton>
      </div>

      {/* leaving stays separate from the final submission */}
      <div className="flex shrink-0 items-center gap-2">
        <ControlButton
          label={t('meeting.controls.leave')}
          className={`${baseBtn} bg-white/10 text-white hover:bg-white/20`}
          onClick={onLeave}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="hidden lg:inline">{t('meeting.controls.leave')}</span>
        </ControlButton>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onEndAndSubmit}
              disabled={!canSubmit || submitting}
              aria-label={t('meeting.controls.endSubmit')}
              className={`${baseBtn} shrink-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 font-semibold text-white shadow-lg shadow-pink-900/30 hover:brightness-110`}
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('meeting.controls.endSubmit')}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t('meeting.controls.endSubmit')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default MeetingControls;
