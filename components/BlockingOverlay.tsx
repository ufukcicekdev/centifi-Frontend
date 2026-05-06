import React from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import CentifiLogo from "./CentifiLogo";

export default function BlockingOverlay({
  visible,
  isDark,
  label,
}: {
  visible: boolean;
  isDark: boolean;
  label?: string;
}) {
  if (!visible) return null;

  const fg = isDark ? "#ffffff" : "#111111";
  const bg = isDark ? "rgba(0,0,0,0.62)" : "rgba(0,0,0,0.52)";

  return (
    <View
      pointerEvents="auto"
      style={[
        StyleSheet.absoluteFillObject,
        {
          zIndex: 9999,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          ...(Platform.OS === "android" ? { elevation: 24 } : {}),
        },
      ]}
    >
      <View style={{ alignItems: "center" }}>
        <CentifiLogo size={64} />
        <View style={{ height: 18 }} />
        <ActivityIndicator color={fg} />
        {label ? (
          <>
            <View style={{ height: 12 }} />
            <Text style={{ color: fg, fontSize: 14, fontWeight: "700", opacity: 0.95, textAlign: "center" }}>
              {label}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

