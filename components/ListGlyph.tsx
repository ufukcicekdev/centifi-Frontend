import React from "react";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExpenseList } from "../constants/mockData";
import { displayListEmoji } from "../lib/listDisplayName";
import { EmojiPreviewBadge } from "./EmojiPickerCell";
import EmojiText from "./EmojiText";

/**
 * Liste rozeti — Android: emoji; iOS: renkli ikon rozeti (emoji tofu olmaz).
 */
export default function ListGlyph({
  list,
  size,
  color = "#888",
  isDark = true,
}: {
  list: ExpenseList;
  size: number;
  color?: string;
  isDark?: boolean;
}) {
  const isDefault = list.id === "private" || list.isDefault;

  if (Platform.OS === "android") {
    return <EmojiText emoji={displayListEmoji(list)} size={size} />;
  }

  if (isDefault) {
    return (
      <Ionicons
        name="lock-closed-outline"
        size={size}
        color={color}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <EmojiPreviewBadge emoji={displayListEmoji(list)} isDark={isDark} size={size} />;
}
