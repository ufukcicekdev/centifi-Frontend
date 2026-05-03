import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../../store/useStore";
import { getCategoryMeta } from "../../../constants/mockData";
import { BUDGET_COLOR_PALETTE } from "../../../constants/budgetColors";
import { foregroundOnHex, hexToRgba } from "../../../lib/colorUi";
import { currencySymbolFor, formatMoneyAmount } from "../../../lib/formatMoney";
import { averageMonthlySpendForCategory } from "../../../lib/categoryBudgetStats";
import type { Language } from "../../../i18n";
import { useAppDialog } from "../../../context/AppDialogContext";

const CORAL = "#FF6B6B";

export default function CategoryBudgetScreen() {
  const { categoryId: rawId } = useLocalSearchParams<{ categoryId: string }>();
  const categoryId = typeof rawId === "string" ? rawId : rawId?.[0] ?? "";
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm } = useAppDialog();
  const insets = useSafeAreaInsets();

  const isDark = useStore((s) => s.isDark);
  const expenses = useStore((s) => s.expenses);
  const customCategories = useStore((s) => s.customCategories);
  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);
  const categoryBudgets = useStore((s) => s.categoryBudgets);
  const setCategoryBudget = useStore((s) => s.setCategoryBudget);
  const removeCategoryBudgetEntry = useStore((s) => s.removeCategoryBudgetEntry);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const displayCurrency = useStore((s) => s.displayCurrency);

  const lang = i18n.language as Language;
  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const statusBarTop =
    insets.top > 0 ? insets.top : Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const headerPaddingTop = Math.max(statusBarTop, 12);

  const meta = useMemo(() => {
    if (!categoryId) return null;
    return getCategoryMeta(categoryId, customCategories, categoryDisplayOverrides);
  }, [categoryId, customCategories, categoryDisplayOverrides]);

  const savedAmount = categoryId ? categoryBudgets[categoryId]?.amount : undefined;
  const savedColor = categoryId ? categoryBudgets[categoryId]?.budgetColor : undefined;

  const [amountStr, setAmountStr] = useState("");
  const [selectedColor, setSelectedColor] = useState(meta?.color ?? "#55EFC4");

  useEffect(() => {
    if (!meta) return;
    if (savedAmount != null && savedAmount > 0) {
      setAmountStr(String(savedAmount));
    } else {
      setAmountStr("");
    }
    setSelectedColor(savedColor ?? meta.color);
  }, [categoryId, meta, savedAmount, savedColor]);

  const avg = useMemo(() => {
    if (!categoryId) return 0;
    return averageMonthlySpendForCategory(expenses, categoryId);
  }, [categoryId, expenses]);

  const avgLabel = avg > 0 ? formatMoneyAmount(avg, lang, displayCurrency) : "—";

  const heroBg = hexToRgba(selectedColor, isDark ? 0.42 : 0.28);
  const onSaveBtn = foregroundOnHex(selectedColor);
  const amountSymbol = currencySymbolFor(displayCurrency, lang);

  const handleSave = useCallback(() => {
    if (!categoryId || !meta) return;
    const trimmed = amountStr.trim().replace(",", ".");
    if (!trimmed) {
      removeCategoryBudgetEntry(categoryId);
      router.back();
      return;
    }
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0) {
      showAlert(t("common.error"), t("budgets.invalidAmount"));
      return;
    }
    if (n === 0) {
      removeCategoryBudgetEntry(categoryId);
      router.back();
      return;
    }
    setCategoryBudget(categoryId, { amount: n, budgetColor: selectedColor });
    router.back();
  }, [
    amountStr,
    categoryId,
    meta,
    removeCategoryBudgetEntry,
    router,
    selectedColor,
    setCategoryBudget,
    t,
  ]);

  const handleRemove = useCallback(() => {
    if (!categoryId) return;
    removeCategoryBudgetEntry(categoryId);
    router.back();
  }, [categoryId, removeCategoryBudgetEntry, router]);

  useFocusEffect(
    useCallback(() => {
      if (!useStore.getState().isAuthenticated) {
        router.back();
      }
    }, [router]),
  );

  if (!isAuthenticated) {
    return null;
  }

  if (!categoryId || !meta) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: mutedColor }}>{t("common.error")}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: textColor }}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: headerPaddingTop,
            paddingBottom: 12,
            paddingHorizontal: 8,
            backgroundColor: bg,
            zIndex: 2,
            elevation: 4,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#2c2c2e" : "#e5e5ea",
            }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              color: textColor,
              fontSize: 18,
              fontWeight: "700",
              marginHorizontal: 8,
            }}
            numberOfLines={1}
          >
            {meta.name}
          </Text>
          <Pressable
            onPress={handleSave}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedColor,
            }}
            accessibilityLabel={t("common.save")}
          >
            <Ionicons name="checkmark" size={26} color={onSaveBtn} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 32),
            alignItems: "stretch",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 28,
                backgroundColor: heroBg,
                borderWidth: 4,
                borderColor: selectedColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 56 }}>{meta.emoji}</Text>
            </View>
            <View
              style={{
                marginTop: 10,
                height: 4,
                width: 56,
                borderRadius: 2,
                backgroundColor: selectedColor,
              }}
            />
          </View>

          <Text
            style={{
              color: mutedColor,
              fontSize: 14,
              fontWeight: "500",
              marginBottom: 28,
              textAlign: "center",
            }}
          >
            {t("budgets.avgPerMonth", { amount: avgLabel })}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <Text
              style={{
                flex: 1,
                color: textColor,
                fontSize: 15,
                fontWeight: "600",
                marginRight: 10,
              }}
            >
              {t("budgets.changeColor")}
            </Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: selectedColor,
                borderWidth: 2,
                borderColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.12)",
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              alignContent: "flex-start",
              paddingVertical: 4,
              marginBottom: 12,
              marginHorizontal: -6,
            }}
          >
            {BUDGET_COLOR_PALETTE.map((hex) => {
              const selected = selectedColor === hex;
              const ringMuted = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.14)";
              return (
                <Pressable
                  key={hex}
                  onPress={() => setSelectedColor(hex)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    margin: 6,
                    backgroundColor: hex,
                    borderWidth: selected ? 4 : 2,
                    borderColor: selected ? "#fff" : ringMuted,
                  }}
                />
              );
            })}
          </View>

          <Text
            style={{
              alignSelf: "stretch",
              color: mutedColor,
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 8,
              letterSpacing: 0.3,
            }}
          >
            {t("budgets.monthlyLimit")}
          </Text>
          <View
            style={{
              alignSelf: "stretch",
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 16,
              borderWidth: 2,
              borderColor: selectedColor,
              backgroundColor: isDark ? "#141414" : "#fafafa",
              paddingHorizontal: 18,
              paddingVertical: 16,
              marginBottom: 28,
            }}
          >
            <Text style={{ color: textColor, fontSize: 36, fontWeight: "600", marginRight: 6, minWidth: 28 }}>
              {amountSymbol}
            </Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0"
              placeholderTextColor={mutedColor}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                minWidth: 0,
                color: textColor,
                fontSize: 40,
                fontWeight: "700",
                padding: 0,
              }}
            />
          </View>

          <Pressable
            onPress={() => {
              void (async () => {
                const ok = await showConfirm({
                  title: t("budgets.removeBudget"),
                  confirmText: t("common.delete"),
                  cancelText: t("common.cancel"),
                  destructive: true,
                });
                if (ok) handleRemove();
              })();
            }}
            style={({ pressed }) => ({
              alignSelf: "stretch",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: CORAL,
              paddingVertical: 16,
              borderRadius: 14,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{t("budgets.removeBudget")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
