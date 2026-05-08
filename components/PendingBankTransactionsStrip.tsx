import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { BankAutomation } from "../constants/mockData";
import type { PendingBankTransaction } from "../lib/pendingBankTypes";
import type { Language } from "../i18n";

type Props = {
  items: PendingBankTransaction[];
  bankAutomations: BankAutomation[];
  isDark: boolean;
  language: Language;
  onPressItem: (item: PendingBankTransaction) => void;
  onDismiss: (id: string) => void;
};

const CORAL = "#FF6B6B";

function formatPostedLine(ms: number, language: Language, t: (k: string) => string): string {
  const d = new Date(ms);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const day = startOf(d);
  const today0 = startOf(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const y0 = startOf(y);
  const locale =
    language === "tr"
      ? "tr-TR"
      : language === "de"
        ? "de-DE"
        : language === "fr"
          ? "fr-FR"
          : language === "es"
            ? "es-ES"
            : "en-US";
  const timeStr = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (day === today0) return `${t("common.today")}, ${timeStr}`;
  if (day === y0) return `${t("common.yesterday")}, ${timeStr}`;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    d,
  );
}

export default function PendingBankTransactionsStrip({
  items,
  bankAutomations,
  isDark,
  language,
  onPressItem,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const cardBg = isDark ? "#1a1a1a" : "#fff";
  const textColor = isDark ? "#fff" : "#111";
  const muted = isDark ? "#888" : "#666";

  const bankByPkg = useMemo(() => {
    const m = new Map<string, BankAutomation>();
    for (const b of bankAutomations) m.set(b.packageName, b);
    return m;
  }, [bankAutomations]);

  if (items.length === 0) return null;

  return (
    <View style={{ marginTop: 18, marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, marginBottom: 10 }}>
        <Ionicons name="information-circle-outline" size={16} color={CORAL} />
        <Text style={{ color: CORAL, fontSize: 13, fontWeight: "700", flex: 1 }} numberOfLines={1}>
          {t("dashboard.pendingBankTitle")}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
      >
        {items.map((item) => {
          const bank = bankByPkg.get(item.packageName);
          const label = bank?.name ?? item.packageName.split(".").pop() ?? item.packageName;
          const emoji = bank?.emoji ?? "🏦";
          const iconU = bank?.iconUrl?.trim();
          return (
            <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: isDark ? "#2c2c2e" : "#e8e8ec" }]}>
              <Pressable onPress={() => onPressItem(item)} style={styles.cardInner}>
                {iconU && /^https?:\/\//i.test(iconU) ? (
                  <Image
                    source={{ uri: iconU }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7",
                    }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                )}
                <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                  <Text style={{ color: muted, fontSize: 11 }} numberOfLines={1}>
                    {formatPostedLine(item.postedAtMs, language, t)}
                  </Text>
                  <Text style={{ color: textColor, fontSize: 15, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={{ color: muted, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                    {(item.title + (item.body ? ` · ${item.body}` : "")).trim() || "—"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                    <Text style={{ color: CORAL, fontSize: 13, fontWeight: "700" }}>{t("dashboard.pendingBankMissingInfo")}</Text>
                    <Ionicons name="chevron-forward" size={16} color={CORAL} style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.pendingBankDismissA11y")}
                hitSlop={{ top: 6, bottom: 6, left: 8, right: 10 }}
                android_ripple={
                  Platform.OS === "android"
                    ? { color: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)", foreground: true }
                    : undefined
                }
                onPress={() => onDismiss(item.id)}
                style={({ pressed }) => [
                  styles.dismissBtn,
                  {
                    borderColor: isDark ? "#3a3a3c" : "#d8d8dc",
                    backgroundColor: isDark ? "#2a2a2c" : "#f2f2f7",
                  },
                  pressed && {
                    backgroundColor: isDark ? "#3d3d40" : "#e6e6eb",
                    borderColor: isDark ? "#48484a" : "#c8c8cc",
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={isDark ? "#c4c4c8" : "#48484a"} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 288,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardInner: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 6,
  },
  dismissBtn: {
    alignSelf: "center",
    marginRight: 10,
    marginVertical: 10,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
});
