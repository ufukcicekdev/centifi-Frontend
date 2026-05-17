import React from "react";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  type EditorEmojiIon,
  editorPresetIonForEmoji,
  emojiGridIndexForEmoji,
  emojiPickerCellTint,
} from "../lib/categoryEditorEmojiIconGrid";
import EmojiText from "./EmojiText";

/**
 * Emoji seçici grid hücresi — Android: emoji; iOS: renkli Ionicons (emoji tofu olmaz).
 */
export default function EmojiPickerCell({
  emoji,
  ion,
  gridIndex,
  isDark,
  iconSize = 26,
  nativeEmojiOnAndroid = true,
}: {
  emoji: string;
  ion: EditorEmojiIon;
  gridIndex: number;
  isDark: boolean;
  iconSize?: number;
  /** false → Android’de de renkli ikon (kategori sheet). */
  nativeEmojiOnAndroid?: boolean;
}) {
  if (Platform.OS === "android" && nativeEmojiOnAndroid) {
    return <EmojiText emoji={emoji} size={iconSize + 2} />;
  }

  const tint = emojiPickerCellTint(gridIndex, isDark);
  const pad = Math.round(iconSize * 0.35);

  return (
    <View
      style={{
        width: iconSize + pad * 2,
        height: iconSize + pad * 2,
        borderRadius: 12,
        backgroundColor: tint.backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={ion} size={iconSize} color={tint.color} accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Büyük önizleme rozeti (liste ekleme üst ikon). */
export function EmojiPreviewBadge({
  emoji,
  isDark,
  size = 56,
}: {
  emoji: string;
  isDark: boolean;
  size?: number;
}) {
  if (Platform.OS === "android") {
    return <EmojiText emoji={emoji} size={size} />;
  }

  const gridIndex = emojiGridIndexForEmoji(emoji);
  const tint = emojiPickerCellTint(gridIndex, isDark);
  const ion = editorPresetIonForEmoji(emoji);
  const box = Math.round(size * 1.35);

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 20,
        backgroundColor: tint.backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={ion} size={Math.round(size * 0.55)} color={tint.color} accessibilityIgnoresInvertColors />
    </View>
  );
}
