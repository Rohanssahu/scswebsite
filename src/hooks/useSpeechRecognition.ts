import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from '@/i18n/config';
import { getLocaleConfig } from '@/i18n/languageConfig';

// Optional browser speech-to-text via the (webkit)SpeechRecognition API.
// The microphone is only requested when start() is called from an explicit
// user action (mic button). Audio is never recorded, stored or uploaded —
// the browser hands us text and nothing else. Unsupported browsers simply
// report supported=false and the text input remains the fallback.

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as RecognitionCtor) ?? (w.webkitSpeechRecognition as RecognitionCtor) ?? null;
}

export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  /** i18n key of the current error, rendered with t() by the caller. */
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('guide.chat.micUnsupported');
      return;
    }
    try {
      const recognition = new Ctor();
      // Listen in the selected website language.
      recognition.lang = getLocaleConfig(i18n.language).locale;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript.trim()) onResultRef.current(transcript.trim());
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };
      recognition.onerror = (event) => {
        recognitionRef.current = null;
        setListening(false);
        setError(event.error === 'not-allowed' ? 'guide.chat.micDenied' : 'guide.chat.micFailed');
      };
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setError('guide.chat.micFailed');
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
