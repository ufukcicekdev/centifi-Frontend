import React, { useEffect, useRef } from "react";
import { Pressable, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface VoiceButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
}

export default function VoiceButton({ isRecording, onPressIn, onPressOut, size = 80 }: VoiceButtonProps) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulseAnim1 = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnim2 = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      pulseAnim1.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse1, { toValue: 1.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse1, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseAnim2.current = Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(pulse2, { toValue: 2.0, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseAnim1.current.start();
      pulseAnim2.current.start();
    } else {
      pulseAnim1.current?.stop();
      pulseAnim2.current?.stop();
      Animated.timing(pulse1, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(pulse2, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
    return () => {
      pulseAnim1.current?.stop();
      pulseAnim2.current?.stop();
    };
  }, [isRecording]);

  const btnColor = isRecording ? "#FF6B6B" : "#6C63FF";

  return (
    <View style={{ width: size * 2.5, height: size * 2.5, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute",
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: isRecording ? "#FF6B6B30" : "#6C63FF20",
        transform: [{ scale: pulse2 }],
      }} />
      <Animated.View style={{
        position: "absolute",
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: isRecording ? "#FF6B6B50" : "#6C63FF30",
        transform: [{ scale: pulse1 }],
      }} />
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: btnColor,
          alignItems: "center", justifyContent: "center",
          shadowColor: btnColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
        }}>
          <Ionicons name={isRecording ? "stop" : "mic"} size={size * 0.38} color="#ffffff" />
        </View>
      </Pressable>
    </View>
  );
}
