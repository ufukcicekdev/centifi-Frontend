import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

const ERROR_COLOR = "#FF453A";

/** Tutar / açıklama doğrulama — iOS modal üstünde dialog görünmeyebilir; Android + iOS. */
export default function FormInlineError({
  message,
  style,
}: {
  message?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  if (!message) return null;
  return (
    <Text
      style={[{ color: ERROR_COLOR, fontSize: 14, fontWeight: "600", marginTop: 4 }, style]}
      accessibilityRole="alert"
    >
      {message}
    </Text>
  );
}

export { ERROR_COLOR as FORM_INLINE_ERROR_COLOR };

export type ExpenseFormFieldError = "amount" | "description" | null;
