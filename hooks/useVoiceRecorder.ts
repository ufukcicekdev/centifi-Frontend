import { useEffect, useRef } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

/** Basılı çok erken bırakıldığında `permission_denied` ile karışmasın diye ayrı sonuçlar */
export type VoiceStartResult =
  | "ok"
  | "permission_denied"
  | "failed"
  | "cancelled";

interface UseVoiceRecorder {
  isRecording: boolean;
  startRecording: () => Promise<VoiceStartResult>;
  stopRecording: () => Promise<string | null>;
}

const MIN_RECORD_MS = 500;

function resolvedRecordingUri(recorder: {
  uri: string | null;
  getStatus: () => { url: string | null };
}): string | null {
  const fromProp =
    recorder.uri != null && typeof recorder.uri === "string" ? recorder.uri.trim() : "";
  if (fromProp.length > 0) return fromProp;
  const url = recorder.getStatus().url;
  if (url != null && url.trim().length > 0) return url.trim();
  return null;
}

/**
 * Ses kaydı — expo-audio (SDK 55).
 * stop ile start aynı sayaçta birbirini iptal ettiği için önceki sürümde çok kısa basışta
 * yanlışlıkla «izin yok» uyarısı ve sessiz başarısızlık oluyordu; buna göre düzeltildi.
 */
export function useVoiceRecorder(): UseVoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  /** stop, start’tan önce gelirse prepare sonrası record() çağrılmasın */
  const recordingEpoch = useRef(0);

  useEffect(() => {
    return () => {
      recordingEpoch.current += 1;
      void recorder.stop().catch(() => {});
    };
  }, [recorder]);

  const startRecording = async (): Promise<VoiceStartResult> => {
    recordingEpoch.current += 1;
    const epoch = recordingEpoch.current;

    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        return "permission_denied";
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });

      await recorder.stop().catch(() => {});

      await recorder.prepareToRecordAsync();

      if (recordingEpoch.current !== epoch) {
        return "cancelled";
      }

      recorder.record();

      if (recordingEpoch.current !== epoch) {
        await recorder.stop().catch(() => {});
        return "cancelled";
      }

      return "ok";
    } catch (e) {
      if (__DEV__) {
        console.warn("[useVoiceRecorder] Failed to start:", e);
      }
      await recorder.stop().catch(() => {});
      return "failed";
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    recordingEpoch.current += 1;

    try {
      const durationBefore = recorder.getStatus().durationMillis;
      await recorder.stop();
      const durationAfter = recorder.getStatus().durationMillis;
      const duration = Math.max(durationBefore, durationAfter);
      if (duration < MIN_RECORD_MS) {
        return null;
      }

      const uri = resolvedRecordingUri(recorder);
      return uri;
    } catch (e) {
      if (__DEV__) {
        console.warn("[useVoiceRecorder] Failed to stop:", e);
      }
      return null;
    }
  };

  return {
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
  };
}
