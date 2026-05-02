import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  Platform,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { buildCategoriesForHome, useStore } from "../../store/useStore";
import { useAIParser } from "../../hooks/useAIParser";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import ReviewExpenseModal from "../../components/ReviewExpenseModal";
import ListsPickerModal from "../../components/ListsPickerModal";
import ExpenseTxRow from "../../components/ExpenseTxRow";
import {
  filterByPeriod,
  formatDayNetTotal,
  formatPeriodPillLabel,
  groupByDate,
} from "../../lib/expenseFilters";
import MonthPickerModal from "../../components/MonthPickerModal";
import CategorySpendScroller from "../../components/CategorySpendScroller";
import { parseImage as parseImageBackend, parseAudio as parseAudioBackend } from "../../lib/backend";
import type { Category } from "../../constants/mockData";

const PURPLE = "#6C63FF";
const CORAL = "#FF6B6B";

type TxFlowFilter = "all" | "expense" | "income";

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const {
    isDark, expenses,
    lists, activeListId, setActiveList, addList,
    periodFilter, setPeriodFilter,
    language,
    enabledCategoryIds,
    customCategories,
    categoryDisplayOverrides,
  } = useStore();
  const { parseText } = useAIParser();
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();

  const [showInput, setShowInput] = useState(false);
  const [promptText, setPromptText] = useState("");
  const inputAnim = useRef(new Animated.Value(0)).current;

  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewParsing, setReviewParsing] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<{
    amount: number; description: string; category: Category; date: string; currency: string;
  } | null>(null);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [txCategoryFilter, setTxCategoryFilter] = useState<string | null>(null);
  /** Üstteki Harcama / Gelir kutularından liste + grafik filtresi */
  const [txFlowFilter, setTxFlowFilter] = useState<TxFlowFilter>("all");

  const bg = isDark ? "#0f0f0f" : "#f5f5f5";
  const cardBg = isDark ? "#1a1a1a" : "#fff";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const divider = isDark ? "#222" : "#eee";

  const periodExpenses = useMemo(() => {
    let result = filterByPeriod(expenses, periodFilter);
    result = result.filter((e) => !e.listId || e.listId === activeListId);
    return result;
  }, [expenses, periodFilter, activeListId]);

  const flowFilteredExpenses = useMemo(() => {
    if (txFlowFilter === "expense") return periodExpenses.filter((e) => !e.isIncome);
    if (txFlowFilter === "income") return periodExpenses.filter((e) => !!e.isIncome);
    return periodExpenses;
  }, [periodExpenses, txFlowFilter]);

  const listFiltered = useMemo(() => {
    if (!txCategoryFilter) return flowFilteredExpenses;
    return flowFilteredExpenses.filter((e) => e.category === txCategoryFilter);
  }, [flowFilteredExpenses, txCategoryFilter]);

  /** Üst özet: ay + liste + Harcama/Gelir kutuları. Kategori seçimi listeyi süzer; özetleri sıfırlamaz. */
  const { totalNet, totalExpenseOut, totalIncomeIn } = useMemo(() => {
    const exp = flowFilteredExpenses.filter((e) => !e.isIncome).reduce((s, e) => s + e.amount, 0);
    const inc = flowFilteredExpenses.filter((e) => e.isIncome).reduce((s, e) => s + e.amount, 0);
    const net = inc - exp;
    return { totalNet: net, totalExpenseOut: exp, totalIncomeIn: inc };
  }, [flowFilteredExpenses]);

  const grouped = useMemo(() => groupByDate(listFiltered), [listFiltered]);

  const activeList = lists.find((l) => l.id === activeListId);
  const periodLabel = formatPeriodPillLabel(periodFilter, language);

  const homeCats = useMemo(
    () => buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides),
    [enabledCategoryIds, customCategories, categoryDisplayOverrides],
  );

  // Input animation
  const toggleInput = () => {
    const toVal = showInput ? 0 : 1;
    setShowInput(!showInput);
    Animated.spring(inputAnim, { toValue: toVal, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };

  const openReview = (parsed: any) => { setReviewExpense(parsed); setReviewParsing(false); setReviewVisible(true); };

  const handleTextSubmit = async () => {
    if (!promptText.trim()) return;
    setReviewExpense(null); setReviewParsing(true); setReviewVisible(true);
    setPromptText(""); if (showInput) toggleInput();
    try { openReview(await parseText(promptText)); }
    catch { setReviewVisible(false); Alert.alert("Error", "Could not parse expense."); }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to scan receipts."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (result.canceled || !result.assets[0]?.base64) return;
    const { base64, mimeType } = result.assets[0];
    setReviewExpense(null); setReviewParsing(true); setReviewVisible(true);
    try { openReview(await parseImageBackend(base64!, mimeType ?? "image/jpeg")); }
    catch { setReviewVisible(false); Alert.alert("Error", "Could not parse receipt."); }
  };

  const handleVoice = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      if (!uri) return;
      setReviewExpense(null); setReviewParsing(true); setReviewVisible(true);
      try {
        const FileSystem = await import("expo-file-system");
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
        const mimeType = uri.endsWith(".wav") ? "audio/wav" : "audio/m4a";
        openReview(await parseAudioBackend(b64, mimeType, language));
      } catch { setReviewVisible(false); Alert.alert("Error", "Could not analyze voice. Try again."); }
    } else {
      await startRecording();
    }
  };

  const inputTranslateY = inputAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });

  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const netAccent = totalNet >= 0 ? "#55efc4" : CORAL;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Yapışkan: ayarlar + net tutar + harcama/gelir kutuları + tarih/liste filtreleri */}
        <View
          style={{
            backgroundColor: bg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: divider,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <Pressable
              onPress={() => router.push("/(app)/settings")}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="settings-outline" size={22} color={mutedColor} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: mutedColor, fontSize: 13, marginBottom: 2 }}>
              {language === "tr" ? "Net (gelir − harcama)" : "Net (income − expenses)"}
            </Text>
            <Text style={{ color: mutedColor, fontSize: 11, marginBottom: 6, opacity: 0.9 }}>
              {language === "tr"
                ? "Ay + liste + üstteki Harcama/Gelir. Kategori yalnızca listeyi süzer."
                : "Month + list + expense/income tiles. Category only filters the list below."}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: netAccent,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  marginTop: 4,
                }}
              >
                <Ionicons
                  name={totalNet >= 0 ? "add" : "remove"}
                  size={18}
                  color={totalNet >= 0 ? "#0f0f0f" : "#fff"}
                />
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", flexShrink: 1 }}>
                <Text
                  style={{
                    color: netAccent,
                    fontSize: 44,
                    fontWeight: "800",
                    letterSpacing: -1,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {fmt(totalNet)}
                </Text>
                <Text style={{ color: textColor, fontSize: 26, fontWeight: "700", marginLeft: 6 }}>$</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setTxFlowFilter((p) => (p === "expense" ? "all" : "expense"))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: "rgba(255,107,107,0.18)",
                  borderWidth: txFlowFilter === "expense" ? 2 : 0,
                  borderColor: CORAL,
                }}
              >
                <Text style={{ color: mutedColor, fontSize: 11, marginBottom: 4 }}>
                  {language === "tr" ? "Harcama" : "Spending"}
                </Text>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "700" }}>- {fmt(totalExpenseOut)} $</Text>
              </Pressable>
              <Pressable
                onPress={() => setTxFlowFilter((p) => (p === "income" ? "all" : "income"))}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#252528" : "#e8e8ec",
                  borderWidth: txFlowFilter === "income" ? 2 : 0,
                  borderColor: "#55efc4",
                }}
              >
                <Text style={{ color: mutedColor, fontSize: 11, marginBottom: 4 }}>
                  {language === "tr" ? "Gelir" : "Income"}
                </Text>
                <Text style={{ color: totalIncomeIn > 0 ? "#55efc4" : mutedColor, fontSize: 15, fontWeight: "700" }}>
                  + {fmt(totalIncomeIn)} $
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={() => setMonthModalOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#1e1e1e" : "#efefef",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
                gap: 4,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>{periodLabel}</Text>
              <Ionicons name="chevron-down" size={13} color={mutedColor} />
            </Pressable>
            <Text style={{ color: mutedColor, fontSize: 13 }}>in</Text>
            <Pressable
              onPress={() => setListsModalOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "#1e1e1e" : "#efefef",
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
                gap: 4,
              }}
            >
              <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>
                {activeList?.name ?? "Private list"}
              </Text>
              <Ionicons name="chevron-down" size={13} color={mutedColor} />
            </Pressable>
          </View>
        </View>

        <Text style={{ color: mutedColor, fontSize: 12, paddingHorizontal: 20, marginBottom: 8 }}>
          {language === "tr"
            ? txFlowFilter === "expense"
              ? "Yalnızca harcamalar · Kategoriye dokun veya uzun bas"
              : txFlowFilter === "income"
                ? "Yalnızca gelirler · Kategoriye dokun veya uzun bas"
                : "Kategoriye dokun: işlem filtresi · Uzun bas: kategori detayı"
            : txFlowFilter === "expense"
              ? "Expenses only · Tap category to filter · Long press for details"
              : txFlowFilter === "income"
                ? "Income only · Tap category to filter · Long press for details"
                : "Tap a category to filter transactions · Long press for category details"}
        </Text>
        <CategorySpendScroller
          categories={homeCats}
          expenses={listFiltered}
          selectedCategoryId={txCategoryFilter}
          onSelectCategory={setTxCategoryFilter}
          onLongPressCategory={(id) => router.push({ pathname: "/category/[id]", params: { id } })}
          isDark={isDark}
        />

        {/* ── Transactions ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          {grouped.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: mutedColor, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>
                {language === "tr"
                  ? txFlowFilter === "expense"
                    ? "Bu dönemde harcama yok."
                    : txFlowFilter === "income"
                      ? "Bu dönemde gelir yok."
                      : "Bu dönemde işlem yok."
                  : txFlowFilter === "expense"
                    ? "No spending this period."
                    : txFlowFilter === "income"
                      ? "No income this period."
                      : "No transactions this period."}
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.label} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>{group.label}</Text>
                  <Text style={{ color: mutedColor, fontSize: 13 }}>
                    {formatDayNetTotal(group.total)}
                  </Text>
                </View>
                <View style={{ backgroundColor: cardBg, borderRadius: 18, overflow: "hidden" }}>
                  {group.items.map((exp, idx) => (
                    <View key={exp.id}>
                      {idx > 0 && <View style={{ height: 1, backgroundColor: divider, marginHorizontal: 16 }} />}
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
        onEditLists={() => router.push("/(app)/settings")}
        isDark={isDark}
        language={language}
      />

      {/* ── AI text input (slides up) ── */}
      {showInput && (
        <Animated.View style={{
          position: "absolute", bottom: 90, left: 20, right: 20,
          backgroundColor: cardBg, borderRadius: 18,
          shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
          opacity: inputAnim, transform: [{ translateY: inputTranslateY }],
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 4 }}>
            <Ionicons name="sparkles-outline" size={18} color={PURPLE} style={{ marginRight: 10 }} />
            <TextInput
              value={promptText} onChangeText={setPromptText}
              placeholder="Describe your expense…"
              placeholderTextColor={mutedColor}
              style={{ flex: 1, color: textColor, fontSize: 15, paddingVertical: 14 }}
              returnKeyType="send" onSubmitEditing={handleTextSubmit} autoFocus
            />
            {promptText.length > 0 && (
              <Pressable onPress={handleTextSubmit} style={{ backgroundColor: PURPLE, borderRadius: 10, padding: 8 }}>
                <Ionicons name="arrow-up" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Bottom bar ── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 32, paddingBottom: Platform.OS === "ios" ? 30 : 16, paddingTop: 12,
        backgroundColor: bg,
      }}>
        {/* + */}
        <Pressable onPress={() => router.push("/add" as any)}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={28} color={textColor} />
        </Pressable>

        {/* Search */}
        <Pressable onPress={toggleInput}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="search-outline" size={24} color={showInput ? PURPLE : mutedColor} />
        </Pressable>

        {/* Image scan */}
        <Pressable onPress={handleImagePick}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="camera-outline" size={24} color={mutedColor} />
        </Pressable>

        {/* Voice FAB */}
        <Pressable onPress={handleVoice}
          style={{
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: isRecording ? "#FF6B6B" : "#FF6B6B",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#FF6B6B", shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
          }}>
          <Ionicons name={isRecording ? "stop" : "mic"} size={26} color="#fff" />
        </Pressable>
      </View>

      <ReviewExpenseModal
        visible={reviewVisible} parsing={reviewParsing} parsedExpense={reviewExpense}
        onClose={() => setReviewVisible(false)}
        onSaved={() => setReviewVisible(false)}
      />
    </SafeAreaView>
  );
}
