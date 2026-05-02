import { useState, useRef } from "react";

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

/** Web: gerçek kayıt yok; push-to-talk sözleşmesi ile aynı dönüş tipleri. */
export function useVoiceRecorder(): UseVoiceRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const recordingEpoch = useRef(0);
  const capturingRef = useRef(false);

  const startRecording = async (): Promise<VoiceStartResult> => {
    recordingEpoch.current += 1;
    const epoch = recordingEpoch.current;
    await Promise.resolve();
    if (recordingEpoch.current !== epoch) return "cancelled";
    capturingRef.current = true;
    setIsRecording(true);
    return "ok";
  };

  const stopRecording = async (): Promise<string | null> => {
    recordingEpoch.current += 1;
    const hadCapture = capturingRef.current;
    capturingRef.current = false;
    setIsRecording(false);
    if (!hadCapture) return null;
    return "mock-audio-uri";
  };

  return { isRecording, startRecording, stopRecording };
}
