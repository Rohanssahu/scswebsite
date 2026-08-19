import { useCallback, useEffect, useRef, useState } from 'react';

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
      setError('Speech recognition is not supported in this browser — please type instead.');
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = 'en-US';
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
        setError(
          event.error === 'not-allowed'
            ? 'Microphone permission was denied — you can keep typing instead.'
            : 'Voice input failed — please type your message instead.',
        );
      };
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setError('Voice input failed to start — please type your message instead.');
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
