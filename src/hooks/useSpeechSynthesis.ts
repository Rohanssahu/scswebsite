import { useCallback, useEffect, useRef, useState } from 'react';

// Optional browser text-to-speech via the Web Speech API.
// Nothing is recorded or uploaded; unsupported browsers degrade to captions only.

interface SpeakOptions {
  onEnd?: () => void;
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if (supported) {
      // Detach handlers so cancel() doesn't fire onEnd callbacks.
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !text.trim()) {
        options?.onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        options?.onEnd?.();
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        options?.onEnd?.();
      };
      utteranceRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  // Stop speaking if the component unmounts or the page navigates away.
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
