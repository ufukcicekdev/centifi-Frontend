import React, { useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import type { Language } from "../i18n";
import {
  decimalSeparatorForLanguage,
  hasDecimalSeparator,
  insertDecimalSeparator,
  sanitizeAmountInput,
} from "../lib/amountInput";

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
  amountPlaceholder,
  decimalSeparatorA11y,
  language,
  isDark,
}: {
  isIncome: boolean;
  onSelectExpense: () => void;
  onSelectIncome: () => void;
  amount: string;
  onChangeAmount: (v: string) => void;
  currencySuffix: string;
  amountPlaceholder?: string;
  decimalSeparatorA11y?: string;
  language: Language;
  isDark: boolean;
}) {
  const stepperBg = isDark ? "#2c2c2e" : "#e8e8ec";
  const mutedColor = isDark ? "#6b6b70" : "#888";
  const decSep = decimalSeparatorForLanguage(language);
  const labelColor = isDark ? "#fff" : "#111";

  const expenseSel = !isIncome;
  const incomeSel = isIncome;
  const amtColor = isIncome ? INCOME_GREEN : CORAL;

  const segPad = { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 } as const;
  const leftSlotWidth = 64;
  /** TRY + kuruş [,] + gelir [+] */
  const rightSlotWidth = 138;

  const insertSep = useCallback(() => {
    onChangeAmount(insertDecimalSeparator(amount, decSep));
  }, [amount, decSep, onChangeAmount]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      const key = e.nativeEvent.key;
      if (key !== "," && key !== ".") return;
      if (hasDecimalSeparator(amount)) return;
      onChangeAmount(insertDecimalSeparator(amount, key === "." ? "." : ","));
    },
    [amount, onChangeAmount],
  );

  const showSepButton = !hasDecimalSeparator(amount);

  return (
    <View
      style={{
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: stepperBg,
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 6,
      }}
    >
      <TextInput
        value={amount}
        onChangeText={(text) => onChangeAmount(sanitizeAmountInput(text))}
        onKeyPress={handleKeyPress}
        placeholder={amountPlaceholder}
        placeholderTextColor={mutedColor}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={{
          width: "100%",
          color: amtColor,
          fontSize: 32,
          fontWeight: "700",
          textAlign: "center",
          paddingVertical: 6,
          paddingLeft: leftSlotWidth,
          paddingRight: rightSlotWidth,
          minWidth: 80,
        }}
      />
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 8, width: leftSlotWidth, alignItems: "flex-start" }}
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
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 8,
          width: rightSlotWidth,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        {showSepButton ? (
          <Pressable
            onPress={insertSep}
            accessibilityRole="button"
            accessibilityLabel={decimalSeparatorA11y ?? `Insert ${decSep}`}
            hitSlop={8}
            style={{
              minWidth: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#3a3a40" : "#d8d8de",
            }}
          >
            <Text style={{ color: labelColor, fontSize: 20, fontWeight: "800" }}>{decSep}</Text>
          </Pressable>
        ) : null}
        <Text pointerEvents="none" style={{ color: mutedColor, fontSize: 17, fontWeight: "600" }}>
          {currencySuffix}
        </Text>
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
          <Text
            style={{
              color: incomeSel ? INCOME_GREEN : mutedColor,
              fontSize: 22,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
