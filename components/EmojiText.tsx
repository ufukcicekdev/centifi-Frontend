import React from "react";
import { Platform, Text, type TextStyle } from "react-native";

const FALLBACK = "📋";

/**
 * Renkli Unicode emoji — seçici ve rozetlerde Ionicons yerine (Android ile aynı görünüm).
 * Özel font verilmez; iOS/Android sistem emoji fontu kullanılır.
 */
export default function EmojiText({
  emoji,
  size,
  style,
}: {
  emoji: string;
  size: number;
  style?: TextStyle;
}) {
  const glyph = emoji.trim() || FALLBACK;

  return (
    <Text
      style={[
        {
          fontSize: size,
          lineHeight: Platform.OS === "ios" ? Math.round(size * 1.12) : Math.round(size * 1.2),
          textAlign: "center",
          ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
        },
        style,
      ]}
      allowFontScaling={false}
      accessibilityRole="image"
      accessibilityLabel={glyph}
    >
      {glyph}
    </Text>
  );
}
