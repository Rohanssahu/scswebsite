import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TurnstileWidget, { TurnstileWidgetHandle } from '@/components/forms/TurnstileWidget';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { isLeadCaptureReady } from '@/services/supabaseClient';
import { VirtualGuideApi } from '@/hooks/useVirtualGuide';
import type { AvatarState } from '@/types/virtualGuide';
import type { VoiceSessionState } from '@/services/voiceSessionCore';

// Buddy real-time voice mode. Fills the panel body (in place of the chat)
// while settingsMode === 'voice'. Consent + Turnstile come BEFORE any
// connection; microphone denial and every failure fall back to the existing
// text chat / manual analysis flow, which stays fully functional.

interface VoicePanelProps {
  guide: VirtualGuideApi;
}

const AVATAR_BY_STATE: Record<VoiceSessionState, AvatarState> = {
  idle: 'welcome',
  consent: 'welcome',
  connecting: 'thinking',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  paused: 'idle',
  completed: 'success',
  error: 'idle',
};

const VoicePanel = ({ guide }: VoicePanelProps) => {
  const { t, i18n } = useTranslation();
  const voice = useVoiceSession();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const live = ['listening', 'thinking', 'speaking', 'paused'].includes(voice.state);

  // Mirror the voice state onto the shared Buddy avatar (stage animation).
  useEffect(() => {
    guide.setVoiceAvatar(AVATAR_BY_STATE[voice.state], voice.audioLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.state, voice.audioLevel]);

  // Leaving voice mode ends the live session and clears the avatar override.
  useEffect(() => {
    return () => {
      voice.reset();
      guide.setVoiceAvatar(null, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [voice.transcript]);

  const progress = voice.buddyState?.progress ?? null;
  const estimate = voice.buddyState?.estimate ?? null;
  const referenceCode = voice.buddyState?.referenceCode ?? null;

  const langHint = useMemo(
    () => (['en', 'hi'].includes(i18n.language) ? i18n.language : null),
    [i18n.language],
  );

  const startFallbackFlow = (mode: 'new' | 'existing') => {
    guide.closeVoice();
    guide.runAction({ label: 'fallback', kind: mode === 'new' ? 'flow-new' : 'flow-existing' });
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text) return;
    voice.sendText(text);
    setTextInput('');
  };

  const fallbackButtons = (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-gray-700">{t('voice.fallback.title')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startFallbackFlow('new')}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {t('voice.fallback.new')}
        </button>
        <button
          type="button"
          onClick={() => startFallbackFlow('existing')}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {t('voice.fallback.existing')}
        </button>
        <button
          type="button"
          onClick={guide.closeVoice}
          className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          {t('voice.fallback.text')}
        </button>
      </div>
    </div>
  );

  // ---------- idle: explainer + start ----------
  if (voice.state === 'idle') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{t('voice.title')}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{t('voice.intro')}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{t('voice.languagesHint')}</p>
        {isLeadCaptureReady ? (
          <button
            type="button"
            onClick={voice.begin}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Mic className="h-4 w-4" aria-hidden="true" /> {t('voice.talkButton')}
          </button>
        ) : (
          <p className="mt-4 text-xs text-amber-700" role="alert">
            {t('voice.errors.voice_disabled')}
          </p>
        )}
        {fallbackButtons}
      </div>
    );
  }

  // ---------- consent + Turnstile ----------
  if (voice.state === 'consent') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{t('voice.consent.title')}</h3>
        <ul className="mt-2 list-disc space-y-1.5 ps-4 text-xs leading-relaxed text-gray-600">
          <li>{t('voice.consent.mic')}</li>
          <li>{t('voice.consent.data')}</li>
          <li>{t('voice.consent.noAudio')}</li>
        </ul>
        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} className="mt-3" />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={!turnstileToken}
            onClick={() => {
              if (!turnstileToken) return;
              void voice.start(turnstileToken, langHint);
              turnstileRef.current?.reset();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Mic className="h-4 w-4" aria-hidden="true" /> {t('voice.consent.agree')}
          </button>
          <button
            type="button"
            onClick={voice.reset}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            {t('voice.consent.cancel')}
          </button>
        </div>
      </div>
    );
  }

  // ---------- error ----------
  if (voice.state === 'error') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <p className="text-sm font-medium text-red-700" role="alert">
          {t(`voice.errors.${voice.error ?? 'unknown'}`)}
        </p>
        {voice.error === 'turnstile_failed' && (
          <button
            type="button"
            onClick={voice.begin}
            className="mt-3 self-start rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            {t('voice.retry')}
          </button>
        )}
        {fallbackButtons}
      </div>
    );
  }

  // ---------- completed ----------
  if (voice.state === 'completed') {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <p className="text-sm font-semibold text-gray-900">{t('voice.completedTitle')}</p>
        {referenceCode && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {t('voice.reference', { code: referenceCode })}
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{t('voice.completedText')}</p>
        {fallbackButtons}
      </div>
    );
  }

  // ---------- live session (connecting / listening / thinking / speaking / paused) ----------
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* status + progress */}
      <div className="border-b border-gray-100 px-4 py-2">
        <p className="text-xs font-medium text-gray-700" aria-live="polite">
          {t(`voice.states.${voice.state}`)}
        </p>
        {progress && progress.intent && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>{t('voice.progress.title')}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('voice.progress.title')}>
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* live transcript */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite" aria-label={t('voice.transcript.title')}>
        {voice.transcript.length === 0 && <p className="text-xs text-gray-400">{t('voice.transcript.empty')}</p>}
        {voice.transcript.map((item) => (
          <div key={item.id} className={item.speaker === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                item.speaker === 'user'
                  ? 'rounded-se-sm bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'rounded-ss-sm border border-gray-200 bg-gray-50 text-gray-800'
              } ${item.final ? '' : 'opacity-70'}`}
            >
              <span className="sr-only">{item.speaker === 'user' ? t('voice.transcript.you') : t('voice.transcript.buddy')}: </span>
              {item.text}
            </div>
          </div>
        ))}

        {/* preliminary estimate card */}
        {estimate && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <p className="text-xs font-semibold text-purple-900">{t('voice.estimate.title')}</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-purple-900/90">
              <li>{t('voice.estimate.hours', { min: estimate.totalHoursMin, max: estimate.totalHoursMax })}</li>
              <li>{t('voice.estimate.cost', { min: estimate.totalCostMin, max: estimate.totalCostMax })}</li>
              <li>
                {t('voice.estimate.duration', {
                  min: estimate.durationWeeksMin,
                  max: estimate.durationWeeksMax,
                  capacity: estimate.weeklyCapacityHours,
                })}
              </li>
              <li>{t('voice.estimate.confidence', { level: estimate.confidence })}</li>
            </ul>
            <p className="mt-1.5 text-[10px] font-medium text-purple-700">{t('voice.estimate.preliminary')}</p>
          </div>
        )}

        {referenceCode && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{t('voice.reference', { code: referenceCode })}</p>
        )}
      </div>

      {/* controls */}
      <div className="flex items-center gap-1.5 border-t border-gray-200 px-3 py-2">
        <button
          type="button"
          onClick={voice.toggleMute}
          aria-pressed={voice.muted}
          aria-label={voice.muted ? t('voice.controls.unmute') : t('voice.controls.mute')}
          title={voice.muted ? t('voice.controls.unmute') : t('voice.controls.mute')}
          className={`min-h-11 min-w-11 rounded-xl p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
            voice.muted ? 'bg-amber-500 text-white' : 'border border-gray-300 text-gray-600 hover:border-pink-400'
          }`}
        >
          {voice.muted ? <MicOff className="mx-auto h-4 w-4" aria-hidden="true" /> : <Mic className="mx-auto h-4 w-4" aria-hidden="true" />}
        </button>
        <form onSubmit={submitText} className="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t('voice.controls.textPlaceholder')}
            aria-label={t('voice.controls.textLabel')}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || !live}
            aria-label={t('voice.controls.sendText')}
            className="min-h-11 min-w-11 rounded-xl border border-gray-300 p-2.5 text-gray-600 hover:border-pink-400 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <Send className="mx-auto h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </form>
        <button
          type="button"
          onClick={voice.end}
          aria-label={t('voice.controls.end')}
          title={t('voice.controls.end')}
          className="min-h-11 min-w-11 rounded-xl bg-red-600 p-2.5 text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <PhoneOff className="mx-auto h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default VoicePanel;
