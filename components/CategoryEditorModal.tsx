import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import type { CustomCategory } from "../constants/mockData";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

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
  const keyboardInset = useKeyboardInset();
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
          paddingBottom: (Platform.OS === "ios" ? 36 : 24) + keyboardInset,
          paddingTop: 16,
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
          Choose emoji
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
      </View>
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
  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "📦");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const keyboardInset = useKeyboardInset();

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
      Alert.alert("Error", "Please enter a category name.");
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
      Alert.alert("Error", "Could not save category.");
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
          paddingBottom: (Platform.OS === "ios" ? 40 : 28) + keyboardInset,
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
            padding: 16,
            alignItems: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
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
