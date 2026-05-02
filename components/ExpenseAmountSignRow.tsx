import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";

const CORAL = "#FF6B6B";
const INCOME_GREEN = "#55efc4";

/**
 * − / + seçimi tutarı değiştirmez: harcama (−) vs gelir (+) anlamındadır.
 */
export default function ExpenseAmountSignRow({
  isIncome,
  onSelectExpense,
  onSelectIncome,
  amount,
  onChangeAmount,
  currencySuffix,
  isDark,
}: {
  isIncome: boolean;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  amount: string;
  onChangeAmount: (v: string) => void;
  currencySuffix: string;
  isDark: boolean;
}) {
  const stepperBg = isDark ? "#2c2c2e" : "#e8e8ec";
  const mutedColor = isDark ? "#6b6b70" : "#888";

  const expenseSel = !isIncome;
  const incomeSel = isIncome;
  const amtColor = isIncome ? INCOME_GREEN : CORAL;

  const segPad = { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 } as const;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: stepperBg,
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 6,
      }}
    >
      <Pressable
        onPress={onSelectExpense}
        accessibilityRole="button"
        accessibilityState={{ selected: expenseSel }}
        style={{
          ...segPad,
          backgroundColor: expenseSel ? (isDark ? "#3a2528" : "#ffe8e8") : "transparent",
          borderWidth: expenseSel ? 1.5 : 0,
          borderColor: expenseSel ? CORAL : "transparent",
        }}
      >
        <Text style={{ color: CORAL, fontSize: 22, fontWeight: "700", textAlign: "center" }}>−</Text>
      </Pressable>
      <TextInput
        value={amount}
        onChangeText={onChangeAmount}
        keyboardType="decimal-pad"
        style={{
          flex: 1,
          color: amtColor,
          fontSize: 32,
          fontWeight: "700",
          textAlign: "center",
          paddingVertical: 6,
          minWidth: 80,
        }}
      />
      <Text style={{ color: mutedColor, fontSize: 17, fontWeight: "600" }}>{currencySuffix}</Text>
      <Pressable
        onPress={onSelectIncome}
        accessibilityRole="button"
        accessibilityState={{ selected: incomeSel }}
        style={{
          ...segPad,
          backgroundColor: incomeSel ? (isDark ? "#1e3329" : "#e8faf3") : "transparent",
          borderWidth: incomeSel ? 1.5 : 0,
          borderColor: incomeSel ? INCOME_GREEN : "transparent",
        }}
      >
        <Text style={{ color: incomeSel ? INCOME_GREEN : mutedColor, fontSize: 22, fontWeight: "700", textAlign: "center" }}>
          +
        </Text>
      </Pressable>
    </View>
  );
}
