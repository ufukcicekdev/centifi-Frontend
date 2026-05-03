import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { getCategoryMeta, type Expense } from "../constants/mockData";
import type { Language } from "../i18n";
import { currencySymbolFor, formatAmountDigits } from "../lib/formatMoney";

export default function ExpenseTxRow({
  expense,
  isDark,
  onPress,
}: {
  expense: Expense;
  isDark: boolean;
  onPress?: () => void;
}) {
  const customCategories = useStore((s) => s.customCategories);
  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);
  const language = useStore((s) => s.language);
  const displayCurrency = useStore((s) => s.displayCurrency);
  const lang = language as Language;
  const sym = currencySymbolFor(displayCurrency, lang);
  const meta = getCategoryMeta(expense.category, customCategories, categoryDisplayOverrides);
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";

  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: meta.bgColor,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
      }}>
        <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: mutedColor, fontSize: 12, marginBottom: 1 }}>{meta.name}</Text>
        <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {expense.description}
        </Text>
      </View>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}>
        <Ionicons
          name={expense.isIncome ? "add-circle" : "remove-circle"}
          size={14}
          color={expense.isIncome ? "#55efc4" : "#FF6B6B"}
          style={{ marginRight: 4 }}
        />
        <Text
          style={{
            color: expense.isIncome ? "#55efc4" : textColor,
            fontWeight: "700",
            fontSize: 14,
          }}
        >
          {sym}
          {formatAmountDigits(expense.amount, lang)}
        </Text>
      </View>
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      {inner}
    </Pressable>
  ) : (
    inner
  );
}
