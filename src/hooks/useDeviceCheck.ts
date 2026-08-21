// =============================================================================
// useDeviceCheck — thin React wrapper around DeviceCheckController.
//
// The controller owns the media resources and the state machine; this hook
// only mirrors its snapshot into React state and guarantees dispose() runs on
// unmount, so no test stream, AudioContext or animation frame survives the
// lobby.
//
// Nothing here requests a device: every action below is bound to a client
// button in DeviceCheckPanel.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceCheckController,
  INITIAL_DEVICE_CHECK_SNAPSHOT,
  browserDeviceCheckDeps,
  type DeviceCheckSnapshot,
} from '@/services/deviceCheckController';

export interface DeviceCheckApi extends DeviceCheckSnapshot {
  /** Runs (or re-runs) the microphone test. Client action only. */
  testMicrophone: () => void;
  /** Switches input device, then re-tests it. */
  selectMicrophone: (deviceId: string | null) => void;
  /** Clears a result so the client can start over. */
  resetMicrophone: () => void;
  /** Plays the local test tone once. Never called automatically. */
  playTestSound: () => void;
  /** The client's explicit answer — the only route to a speaker pass. */
  confirmSpeaker: (heard: boolean) => void;
  selectOutput: (deviceId: string | null) => void;
  /** Releases every temporary resource (called before joining the meeting). */
  release: () => void;
}

export function useDeviceCheck(): DeviceCheckApi {
  const [snapshot, setSnapshot] = useState<DeviceCheckSnapshot>(INITIAL_DEVICE_CHECK_SNAPSHOT);
  const controllerRef = useRef<DeviceCheckController | null>(null);

  useEffect(() => {
    const controller = new DeviceCheckController(browserDeviceCheckDeps(), setSnapshot);
    controllerRef.current = controller;
    setSnapshot(controller.getSnapshot());
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const testMicrophone = useCallback(() => {
    void controllerRef.current?.testMicrophone();
  }, []);

  const selectMicrophone = useCallback((deviceId: string | null) => {
    void controllerRef.current?.selectMicrophone(deviceId);
  }, []);

  const resetMicrophone = useCallback(() => {
    controllerRef.current?.resetMicrophone();
  }, []);

  const playTestSound = useCallback(() => {
    void controllerRef.current?.playTestSound();
  }, []);

  const confirmSpeaker = useCallback((heard: boolean) => {
    controllerRef.current?.confirmSpeaker(heard);
  }, []);

  const selectOutput = useCallback((deviceId: string | null) => {
    controllerRef.current?.selectOutput(deviceId);
  }, []);

  const release = useCallback(() => {
    controllerRef.current?.dispose();
    controllerRef.current = null;
  }, []);

  return {
    ...snapshot,
    testMicrophone,
    selectMicrophone,
    resetMicrophone,
    playTestSound,
    confirmSpeaker,
    selectOutput,
    release,
  };
}
