// =============================================================================
// useConsultationMeeting — React wrapper around MeetingSession.
//
// Owns the live meeting state the UI renders: connection state, Buddy
// activity, chat, agent-published buddy.state (progress + proposal), device
// toggles and connection quality. All rules live in consultationCore.ts.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mergeChatMessage,
  type BuddyActivity,
  type ChatMessage,
  type ConnectionQuality,
  type MeetingConnectionState,
  type MeetingJoinResponse,
} from '@/services/consultationCore';
import { MeetingSession } from '@/services/meetingSession';
import type { BuddyStateView } from '@/services/voiceSessionCore';

export interface ConsultationMeetingApi {
  connection: MeetingConnectionState;
  errorCode: string | null;
  activity: BuddyActivity;
  agentPresent: boolean;
  quality: ConnectionQuality;
  audioLevel: number;
  messages: ChatMessage[];
  buddyState: BuddyStateView | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  clientSpeaking: boolean;
  buddySpeaking: boolean;
  cameraStream: MediaStream | null;
  connect: (join: MeetingJoinResponse, options: { camera: boolean; micMuted: boolean }) => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  sendChat: (text: string) => void;
  addSystemMessage: (text: string) => void;
  leave: () => Promise<void>;
}

export function useConsultationMeeting(): ConsultationMeetingApi {
  const sessionRef = useRef<MeetingSession | null>(null);
  const systemCounter = useRef(0);

  const [connection, setConnection] = useState<MeetingConnectionState>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [activity, setActivity] = useState<BuddyActivity>('waiting');
  const [agentPresent, setAgentPresent] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [buddyState, setBuddyState] = useState<BuddyStateView | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [clientSpeaking, setClientSpeaking] = useState(false);
  const [buddySpeaking, setBuddySpeaking] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const addSystemMessage = useCallback((text: string) => {
    systemCounter.current += 1;
    setMessages((prev) =>
      mergeChatMessage(prev, {
        id: `system-${systemCounter.current}`,
        sender: 'system',
        text,
        at: Date.now(),
        final: true,
        delivery: 'sent',
      }),
    );
  }, []);

  const ensureSession = useCallback((): MeetingSession => {
    if (sessionRef.current) return sessionRef.current;
    const session = new MeetingSession({
      onConnection: (state, code) => {
        setConnection(state);
        setErrorCode(code ?? null);
      },
      onActivity: setActivity,
      onAgentPresent: setAgentPresent,
      onChat: (message) => setMessages((prev) => mergeChatMessage(prev, message)),
      onBuddyState: setBuddyState,
      onAudioLevel: setAudioLevel,
      onQuality: setQuality,
      onLocalCamera: setCameraStream,
      onClientSpeaking: setClientSpeaking,
      onBuddySpeaking: setBuddySpeaking,
    });
    sessionRef.current = session;
    return session;
  }, []);

  const connect = useCallback(
    async (join: MeetingJoinResponse, options: { camera: boolean; micMuted: boolean }) => {
      const session = ensureSession();
      setMicEnabled(!options.micMuted);
      setCameraEnabled(options.camera);
      await session.connect(join, options);
    },
    [ensureSession],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((prev) => {
      const next = !prev;
      void sessionRef.current?.setMicEnabled(next);
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((prev) => {
      const next = !prev;
      void sessionRef.current?.setCameraEnabled(next).then((ok) => {
        if (!ok && next) setCameraEnabled(false);
      });
      return next;
    });
  }, []);

  /** Speaker toggle mutes/unmutes Buddy's audio elements locally. */
  const toggleSpeaker = useCallback(() => {
    setSpeakerEnabled((prev) => {
      const next = !prev;
      document.querySelectorAll<HTMLAudioElement>('audio[data-meeting-audio="true"]').forEach((el) => {
        el.muted = !next;
      });
      return next;
    });
  }, []);

  const sendChat = useCallback((text: string) => {
    void sessionRef.current?.sendChat(text);
  }, []);

  const leave = useCallback(async () => {
    await sessionRef.current?.end();
  }, []);

  useEffect(
    () => () => {
      void sessionRef.current?.dispose();
      sessionRef.current = null;
    },
    [],
  );

  return {
    connection,
    errorCode,
    activity,
    agentPresent,
    quality,
    audioLevel,
    messages,
    buddyState,
    micEnabled,
    cameraEnabled,
    speakerEnabled,
    clientSpeaking,
    buddySpeaking,
    cameraStream,
    connect,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    sendChat,
    addSystemMessage,
    leave,
  };
}
