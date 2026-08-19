import { useCallback, useEffect, useRef, useState } from 'react';

// Optional browser text-to-speech via the Web Speech API.
// Nothing is recorded or uploaded; unsupported browsers degrade to captions only.
// The onEnd callback is guaranteed to fire exactly once per speak() call —
// including when the utterance is cancelled — so message queues never stall.

interface SpeakOptions {
  onEnd?: () => void;
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);

  const flush = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
    const cb = onEndRef.current;
    onEndRef.current = null;
    cb?.();
  }, [supported]);

  const cancel = useCallback(() => {
    flush();
  }, [flush]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !text.trim()) {
        options?.onEnd?.();
        return;
      }
      flush(); // settle any previous utterance first
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      const settle = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setSpeaking(false);
          const cb = onEndRef.current;
          onEndRef.current = null;
          cb?.();
        }
      };
      utterance.onend = settle;
      utterance.onerror = settle;
      utteranceRef.current = utterance;
      onEndRef.current = options?.onEnd ?? null;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [flush, supported],
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

  return { supported, speaking, speak, cancel };
}
