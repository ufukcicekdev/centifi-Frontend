import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { expenseListIdForApi, fetchSpendingInsights } from "../../lib/backend";
import { displayExpenseListName } from "../../lib/listDisplayName";
import { getApiErrorStatus, type ApiError } from "../../lib/api";
import { userFacingApiMessage } from "../../lib/userFacingApiMessage";
import { useAppDialog } from "../../context/AppDialogContext";
import { getRegretEntriesMap, type RegretScore } from "../../hooks/useRegretPrompts";
import { getCategoryMeta } from "../../constants/mockData";

const PURPLE = "#6C63FF";
const CTA_TEXT = "#ffffff";
const GUTTER = 16;
const ROW_H = 52;

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function todayNoon(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0, 0);
}

function stripMdBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

function InsightMarkdownLines({
  text,
  textColor,
  mutedColor,
}: {
  text: string;
  textColor: string;
  mutedColor: string;
}) {
  const lines = text.trim().split("\n");
  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) {
          return <View key={`e-${i}`} style={{ height: 2 }} />;
        }
        if (t.startsWith("## ")) {
          return (
            <Text
              key={i}
              style={{
                color: textColor,
                fontSize: 18,
                fontWeight: "800",
                marginTop: i === 0 ? 0 : 4,
                letterSpacing: -0.2,
              }}
            >
              {stripMdBold(t.slice(3))}
            </Text>
          );
        }
        if (t.startsWith("- ")) {
          const body = stripMdBold(t.slice(2));
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", paddingRight: 4 }}>
              <Text style={{ color: PURPLE, marginRight: 10, marginTop: 2, fontWeight: "700" }}>•</Text>
              <Text style={{ color: textColor, flex: 1, fontSize: 15, lineHeight: 22 }}>{body}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={{ color: mutedColor, fontSize: 13, lineHeight: 19 }}>
            {stripMdBold(t)}
          </Text>
        );
      })}
    </View>
  );
}

export default function InsightsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const isDark = useStore((s) => s.isDark);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const lists = useStore((s) => s.lists);
  const language = useStore((s) => s.language);

  const [endDate, setEndDate] = useState(() => todayNoon());
  const [startDate, setStartDate] = useState(() => startOfMonth(todayNoon()));
  const [selectedListKey, setSelectedListKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [expenseCount, setExpenseCount] = useState<number | null>(null);
  const [picker, setPicker] = useState<null | "start" | "end">(null);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);

  const expenses = useStore((s) => s.expenses);
  const customCategories = useStore((s) => s.customCategories);
  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);

  interface RegretCatStat { total: number; regret: number; rate: number }
  const [regretStats, setRegretStats] = useState<Record<string, RegretCatStat>>({});

  useEffect(() => {
    getRegretEntriesMap().then((map) => {
      if (map.size === 0) return;
      const stats: Record<string, RegretCatStat> = {};
      for (const exp of expenses) {
        if (exp.isIncome) continue;
        const score = map.get(exp.id);
        if (!score) continue;
        const meta = getCategoryMeta(exp.category, customCategories, categoryDisplayOverrides);
        const key = meta.name;
        if (!stats[key]) stats[key] = { total: 0, regret: 0, rate: 0 };
        stats[key].total++;
        if (score === "regret") stats[key].regret++;
      }
      for (const key of Object.keys(stats)) {
        stats[key].rate = Math.round((stats[key].regret / stats[key].total) * 100);
      }
      setRegretStats(stats);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length, customCategories, categoryDisplayOverrides]);

  useFocusEffect(
    useCallback(() => {
      if (!useStore.getState().isAuthenticated) {
        router.back();
      }
    }, [router]),
  );

  const selectableLists = useMemo(
    () => lists.filter((l) => /^\d+$/.test(String(l.id).trim())),
    [lists],
  );

  const listNamePreview = useMemo(() => {
    if (selectedListKey == null) return t("report.allLists");
    const row = lists.find((l) => String(l.id).trim() === selectedListKey);
    return row ? displayExpenseListName(row.name, t) : t("report.allLists");
  }, [selectedListKey, lists, t]);

  const tokens = useMemo(() => {
    if (isDark) {
      return {
        bg: "#0b1326",
        card: "#171f32",
        cardHigh: "#1e2740",
        border: "#404758",
        text: "#dee2f1",
        muted: "#bfc5d7",
        previewBg: "#121a2e",
        resultBg: "#121a2e",
      };
    }
    return {
      bg: "#f5f7fb",
      card: "#ffffff",
      cardHigh: "#f8f9fc",
      border: "rgba(0,0,0,0.08)",
      text: "#111827",
      muted: "#5c6370",
      previewBg: "#eef1f8",
      resultBg: "#f0f4fc",
    };
  }, [isDark]);

  const closeIosPicker = () => {
    setPicker(null);
    setIosTemp(null);
  };

  const openPicker = (which: "start" | "end") => {
    if (Platform.OS === "ios") {
      setIosTemp(which === "start" ? startDate : endDate);
    }
    setPicker(which);
  };

  const applyIosDate = () => {
    const d = iosTemp ?? (picker === "start" ? startDate : endDate);
    if (picker === "start") setStartDate(d);
    else setEndDate(d);
    closeIosPicker();
  };

  const onAndroidChange = (_: unknown, date?: Date) => {
    if (Platform.OS !== "android") return;
    setPicker(null);
    if (!date) return;
    if (picker === "start") setStartDate(date);
    else setEndDate(date);
  };

  const handleAnalyze = async () => {
    if (!isAuthenticated) {
      showAlert(t("insights.needSignInTitle"), t("insights.needSignInBody"));
      return;
    }
    const start = localYmd(startDate);
    const end = localYmd(endDate);
    if (start > end) {
      showAlert(t("insights.invalidRangeTitle"), t("insights.invalidRangeBody"));
      return;
    }
    setLoading(true);
    setInsight(null);
    setExpenseCount(null);
    try {
      const apiListId =
        selectedListKey == null ? undefined : expenseListIdForApi(selectedListKey);
      const res = await fetchSpendingInsights({
        start_date: start,
        end_date: end,
        list_id: apiListId,
        language,
      });
      setInsight(res.insight);
      setExpenseCount(res.expense_count);
    } catch (e: unknown) {
      const status = getApiErrorStatus(e);
      const details = e && typeof e === "object" && "details" in e ? (e as ApiError).details : undefined;
      const msg = userFacingApiMessage(details, t, "insights.errorGeneric", {
        unavailableKey: "errors.aiServiceUnavailable",
      });
      const title = status === 503 ? t("insights.errorAiTitle") : t("common.error");
      showAlert(title, msg);
    } finally {
      setLoading(false);
    }
  };

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: tokens.card,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tokens.border,
        paddingVertical: 4,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          color: tokens.muted,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const DateRow = ({
    label,
    value,
    which,
    showDivider,
  }: {
    label: string;
    value: Date;
    which: "start" | "end";
    showDivider: boolean;
  }) => (
    <Pressable
      onPress={() => openPicker(which)}
      accessibilityRole="button"
      android_ripple={{ color: `${PURPLE}33` }}
      style={{ alignSelf: "stretch" }}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            minHeight: ROW_H,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: pressed ? tokens.cardHigh : "transparent",
            borderTopWidth: showDivider ? StyleSheet.hairlineWidth : 0,
            borderTopColor: tokens.border,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${PURPLE}22`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Ionicons name="calendar-outline" size={22} color={PURPLE} />
          </View>
          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: "600", marginBottom: 2 }}>{label}</Text>
            <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "700" }}>{localYmd(value)}</Text>
          </View>
          <View
            style={{
              width: 28,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
              flexShrink: 0,
            }}
          >
            <Ionicons name="chevron-forward" size={22} color={tokens.muted} />
          </View>
        </View>
      )}
    </Pressable>
  );

  const ListRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      android_ripple={{ color: `${PURPLE}33` }}
      style={{ alignSelf: "stretch" }}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            minHeight: ROW_H,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: pressed ? tokens.cardHigh : selected ? `${PURPLE}14` : "transparent",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: tokens.border,
          }}
        >
          <View style={{ width: 28, alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
            <Ionicons
              name={selected ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={selected ? PURPLE : tokens.muted}
            />
          </View>
          <Text
            style={{
              color: tokens.text,
              fontSize: 16,
              fontWeight: selected ? "700" : "500",
              flex: 1,
              flexShrink: 1,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={["top", "left", "right", "bottom"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 12,
          minHeight: 48,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={14}
          style={{ position: "absolute", left: 4, padding: 10, zIndex: 1 }}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={tokens.muted} />
        </Pressable>
        <Text style={{ color: tokens.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 }}>
          {t("insights.title")}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: GUTTER,
          paddingTop: 16,
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: tokens.card,
            borderRadius: 18,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.border,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: `${PURPLE}28`,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="sparkles" size={26} color={PURPLE} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
              {t("insights.heroTitle")}
            </Text>
            <Text style={{ color: tokens.muted, fontSize: 14, lineHeight: 20 }}>{t("insights.subtitle")}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingBottom: 4 }}
          style={{ flexGrow: 0, marginBottom: 14, marginHorizontal: -GUTTER }}
        >
          {([
            {
              label: language === "tr" ? "Bu ay" : "This month",
              getRange: () => {
                const n = todayNoon();
                return { start: startOfMonth(n), end: n };
              },
            },
            {
              label: language === "tr" ? "Geçen ay" : "Last month",
              getRange: () => {
                const n = todayNoon();
                const firstThisMonth = startOfMonth(n);
                const lastMonth = new Date(firstThisMonth.getTime() - 86400000);
                return { start: startOfMonth(lastMonth), end: lastMonth };
              },
            },
            {
              label: language === "tr" ? "Son 3 ay" : "Last 3 months",
              getRange: () => {
                const n = todayNoon();
                const s = new Date(n.getFullYear(), n.getMonth() - 2, 1, 12, 0, 0, 0);
                return { start: s, end: n };
              },
            },
            {
              label: language === "tr" ? "Son 6 ay" : "Last 6 months",
              getRange: () => {
                const n = todayNoon();
                const s = new Date(n.getFullYear(), n.getMonth() - 5, 1, 12, 0, 0, 0);
                return { start: s, end: n };
              },
            },
          ] as { label: string; getRange: () => { start: Date; end: Date } }[]).map((preset) => {
            const range = preset.getRange();
            const isActive =
              localYmd(startDate) === localYmd(range.start) &&
              localYmd(endDate) === localYmd(range.end);
            return (
              <Pressable
                key={preset.label}
                onPress={() => {
                  setStartDate(range.start);
                  setEndDate(range.end);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? PURPLE : tokens.card,
                  borderWidth: 1,
                  borderColor: isActive ? PURPLE : tokens.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: isActive ? "#fff" : tokens.text,
                    fontSize: 13,
                    fontWeight: isActive ? "700" : "500",
                  }}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Card title={t("report.cardPeriod")}>
          <DateRow label={t("report.startDate")} value={startDate} which="start" showDivider={false} />
          <DateRow label={t("report.endDate")} value={endDate} which="end" showDivider />
        </Card>

        <Card title={t("report.cardList")}>
          <ListRow
            label={t("report.allLists")}
            selected={selectedListKey == null}
            onPress={() => setSelectedListKey(null)}
          />
          {selectableLists.map((l) => {
            const id = String(l.id).trim();
            return (
              <ListRow
                key={id}
                label={displayExpenseListName(l.name, t)}
                selected={selectedListKey === id}
                onPress={() => setSelectedListKey(id)}
              />
            );
          })}
        </Card>

        <View
          style={{
            backgroundColor: tokens.previewBg,
            borderRadius: 16,
            padding: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.border,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: tokens.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 10 }}>
            {t("report.previewTitle")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="calendar-outline" size={18} color={tokens.muted} style={{ marginRight: 8 }} />
            <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>
              {localYmd(startDate)} → {localYmd(endDate)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="list-outline" size={18} color={tokens.muted} style={{ marginRight: 8 }} />
            <Text style={{ color: tokens.text, fontSize: 14 }} numberOfLines={2}>
              {listNamePreview}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void handleAnalyze()}
          disabled={loading}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          style={{ alignSelf: "stretch", opacity: loading ? 0.85 : 1 }}
        >
          {({ pressed }) => (
            <View
              style={{
                width: "100%",
                minHeight: 54,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: PURPLE,
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                shadowColor: PURPLE,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 10,
                opacity: pressed && !loading ? 0.92 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={CTA_TEXT} />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={CTA_TEXT} style={{ marginRight: 10 }} />
                  <Text style={{ color: CTA_TEXT, fontSize: 17, fontWeight: "800" }}>{t("insights.analyze")}</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
        <Text style={{ color: tokens.muted, fontSize: 12, textAlign: "center", marginTop: 10, lineHeight: 17 }}>
          {loading ? t("insights.analyzing") : t("insights.runHint")}
        </Text>

        {insight != null && insight.length > 0 ? (
          <View
            style={{
              marginTop: 22,
              backgroundColor: tokens.resultBg,
              borderRadius: 16,
              padding: 18,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.border,
            }}
          >
            <Text style={{ color: tokens.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 12 }}>
              {t("insights.resultTitle")}
              {expenseCount != null ? ` · ${t("insights.rowCount", { count: expenseCount })}` : ""}
            </Text>
            <InsightMarkdownLines text={insight} textColor={tokens.text} mutedColor={tokens.muted} />
            <Text style={{ color: tokens.muted, fontSize: 12, lineHeight: 17, marginTop: 16, opacity: 0.95 }}>
              {t("insights.aiDisclaimer")}
            </Text>
          </View>
        ) : null}

        <Text style={{ color: tokens.muted, fontSize: 12, lineHeight: 18, marginTop: 20, opacity: 0.92 }}>
          {t("insights.retryHint")}
        </Text>

        {Object.keys(regretStats).length > 0 ? (
          <View
            style={{
              marginTop: 24,
              backgroundColor: tokens.card,
              borderRadius: 20,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.border,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(255,107,107,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>😞</Text>
              </View>
              <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "800" }}>{t("regret.sectionTitle")}</Text>
            </View>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: tokens.border }} />
            {Object.entries(regretStats)
              .sort((a, b) => b[1].rate - a[1].rate)
              .slice(0, 5)
              .map(([cat, stat], idx) => (
                <View
                  key={cat}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: tokens.border,
                    gap: 12,
                  }}
                >
                  <Text style={{ color: tokens.text, fontSize: 14, flex: 1 }}>{cat}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{
                        height: 6,
                        width: 80,
                        borderRadius: 3,
                        backgroundColor: tokens.border,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: `${stat.rate}%`,
                          borderRadius: 3,
                          backgroundColor: stat.rate >= 50 ? "#FF6B6B" : stat.rate >= 25 ? "#FDCB6E" : "#55efc4",
                        }}
                      />
                    </View>
                    <Text style={{ color: tokens.muted, fontSize: 13, fontWeight: "700", minWidth: 32, textAlign: "right" }}>
                      %{stat.rate}
                    </Text>
                  </View>
                </View>
              ))}
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
              <Text style={{ color: tokens.muted, fontSize: 12, lineHeight: 17 }}>
              {t("regret.disclaimer")}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {Platform.OS === "android" && picker != null && (
        <DateTimePicker
          value={picker === "start" ? startDate : endDate}
          mode="date"
          display="default"
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === "ios" && picker != null && (
        <Modal transparent animationType="slide" visible onRequestClose={closeIosPicker}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]}
              onPress={closeIosPicker}
            />
            <View
              style={{
                backgroundColor: tokens.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: insets.bottom + 16,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: tokens.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: tokens.border,
                }}
              >
                <Pressable onPress={closeIosPicker} hitSlop={12}>
                  <Text style={{ color: PURPLE, fontSize: 17 }}>{t("common.cancel")}</Text>
                </Pressable>
                <Text style={{ color: tokens.text, fontSize: 17, fontWeight: "700" }}>
                  {picker === "start" ? t("report.startDate") : t("report.endDate")}
                </Text>
                <Pressable onPress={applyIosDate} hitSlop={12}>
                  <Text style={{ color: PURPLE, fontSize: 17, fontWeight: "800" }}>{t("common.done")}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosTemp ?? (picker === "start" ? startDate : endDate)}
                mode="date"
                display="spinner"
                themeVariant={isDark ? "dark" : "light"}
                onChange={(_, d) => {
                  if (d) setIosTemp(d);
                }}
                style={{ height: 216, alignSelf: "center", width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
