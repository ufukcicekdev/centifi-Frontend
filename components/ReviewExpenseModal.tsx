import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getCategoryMeta, type Expense } from "../constants/mockData";
import CategoryGlyph from "./CategoryGlyph";
import { createExpense, expenseListIdForApi, type ParsedExpenseItem } from "../lib/backend";
import { formatApiErrorDetailBody, type ApiError } from "../lib/api";
import { currencySymbolFor } from "../lib/formatMoney";
import type { Language } from "../i18n";
import { buildCategoriesForHome, useStore } from "../store/useStore";
import AddExpenseDatePickerModal from "./AddExpenseDatePickerModal";
import {
  actionBarInnerBottomPad,
  expenseFormMainKeyboardLiftPad,
} from "../lib/keyboardFooterChrome";
import { OnboardingAddCategoryFullScreenModal } from "./onboarding/OnboardingAddCategoryFullScreenModal";
import { useAppDialog } from "../context/AppDialogContext";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

export type ReviewParsingKind = "receipt" | "voice" | "text";

type EditRow = {
  key: string;
  amount: string;
  description: string;
  category: string;
  occurredAt: Date;
  currency: string;
};

interface Props {
  visible: boolean;
  parsing: boolean;
  /** Yükleme sırasında gösterilen açıklama (ses/fiş/metin) */
  parsingKind?: ReviewParsingKind;
  parsedExpenses: ParsedExpenseItem[] | null;
  onClose: () => void;
  onSaved: () => void;
}

function parseYmdToLocal(ymd: string): Date {
  const parts = ymd.trim().split(/[-/]/).map((p) => parseInt(p, 10));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toApiDateOnly(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Cihazın yerel takvim günü (sunucu saat diliminden bağımsız) */
function localTodayAtNoon(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0, 0);
}

/** Add expense ekranı ile aynı “Bugün / Dün / 27 Eki” etiketi */
function formatDatePill(
  ymd: string,
  language: Language,
  rel: { today: string; yesterday: string },
): string {
  const dt = parseYmdToLocal(ymd);
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t1 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((t0 - t1) / 86400000);
  if (diffDays === 0) return rel.today;
  if (diffDays === 1) return rel.yesterday;
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
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(dt);
}

/** Turkish "13,50" vs "1.234,56" vs US "13.50" → number */
function parseAmountInput(raw: string): number {
  const trimmed = raw.replace(/\s/g, "");
  if (!trimmed) return NaN;
  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = trimmed.replace(/,/g, "");
  } else if (trimmed.includes(",")) {
    normalized = trimmed.replace(",", ".");
  } else {
    normalized = trimmed;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export default function ReviewExpenseModal({
  visible,
  parsing,
  parsingKind = "receipt",
  parsedExpenses,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { showAlert } = useAppDialog();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const { width: winW } = useWindowDimensions();
  const {
    isDark,
    addExpensesBatch,
    addCategory,
    activeListId,
    customCategories,
    categoryDisplayOverrides,
    enabledCategoryIds,
    language,
    displayCurrency,
  } = useStore();
  const lang = language as Language;
  const homeCats = useMemo(() => {
    let cats = buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides);
    if (cats.length === 0) cats = buildCategoriesForHome(null, customCategories, categoryDisplayOverrides);
    return cats;
  }, [enabledCategoryIds, customCategories, categoryDisplayOverrides]);
  const expenseCurrency = (displayCurrency || "USD").trim().toUpperCase();

  const [rows, setRows] = useState<EditRow[]>([]);
  const [dateModalRow, setDateModalRow] = useState<number | null>(null);
  const [categoryModalRow, setCategoryModalRow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const bg = isDark ? "#000000" : "#f5f5f5";
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#111111";
  const mutedColor = isDark ? "#6b6b70" : "#888888";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  const bottomBarBg = isDark ? "#0a0a0a" : "#ffffff";
  const saveBtnBg = isDark ? "#2c2c2e" : "#e2e2e6";
  const pillBg = isDark ? "#1c1c1e" : "#efefef";

  const dateYmdForModal = useMemo(() => {
    if (dateModalRow === null || rows[dateModalRow] == null) return toApiDateOnly(new Date());
    return toApiDateOnly(rows[dateModalRow].occurredAt);
  }, [dateModalRow, rows]);

  const pillStyle = useMemo(
    () => ({
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: pillBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 6,
    }),
    [pillBg],
  );

  const patchRow = useCallback((index: number, patch: Partial<EditRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  const removeRowAt = useCallback(
    (index: number) => {
      setDateModalRow((d) =>
        d === null ? null : d === index ? null : d > index ? d - 1 : d,
      );
      setCategoryModalRow((c) =>
        c === null ? null : c === index ? null : c > index ? c - 1 : c,
      );
      setRows((prev) => {
        const next = prev.filter((_, idx) => idx !== index);
        if (next.length === 0) {
          setTimeout(() => onClose(), 0);
        }
        return next;
      });
    },
    [onClose],
  );

  useEffect(() => {
    if (!visible || !parsing) return;
    setRows([]);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
  }, [visible, parsing, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!visible || parsing || !parsedExpenses?.length || success) return;
    setRows(
      parsedExpenses.map((p, i) => {
        const amt =
          typeof p.amount === "number" && Number.isFinite(p.amount) ? Number(p.amount).toFixed(2) : "0.00";
        const cur = (p.currency || expenseCurrency).trim().toUpperCase();
        /** Fiş/ses: her zaman işlemin yapıldığı gün (yerel bugün). Metin ayrıştırmada API tarihi. */
        const defaultDate =
          parsingKind === "text"
            ? parseYmdToLocal(p.date || toApiDateOnly(new Date()))
            : localTodayAtNoon();
        return {
          key: `e-${i}-${String(p.amount)}-${String(p.category)}-${(p.description ?? "").slice(0, 24)}`,
          amount: amt,
          description: p.description ?? "",
          category: String(p.category || "other"),
          occurredAt: defaultDate,
          currency: cur,
        };
      }),
    );
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [
    visible,
    parsing,
    parsedExpenses,
    success,
    expenseCurrency,
    parsingKind,
    fadeAnim,
    slideAnim,
  ]);

  useEffect(() => {
    if (!visible) {
      setSuccess(false);
      setSaving(false);
      setDateModalRow(null);
      setCategoryModalRow(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      setRows([]);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const num = parseAmountInput(row.amount);
      if (!Number.isFinite(num) || num <= 0) {
        showAlert(t("review.invalidAmountTitle"), t("review.invalidAmountRow", { n: i + 1 }));
        return;
      }
      if (!row.description.trim()) {
        showAlert(t("common.formValidationTitle"), t("forms.descriptionRequired"));
        return;
      }
    }

    setSaving(true);
    try {
      const { notificationAsync, NotificationFeedbackType } = await import("expo-haptics");
      await notificationAsync(NotificationFeedbackType.Success);
    } catch {
      /* no haptics */
    }

    try {
      const list_id = expenseListIdForApi(activeListId);
      const inserted: Expense[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const num = parseAmountInput(row.amount);
        const date = toApiDateOnly(row.occurredAt);
        const cur = (row.currency || expenseCurrency).trim().toUpperCase();
        const dto = await createExpense({
          amount: num,
          description: row.description.trim(),
          category: row.category,
          date,
          currency: cur,
          is_income: false,
          ...(list_id != null ? { list_id } : {}),
        });
        inserted.push({
          id: String(dto.id),
          amount: num,
          description: row.description.trim(),
          category: row.category,
          date,
          currency: dto.currency ?? cur,
          listId: activeListId,
          isIncome: false,
        });
      }
      addExpensesBatch(inserted);
      setSaving(false);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 900);
    } catch (e) {
      setSaving(false);
      const detail = formatApiErrorDetailBody(
        e && typeof e === "object" && "details" in e ? (e as ApiError).details : null,
      );
      showAlert(t("review.saveFailedTitle"), detail ?? t("review.saveFailedBody"));
    }
  };

  const showForm = !parsing && !success && rows.length > 0;
  const emptyParsed = !parsing && !success && parsedExpenses != null && parsedExpenses.length === 0;

  const keyboardLiftPad = expenseFormMainKeyboardLiftPad(keyboardInset);
  const footerInnerBottomPad = actionBarInnerBottomPad(keyboardInset, insets.bottom);
  /** Alt şerit artık scroll dışında flex ile; sadece son içerik ile şerit arası nefes */
  const scrollContentBottomPad = showForm
    ? 24 + Math.min(80, Math.max(0, (rows.length - 1) * 28))
    : 40;

  const parsingCopy = useMemo(() => {
    if (parsingKind === "voice") return t("review.parsingVoice");
    if (parsingKind === "text") return t("review.parsingText");
    return t("review.parsingReceipt");
  }, [parsingKind, t]);

  const saveLabel = useMemo(() => {
    if (rows.length <= 1) return t("common.save");
    return t("review.saveAll", { count: rows.length });
  }, [rows.length, t]);

  const successTitle = useMemo(() => {
    return rows.length > 1 ? t("review.successMany") : t("review.successOne");
  }, [rows.length, t]);

  const dateRelLabels = useMemo(
    () => ({ today: t("common.today"), yesterday: t("common.yesterday") }),
    [t],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "android" ? "padding" : undefined}
          enabled={Platform.OS !== "android" || keyboardInset > 0}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{ alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={28} color={textColor} />
            </Pressable>

            <View style={{ flex: 1, paddingBottom: keyboardLiftPad }}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                nestedScrollEnabled
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  paddingBottom: scrollContentBottomPad,
                  flexGrow: parsing || success || emptyParsed ? 1 : undefined,
                }}
                keyboardShouldPersistTaps="handled"
              >
              {parsing ? (
                <View style={{ alignItems: "center", paddingTop: 72, paddingHorizontal: 12 }}>
                  <ActivityIndicator size="large" color="#6C63FF" />
                  <Text style={{ color: mutedColor, marginTop: 20, fontSize: 15, textAlign: "center" }}>
                    {parsingCopy}
                  </Text>
                </View>
              ) : success ? (
                <View style={{ alignItems: "center", paddingTop: 72 }}>
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: "#43E97B20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="checkmark" size={38} color="#43E97B" />
                  </View>
                  <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>{successTitle}</Text>
                </View>
              ) : emptyParsed ? (
                <View style={{ alignItems: "center", paddingTop: 72, paddingHorizontal: 16 }}>
                  <Text style={{ color: mutedColor, fontSize: 15, textAlign: "center" }}>
                    {t("review.emptyParsed")}
                  </Text>
                </View>
              ) : (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {rows.map((row, i) => {
                    const meta = getCategoryMeta(row.category, customCategories, categoryDisplayOverrides);
                    const rowSym = currencySymbolFor(row.currency || expenseCurrency, lang);
                    return (
                      <React.Fragment key={row.key}>
                      <View style={{ marginBottom: i < rows.length - 1 ? 20 : 0 }}>
                        {rows.length > 1 && (
                          <Text
                            style={{
                              color: mutedColor,
                              fontSize: 12,
                              fontWeight: "700",
                              marginBottom: 8,
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("review.itemLabel", { current: i + 1, total: rows.length })}
                          </Text>
                        )}
                        <View style={{ position: "relative", width: "100%", marginBottom: 14 }}>
                          <Pressable
                            onPress={() => removeRowAt(i)}
                            hitSlop={12}
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              zIndex: 2,
                              padding: 6,
                            }}
                            accessibilityLabel={t("review.removeItemA11y")}
                          >
                            <Ionicons name="trash-outline" size={22} color={mutedColor} />
                          </Pressable>
                          <View
                            style={{
                              backgroundColor: cardBg,
                              borderRadius: 22,
                              paddingVertical: 22,
                              paddingHorizontal: 20,
                              borderWidth: 1,
                              borderColor,
                              alignItems: "center",
                            }}
                          >
                          <View
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 20,
                              backgroundColor: meta.bgColor,
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 14,
                            }}
                          >
                            <CategoryGlyph emoji={meta.emoji} size={30} color={meta.color} categoryId={row.category} />
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: mutedColor,
                                fontSize: 20,
                                fontWeight: "700",
                                marginTop: 14,
                                marginRight: 4,
                              }}
                            >
                              {rowSym}
                            </Text>
                            <TextInput
                              value={row.amount}
                              onChangeText={(text) => patchRow(i, { amount: text })}
                              keyboardType="decimal-pad"
                              style={{
                                color: textColor,
                                fontSize: 44,
                                fontWeight: "800",
                                letterSpacing: -2,
                                minWidth: 100,
                                padding: 0,
                                textAlign: "center",
                              }}
                              accessibilityLabel={t("review.amount")}
                            />
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
                            <CategoryGlyph emoji={meta.emoji} size={16} color={meta.color} categoryId={row.category} />
                            <Text style={{ color: meta.color, fontSize: 13, fontWeight: "600" }}>{meta.name}</Text>
                          </View>
                          </View>
                        </View>

                        <View style={{ marginBottom: 12 }}>
                          <Pressable onPress={() => setDateModalRow(i)} style={pillStyle}>
                            <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
                              {formatDatePill(toApiDateOnly(row.occurredAt), lang, dateRelLabels)}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={mutedColor} />
                          </Pressable>
                        </View>

                        <View
                          style={{
                            backgroundColor: cardBg,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor,
                          }}
                        >
                          <Text
                            style={{
                              color: mutedColor,
                              fontSize: 11,
                              letterSpacing: 1.2,
                              textTransform: "uppercase",
                              marginBottom: 8,
                            }}
                          >
                            {t("expenseDetail.descriptionPlaceholder")}
                          </Text>
                          <TextInput
                            value={row.description}
                            onChangeText={(text) => patchRow(i, { description: text })}
                            style={{
                              color: textColor,
                              fontSize: 16,
                              fontWeight: "500",
                              padding: 0,
                              minHeight: 22,
                              textAlignVertical: "top",
                            }}
                            placeholderTextColor={mutedColor}
                            multiline
                          />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              color: mutedColor,
                              fontSize: 11,
                              letterSpacing: 1.2,
                              textTransform: "uppercase",
                              marginBottom: 10,
                            }}
                          >
                            {t("expenseDetail.categoryLabel")}
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            style={{ flexGrow: 0, flexShrink: 0, maxHeight: 56 }}
                            contentContainerStyle={{ gap: 10, alignItems: "center", paddingRight: 8 }}
                          >
                            <Pressable
                              onPress={() => setCategoryModalRow(i)}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                borderWidth: 2,
                                borderColor: isDark ? "#3a3a40" : "#ccc",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons name="add" size={24} color={textColor} />
                            </Pressable>

                            {homeCats.map((cat) => {
                              const m = getCategoryMeta(cat.id, customCategories, categoryDisplayOverrides);
                              const sel = cat.id === row.category;
                              return (
                                <Pressable
                                  key={cat.id}
                                  onPress={() => patchRow(i, { category: cat.id })}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8,
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderRadius: 22,
                                    backgroundColor: sel ? (isDark ? "#2a2a2e" : "#e4e4ea") : pillBg,
                                    maxWidth: winW * 0.55,
                                    borderWidth: sel ? 2 : 0,
                                    borderColor: sel ? m.color : "transparent",
                                  }}
                                >
                                  <CategoryGlyph emoji={m.emoji} size={20} color={m.color} categoryId={cat.id} />
                                  <Text
                                    style={{
                                      color: textColor,
                                      fontWeight: sel ? "700" : "600",
                                      fontSize: 14,
                                      flexShrink: 1,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {m.name}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </View>
                      </React.Fragment>
                    );
                  })}
                </Animated.View>
              )}
              </ScrollView>

              {showForm ? (
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: footerInnerBottomPad,
                    backgroundColor: bottomBarBg,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDark ? "#222222" : "#e5e5e5",
                  }}
                >
                  <Pressable
                    onPress={handleSaveAll}
                    disabled={saving}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      backgroundColor: saveBtnBg,
                      borderRadius: 16,
                      paddingVertical: 16,
                      opacity: saving ? 0.65 : 1,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color={textColor} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={22} color={textColor} />
                        <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>{saveLabel}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>

        <AddExpenseDatePickerModal
          visible={dateModalRow !== null}
          valueYmd={dateYmdForModal}
          onClose={() => setDateModalRow(null)}
          onConfirm={(ymd) => {
            if (dateModalRow !== null) {
              patchRow(dateModalRow, { occurredAt: parseYmdToLocal(ymd) });
            }
            setDateModalRow(null);
          }}
          isDark={isDark}
          language={lang}
        />

        <OnboardingAddCategoryFullScreenModal
          visible={categoryModalRow !== null}
          onClose={() => setCategoryModalRow(null)}
          isDark={isDark}
          onCreate={async (data) => {
            const created = await addCategory(data);
            if (categoryModalRow !== null) {
              patchRow(categoryModalRow, { category: created.id });
            }
            setCategoryModalRow(null);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
