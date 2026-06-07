import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Expense } from "../constants/mockData";
import type { Language } from "../i18n";
import type { PeriodFilter } from "../lib/expenseFilters";
import {
  distinctExpenseYears,
  formatDayNetTotal,
  monthShortLabels,
  sumExpensesForMonth,
} from "../lib/expenseFilters";

const CORAL = "#FF6B6B";

const COPY: Record<Language, { title: string; apply: string; allTime: string }> = {
  en: { title: "Month", apply: "Apply", allTime: "All time" },
  tr: { title: "Ay", apply: "Uygula", allTime: "Tüm zamanlar" },
  de: { title: "Monat", apply: "Übernehmen", allTime: "Gesamt" },
  fr: { title: "Mois", apply: "Appliquer", allTime: "Tout" },
  es: { title: "Mes", apply: "Aplicar", allTime: "Todo" },
};

export default function MonthPickerModal({
  visible,
  onClose,
  onApply,
  periodFilter,
  expenses,
  activeListId,
  language,
  displayCurrency,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (p: PeriodFilter) => void;
  periodFilter: PeriodFilter;
  expenses: Expense[];
  activeListId: string;
  language: Language;
  displayCurrency: string;
  isDark: boolean;
}) {
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = COPY[language];
  const labels = useMemo(() => monthShortLabels(language), [language]);

  const [scopeAll, setScopeAll] = useState(periodFilter.kind === "all_time");
  const [year, setYear] = useState(
    periodFilter.kind === "calendar_month" ? periodFilter.year : new Date().getFullYear(),
  );
  const [monthIndex, setMonthIndex] = useState<number | null>(
    periodFilter.kind === "calendar_month" ? periodFilter.monthIndex : new Date().getMonth(),
  );

  useEffect(() => {
    if (!visible) return;
    if (periodFilter.kind === "all_time") {
      setScopeAll(true);
      setYear(new Date().getFullYear());
      setMonthIndex(null);
    } else {
      setScopeAll(false);
      setYear(periodFilter.year);
      setMonthIndex(periodFilter.monthIndex);
    }
  }, [visible, periodFilter]);

  const years = useMemo(
    () => distinctExpenseYears(expenses, activeListId),
    [expenses, activeListId],
  );

  const sheetBg = isDark ? "#1e1e22" : "#f4f4f6";
  const cellIdle = isDark ? "#2c2c32" : "#e8e8ec";
  const text = isDark ? "#fff" : "#111";
  const muted = isDark ? "#9a9aa3" : "#666";

  const cellW = (winW - 40 - 16) / 3;

  /** Modal + Android: sistem nav bar’ı üstüne binmesin; inset 0 gelse de minimum pay */
  const sheetBottomPadding = 16 + Math.max(insets.bottom, Platform.OS === "android" ? 28 : 12);

  const apply = () => {
    if (scopeAll) {
      onApply({ kind: "all_time" });
    } else if (monthIndex !== null) {
      onApply({ kind: "calendar_month", year, monthIndex });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#000000aa" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: sheetBottomPadding,
            maxHeight: "85%",
          }}
        >
          <Text style={{ color: text, fontSize: 22, fontWeight: "800", marginBottom: 18 }}>{t.title}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
            <Pressable
              onPress={() => {
                setScopeAll(true);
                setMonthIndex(null);
              }}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 22,
                backgroundColor: scopeAll ? CORAL : cellIdle,
                borderWidth: scopeAll ? 0 : 1,
                borderColor: isDark ? "#3a3a42" : "#d0d0d8",
              }}
            >
              <Text style={{ color: scopeAll ? "#fff" : text, fontWeight: "700", fontSize: 14 }}>{t.allTime}</Text>
            </Pressable>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setScopeAll(false);
                  setYear(y);
                  if (monthIndex === null) setMonthIndex(new Date().getMonth());
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 22,
                  backgroundColor: !scopeAll && year === y ? (isDark ? "#3a3a42" : "#222") : cellIdle,
                  borderWidth: !scopeAll && year === y ? 0 : 1,
                  borderColor: isDark ? "#3a3a42" : "#d0d0d8",
                }}
              >
                <Text style={{
                  color: !scopeAll && year === y ? "#fff" : text,
                  fontWeight: "700",
                  fontSize: 14,
                }}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {!scopeAll ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
              {labels.map((lab, mi) => {
                const sum = sumExpensesForMonth(expenses, year, mi, activeListId);
                const sel = monthIndex === mi;
                return (
                  <Pressable
                    key={lab}
                    onPress={() => setMonthIndex(mi)}
                    style={{
                      width: cellW,
                      paddingVertical: 14,
                      paddingHorizontal: 6,
                      borderRadius: 16,
                      backgroundColor: sel ? CORAL : cellIdle,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: sel ? "#fff" : text, fontWeight: "800", fontSize: 14 }}>{lab}</Text>
                    {sum !== 0 ? (
                      <Text
                        style={{
                          color: sel ? "rgba(255,255,255,0.85)" : muted,
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                      >
                        {formatDayNetTotal(sum, language, displayCurrency)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ minHeight: 24 }} />
          )}

          <Pressable
            onPress={apply}
            style={{
              marginTop: 22,
              backgroundColor: CORAL,
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: !scopeAll && monthIndex === null ? 0.45 : 1,
            }}
            disabled={!scopeAll && monthIndex === null}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>{t.apply}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
