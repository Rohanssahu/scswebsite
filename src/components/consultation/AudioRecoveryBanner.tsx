// =============================================================================
// AudioRecoveryBanner — in-meeting microphone recovery.
//
// Shown when the LiveKit local microphone track is NOT actually published
// ('failed') or stopped being published mid-meeting ('lost'). The meeting is
// never ended automatically: the client can retry the microphone, open the
// audio-settings guidance, or keep going in text chat, which stays available
// the whole time.
// =============================================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, MicOff, RefreshCw, Settings } from 'lucide-react';
import PermissionHelp from '@/components/consultation/PermissionHelp';

export type MicPublicationStatus = 'unknown' | 'published' | 'failed' | 'lost';

interface AudioRecoveryBannerProps {
  status: Exclude<MicPublicationStatus, 'unknown' | 'published'>;
  retrying: boolean;
  onRetry: () => void;
  onOpenChat: () => void;
}

const AudioRecoveryBanner: React.FC<AudioRecoveryBannerProps> = ({
  status,
  retrying,
  onRetry,
  onOpenChat,
}) => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="shrink-0 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-50"
    >
      <p className="flex gap-2 font-medium">
        <MicOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {t(status === 'lost' ? 'meeting.audioRecovery.lostTitle' : 'meeting.audioRecovery.failedTitle')}
      </p>
      <p className="mt-1 ps-6 text-rose-100/90">{t('meeting.audioRecovery.text')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {retrying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t('meeting.audioRecovery.retryMic')}
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          {t('meeting.audioRecovery.audioSettings')}
        </button>
        <button
          type="button"
          onClick={onOpenChat}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {t('meeting.fallback.useChat')}
        </button>
      </div>
      {settingsOpen && <PermissionHelp defaultOpen tone="dark" />}
    </div>
  );
};

export default AudioRecoveryBanner;
