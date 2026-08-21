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
  type MeetingJoinStage,
  type MicControlState,
  type MicPublicationStatus,
} from '@/services/consultationCore';
import {
  MeetingSession,
  type MeetingConnectOptions,
  type MicNotice,
} from '@/services/meetingSession';
import type { DeviceOption } from '@/services/deviceCheck';
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
  /** Whether the local microphone track is really published (not assumed). */
  micPublication: MicPublicationStatus;
  /** What the mic button shows — derived from the real publication/track. */
  micState: MicControlState;
  /** Staged join progress; only 'connected' means two-way voice. */
  joinStage: MeetingJoinStage;
  /** Latest non-identifying device notice ('device_changed' | 'no_device'). */
  micNotice: MicNotice | null;
  /** Input devices offered by "Choose another microphone" (memory only). */
  microphones: DeviceOption[];
  retryingMic: boolean;
  connect: (join: MeetingJoinResponse, options: MeetingConnectOptions) => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  sendChat: (text: string) => void;
  addSystemMessage: (text: string) => void;
  /** Republishes the tested microphone after a publication failure. */
  retryMicrophone: () => Promise<MicPublicationStatus>;
  /** Publishes from a different input device, in the same room. */
  switchMicrophone: (deviceId: string | null) => Promise<MicPublicationStatus>;
  /** Re-enumerates input devices for the picker. */
  refreshMicrophones: () => Promise<void>;
  clearMicNotice: () => void;
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
  const [micPublication, setMicPublication] = useState<MicPublicationStatus>('unknown');
  const [micState, setMicState] = useState<MicControlState>('idle');
  const [joinStage, setJoinStage] = useState<MeetingJoinStage>('idle');
  const [micNotice, setMicNotice] = useState<MicNotice | null>(null);
  const [microphones, setMicrophones] = useState<DeviceOption[]>([]);
  const [retryingMic, setRetryingMic] = useState(false);

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
      onMicPublication: setMicPublication,
      // The microphone button follows LiveKit's real publication state, so it
      // can never show "unmuted" while nothing is actually being published.
      onMicState: (state) => {
        setMicState(state);
        setMicEnabled(state === 'unmuted' || state === 'publishing');
      },
      onJoinStage: setJoinStage,
      onMicNotice: setMicNotice,
    });
    sessionRef.current = session;
    return session;
  }, []);

  const connect = useCallback(
    async (join: MeetingJoinResponse, options: MeetingConnectOptions) => {
      const session = ensureSession();
      setMicEnabled(!options.micMuted);
      setCameraEnabled(options.camera);
      await session.connect(join, options);
    },
    [ensureSession],
  );

  /**
   * Mute/unmute the REAL publication. The optimistic flip keeps the button
   * responsive, but onMicState (fed by LiveKit) is the authority and corrects
   * it — including "unmute recreated a publication that had gone away".
   */
  const toggleMic = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setMicEnabled((prev) => {
      const next = !prev;
      void session.setMicEnabled(next);
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

  /** Text chat never depends on this — it stays usable whatever audio does. */
  const retryMicrophone = useCallback(async (): Promise<MicPublicationStatus> => {
    const session = sessionRef.current;
    if (!session) return 'failed';
    setRetryingMic(true);
    try {
      const status = await session.retryMicrophone();
      setMicrophones(session.microphoneOptions);
      return status;
    } finally {
      setRetryingMic(false);
    }
  }, []);

  /** Same room, same Buddy job — only the input device changes. */
  const switchMicrophone = useCallback(async (deviceId: string | null): Promise<MicPublicationStatus> => {
    const session = sessionRef.current;
    if (!session) return 'failed';
    setRetryingMic(true);
    try {
      setMicNotice(null);
      return await session.switchMicrophone(deviceId);
    } finally {
      setRetryingMic(false);
    }
  }, []);

  const refreshMicrophones = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setMicrophones(await session.refreshMicrophones());
  }, []);

  const clearMicNotice = useCallback(() => setMicNotice(null), []);

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
    micPublication,
    micState,
    joinStage,
    micNotice,
    microphones,
    retryingMic,
    connect,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    sendChat,
    addSystemMessage,
    retryMicrophone,
    switchMicrophone,
    refreshMicrophones,
    clearMicNotice,
    leave,
  };
}
