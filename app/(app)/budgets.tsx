import React, { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { BUILTIN_CATEGORIES, getCategoryMeta } from "../../constants/mockData";
import { formatMoneyAmount } from "../../lib/formatMoney";
import { BudgetThresholdSlider } from "../../components/BudgetThresholdSlider";
import type { Language } from "../../i18n";

const CORAL = "#FF6B6B";

export default function BudgetsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isDark = useStore((s) => s.isDark);
  const customCategories = useStore((s) => s.customCategories);
  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);
  const categoryBudgets = useStore((s) => s.categoryBudgets);
  const budgetAlertsEnabled = useStore((s) => s.budgetAlertsEnabled);
  const setBudgetAlertsEnabled = useStore((s) => s.setBudgetAlertsEnabled);
  const budgetAlertThresholdPercent = useStore((s) => s.budgetAlertThresholdPercent);
  const setBudgetAlertThresholdPercent = useStore((s) => s.setBudgetAlertThresholdPercent);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const displayCurrency = useStore((s) => s.displayCurrency);

  const lang = i18n.language as Language;

  useFocusEffect(
    useCallback(() => {
      if (!useStore.getState().isAuthenticated) {
        router.back();
      }
    }, [router]),
  );

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const cardBg = isDark ? "#1c1c1e" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const BELL_GOLD = "#E6C229";

  const builtins = useMemo(
    () =>
      BUILTIN_CATEGORIES.map((c) => ({
        ...getCategoryMeta(c.id, customCategories, categoryDisplayOverrides),
        id: c.id,
      })),
    [customCategories, categoryDisplayOverrides],
  );

  const customs = useMemo(
    () =>
      customCategories.map((c) => ({
        ...getCategoryMeta(c.id, customCategories, categoryDisplayOverrides),
        id: c.id,
      })),
    [customCategories, categoryDisplayOverrides],
  );

  const Row = ({ id }: { id: string }) => {
    const meta = getCategoryMeta(id, customCategories, categoryDisplayOverrides);
    const b = categoryBudgets[id];
    const cap = b?.amount != null && b.amount > 0 ? b.amount : null;

    const primaryLine =
      cap != null ? formatMoneyAmount(cap, lang, displayCurrency) : t("budgets.noBudget");

    return (
      <Pressable
        onPress={() => router.push(`/budget/${encodeURIComponent(id)}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "center",
            width: "100%",
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: meta.bgColor,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
            <Text style={{ color: textColor, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
              {meta.name}
            </Text>
            <Text
              style={{
                color: cap != null ? textColor : mutedColor,
                fontSize: 15,
                marginTop: 4,
                fontWeight: cap != null ? "600" : "400",
              }}
              numberOfLines={1}
            >
              {primaryLine}
            </Text>
          </View>
          <View style={{ flexShrink: 0, marginLeft: 8, justifyContent: "center" }}>
            <Ionicons name="chevron-forward" size={20} color={mutedColor} />
          </View>
        </View>
      </Pressable>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 14,
          minHeight: 48,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={14}
          style={{ position: "absolute", left: 12, padding: 8, zIndex: 1 }}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={26} color={mutedColor} />
        </Pressable>
        <Text
          style={{
            color: textColor,
            fontSize: 17,
            fontWeight: "700",
            letterSpacing: -0.2,
          }}
        >
          {t("budgets.title")}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Ionicons name="notifications" size={22} color={BELL_GOLD} style={{ marginRight: 10 }} />
            <Text style={{ color: textColor, fontSize: 16, fontWeight: "600", flex: 1 }}>
              {t("budgets.alerts")}
            </Text>
            <Switch
              value={budgetAlertsEnabled}
              onValueChange={setBudgetAlertsEnabled}
              trackColor={{ false: "#3a3a3c", true: CORAL }}
              thumbColor="#fff"
              ios_backgroundColor="#3a3a3c"
            />
          </View>
          <Text
            style={{
              color: mutedColor,
              fontSize: 13,
              lineHeight: 18,
              marginBottom: budgetAlertsEnabled ? 14 : 0,
              marginLeft: 32,
            }}
          >
            {t("budgets.alertsHint")}
          </Text>

          {budgetAlertsEnabled ? (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "500" }}>
                  {t("budgets.alertThreshold")}
                </Text>
                <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "600" }}>
                  {budgetAlertThresholdPercent}%
                </Text>
              </View>
              <BudgetThresholdSlider
                value={budgetAlertThresholdPercent}
                onChange={setBudgetAlertThresholdPercent}
                isDark={isDark}
              />
            </>
          ) : null}
        </View>

        <Text
          style={{
            color: isDark ? "#6b6b70" : "#888",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.4,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          {t("budgets.sectionRecommendations")}
        </Text>
        {builtins.map((c) => (
          <View
            key={c.id}
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <Row id={c.id} />
          </View>
        ))}

        {customs.length > 0 ? (
          <>
            <Text
              style={{
                color: isDark ? "#6b6b70" : "#888",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.4,
                textTransform: "uppercase",
                marginBottom: 10,
                marginTop: 14,
              }}
            >
              {t("budgets.sectionOther")}
            </Text>
            {customs.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <Row id={c.id} />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
