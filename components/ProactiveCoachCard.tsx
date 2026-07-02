import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { CoachMessage } from "../hooks/useProactiveCoach";

interface Props {
  message: CoachMessage;
  isDark: boolean;
  onDismiss: () => void;
  onOpenInsights: () => void;
}

const TYPE_CONFIG = {
  warning: {
    icon: "trending-up" as const,
    iconColor: "#FF6B6B",
    accentColor: "#FF6B6B",
    labelColor: "#FF6B6B",
  },
  info: {
    icon: "bulb" as const,
    iconColor: "#6C63FF",
    accentColor: "#6C63FF",
    labelColor: "#6C63FF",
  },
  positive: {
    icon: "checkmark-circle" as const,
    iconColor: "#00C896",
    accentColor: "#00C896",
    labelColor: "#00C896",
  },
};

export default function ProactiveCoachCard({ message, isDark, onDismiss, onOpenInsights }: Props) {
  const config = TYPE_CONFIG[message.type];
  const { t } = useTranslation();
  const cardBg = isDark ? "#1c1c1e" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#111111";
  const mutedColor = isDark ? "#8e8e93" : "#8e8e93";

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 20,
        backgroundColor: cardBg,
        flexDirection: "row",
        overflow: "hidden",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.35 : 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          },
          android: { elevation: 4 },
        }),
      }}
    >
      {/* Sol renkli bant */}
      <View style={{ width: 4, backgroundColor: config.accentColor }} />

      {/* İçerik alanı */}
      <View style={{ flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 12 }}>
        {/* Başlık satırı */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: `${config.iconColor}20`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Ionicons name={config.icon} size={16} color={config.iconColor} />
          </View>
          <Text
            style={{
              color: config.labelColor,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {t("coach.sectionTitle")}
          </Text>
        </View>

        {/* Mesaj */}
        <Text
          style={{
            color: textColor,
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "400",
          }}
        >
          {message.text}
        </Text>

        {/* CTA */}
        <Pressable onPress={onOpenInsights} hitSlop={8} style={{ marginTop: 10, alignSelf: "flex-start" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: `${config.accentColor}15`,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: config.accentColor, fontSize: 12, fontWeight: "700" }}>
              {t("coach.detailsCta")}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={config.accentColor} />
          </View>
        </Pressable>
      </View>

      {/* Kapat butonu */}
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        style={{
          paddingTop: 10,
          paddingRight: 12,
          alignSelf: "flex-start",
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={13} color={mutedColor} />
        </View>
      </Pressable>
    </View>
  );
}
