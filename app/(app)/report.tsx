import React, { useCallback, useMemo, useState } from "react";
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
import { expenseListIdForApi, sendExpenseReportEmail, updateMe } from "../../lib/backend";
import { normalizeAppLanguage, setAppLanguage } from "../../lib/appLanguage";
import { displayExpenseListName } from "../../lib/listDisplayName";
import { formatApiErrorDetailBody, getApiErrorStatus, type ApiError } from "../../lib/api";
import { useAppDialog } from "../../context/AppDialogContext";

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

type ReportTokens = {
  bg: string;
  card: string;
  cardHigh: string;
  border: string;
  text: string;
  muted: string;
  previewBg: string;
};

/** Module-level: defining rows inside ``ReportScreen`` recreated the component type every render and broke radio icon updates on some Android builds. */
function ReportCard({
  title,
  children,
  tokens,
}: {
  title: string;
  children: React.ReactNode;
  tokens: ReportTokens;
}) {
  return (
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
}

function ReportDateRow({
  label,
  value,
  showDivider,
  onPress,
  tokens,
}: {
  label: string;
  value: Date;
  showDivider: boolean;
  onPress: () => void;
  tokens: ReportTokens;
}) {
  return (
    <Pressable
      onPress={onPress}
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
}

function ReportListRow({
  rowKey,
  label,
  selected,
  onPress,
  tokens,
}: {
  rowKey: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  tokens: ReportTokens;
}) {
  return (
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
              key={`${rowKey}-sel-${selected ? 1 : 0}`}
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
}

export default function ReportScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const isDark = useStore((s) => s.isDark);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const lists = useStore((s) => s.lists);
  const user = useStore((s) => s.user);
  const language = useStore((s) => s.language);

  const [endDate, setEndDate] = useState(() => todayNoon());
  const [startDate, setStartDate] = useState(() => startOfMonth(todayNoon()));
  /** `null` = all lists; otherwise matches `ExpenseList.id` (string, e.g. `"12"`). */
  const [selectedListKey, setSelectedListKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState<null | "start" | "end">(null);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!useStore.getState().isAuthenticated) {
        router.back();
      }
    }, [router]),
  );

  const selectableLists = useMemo(() => {
    return lists.filter((l) => {
      const id = String(l.id).trim();
      return /^\d+$/.test(id) || id === "private";
    });
  }, [lists]);

  const listNamePreview = useMemo(() => {
    if (selectedListKey === null) return t("report.allLists");
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

  const handleSend = async () => {
    if (!isAuthenticated || !user) {
      showAlert(t("report.needSignInTitle"), t("report.needSignInBody"));
      return;
    }
    const start = localYmd(startDate);
    const end = localYmd(endDate);
    if (start > end) {
      showAlert(t("report.invalidRangeTitle"), t("report.invalidRangeBody"));
      return;
    }
    setSending(true);
    try {
      const lang = normalizeAppLanguage(language || i18n.resolvedLanguage || i18n.language);
      setAppLanguage(lang);
      await updateMe({ language: lang }).catch(() => {});
      const apiListId =
        selectedListKey === null ? undefined : expenseListIdForApi(selectedListKey);
      const res = await sendExpenseReportEmail({
        start_date: start,
        end_date: end,
        list_id: apiListId,
        language: lang,
      });
      showAlert(
        t("report.successTitle"),
        t("report.successBody", { email: res.sent_to, count: res.expense_count }),
      );
    } catch (e: unknown) {
      const status = getApiErrorStatus(e);
      const details = e && typeof e === "object" && "details" in e ? (e as ApiError).details : undefined;
      const msg = formatApiErrorDetailBody(details) ?? t("report.errorGeneric");
      const title = status === 400 ? t("report.errorTitle") : t("common.error");
      showAlert(title, msg);
    } finally {
      setSending(false);
    }
  };

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
          {t("report.title")}
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
            <Ionicons name="mail-outline" size={26} color={PURPLE} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: tokens.text, fontSize: 16, fontWeight: "700", marginBottom: 6 }}>
              {t("report.heroTitle")}
            </Text>
            <Text style={{ color: tokens.muted, fontSize: 14, lineHeight: 20 }}>{t("report.subtitle")}</Text>
          </View>
        </View>

        <ReportCard title={t("report.cardPeriod")} tokens={tokens}>
          <ReportDateRow
            label={t("report.startDate")}
            value={startDate}
            showDivider={false}
            onPress={() => openPicker("start")}
            tokens={tokens}
          />
          <ReportDateRow
            label={t("report.endDate")}
            value={endDate}
            showDivider
            onPress={() => openPicker("end")}
            tokens={tokens}
          />
        </ReportCard>

        <ReportCard title={t("report.cardList")} tokens={tokens}>
          <ReportListRow
            rowKey="list-all"
            label={t("report.allLists")}
            selected={selectedListKey === null}
            onPress={() => setSelectedListKey(null)}
            tokens={tokens}
          />
          {selectableLists.map((l) => {
            const id = String(l.id).trim();
            return (
              <ReportListRow
                key={id}
                rowKey={`list-${id}`}
                label={displayExpenseListName(l.name, t)}
                selected={selectedListKey === id}
                onPress={() => setSelectedListKey(id)}
                tokens={tokens}
              />
            );
          })}
        </ReportCard>

        <View
          style={{
            backgroundColor: tokens.previewBg,
            borderRadius: 16,
            padding: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tokens.border,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: tokens.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 10 }}>
            {t("report.previewTitle")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="person-outline" size={18} color={tokens.muted} style={{ marginRight: 8 }} />
            <Text style={{ color: tokens.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
              {user?.email ?? "—"}
            </Text>
          </View>
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

        <View style={{ flex: 1, minHeight: 16 }} />

        <Pressable
          onPress={() => void handleSend()}
          disabled={sending}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          style={{ alignSelf: "stretch", opacity: sending ? 0.85 : 1 }}
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
                opacity: pressed && !sending ? 0.92 : 1,
              }}
            >
              {sending ? (
                <ActivityIndicator color={CTA_TEXT} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={CTA_TEXT} style={{ marginRight: 10 }} />
                  <Text style={{ color: CTA_TEXT, fontSize: 17, fontWeight: "800" }}>{t("report.send")}</Text>
                </>
              )}
            </View>
          )}
        </Pressable>
        <Text style={{ color: tokens.muted, fontSize: 12, textAlign: "center", marginTop: 10, lineHeight: 17 }}>
          {t("report.sendSubtext")}
        </Text>

        <Text style={{ color: tokens.muted, fontSize: 12, lineHeight: 18, marginTop: 22, opacity: 0.92 }}>
          {t("report.footerNote")}
        </Text>
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
