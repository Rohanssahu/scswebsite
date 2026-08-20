import { useCallback, useEffect, useRef, useState } from 'react';
import { getLocaleConfig } from '@/i18n/languageConfig';

// Optional browser text-to-speech via the Web Speech API.
// Nothing is recorded or uploaded; unsupported browsers degrade to captions only.
// Language-aware: picks the best available voice for the requested locale and
// refuses to speak with an unrelated voice (captions remain the fallback).
// Long messages are split into sentences with short natural pauses.
// The onEnd callback fires exactly once per speak() call — including when the
// utterance is cancelled — so message queues never stall.

interface SpeakOptions {
  /** Language code (e.g. 'hi'); voice is matched from the locale config. */
  lang?: string;
  /** Speech rate; defaults to 0.82. */
  rate?: number;
  onEnd?: () => void;
}

const SENTENCE_SPLIT = /(?<=[.!?।؟…])\s+/u;
const SENTENCE_PAUSE_MS = 220;

function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = getLocaleConfig(lang).voicePreferences;
  // 1. Exact preferred locales (e.g. en-IN before en-US).
  for (const pref of prefs) {
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === pref.toLowerCase());
    if (exact) return exact;
  }
  // 2. Any compatible voice sharing the base language.
  const base = lang.toLowerCase().split('-')[0];
  const compatible = voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base));
  if (compatible) return compatible;
  // 3. Never fall back to an unrelated voice — captions take over instead.
  return null;
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(0);
  const sessionRef = useRef(0);
  const onEndRef = useRef<(() => void) | null>(null);
  const pauseTimerRef = useRef<number | null>(null);

  // Voice lists load asynchronously in most browsers.
  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoicesReady((n) => n + 1);
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [supported]);

  /** Whether a compatible voice exists for the given language right now. */
  const voiceAvailable = useCallback(
    (lang: string) => supported && pickVoice(lang) !== null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supported, voicesReady],
  );

  /** Cancel any queued speech before speaking something new — never overlap. */
  const cancel = useCallback(() => {
    sessionRef.current += 1; // invalidate in-flight utterance chains
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
    const cb = onEndRef.current;
    onEndRef.current = null;
    cb?.();
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const lang = options?.lang ?? 'en';
      const voice = supported ? pickVoice(lang) : null;
      if (!supported || !text.trim() || !voice) {
        // No compatible voice → captions only; settle immediately.
        options?.onEnd?.();
        return;
      }
      cancel(); // settle any previous utterance first (fires its onEnd)
      const session = sessionRef.current;
      onEndRef.current = options?.onEnd ?? null;
      const sentences = splitSentences(text);
      const rate = options?.rate ?? 0.82;

      const finish = () => {
        if (sessionRef.current !== session) return;
        setSpeaking(false);
        const cb = onEndRef.current;
        onEndRef.current = null;
        cb?.();
      };

      const speakAt = (index: number) => {
        if (sessionRef.current !== session) return;
        if (index >= sentences.length) {
          finish();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(sentences[index]);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        const next = () => {
          if (sessionRef.current !== session) return;
          // Short natural pause between sentences.
          pauseTimerRef.current = window.setTimeout(() => speakAt(index + 1), SENTENCE_PAUSE_MS);
        };
        utterance.onend = next;
        utterance.onerror = next;
        window.speechSynthesis.speak(utterance);
      };

      setSpeaking(true);
      speakAt(0);
    },
    [cancel, supported],
  );

  // Stop speaking if the component unmounts or the page unloads.
  useEffect(() => {
    if (!supported) return;
    const stop = () => window.speechSynthesis.cancel();
    window.addEventListener('beforeunload', stop);
    return () => {
      window.removeEventListener('beforeunload', stop);
      stop();
    };
  }, [supported]);

  return { supported, speaking, speak, cancel, voiceAvailable };
}
