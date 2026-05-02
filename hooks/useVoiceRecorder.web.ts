import { useState } from "react";

interface UseVoiceRecorder {
  isRecording: boolean;
  audioUri: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearRecording: () => void;
}

/** Web: expo-av native module is unavailable; use mock URI flow used elsewhere in the app. */
export function useVoiceRecorder(): UseVoiceRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const startRecording = async () => {
    setIsRecording(true);
  };

  const stopRecording = async (): Promise<string | null> => {
    setIsRecording(false);
    const uri = "mock-audio-uri";
    setAudioUri(uri);
    return uri;
  };

  const clearRecording = () => {
    setAudioUri(null);
  };

  return { isRecording, audioUri, startRecording, stopRecording, clearRecording };
}
