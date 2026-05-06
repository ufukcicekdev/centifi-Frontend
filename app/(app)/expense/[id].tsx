import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { buildCategoriesForHome, useStore } from "../../../store/useStore";
import { getCategoryMeta } from "../../../constants/mockData";
import AddExpenseDatePickerModal from "../../../components/AddExpenseDatePickerModal";
import ListsPickerModal from "../../../components/ListsPickerModal";
import CategoryEditorModal from "../../../components/CategoryEditorModal";
import ExpenseAmountSignRow from "../../../components/ExpenseAmountSignRow";
import BlockingOverlay from "../../../components/BlockingOverlay";
import type { Language } from "../../../i18n";
import { useThrottledRouter, navigateToSettings } from "../../../hooks/useThrottledRouter";
import { useAppDialog } from "../../../context/AppDialogContext";
import { displayExpenseListName, displayListEmoji } from "../../../lib/listDisplayName";
import {
  actionBarInnerBottomPad,
  keyboardLiftPaddingBottom,
} from "../../../lib/keyboardFooterChrome";
import { saveBarPaddingBottom } from "../../../lib/saveBarPaddingBottom";
import { currencySymbolFor } from "../../../lib/formatMoney";
import { useKeyboardInset } from "../../../hooks/useKeyboardInset";

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

const CORAL = "#FF6B6B";

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
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(dt);
}

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const throttledPush = useThrottledRouter();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useAppDialog();
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const expenseId = Array.isArray(rawId) ? rawId[0] : rawId ?? "";

  const {
    isDark,
    expenses,
    lists,
    addList,
    customCategories,
    enabledCategoryIds,
    language,
    updateExpense,
    removeExpense,
    addCategory,
    categoryDisplayOverrides,
    displayCurrency,
  } = useStore();

  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenses, expenseId],
  );

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceId>("once");
  const [listId, setListId] = useState<string>("private");
  const [selectedCategory, setSelectedCategory] = useState("other");
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isIncome, setIsIncome] = useState(false);

  useLayoutEffect(() => {
    const ex = useStore.getState().expenses.find((e) => e.id === expenseId);
    if (!ex) return;
    const fb = useStore.getState().lists.find((l) => l.isDefault)?.id ?? useStore.getState().lists[0]?.id ?? "private";
    setDescription(ex.description);
    setAmount(String(ex.amount));
    setDate(ex.date);
    setSelectedCategory(ex.category);
    setListId(ex.listId ?? fb);
    const r = ex.recurrenceRule;
    setRecurrence(
      typeof r === "string" && (REC_IDS as readonly string[]).includes(r) ? (r as RecurrenceId) : "once",
    );
    setIsIncome(!!ex.isIncome);
  }, [expenseId, expense?.recurrenceRule, expense?.listId]);

  const lang = language as Language;

  const homeCats = useMemo(() => {
    let cats = buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides);
    if (cats.length === 0) cats = buildCategoriesForHome(null, customCategories, categoryDisplayOverrides);
    return cats;
  }, [enabledCategoryIds, customCategories, categoryDisplayOverrides]);

  if (!expenseId) {
    return null;
  }

  if (!expense) {
    const nfBg = isDark ? "#000000" : "#f5f5f5";
    const nfText = isDark ? "#fff" : "#111";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: nfBg }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 12 }}
        >
          <Ionicons name="close" size={28} color={nfText} />
        </Pressable>
        <Text style={{ color: nfText, textAlign: "center", marginTop: 48, paddingHorizontal: 24 }}>
          {t("expenseDetail.notFound")}
        </Text>
      </SafeAreaView>
    );
  }

  const recLabels = REC_LABELS[lang];

  const activeList = lists.find((l) => l.id === listId);
  const saveBarBottomPad = saveBarPaddingBottom(insets.bottom);
  const keyboardLiftPad =
    Platform.OS === "android" ? 0 : keyboardLiftPaddingBottom(keyboardInset);
  const footerInnerBottomPad = actionBarInnerBottomPad(keyboardInset, insets.bottom);

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#111";
  const mutedColor = isDark ? "#6b6b70" : "#888";
  const pillBg = isDark ? "#1c1c1e" : "#efefef";
  const bottomBarBg = isDark ? "#0a0a0a" : "#fff";

  const pillStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: pillBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  };

  const catMeta = getCategoryMeta(selectedCategory, customCategories, categoryDisplayOverrides);

  const handleSave = async () => {
    if (!expense) return;
    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) {
      showAlert(t("common.error"), t("forms.validAmount"));
      return;
    }
    if (!description.trim()) {
      showAlert(t("common.error"), t("forms.descriptionRequired"));
      return;
    }
    setSaving(true);
    try {
      await updateExpense(expense.id, {
        description: description.trim(),
        amount: num,
        category: selectedCategory,
        date,
        currency: displayCurrency,
        listId,
        isIncome,
      });
      try {
        const { notificationAsync, NotificationFeedbackType } = await import("expo-haptics");
        await notificationAsync(NotificationFeedbackType.Success);
      } catch {
        /* noop */
      }
      router.back();
    } catch {
      showAlert(t("common.error"), t("forms.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!expense) return;
    void (async () => {
      const ok = await showConfirm({
        title: t("expenseDetail.deleteConfirmTitle"),
        message: t("expenseDetail.deleteConfirmMessage"),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        destructive: true,
      });
      if (!ok) return;
      try {
        await removeExpense(expense.id);
        router.back();
      } catch {
        showAlert(t("common.error"), t("expenseDetail.deleteFailed"));
      }
    })();
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
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 20,
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <View style={{ gap: 12 }}>
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
                    <Text style={{ fontSize: 15 }}>{displayListEmoji(activeList)}</Text>
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
                  fontSize: 28,
                  fontWeight: "700",
                  paddingVertical: 10,
                  minHeight: 44,
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

              <Pressable
                onPress={() => setCategoryModalOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 10,
                  backgroundColor: pillBg,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 22,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 22 }}>{catMeta.emoji}</Text>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>{catMeta.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={mutedColor} />
              </Pressable>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: footerInnerBottomPad,
              backgroundColor: bottomBarBg,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isDark ? "#2c2c2c" : "#e0e0e0",
            }}
          >
            <Pressable
              onPress={handleDelete}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                backgroundColor: CORAL,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("common.delete")}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{t("common.delete")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                backgroundColor: isDark ? "#2c2c2e" : "#e2e2e6",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: saving ? 0.65 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("common.save")}
            >
              {saving ? (
                <ActivityIndicator color={textColor} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={22} color={textColor} />
                  <Text style={{ color: textColor, fontWeight: "700", fontSize: 16 }}>{t("common.save")}</Text>
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

      <ListsPickerModal
        visible={listsModalOpen}
        onClose={() => setListsModalOpen(false)}
        lists={lists}
        activeListId={listId}
        onSelectList={setListId}
        onAddList={addList}
        onEditLists={() => {
          setListsModalOpen(false);
          navigateToSettings(router);
        }}
        isDark={isDark}
        language={lang}
      />

      <Modal visible={recurrenceOpen} transparent animationType="fade" onRequestClose={() => setRecurrenceOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "center", paddingHorizontal: 28 }}
          onPress={() => setRecurrenceOpen(false)}
        >
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
              {REC_IDS.map((rid, i) => (
                <Pressable
                  key={rid}
                  onPress={() => {
                    setRecurrence(rid);
                    setRecurrenceOpen(false);
                  }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: isDark ? "#3a3a40" : "#eee",
                    backgroundColor: recurrence === rid ? (isDark ? "#3a3a42" : "#f0f0f4") : "transparent",
                  }}
                >
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: recurrence === rid ? "700" : "500" }}>
                    {recLabels[rid]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={categoryModalOpen} transparent animationType="slide" onRequestClose={() => setCategoryModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#00000088" }} onPress={() => setCategoryModalOpen(false)} />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? "#1a1a1a" : "#fff",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: saveBarBottomPad,
            paddingTop: 12,
            maxHeight: "55%",
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "#444" : "#ccc", alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ color: textColor, fontSize: 17, fontWeight: "700", paddingHorizontal: 20, marginBottom: 12 }}>
            {t("expenseDetail.categoryLabel")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 8 }}>
            <Pressable
              onPress={() => {
                setCategoryModalOpen(false);
                setCategoryEditorOpen(true);
              }}
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
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setCategoryModalOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 22,
                    backgroundColor: sel ? (isDark ? "#2a2a2e" : "#e4e4ea") : pillBg,
                    borderWidth: sel ? 2 : 0,
                    borderColor: sel ? m.color : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
                  <Text style={{ color: textColor, fontWeight: sel ? "700" : "600", fontSize: 14 }}>{m.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <CategoryEditorModal
        visible={categoryEditorOpen}
        onClose={() => setCategoryEditorOpen(false)}
        isDark={isDark}
        onSave={async (data) => {
          const row = await addCategory(data);
          setSelectedCategory(row.id);
        }}
      />

      <BlockingOverlay visible={saving} isDark={isDark} />
    </SafeAreaView>
  );
}
