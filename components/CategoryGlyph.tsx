import React from "react";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoryGridIonName } from "../constants/mockData";
import {
  editorPresetIonForEmoji,
  type EditorEmojiIon,
} from "../lib/categoryEditorEmojiIconGrid";
import EmojiText from "./EmojiText";

type IonName = EditorEmojiIon;

function ionForCategory(emoji: string, categoryId?: string): IonName {
  const builtin =
    categoryId != null ? (categoryGridIonName(categoryId) as IonName) : "pricetag-outline";
  if (builtin !== "pricetag-outline") return builtin;
  return editorPresetIonForEmoji(emoji);
}

/**
 * Kategori rozeti — Android: renkli emoji; iOS: Ionicons + kategori rengi (Expo Go’da emoji tofu olabiliyor).
 */
export default function CategoryGlyph({
  emoji,
  size,
  color = "#888",
  categoryId,
}: {
  emoji: string;
  size: number;
  color?: string;
  categoryId?: string;
}) {
  if (Platform.OS === "android") {
    return <EmojiText emoji={emoji} size={size} />;
  }

  const ion = ionForCategory(emoji, categoryId);
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={ion} size={size} color={color} accessibilityIgnoresInvertColors />
    </View>
  );
}
