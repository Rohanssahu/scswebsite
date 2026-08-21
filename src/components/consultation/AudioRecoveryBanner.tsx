// =============================================================================
// AudioRecoveryBanner — in-meeting microphone recovery.
//
// Shown when the LiveKit local microphone publication is NOT live: 'failed'
// (it never published) or 'lost' (the device/track went away mid-meeting).
//
// The meeting is never ended automatically and the room is never rebuilt: the
// client retries the microphone, picks a different input device, or keeps going
// in text chat — all inside the SAME room, so no second Buddy is dispatched.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, MicOff, RefreshCw, Settings } from 'lucide-react';
import PermissionHelp from '@/components/consultation/PermissionHelp';
import type { DeviceOption } from '@/services/deviceCheck';
import type { MicFailureStatus } from '@/services/consultationCore';

interface AudioRecoveryBannerProps {
  status: MicFailureStatus;
  retrying: boolean;
  /** Input devices to choose from. Empty when the browser will not enumerate. */
  microphones: DeviceOption[];
  onRetry: () => void;
  /** Publishes from another device — same room, same meeting. */
  onSelectMicrophone: (deviceId: string) => void;
  onRefreshMicrophones: () => void;
  onOpenChat: () => void;
}

const AudioRecoveryBanner: React.FC<AudioRecoveryBannerProps> = ({
  status,
  retrying,
  microphones,
  onRetry,
  onSelectMicrophone,
  onRefreshMicrophones,
  onOpenChat,
}) => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // The list is only fetched when the client asks to change device, and it is
  // never persisted or logged — device ids stay in memory.
  useEffect(() => {
    if (pickerOpen) onRefreshMicrophones();
  }, [pickerOpen, onRefreshMicrophones]);

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
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
          {t('meeting.audioRecovery.chooseMic')}
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

      {pickerOpen && (
        <div className="mt-2 rounded-xl bg-black/20 p-2">
          <label htmlFor="recovery-mic" className="block text-xs text-rose-100/90">
            {t('meeting.audioRecovery.micPickerLabel')}
          </label>
          {microphones.length === 0 ? (
            <p className="mt-1 text-xs text-rose-100/80">{t('meeting.audioRecovery.noDevices')}</p>
          ) : (
            <select
              id="recovery-mic"
              defaultValue=""
              disabled={retrying}
              onChange={(event) => {
                const deviceId = event.target.value;
                if (deviceId) onSelectMicrophone(deviceId);
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-navy-900 px-2 py-2 text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <option value="">{t('meeting.audioRecovery.micPickerPlaceholder')}</option>
              {microphones.map((option) => (
                <option key={option.deviceId} value={option.deviceId}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {settingsOpen && <PermissionHelp defaultOpen tone="dark" />}
    </div>
  );
};

export default AudioRecoveryBanner;
