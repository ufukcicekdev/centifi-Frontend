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
import { sendExpenseReportEmail } from "../../lib/backend";
import { formatApiErrorDetailBody, getApiErrorStatus, type ApiError } from "../../lib/api";
import { useAppDialog } from "../../context/AppDialogContext";

const PURPLE = "#6C63FF";
const GUTTER = 16;

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

export default function ReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const isDark = useStore((s) => s.isDark);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const lists = useStore((s) => s.lists);
  const user = useStore((s) => s.user);

  const [endDate, setEndDate] = useState(() => todayNoon());
  const [startDate, setStartDate] = useState(() => startOfMonth(todayNoon()));
  /** null = all lists */
  const [listId, setListId] = useState<number | null>(null);
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

  const numericLists = useMemo(
    () => lists.filter((l) => /^\d+$/.test(l.id)).map((l) => ({ id: Number(l.id), name: l.name })),
    [lists],
  );

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const cardBg = isDark ? "#1c1c1e" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const surface = isDark ? "#2c2c2e" : "#f2f2f7";

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
      const res = await sendExpenseReportEmail({
        start_date: start,
        end_date: end,
        list_id: listId ?? undefined,
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

  const dateRow = (label: string, value: Date, which: "start" | "end") => (
    <Pressable
      onPress={() => openPicker(which)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: GUTTER,
        backgroundColor: surface,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor,
        marginBottom: 12,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: "600", marginRight: 6 }}>
          {localYmd(value)}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={PURPLE} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "left", "right"]}>
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
          style={{ position: "absolute", left: 8, padding: 8, zIndex: 1 }}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={mutedColor} />
        </Pressable>
        <Text style={{ color: textColor, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>
          {t("report.title")}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom: 32 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: mutedColor, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
          {t("report.subtitle")}
        </Text>

        <Text style={{ color: mutedColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, marginBottom: 8 }}>
          {t("report.period")}
        </Text>
        {dateRow(t("report.startDate"), startDate, "start")}
        {dateRow(t("report.endDate"), endDate, "end")}

        <Text
          style={{
            color: mutedColor,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.1,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          {t("report.listLabel")}
        </Text>
        <Pressable
          onPress={() => setListId(null)}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: GUTTER,
            borderRadius: 12,
            backgroundColor: listId == null ? `${PURPLE}22` : surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: listId == null ? PURPLE : borderColor,
            marginBottom: 8,
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ color: textColor, fontSize: 16, fontWeight: listId == null ? "700" : "500" }}>
            {t("report.allLists")}
          </Text>
        </Pressable>
        {numericLists.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => setListId(l.id)}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: GUTTER,
              borderRadius: 12,
              backgroundColor: listId === l.id ? `${PURPLE}22` : surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: listId === l.id ? PURPLE : borderColor,
              marginBottom: 8,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={{ color: textColor, fontSize: 16, fontWeight: listId === l.id ? "700" : "500" }}>
              {l.name}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => void handleSend()}
          disabled={sending}
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: PURPLE,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed || sending ? 0.85 : 1,
          })}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{t("report.send")}</Text>
          )}
        </Pressable>

        <Text style={{ color: mutedColor, fontSize: 12, lineHeight: 17, marginTop: 14 }}>
          {t("report.footerHint")}
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
                backgroundColor: cardBg,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: insets.bottom + 16,
              }}
            >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: borderColor,
              }}
            >
              <Pressable onPress={closeIosPicker} hitSlop={12}>
                <Text style={{ color: PURPLE, fontSize: 17 }}>{t("common.cancel")}</Text>
              </Pressable>
              <Text style={{ color: textColor, fontSize: 17, fontWeight: "600" }}>
                {picker === "start" ? t("report.startDate") : t("report.endDate")}
              </Text>
              <Pressable onPress={applyIosDate} hitSlop={12}>
                <Text style={{ color: PURPLE, fontSize: 17, fontWeight: "700" }}>{t("common.done")}</Text>
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
