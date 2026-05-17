import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { buildCategoriesForHome, useStore } from "../../store/useStore";
import { getCategoryMeta } from "../../constants/mockData";
import CategoryGlyph from "../../components/CategoryGlyph";
import {
  createExpense,
  createRecurringExpense,
  expenseListIdForApi,
  mapExpenseDto,
} from "../../lib/backend";
import type { RecurrenceRule } from "../../lib/backend";
import AddExpenseDatePickerModal from "../../components/AddExpenseDatePickerModal";
import ListsPickerModal from "../../components/ListsPickerModal";
import { OnboardingAddCategoryFullScreenModal } from "../../components/onboarding/OnboardingAddCategoryFullScreenModal";
import ExpenseAmountSignRow from "../../components/ExpenseAmountSignRow";
import BlockingOverlay from "../../components/BlockingOverlay";
import type { Language } from "../../i18n";
import { useThrottledRouter, navigateToSettings } from "../../hooks/useThrottledRouter";
import { useAppDialog } from "../../context/AppDialogContext";
import { displayExpenseListName } from "../../lib/listDisplayName";
import ListGlyph from "../../components/ListGlyph";
import {
  actionBarInnerBottomPad,
  expenseFormMainKeyboardLiftPad,
} from "../../lib/keyboardFooterChrome";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { currencySymbolFor } from "../../lib/formatMoney";

type RecurrenceId =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly";

const REC_LABELS: Record<Language, Record<RecurrenceId, string>> = {
  en: {
    once: "Once",
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    bimonthly: "Bi-monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  },
  tr: {
    once: "Bir kez",
    daily: "Günlük",
    weekly: "Haftalık",
    biweekly: "İki haftada bir",
    monthly: "Aylık",
    bimonthly: "İki ayda bir",
    quarterly: "Üç aylık",
    yearly: "Yıllık",
  },
  de: {
    once: "Einmal",
    daily: "Täglich",
    weekly: "Wöchentlich",
    biweekly: "Zweiwöchentlich",
    monthly: "Monatlich",
    bimonthly: "Zweimonatlich",
    quarterly: "Vierteljährlich",
    yearly: "Jährlich",
  },
  fr: {
    once: "Une fois",
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    biweekly: "Bihebdomadaire",
    monthly: "Mensuel",
    bimonthly: "Bimestriel",
    quarterly: "Trimestriel",
    yearly: "Annuel",
  },
  es: {
    once: "Una vez",
    daily: "Diario",
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
    bimonthly: "Bimensual",
    quarterly: "Trimestral",
    yearly: "Anual",
  },
};

const REC_IDS: RecurrenceId[] = [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "yearly",
];

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function formatDatePill(
  ymd: string,
  language: Language,
  rel: { today: string; yesterday: string },
): string {
  const dt = parseYmdLocal(ymd);
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
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(dt);
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default function AddExpense() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pendingId?: string; bankPrefill?: string }>();
  const pendingIdParam = firstParam(params.pendingId);
  const bankPrefillParam = firstParam(params.bankPrefill);
  const throttledPush = useThrottledRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { t } = useTranslation();
  const { showAlert } = useAppDialog();

  const {
    isDark,
    activeListId,
    setActiveList,
    lists,
    addList,
    addExpense,
    removePendingBankTransaction,
    customCategories,
    enabledCategoryIds,
    language,
    displayCurrency,
    addCategory,
    categoryDisplayOverrides,
    pendingBankTransactions,
  } = useStore();

  const activeList = lists.find((l) => l.id === activeListId);
  const keyboardInset = useKeyboardInset();
  const keyboardLiftPad = expenseFormMainKeyboardLiftPad(keyboardInset);
  const footerInnerBottomPad = actionBarInnerBottomPad(keyboardInset, insets.bottom);

  const homeCats = useMemo(() => {
    let cats = buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides);
    if (cats.length === 0) cats = buildCategoriesForHome(null, customCategories, categoryDisplayOverrides);
    return cats;
  }, [enabledCategoryIds, customCategories, categoryDisplayOverrides]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => {
    const n = new Date();
    const mm = String(n.getMonth() + 1).padStart(2, "0");
    const dd = String(n.getDate()).padStart(2, "0");
    return `${n.getFullYear()}-${mm}-${dd}`;
  });
  const [selectedCategory, setSelectedCategory] = useState(() => homeCats[0]?.id ?? "other");
  const [recurrence, setRecurrence] = useState<RecurrenceId>("once");
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isIncome, setIsIncome] = useState(false);

  useEffect(() => {
    setSelectedCategory((prev) =>
      homeCats.some((c) => c.id === prev) ? prev : homeCats[0]?.id ?? "other",
    );
  }, [homeCats]);

  useEffect(() => {
    const pre = bankPrefillParam?.trim();
    if (!pre) return;
    setDescription((d) => (d.trim() ? d : pre));
  }, [bankPrefillParam]);

  /** Bildirim deep link’i yalnızca pendingId taşıyorsa metni kuyruktan doldur (dashboard ile aynı). */
  useEffect(() => {
    if (!pendingIdParam) return;
    if (bankPrefillParam?.trim()) return;
    const row = pendingBankTransactions.find((p) => p.id === pendingIdParam);
    if (!row) return;
    const desc = [row.title, row.body].filter(Boolean).join(" · ").slice(0, 450);
    if (!desc) return;
    setDescription((d) => (d.trim() ? d : desc));
  }, [pendingIdParam, bankPrefillParam, pendingBankTransactions]);

  const lang = language as Language;
  const recLabels = REC_LABELS[lang];

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#111";
  const mutedColor = isDark ? "#6b6b70" : "#888";
  const pillBg = isDark ? "#1c1c1e" : "#efefef";
  const bottomBarBg = isDark ? "#0a0a0a" : "#fff";
  const saveBtnBg = isDark ? "#2c2c2e" : "#e2e2e6";

  const handleSave = async () => {
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) {
      showAlert(t("common.error"), t("forms.validAmount"));
      return;
    }
    if (!description.trim()) {
      showAlert(t("common.formValidationTitle"), t("forms.descriptionRequired"));
      return;
    }

    setSaving(true);
    try {
      const list_id = expenseListIdForApi(activeListId);
      if (recurrence !== "once") {
        const rule = await createRecurringExpense({
          amount: num,
          description: description.trim(),
          category: selectedCategory,
          currency: displayCurrency,
          is_income: isIncome,
          recurrence_rule: recurrence as RecurrenceRule,
          anchor_date: date,
          ...(list_id != null ? { list_id } : {}),
        });
        if (rule.initial_expense) {
          addExpense(mapExpenseDto(rule.initial_expense, activeListId), { deferBudgetCheckMs: 480 });
        }
      } else {
        const dto = await createExpense({
          amount: num,
          description: description.trim(),
          category: selectedCategory,
          date,
          currency: displayCurrency,
          is_income: isIncome,
          ...(list_id != null ? { list_id } : {}),
        });
        addExpense(mapExpenseDto(dto, activeListId), { deferBudgetCheckMs: 480 });
      }
      if (pendingIdParam) removePendingBankTransaction(pendingIdParam);
      try {
        const { notificationAsync, NotificationFeedbackType } = await import("expo-haptics");
        await notificationAsync(NotificationFeedbackType.Success);
      } catch {
        /* noop */
      }
      router.back();
    } catch {
      showAlert(t("common.error"), t("forms.saveFailedRetry"));
      setSaving(false);
    }
  };

  const pillStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: pillBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "padding" : undefined}
        enabled={Platform.OS !== "android" || keyboardInset > 0}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{ alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12 }}
          >
            <Ionicons name="close" size={28} color={textColor} />
          </Pressable>

          <View style={{ flex: 1, paddingBottom: keyboardLiftPad }}>
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              nestedScrollEnabled
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 20,
                flexGrow: 1,
                minHeight: Math.max(420, winH - insets.top - Math.max(insets.bottom, 16) - 168),
                justifyContent: "center",
              }}
            >
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                <Pressable onPress={() => setDateModalOpen(true)} style={pillStyle}>
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
                    {formatDatePill(date, lang, {
                      today: t("common.today"),
                      yesterday: t("common.yesterday"),
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={mutedColor} />
                </Pressable>
                <Pressable onPress={() => setRecurrenceOpen(true)} style={pillStyle}>
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
                    {recLabels[recurrence]}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={mutedColor} />
                </Pressable>
                <Text style={{ color: mutedColor, fontSize: 13 }}>{t("dashboard.listFilterIn")}</Text>
                <Pressable onPress={() => setListsModalOpen(true)} style={pillStyle}>
                  {activeList ? (
                    <ListGlyph list={activeList} size={15} isDark={isDark} />
                  ) : null}
                  <Text
                    style={{ color: textColor, fontSize: 14, fontWeight: "600", flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {activeList ? displayExpenseListName(activeList.name, t) : t("lists.defaultPrivateList")}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={mutedColor} />
                </Pressable>
              </View>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("expenseDetail.descriptionPlaceholder")}
                placeholderTextColor={mutedColor}
                style={{
                  color: textColor,
                  fontSize: 34,
                  fontWeight: "700",
                  paddingVertical: 6,
                  minHeight: 46,
                }}
              />

              <ExpenseAmountSignRow
                isIncome={isIncome}
                onSelectExpense={() => setIsIncome(false)}
                onSelectIncome={() => setIsIncome(true)}
                amount={amount}
                onChangeAmount={setAmount}
                currencySuffix={currencySymbolFor(displayCurrency, lang)}
                isDark={isDark}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={{ flexGrow: 0, flexShrink: 0, maxHeight: 56 }}
                contentContainerStyle={{ gap: 10, alignItems: "center", paddingRight: 20 }}
              >
              <Pressable
                onPress={() => setCategoryEditorOpen(true)}
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
                const sel = cat.id === selectedCategory;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
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
          </ScrollView>

            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: footerInnerBottomPad,
                backgroundColor: bottomBarBg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? "#222" : "#e5e5e5",
              }}
            >
              <Pressable
                onPress={handleSave}
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
                    <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>
                      {t("common.save")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AddExpenseDatePickerModal
        visible={dateModalOpen}
        valueYmd={date}
        onClose={() => setDateModalOpen(false)}
        onConfirm={setDate}
        isDark={isDark}
        language={lang}
      />

      <OnboardingAddCategoryFullScreenModal
        visible={categoryEditorOpen}
        onClose={() => setCategoryEditorOpen(false)}
        isDark={isDark}
        onCreate={async (data) => {
          const row = await addCategory(data);
          setSelectedCategory(row.id);
        }}
      />

      <ListsPickerModal
        visible={listsModalOpen}
        onClose={() => setListsModalOpen(false)}
        lists={lists}
        activeListId={activeListId}
        onSelectList={setActiveList}
        onAddList={addList}
        onEditLists={() => {
          setListsModalOpen(false);
          navigateToSettings(router);
        }}
        isDark={isDark}
        language={lang}
      />

      <Modal visible={recurrenceOpen} transparent animationType="fade" onRequestClose={() => setRecurrenceOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "center", paddingHorizontal: 28 }} onPress={() => setRecurrenceOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? "#2c2c2e" : "#fff",
              borderRadius: 18,
              overflow: "hidden",
              maxHeight: "70%",
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {REC_IDS.map((id, i) => (
                <Pressable
                  key={id}
                  onPress={() => {
                    setRecurrence(id);
                    setRecurrenceOpen(false);
                  }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: isDark ? "#3a3a40" : "#eee",
                    backgroundColor: recurrence === id ? (isDark ? "#3a3a42" : "#f0f0f4") : "transparent",
                  }}
                >
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: recurrence === id ? "700" : "500" }}>
                    {recLabels[id]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <BlockingOverlay visible={saving} isDark={isDark} />
    </SafeAreaView>
  );
}
