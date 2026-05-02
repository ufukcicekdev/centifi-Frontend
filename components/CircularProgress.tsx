import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  spent: number;
  budget: number;
  currency?: string;
  isDark?: boolean;
}

export default function CircularProgress({
  size = 180,
  strokeWidth = 14,
  progress,
  spent,
  budget,
  currency = "$",
  isDark = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: Math.min(progress, 1),
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const remaining = budget - spent;
  const isOverBudget = remaining < 0;
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";
  const trackColor = isDark ? "#2a2a2a" : "#e5e5e5";

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isOverBudget ? "#FF6B6B" : "#6C63FF"} />
            <Stop offset="100%" stopColor={isOverBudget ? "#FF8E8E" : "#43E97B"} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
          Remaining
        </Text>
        <Text style={{ color: isOverBudget ? "#FF6B6B" : textColor, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>
          {currency}{Math.abs(remaining).toFixed(0)}
        </Text>
        <Text style={{ color: mutedColor, fontSize: 12, marginTop: 2 }}>
          {currency}{spent.toFixed(0)} / {currency}{budget.toFixed(0)}
        </Text>
      </View>
    </View>
  );
}
