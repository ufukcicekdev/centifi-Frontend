import React, { type ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppDialogTheme } from "./appDialogTheme";
import { buildAppDialogTheme } from "./appDialogTheme";

export type ConfirmDialogCardProps = {
  isDark: boolean;
  title: string;
  message?: string;
  cancelText: string;
  confirmText: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Leading icon on confirm pill. Default: trash if `destructive`, else checkmark. */
  confirmIcon?: ComponentProps<typeof Ionicons>["name"];
  /** Max height for message area when text is long */
  maxMessageHeight?: number;
  /** Optional: pre-built theme (avoid recomputing when parent already has theme) */
  themeOverride?: AppDialogTheme;
};

/**
 * Shared confirm UI — İptal / Onay yan yana tam genişlik pill’ler (Android’de flex+Pressable+gap kaynaklı kırılmalara karşı sarmalayıcı View kullanır).
 */
export function ConfirmDialogCard({
  isDark,
  title,
  message,
  cancelText,
  confirmText,
  destructive,
  onCancel,
  onConfirm,
  confirmIcon,
  maxMessageHeight = 320,
  themeOverride,
}: ConfirmDialogCardProps) {
  const theme = themeOverride ?? buildAppDialogTheme(isDark);
  const confirmBg = destructive ? theme.confirmDestructiveBg : theme.confirmAccentBg;
  const msg = (message ?? "").trim();
  const resolvedConfirmIcon =
    confirmIcon ?? (destructive ? "trash-outline" : "checkmark");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="alert"
    >
      <Text style={[styles.title, { color: theme.title }]}>{title}</Text>
      {msg ?
        <ScrollView
          style={[styles.messageScroll, { maxHeight: maxMessageHeight }]}
          contentContainerStyle={styles.messageScrollContent}
          showsVerticalScrollIndicator={msg.length > 280}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <Text style={[styles.message, { color: theme.body }]}>{msg}</Text>
        </ScrollView>
      : null}

      <View style={styles.confirmRow}>
        <View style={styles.confirmHalf}>
          <View
            style={[styles.pillShell, { backgroundColor: theme.secondaryBtnBg }]}
            collapsable={false}
          >
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.pillPressable, { opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <View style={styles.pillInner}>
                <Text
                  style={[styles.confirmBtnLabelSecondary, { color: theme.secondaryBtnLabel }]}
                  numberOfLines={2}
                >
                  {cancelText}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
        <View style={styles.confirmHalfLast}>
          <View style={[styles.pillShell, { backgroundColor: confirmBg }]} collapsable={false}>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.pillPressable, { opacity: pressed ? 0.9 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <View style={styles.pillInnerRow}>
                <Ionicons name={resolvedConfirmIcon} size={20} color="#ffffff" />
                <Text style={[styles.confirmBtnLabelPrimary, styles.confirmLabelAfterIcon]} numberOfLines={1}>
                  {confirmText}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignSelf: "stretch",
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  messageScroll: {
    width: "100%",
  },
  messageScrollContent: {
    paddingBottom: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    textAlign: "center",
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  confirmHalf: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  confirmHalfLast: {
    flex: 1,
    minWidth: 0,
  },
  /** Android Modal içinde Pressable arka planı bazen çizilmez; renk kabuğu View’da. */
  pillShell: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  pillPressable: {
    width: "100%",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  pillInner: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    width: "100%",
  },
  /** İkon + metin tek satır, dikey ortalı (baseline kayması yok) */
  pillInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    maxWidth: "100%",
  },
  confirmBtnLabelSecondary: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  confirmBtnLabelPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  confirmLabelAfterIcon: {
    marginLeft: 8,
    flexShrink: 1,
  },
});
