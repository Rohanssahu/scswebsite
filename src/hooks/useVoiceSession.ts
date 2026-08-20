// React state wrapper around the Buddy voice session (LiveKit).
// Owns the lifecycle: consent → token → connect → live states → completed.
// The manual project-analysis flow remains the fallback whenever anything
// here fails or the feature is disabled server-side.

import { useCallback, useEffect, useRef, useState } from 'react';
import { requestVoiceToken, VoiceSession, VoiceSessionError } from '@/services/voiceSession';
import {
  upsertTranscript,
  type BuddyStateView,
  type TranscriptItem,
  type VoiceErrorCode,
  type VoiceSessionState,
} from '@/services/voiceSessionCore';

export interface VoiceSessionApi {
  state: VoiceSessionState;
  error: VoiceErrorCode | null;
  transcript: TranscriptItem[];
  buddyState: BuddyStateView | null;
  audioLevel: number;
  muted: boolean;
  /** Begin the consent step (renders the consent + Turnstile screen). */
  begin: () => void;
  /** Called with a fresh Turnstile token once the visitor consents. */
  start: (turnstileToken: string, preferredLanguage: string | null) => Promise<void>;
  toggleMute: () => void;
  sendText: (text: string) => void;
  end: () => void;
  reset: () => void;
}

export function useVoiceSession(): VoiceSessionApi {
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [error, setError] = useState<VoiceErrorCode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [buddyState, setBuddyState] = useState<BuddyStateView | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [muted, setMuted] = useState(false);

  const sessionRef = useRef<VoiceSession | null>(null);
  const mutedRef = useRef(false);

  // Always clean up the room on unmount.
  useEffect(() => {
    return () => {
      void sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  const begin = useCallback(() => {
    setError(null);
    setState('consent');
  }, []);

  const start = useCallback(async (turnstileToken: string, preferredLanguage: string | null) => {
    setError(null);
    setState('connecting');
    try {
      const tokenResponse = await requestVoiceToken(turnstileToken, preferredLanguage);
      const session = new VoiceSession({
        onState: (next, code) => {
          // Ignore speaker-driven state flips while muted.
          if (mutedRef.current && (next === 'listening' || next === 'thinking' || next === 'speaking')) return;
          setState(next);
          if (code) setError(code);
        },
        onTranscript: (item) => setTranscript((prev) => upsertTranscript(prev, item)),
        onBuddyState: setBuddyState,
        onAudioLevel: setAudioLevel,
      });
      sessionRef.current = session;
      await session.connect(tokenResponse);
    } catch (e) {
      const code = e instanceof VoiceSessionError ? e.code : 'unknown';
      setError(code);
      setState('error');
    }
  }, []);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    void session.setMuted(next);
  }, []);

  const sendText = useCallback((text: string) => {
    void sessionRef.current?.sendText(text);
  }, []);

  const end = useCallback(() => {
    void sessionRef.current?.end();
    sessionRef.current = null;
    mutedRef.current = false;
    setMuted(false);
    setState('completed');
  }, []);

  const reset = useCallback(() => {
    void sessionRef.current?.dispose();
    sessionRef.current = null;
    mutedRef.current = false;
    setMuted(false);
    setTranscript([]);
    setBuddyState(null);
    setAudioLevel(0);
    setError(null);
    setState('idle');
  }, []);

  return { state, error, transcript, buddyState, audioLevel, muted, begin, start, toggleMute, sendText, end, reset };
}

export type UseVoiceSession = ReturnType<typeof useVoiceSession>;
