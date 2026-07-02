import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { RegretScore } from "../hooks/useRegretPrompts";

interface Props {
  visible: boolean;
  expenseDescription: string;
  expenseAmount: string;
  isDark: boolean;
  onSelect: (score: RegretScore) => void;
  onDismiss: () => void;
}

const OPTION_CONFIGS: { score: RegretScore; emoji: string; key: "optionHappy" | "optionNeutral" | "optionRegret"; color: string }[] = [
  { score: "happy", emoji: "😊", key: "optionHappy", color: "#55efc4" },
  { score: "neutral", emoji: "😐", key: "optionNeutral", color: "#FDCB6E" },
  { score: "regret", emoji: "😞", key: "optionRegret", color: "#FF6B6B" },
];

export default function RegretPromptSheet({
  visible,
  expenseDescription,
  expenseAmount,
  isDark,
  onSelect,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bg = isDark ? "#1C1C1E" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const mutedColor = isDark ? "#8E8E93" : "#6B6B6B";
  const divider = isDark ? "#38383A" : "#E5E5EA";
  const pillBg = isDark ? "#2C2C2E" : "#F2F2F7";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        onPress={onDismiss}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -6 },
            },
            android: { elevation: 20 },
          }),
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: divider,
            alignSelf: "center",
            marginBottom: 20,
          }}
        />

        <Text
          style={{
            color: textColor,
            fontSize: 18,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          {t("regret.question")}
        </Text>

        <View
          style={{
            backgroundColor: pillBg,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: mutedColor, fontSize: 13, flex: 1 }} numberOfLines={1}>
            {expenseDescription}
          </Text>
          <Text style={{ color: textColor, fontSize: 14, fontWeight: "700" }}>{expenseAmount}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {OPTION_CONFIGS.map((opt) => (
            <Pressable
              key={opt.score}
              onPress={() => onSelect(opt.score)}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: 16,
                borderRadius: 18,
                backgroundColor: pressed ? `${opt.color}33` : `${opt.color}18`,
                borderWidth: 1.5,
                borderColor: `${opt.color}55`,
                gap: 6,
              })}
            >
              <Text style={{ fontSize: 30 }}>{opt.emoji}</Text>
              <Text style={{ color: textColor, fontSize: 13, fontWeight: "700" }}>{t(`regret.${opt.key}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onDismiss} style={{ marginTop: 16, alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ color: mutedColor, fontSize: 14 }}>{t("regret.skip")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
