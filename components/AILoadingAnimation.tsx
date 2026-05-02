import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

function WaveBar({ delay }: { delay: number }) {
  const scaleY = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scaleY, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      width: 4, height: 36, borderRadius: 2,
      backgroundColor: "#6C63FF", marginHorizontal: 3,
      transform: [{ scaleY }],
    }} />
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={{
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: "#6C63FF", marginHorizontal: 4,
      opacity,
    }} />
  );
}

export default function AILoadingAnimation({ isDark = true }: { isDark?: boolean }) {
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <WaveBar key={i} delay={i * 80} />
        ))}
      </View>
      <Text style={{ color: textColor, fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
        AI is parsing...
      </Text>
      <Text style={{ color: mutedColor, fontSize: 14 }}>
        Extracting expense details
      </Text>
      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </View>
  );
}
