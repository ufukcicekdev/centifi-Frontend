import React, { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { useShallow } from "zustand/react/shallow";
import { getCategoryMeta, type Expense } from "../constants/mockData";
import CategoryGlyph from "./CategoryGlyph";
import type { Language } from "../i18n";
import { currencySymbolFor, formatAmountDigits } from "../lib/formatMoney";

function ExpenseTxRow({
  expense,
  isDark,
  onPress,
  onDelete,
}: {
  expense: Expense;
  isDark: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const { customCategories, categoryDisplayOverrides, language, displayCurrency } = useStore(
    useShallow((s) => ({
      customCategories: s.customCategories,
      categoryDisplayOverrides: s.categoryDisplayOverrides,
      language: s.language,
      displayCurrency: s.displayCurrency,
    })),
  );
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
        <CategoryGlyph emoji={meta.emoji} size={22} color={meta.color} categoryId={expense.category} />
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

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.7], extrapolate: "clamp" });
    return (
      <Pressable
        onPress={async () => {
          try {
            const { impactAsync, ImpactFeedbackStyle } = await import("expo-haptics");
            await impactAsync(ImpactFeedbackStyle.Medium);
          } catch { /* noop */ }
          swipeRef.current?.close();
          onDelete?.();
        }}
        style={{
          width: 76,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FF3B30",
          borderRadius: 0,
        }}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  const row = onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      {inner}
    </Pressable>
  ) : (
    inner
  );

  if (!onDelete) return row;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {row}
    </Swipeable>
  );
}

export default React.memo(ExpenseTxRow);
