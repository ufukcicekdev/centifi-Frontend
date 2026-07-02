import React from "react";
import { View, Text, Pressable, Image, Modal } from "react-native";
import { Expense, getCategoryMeta } from "../constants/mockData";
import CategoryGlyph from "./CategoryGlyph";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import type { Language } from "../i18n";
import { currencySymbolFor, formatAmountDigits } from "../lib/formatMoney";

interface ExpenseCardProps {
  expense: Expense;
  isDark?: boolean;
  onPress?: () => void;
}

export default function ExpenseCard({
  expense,
  isDark = true,
  onPress,
}: ExpenseCardProps) {
  const customCategories = useStore((s) => s.customCategories);
  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);
  const language = useStore((s) => s.language);
  const displayCurrency = useStore((s) => s.displayCurrency);
  const lang = language as Language;
  const meta = getCategoryMeta(expense.category, customCategories, categoryDisplayOverrides);
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";

  // ✅ FIX 1: Add receipt preview state
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);

  const formattedDate = new Date(expense.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: cardBg,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        opacity: pressed ? 0.75 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 8,
        elevation: 3,
      })}
    >
      {/* Category icon bubble */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: meta.bgColor,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <CategoryGlyph emoji={meta.emoji} size={20} color={meta.color} categoryId={expense.category} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: textColor, fontSize: 14, fontWeight: "600" }}
          numberOfLines={1}
        >
          {expense.description}
        </Text>
        <Text style={{ color: mutedColor, fontSize: 12, marginTop: 2 }}>
          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}{" "}
          · {formattedDate}
        </Text>
      </View>

      {/* Amount */}
      <Text
        style={{ color: textColor, fontSize: 15, fontWeight: "700" }}
      >
        {currencySymbolFor(displayCurrency, lang)}
        {formatAmountDigits(expense.amount, lang)}
      </Text>
    </Pressable>
  );
}
