import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, Pressable, Modal, TextInput } from "react-native";
import type { CustomCategory } from "../constants/mockData";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useAppDialog } from "../context/AppDialogContext";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const PURPLE = "#6C63FF";

const EMOJI_LIST = [
  "🍔", "🍕", "🍜", "☕", "🍺", "🥗", "🚗", "🚌", "✈️", "🚂", "🛵", "⛽",
  "🛍️", "👗", "👟", "💻", "📱", "🎮", "💊", "🏥", "🏋️", "🧘", "🎬", "🎵", "🎯", "📚",
  "⚡", "💧", "🔥", "🏠", "📦", "💰", "💎", "🌟", "🎁", "🐾",
];

export function EmojiPickerSheet({
  visible,
  onSelect,
  onClose,
  isDark,
}: {
  visible: boolean;
  onSelect: (e: string) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  /** İç içe Modal’da kök SafeAreaProvider inset vermez; bu sheet için yerel provider + SafeAreaView şart. */
  const keyboardInset = useKeyboardInset();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "#00000066" }} onPress={onClose} />
        <SafeAreaView
          edges={["bottom"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            paddingBottom: keyboardInset,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? "#444" : "#ddd",
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <Text
            style={{
              color: isDark ? "#fff" : "#000",
              fontSize: 16,
              fontWeight: "700",
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            {t("common.chooseEmoji")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 6 }}>
            {EMOJI_LIST.map((em) => (
              <Pressable
                key={em}
                onPress={() => {
                  onSelect(em);
                  onClose();
                }}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: isDark ? "#252525" : "#f5f5f5",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: 26 }}>{em}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export type CategoryEditorPayload = {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
};

/**
 * Create or edit a custom category (name + emoji). Used from Add expense and Settings.
 */
export default function CategoryEditorModal({
  visible,
  existing,
  onSave,
  onClose,
  isDark,
}: {
  visible: boolean;
  existing?: CustomCategory;
  onSave: (data: CategoryEditorPayload) => void | Promise<void>;
  onClose: () => void;
  isDark: boolean;
}) {
  const { showAlert } = useAppDialog();
  const { t } = useTranslation();
  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "📦");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setName(existing?.name ?? "");
      setEmoji(existing?.emoji ?? "📦");
    }
  }, [visible, existing]);

  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const inputBg = isDark ? "#111" : "#f5f5f5";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert(t("common.error"), t("settings.enterCategoryName"));
      return;
    }
    const payload: CategoryEditorPayload = {
      name: name.trim(),
      emoji,
      color: existing?.color ?? "#A29BFE",
      bgColor: existing?.bgColor ?? "#A29BFE20",
    };
    try {
      await Promise.resolve(onSave(payload));
      onClose();
    } catch {
      showAlert(t("common.error"), t("settings.categorySaveFailed"));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#00000066" }} onPress={onClose} />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 20 + insets.bottom + keyboardInset,
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? "#444" : "#ddd",
            alignSelf: "center",
            marginBottom: 20,
          }}
        />
        <Text style={{ color: textColor, fontSize: 18, fontWeight: "700", marginBottom: 20 }}>
          {existing ? "Edit Category" : "New Category"}
        </Text>

        <Pressable
          onPress={() => setShowEmojiPicker(true)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#A29BFE20",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        </Pressable>

        <View
          style={{
            backgroundColor: inputBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor,
            marginBottom: 20,
          }}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={mutedColor}
            style={{ color: textColor, fontSize: 16, padding: 0 }}
          />
        </View>

        <Pressable
          onPress={() => void handleSave()}
          style={({ pressed }) => ({
            backgroundColor: PURPLE,
            borderRadius: 14,
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "stretch",
            width: "100%",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{ color: "#fff", fontWeight: "700", fontSize: 16, textAlign: "center" }}
          >
            {existing ? "Update" : "Create Category"}
          </Text>
        </Pressable>
      </View>
      <EmojiPickerSheet
        visible={showEmojiPicker}
        onSelect={setEmoji}
        onClose={() => setShowEmojiPicker(false)}
        isDark={isDark}
      />
    </Modal>
  );
}
