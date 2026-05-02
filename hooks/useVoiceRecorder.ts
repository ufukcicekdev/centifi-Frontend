import { useState, useRef } from "react";
import { requireOptionalNativeModule } from "expo";

interface UseVoiceRecorder {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // returns local file URI or null
}

export function useVoiceRecorder(): UseVoiceRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<any>(null);

  const startRecording = async () => {
    const exponentAv = requireOptionalNativeModule("ExponentAV");
    if (!exponentAv) {
      console.warn("[useVoiceRecorder] ExponentAV not available — native build needed.");
      setIsRecording(true);
      return;
    }
    try {
      const { Audio } = await import("expo-av");
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.warn("[useVoiceRecorder] Microphone permission denied.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.warn("[useVoiceRecorder] Failed to start:", e);
      setIsRecording(true); // UI feedback even if recording failed
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    setIsRecording(false);
    if (!recordingRef.current) return null;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri: string | null = recordingRef.current.getURI();
      recordingRef.current = null;
      return uri ?? null;
    } catch (e) {
      console.warn("[useVoiceRecorder] Failed to stop:", e);
      recordingRef.current = null;
      return null;
    }
  };

  return { isRecording, startRecording, stopRecording };
}
