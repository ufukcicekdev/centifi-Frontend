import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { buildCategoriesForHome, useStore } from "../../../store/useStore";
import {
  filterByPeriod,
  formatDayNetTotal,
  formatPeriodPillLabel,
  groupByDate,
} from "../../../lib/expenseFilters";
import ListsPickerModal from "../../../components/ListsPickerModal";
import MonthPickerModal from "../../../components/MonthPickerModal";
import ExpenseTxRow from "../../../components/ExpenseTxRow";
import { getCategoryMeta } from "../../../constants/mockData";
import type { Language } from "../../../i18n";
import { useThrottledRouter } from "../../../hooks/useThrottledRouter";
import { useTranslation } from "react-i18next";
import { displayExpenseListName } from "../../../lib/listDisplayName";
import { currencySymbolFor, formatAmountDigits } from "../../../lib/formatMoney";

const CORAL = "#FF6B6B";
const INCOME_GREEN = "#55efc4";

type ScopeFlow = "all" | "expense" | "income";

const SCOPE_PILL: Record<Language, Record<ScopeFlow, string>> = {
  en: { all: "All", expense: "Expenses", income: "Income" },
  tr: { all: "Tümü", expense: "Harcama", income: "Gelir" },
  de: { all: "Alle", expense: "Ausgaben", income: "Einnahmen" },
  fr: { all: "Tout", expense: "Dépenses", income: "Revenus" },
  es: { all: "Todo", expense: "Gastos", income: "Ingresos" },
};

export default function CategoryDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const throttledPush = useThrottledRouter();
  const insets = useSafeAreaInsets();
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const categoryId = Array.isArray(rawId) ? rawId[0] : rawId ?? "";

  const {
    isDark,
    expenses,
    customCategories,
    enabledCategoryIds,
    lists,
    activeListId,
    setActiveList,
    addList,
    periodFilter,
    setPeriodFilter,
    language,
    categoryDisplayOverrides,
    displayCurrency,
  } = useStore();

  const lang = language as Language;
  const scopeLabels = SCOPE_PILL[lang];

  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeFlow, setScopeFlow] = useState<ScopeFlow>("all");

  const homeCats = useMemo(
    () => buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides),
    [enabledCategoryIds, customCategories, categoryDisplayOverrides],
  );

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#111";
  const mutedColor = isDark ? "#6b6b70" : "#888";
  const pillBg = isDark ? "#1c1c1e" : "#efefef";
  const bottomBarBg = isDark ? "#0a0a0a" : "#fff";
  const cardBg = isDark ? "#1a1a1a" : "#fff";
  const divider = isDark ? "#222" : "#eee";

  const pillStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: pillBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  };

  const allowedIds = useMemo(() => new Set(homeCats.map((c) => c.id)), [homeCats]);

  const meta = getCategoryMeta(categoryId, customCategories, categoryDisplayOverrides);
  const existsOnHome = allowedIds.has(categoryId);

  const baseFiltered = useMemo(() => {
    let result = filterByPeriod(expenses, periodFilter);
    result = result.filter((e) => (!e.listId || e.listId === activeListId) && e.category === categoryId);
    return result;
  }, [expenses, periodFilter, activeListId, categoryId]);

  const filtered = useMemo(() => {
    if (scopeFlow === "expense") return baseFiltered.filter((e) => !e.isIncome);
    if (scopeFlow === "income") return baseFiltered.filter((e) => !!e.isIncome);
    return baseFiltered;
  }, [baseFiltered, scopeFlow]);

  const expenseSum = useMemo(
    () => filtered.filter((e) => !e.isIncome).reduce((s, e) => s + e.amount, 0),
    [filtered],
  );
  const incomeSum = useMemo(
    () => filtered.filter((e) => e.isIncome).reduce((s, e) => s + e.amount, 0),
    [filtered],
  );
  const net = incomeSum - expenseSum;

  const displayAmount = useMemo(() => {
    if (scopeFlow === "all") return Math.abs(net);
    if (scopeFlow === "expense") return expenseSum;
    return incomeSum;
  }, [scopeFlow, net, expenseSum, incomeSum]);

  const highlightIncome = useMemo(() => {
    if (scopeFlow === "income") return true;
    if (scopeFlow === "expense") return false;
    return net >= 0;
  }, [scopeFlow, net]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const activeList = lists.find((l) => l.id === activeListId);
  const periodLabel = formatPeriodPillLabel(periodFilter, language);

  const fmt = (n: number) => formatAmountDigits(n, lang);
  const currencySuffix = currencySymbolFor(displayCurrency, lang);
  const amtColor = highlightIncome ? INCOME_GREEN : CORAL;
  const stepperBg = isDark ? "#2c2c2e" : "#e8e8ec";
  const segPad = { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 } as const;

  if (!categoryId || !existsOnHome) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Ionicons name="close" size={28} color={textColor} />
        </Pressable>
        <Text style={{ color: mutedColor, textAlign: "center", marginTop: 48, paddingHorizontal: 24 }}>
          {t("categoryDetail.notFound")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Ionicons name="close" size={28} color={textColor} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 130,
          }}
        >
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <Pressable onPress={() => setMonthModalOpen(true)} style={pillStyle}>
                <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>{periodLabel}</Text>
                <Ionicons name="chevron-down" size={14} color={mutedColor} />
              </Pressable>
              <Pressable onPress={() => setScopeModalOpen(true)} style={pillStyle}>
                <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
                  {scopeLabels[scopeFlow]}
                </Text>
                <Ionicons name="chevron-down" size={14} color={mutedColor} />
              </Pressable>
              <Text style={{ color: mutedColor, fontSize: 13 }}>{t("dashboard.listFilterIn")}</Text>
              <Pressable onPress={() => setListsModalOpen(true)} style={pillStyle}>
                <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                  {activeList ? displayExpenseListName(activeList.name, t) : t("lists.defaultPrivateList")}
                </Text>
                <Ionicons name="chevron-down" size={14} color={mutedColor} />
              </Pressable>
            </View>

            <Text style={{ color: textColor, fontSize: 28, fontWeight: "700", paddingVertical: 6 }}>
              {meta.name}
            </Text>

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
                onPress={() => setScopeFlow("expense")}
                accessibilityRole="button"
                style={{
                  ...segPad,
                  backgroundColor: !highlightIncome ? (isDark ? "#3a2528" : "#ffe8e8") : "transparent",
                  borderWidth: !highlightIncome ? 1.5 : 0,
                  borderColor: !highlightIncome ? CORAL : "transparent",
                }}
              >
                <Text style={{ color: CORAL, fontSize: 22, fontWeight: "700", textAlign: "center" }}>−</Text>
              </Pressable>
              <Text
                style={{
                  flex: 1,
                  color: amtColor,
                  fontSize: 32,
                  fontWeight: "700",
                  textAlign: "center",
                  paddingVertical: 6,
                  minWidth: 80,
                }}
              >
                {fmt(displayAmount)}
              </Text>
              <Text style={{ color: mutedColor, fontSize: 17, fontWeight: "600" }}>{currencySuffix}</Text>
              <Pressable
                onPress={() => setScopeFlow("income")}
                accessibilityRole="button"
                style={{
                  ...segPad,
                  backgroundColor: highlightIncome ? (isDark ? "#1e3329" : "#e8faf3") : "transparent",
                  borderWidth: highlightIncome ? 1.5 : 0,
                  borderColor: highlightIncome ? INCOME_GREEN : "transparent",
                }}
              >
                <Text
                  style={{
                    color: highlightIncome ? INCOME_GREEN : mutedColor,
                    fontSize: 22,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  +
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => throttledPush("/(app)/settings")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 10,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 22,
                marginTop: 4,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)",
                backgroundColor: "transparent",
              }}
            >
              <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
              <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>{meta.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={mutedColor} />
            </Pressable>
          </View>

          <View style={{ marginTop: 28 }}>
            {grouped.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 24 }}>
                <Text style={{ color: mutedColor, fontSize: 15, textAlign: "center" }}>
                  {t("categoryDetail.emptyPeriod")}
                </Text>
              </View>
            ) : (
              grouped.map((group) => (
                <View key={group.label} style={{ marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>{group.label}</Text>
                    <Text style={{ color: mutedColor, fontSize: 13 }}>
                      {formatDayNetTotal(group.total, lang, displayCurrency)}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: cardBg, borderRadius: 18, overflow: "hidden" }}>
                    {group.items.map((exp, idx) => (
                      <View key={exp.id}>
                        {idx > 0 && (
                          <View style={{ height: 1, backgroundColor: divider, marginHorizontal: 16 }} />
                        )}
                        <View style={{ paddingHorizontal: 16 }}>
                          <ExpenseTxRow
                            expense={exp}
                            isDark={isDark}
                            onPress={() =>
                              router.push({ pathname: "/expense/[id]" as const, params: { id: exp.id } })
                            }
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 28,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: bottomBarBg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? "#222" : "#e5e5e5",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            disabled
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: isDark ? "#2c2c2e" : "#e8e8ec",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.35,
            }}
          >
            <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>#</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              onPress={() => throttledPush("/(app)/settings")}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: isDark ? "#fff" : "#333",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "#1a1a1a" : "#fff",
              }}
            >
              <Ionicons name="settings-outline" size={22} color={mutedColor} />
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: isDark ? "#2c2c2e" : "#e2e2e6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={26} color={textColor} />
            </Pressable>
          </View>
        </View>
      </View>

      <MonthPickerModal
        visible={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        onApply={setPeriodFilter}
        periodFilter={periodFilter}
        expenses={expenses}
        activeListId={activeListId}
        language={language}
        isDark={isDark}
      />

      <ListsPickerModal
        visible={listsModalOpen}
        onClose={() => setListsModalOpen(false)}
        lists={lists}
        activeListId={activeListId}
        onSelectList={setActiveList}
        onAddList={addList}
        onEditLists={() => throttledPush("/(app)/settings")}
        isDark={isDark}
        language={language}
      />

      <Modal visible={scopeModalOpen} transparent animationType="fade" onRequestClose={() => setScopeModalOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "center", paddingHorizontal: 28 }}
          onPress={() => setScopeModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? "#2c2c2e" : "#fff",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <Text
              style={{
                color: textColor,
                fontSize: 13,
                fontWeight: "600",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              {t("categoryDetail.showInList")}
            </Text>
            {(["all", "expense", "income"] as const).map((id, i) => (
              <Pressable
                key={id}
                onPress={() => {
                  setScopeFlow(id);
                  setScopeModalOpen(false);
                }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: isDark ? "#3a3a40" : "#eee",
                  backgroundColor: scopeFlow === id ? (isDark ? "#3a3a42" : "#f0f0f4") : "transparent",
                }}
              >
                <Text style={{ color: textColor, fontSize: 16, fontWeight: scopeFlow === id ? "700" : "500" }}>
                  {scopeLabels[id]}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
