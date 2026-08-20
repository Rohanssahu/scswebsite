import React, { useState } from 'react';
import { Check, Home, LogOut, Pause, Play, Volume2, VolumeX, Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LOCALES, SpeechSpeed, SUPPORTED_LANGUAGES } from '@/i18n/languageConfig';
import { BuddyApi } from '@/hooks/useBuddyAnimation';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';

// Buddy settings view: change language (native labels, keyboard accessible,
// ≥44px touch targets), speech speed, and Buddy character controls (send
// home / bring back, pause animations, reduce motion, optional sounds).

interface GuideSettingsProps {
  guide: VirtualGuideApi;
  buddy: BuddyApi;
}

const SPEEDS: { value: SpeechSpeed; labelKey: string }[] = [
  { value: 'slow', labelKey: 'guide.language.speedSlow' },
  { value: 'normal', labelKey: 'guide.language.speedNormal' },
  { value: 'fast', labelKey: 'guide.language.speedFast' },
];

const GuideSettings = ({ guide, buddy }: GuideSettingsProps) => {
  const { t, i18n } = useTranslation();
  const [remember, setRemember] = useState(true);

  const toggleRow = (
    label: string,
    active: boolean,
    onClick: () => void,
    ActiveIcon: typeof Pause,
    InactiveIcon: typeof Play,
  ) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
        active ? 'border-pink-500 bg-pink-50 font-semibold text-gray-900' : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
      }`}
    >
      <span className="flex items-center gap-2">
        {active ? <ActiveIcon className="h-4 w-4 text-pink-600" aria-hidden="true" /> : <InactiveIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />}
        {label}
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <h3 className="text-sm font-bold text-gray-900">{t('guide.language.changeTitle')}</h3>

      {/* Language list */}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-pink-600">
        {t('guide.language.chooseLanguage')}
      </p>
      <div role="group" aria-label={t('guide.language.listLabel')} className="mt-2 space-y-1.5">
        {SUPPORTED_LANGUAGES.map((code) => {
          const cfg = LOCALES[code];
          const active = i18n.language === code;
          return (
            <button
              key={code}
              type="button"
              lang={code}
              dir={cfg.dir}
              aria-pressed={active}
              aria-label={`${cfg.nativeLabel} (${cfg.englishLabel})`}
              onClick={() => guide.chooseLanguage(code, remember)}
              className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                active
                  ? 'border-pink-500 bg-pink-50 font-semibold text-gray-900'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
              }`}
            >
              <span>
                {cfg.nativeLabel}
                {code !== 'en' && <span className="ms-2 text-xs text-gray-400">{cfg.englishLabel}</span>}
              </span>
              {active && <Check className="h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
        />
        {t('guide.language.rememberChoice')}
      </label>

      {/* Speech speed */}
      {guide.ttsSupported && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-pink-600">
            {t('guide.language.speechSpeed')}
          </p>
          <div role="group" aria-label={t('guide.language.speechSpeed')} className="mt-2 flex gap-1.5">
            {SPEEDS.map((s) => {
              const active = guide.speechSpeed === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => guide.setSpeechSpeed(s.value)}
                  className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                    active
                      ? 'border-pink-500 bg-pink-50 font-semibold text-gray-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-pink-400'
                  }`}
                >
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Voice availability note for the selected language */}
      {guide.ttsSupported && !guide.voiceAvailableForLanguage && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t('guide.language.voiceUnavailable')}
        </p>
      )}

      {/* Buddy character controls */}
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-pink-600">{t('guide.buddy.settingsTitle')}</p>
      <div className="mt-2 space-y-1.5">
        {buddy.insideHome ? (
          <button
            type="button"
            onClick={buddy.bringBack}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <LogOut className="h-4 w-4 text-gray-400 rtl:-scale-x-100" aria-hidden="true" />
            {t('guide.buddy.bringBack')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              guide.closePanel();
              buddy.sendHome();
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 transition-colors hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Home className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {t('guide.buddy.sendHome')}
          </button>
        )}
        {toggleRow(t('guide.buddy.pauseAnimations'), buddy.prefs.animationsPaused, buddy.togglePauseAnimations, Pause, Play)}
        {toggleRow(t('guide.buddy.reduceMotion'), buddy.prefs.reduceMotion, buddy.toggleReduceMotion, Wind, Wind)}
        {toggleRow(t('guide.buddy.sounds'), buddy.prefs.soundsEnabled, buddy.toggleSounds, Volume2, VolumeX)}
        <p className="px-1 text-xs text-gray-500">{t('guide.buddy.soundsHint')}</p>
      </div>

      <button
        type="button"
        onClick={guide.closeSettings}
        className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
      >
        {t('guide.language.done')}
      </button>
    </div>
  );
};

export default GuideSettings;
