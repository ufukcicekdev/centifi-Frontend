import React from "react";
import { Platform, Text, View } from "react-native";
import { LANGUAGES, type Language } from "../i18n";
import EmojiText from "./EmojiText";

const ISO: Record<Language, string> = {
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  tr: "TR",
};

/**
 * Dil bayrağı — Android: emoji; iOS: ISO rozeti (bayrak emojisi RN’de sık tofu).
 */
export default function LanguageFlag({
  language,
  size = 22,
  isDark = true,
}: {
  language: Language;
  size?: number;
  isDark?: boolean;
}) {
  if (Platform.OS === "android") {
    return <EmojiText emoji={LANGUAGES[language].flag} size={size} />;
  }

  const code = ISO[language];
  const box = Math.round(size * 1.15);
  const fontSize = Math.max(9, Math.round(box * 0.38));
  const fg = isDark ? "#c4b5fd" : "#6C63FF";
  const bg = isDark ? "rgba(108,99,255,0.22)" : "rgba(108,99,255,0.14)";

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 6,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize, fontWeight: "800", color: fg, letterSpacing: 0.3 }}>{code}</Text>
    </View>
  );
}
