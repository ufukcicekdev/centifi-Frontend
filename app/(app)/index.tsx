import React, { useState, useRef, useMemo, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useShallow } from "zustand/react/shallow";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Keyboard,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import { buildCategoriesForHome, useStore } from "../../store/useStore";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import {
  useThrottledRouter,
  clearRouterPushCooldown,
  navigateToSettings,
} from "../../hooks/useThrottledRouter";
import ReviewExpenseModal, { type ReviewParsingKind } from "../../components/ReviewExpenseModal";
import ListsPickerModal from "../../components/ListsPickerModal";
import ExpenseTxRow from "../../components/ExpenseTxRow";
import {
  filterByPeriod,
  formatDayNetTotal,
  formatPeriodPillLabel,
  groupByDate,
  isExpenseInPeriod,
} from "../../lib/expenseFilters";
import MonthPickerModal from "../../components/MonthPickerModal";
import CategorySpendScroller from "../../components/CategorySpendScroller";
import PendingBankTransactionsStrip from "../../components/PendingBankTransactionsStrip";
import type { PendingBankTransaction } from "../../lib/pendingBankTypes";
import {
  parseImage as parseImageBackend,
  parseAudio as parseAudioBackend,
  type ParseResult,
  type ParsedExpenseItem,
} from "../../lib/backend";
import { type ApiError } from "../../lib/api";
import { userFacingApiMessage } from "../../lib/userFacingApiMessage";
import { useAppDialog } from "../../context/AppDialogContext";
import { useTranslation } from "react-i18next";
import { displayExpenseListName } from "../../lib/listDisplayName";
import ListGlyph from "../../components/ListGlyph";
import { flushBudgetThresholdCheck } from "../../lib/budgetThresholdNotifications";
import type { Language } from "../../i18n";
import { currencySymbolFor, formatAmountDigits } from "../../lib/formatMoney";
import { getCategoryMeta } from "../../constants/mockData";

const PURPLE = "#6C63FF";
const CORAL = "#FF6B6B";
const MICFAB_FILL_ACTIVE = "#FF5252";

function mimeForRecordedAudioUri(uri: string): string {
  const pathOnly = uri.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (pathOnly.endsWith(".wav")) return "audio/wav";
  if (pathOnly.endsWith(".webm")) return "audio/webm";
  if (pathOnly.endsWith(".3gp") || pathOnly.endsWith(".3gpp")) return "audio/3gpp";
  if (pathOnly.endsWith(".caf")) return "audio/x-caf";
  if (pathOnly.endsWith(".mp4") || pathOnly.endsWith(".mpeg4")) return "audio/mp4";
  return "audio/m4a";
}

type TxFlowFilter = "all" | "expense" | "income";

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { showAlert } = useAppDialog();
  const { t } = useTranslation();
  const router = useRouter();
  const throttledPush = useThrottledRouter();
  const insets = useSafeAreaInsets();
  /** Sistem gezinme çubuğunun üstünde kalsın; inset 0 olsa bile Android’de minimum boşluk */
  const bottomBarInset =
    Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0) + (Platform.OS === "android" ? 20 : 12);
  /** Alt çubuk yüksekliği (padding + ikon satırı ~60) — kaydırma ve üstteki input için */
  const bottomBarBlockHeight = 12 + 64 + bottomBarInset;
  const {
    isDark,
    expenses,
    lists,
    activeListId,
    setActiveList,
    addList,
    periodFilter,
    setPeriodFilter,
    language,
    displayCurrency,
    enabledCategoryIds,
    customCategories,
    categoryDisplayOverrides,
    isAuthenticated,
    expensesNextPagePath,
    expensesLoadingMore,
    loadMoreExpenses,
    pendingBankTransactions,
    removePendingBankTransaction,
    bankAutomations,
  } = useStore(
    useShallow((s) => ({
      isDark: s.isDark,
      expenses: s.expenses,
      lists: s.lists,
      activeListId: s.activeListId,
      setActiveList: s.setActiveList,
      addList: s.addList,
      periodFilter: s.periodFilter,
      setPeriodFilter: s.setPeriodFilter,
      language: s.language,
      displayCurrency: s.displayCurrency,
      enabledCategoryIds: s.enabledCategoryIds,
      customCategories: s.customCategories,
      categoryDisplayOverrides: s.categoryDisplayOverrides,
      isAuthenticated: s.isAuthenticated,
      expensesNextPagePath: s.expensesNextPagePath,
      expensesLoadingMore: s.expensesLoadingMore,
      loadMoreExpenses: s.loadMoreExpenses,
      pendingBankTransactions: s.pendingBankTransactions,
      removePendingBankTransaction: s.removePendingBankTransaction,
      bankAutomations: s.bankAutomations,
    })),
  );
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const keyboardInset = useKeyboardInset();

  /** Yerel işlem listesi araması (AI yok) */
  const [transactionSearch, setTransactionSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  /** + menüsü: manuel ekle / görsel yükle */
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewParsing, setReviewParsing] = useState(false);
  const [reviewParsingKind, setReviewParsingKind] = useState<ReviewParsingKind>("receipt");
  const [reviewExpenses, setReviewExpenses] = useState<ParsedExpenseItem[] | null>(null);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [txCategoryFilter, setTxCategoryFilter] = useState<string | null>(null);
  /** Üstteki Harcama / Gelir kutularından liste + grafik filtresi */
  const [txFlowFilter, setTxFlowFilter] = useState<TxFlowFilter>("all");

  /** Ayarlardan dönünce throttle sıfırlama; ana sayfaya dönünce kategori liste filtresi temizlensin. */
  useFocusEffect(
    useCallback(() => {
      clearRouterPushCooldown();
      setTxCategoryFilter(null);
    }, []),
  );

  const openCategoryDetail = useCallback(
    (id: string | null) => {
      if (id) throttledPush({ pathname: "/category/[id]", params: { id } });
    },
    [throttledPush],
  );

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

  const searchNorm = transactionSearch.trim().toLowerCase();
  const displayFiltered = useMemo(() => {
    if (!searchNorm) return listFiltered;
    return listFiltered.filter((e) => {
      if (e.description.toLowerCase().includes(searchNorm)) return true;
      const meta = getCategoryMeta(e.category, customCategories, categoryDisplayOverrides);
      const catBlob = `${meta.name} ${e.category}`.toLowerCase();
      return catBlob.includes(searchNorm);
    });
  }, [listFiltered, searchNorm, customCategories, categoryDisplayOverrides]);

  /** Arama varken üst tutarlar süzülmüş listeyle uyumlu; arama yokken ay + liste + gelir/gider. Kategori şeridi aramada gizlenir. */
  const totalsBasis = useMemo(
    () => (searchNorm ? displayFiltered : flowFilteredExpenses),
    [searchNorm, displayFiltered, flowFilteredExpenses],
  );

  const { totalNet, totalExpenseOut, totalIncomeIn } = useMemo(() => {
    const exp = totalsBasis.filter((e) => !e.isIncome).reduce((s, e) => s + e.amount, 0);
    const inc = totalsBasis.filter((e) => e.isIncome).reduce((s, e) => s + e.amount, 0);
    const net = inc - exp;
    return { totalNet: net, totalExpenseOut: exp, totalIncomeIn: inc };
  }, [totalsBasis]);

  const grouped = useMemo(
    () =>
      groupByDate(displayFiltered, {
        lang: language as Language,
        today: t("common.today"),
        yesterday: t("common.yesterday"),
      }),
    [displayFiltered, language, t],
  );

  /** Seçili takvim ayında sıfır görünür satır var ama liste + filtre için başka tarihlerde işlem var → genelde üstteki “ay” filtresi. */
  const hintExpandPeriod = useMemo(() => {
    if (periodFilter.kind !== "calendar_month" || grouped.length > 0) return false;
    const matches = expenses.filter(
      (e) =>
        (!e.listId || e.listId === activeListId) &&
        (txFlowFilter === "all" ||
          (txFlowFilter === "expense" && !e.isIncome) ||
          (txFlowFilter === "income" && e.isIncome)) &&
        (!txCategoryFilter || e.category === txCategoryFilter),
    );
    return matches.some((e) => !isExpenseInPeriod(e.date, periodFilter));
  }, [periodFilter, grouped.length, expenses, activeListId, txFlowFilter, txCategoryFilter]);

  const onMomentumScrollEndLoadMore = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isAuthenticated || !expensesNextPagePath || expensesLoadingMore) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const y = layoutMeasurement.height + contentOffset.y;
      if (y >= contentSize.height - 120) void loadMoreExpenses();
    },
    [isAuthenticated, expensesNextPagePath, expensesLoadingMore, loadMoreExpenses],
  );

  const activeList = lists.find((l) => l.id === activeListId);
  const periodLabel = formatPeriodPillLabel(periodFilter, language);

  const homeCats = useMemo(
    () => buildCategoriesForHome(enabledCategoryIds, customCategories, categoryDisplayOverrides),
    [enabledCategoryIds, customCategories, categoryDisplayOverrides],
  );

  const openSearchBar = useCallback(() => {
    setFabMenuOpen(false);
    searchAnim.setValue(0);
    setShowSearchBar(true);
    Animated.spring(searchAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchAnim]);

  /** Kapanışta layout’u animasyon sonuna bağlama — kategori şeridi / padding / toplamlar hemen dönsün (akıcılık). */
  const closeSearchBar = useCallback(() => {
    setFabMenuOpen(false);
    Keyboard.dismiss();
    searchAnim.setValue(0);
    setTransactionSearch("");
    setShowSearchBar(false);
  }, [searchAnim]);

  const toggleSearchBar = useCallback(() => {
    if (showSearchBar) closeSearchBar();
    else openSearchBar();
  }, [showSearchBar, closeSearchBar, openSearchBar]);

  const closeFabMenu = () => setFabMenuOpen(false);

  const openReview = (parsed: ParseResult) => {
    setReviewExpenses(parsed.expenses);
    setReviewParsing(false);
    setReviewVisible(true);
  };

  function resetReviewFlow() {
    setReviewExpenses(null);
    setReviewParsing(false);
    setReviewParsingKind("receipt");
  }

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(t("dashboard.photoPermissionTitle"), t("dashboard.photoPermissionBody"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
      allowsMultipleSelection: false,
      selectionLimit: 1,
    });
    if (result.canceled) return;
    const first = result.assets[0];
    if (!first?.base64) return;
    const { base64, mimeType } = first;
    setReviewExpenses(null);
    setReviewParsingKind("receipt");
    setReviewParsing(true);
    setReviewVisible(true);
    try {
      openReview(await parseImageBackend(base64!, mimeType ?? "image/jpeg"));
    } catch {
      setReviewVisible(false);
      resetReviewFlow();
      showAlert(t("common.error"), t("dashboard.receiptParseFailed"));
    }
  };

  /** Basılı tut: kayıt; bırak: durdur ve analiz et */
  const micPressIn = async () => {
    const result = await startRecording();
    if (result === "permission_denied") {
      showAlert(t("dashboard.micPermissionTitle"), t("dashboard.micPermissionBody"));
      return;
    }
    if (result === "failed") {
      showAlert(t("dashboard.recordingFailedTitle"), t("dashboard.recordingFailedBody"));
    }
  };

  const micPressOut = async () => {
    const uri = await stopRecording();
    if (!uri) {
      showAlert(t("dashboard.voiceCaptureFailedTitle"), t("dashboard.voiceCaptureFailedBody"));
      return;
    }
    setReviewExpenses(null);
    setReviewParsingKind("voice");
    setReviewParsing(true);
    setReviewVisible(true);
    try {
      const { readAsStringAsync } = await import("expo-file-system/legacy");
      const b64 = await readAsStringAsync(uri, { encoding: "base64" });
      const mimeType = mimeForRecordedAudioUri(uri);
      openReview(await parseAudioBackend(b64, mimeType, language));
    } catch (e) {
      setReviewVisible(false);
      resetReviewFlow();
      const details = e && typeof e === "object" && "details" in e ? (e as ApiError).details : null;
      showAlert(
        t("dashboard.voiceAnalysisFailedTitle"),
        userFacingApiMessage(details, t, "dashboard.voiceAnalysisFailedFallback", {
          unavailableKey: "errors.aiServiceUnavailable",
        }),
      );
    }
  };

  /** RNGH jesti: parlak kenara kayınca / kaydırma rekabetinde RN Pressable erken `onPressOut` verebiliyor. */
  const micPressInRef = useRef(micPressIn);
  const micPressOutRef = useRef(micPressOut);
  micPressInRef.current = micPressIn;
  micPressOutRef.current = micPressOut;

  const micHoldGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(0)
        .maxDistance(1000)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onStart(() => {
          void micPressInRef.current();
        })
        .onFinalize(() => {
          void micPressOutRef.current();
        }),
    [],
  );

  const searchTranslateY = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const langUi = language as Language;
  const currencySymbol = useMemo(
    () => currencySymbolFor(displayCurrency, langUi),
    [displayCurrency, langUi],
  );
  const fmt = useMemo(() => (n: number) => formatAmountDigits(n, langUi), [langUi]);
  const netAccent = totalNet >= 0 ? "#55efc4" : CORAL;
  /** Arama açıkken liste altına ekstra boşluk (hap liste üzerinde yüzer) */
  const searchStripExtra = showSearchBar ? 58 : 0;
  /** Alt yüzen şeridin kapladığı yükseklik — ScrollView içeriği bunun altına kaydırılabilsin */
  const floatingChromeHeight = showSearchBar ? 12 + searchStripExtra + bottomBarInset : bottomBarBlockHeight;
  const scrollBottomPad = floatingChromeHeight + 36;
  /** Klavye açıkken yüzen search/FAB şeridini klavyenin üstüne it. */
  const floatingBarBottom = showSearchBar ? keyboardInset : 0;
  /** Klavye açıkken arama hapının altına bottomBarInset vermek klavye ile arada büyük boşluk yaratıyordu. */
  const searchKeyboardOpen = showSearchBar && keyboardInset > 0;
  const searchFloatMarginTop = searchKeyboardOpen ? 0 : 12;
  const searchFloatMarginBottom = searchKeyboardOpen ? 0 : 10;
  const searchFloatPaddingBottom = searchKeyboardOpen ? 0 : bottomBarInset;

  const micRed = "#FF4757";
  const fabMenuBg = isDark ? "rgba(28,28,30,0.94)" : "rgba(255,255,255,0.96)";
  const fabIconTint = isDark ? "rgba(108,99,255,0.22)" : "rgba(108,99,255,0.18)";
  const searchPillBg = isDark ? "rgba(58, 58, 60, 0.92)" : "rgba(235, 235, 240, 0.96)";
  const searchPillBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  /** Alt sol: tek hap içinde + ve arama — düz siyah zemin, beyaz ikonlar */
  const fabSearchPillBg = "#000000";
  const fabSearchPillIcon = "#FFFFFF";

  /** Ayarlar satırı yüksekliği (ScrollView dışı sabit katmanla aynı — yapışkan başlıkta boşluk) */
  const settingsHeaderReserve = 8 + 38 + 4;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
      <ScrollView
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        onMomentumScrollEnd={onMomentumScrollEndLoadMore}
      >
        {/* Yapışkan: net tutar + harcama/gelir kutuları + tarih/liste filtreleri (ayarlar ScrollView dışında, dokunma çakışması yok) */}
        <View
          style={{
            backgroundColor: bg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: divider,
            paddingBottom: 12,
            paddingTop: settingsHeaderReserve,
          }}
        >
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: mutedColor, fontSize: 13, marginBottom: 2 }}>
              {t("dashboard.netBalanceCaption")}
            </Text>
            <Text style={{ color: mutedColor, fontSize: 11, marginBottom: 6, opacity: 0.9 }}>
              {t("dashboard.netBalanceHint")}
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
                <Text style={{ color: textColor, fontSize: 26, fontWeight: "700", marginLeft: 6 }}>
                  {currencySymbol}
                </Text>
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
                  {t("dashboard.spendingTileLabel")}
                </Text>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "700" }}>
                  - {fmt(totalExpenseOut)} {currencySymbol}
                </Text>
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
                  {t("dashboard.incomeTileLabel")}
                </Text>
                <Text style={{ color: totalIncomeIn > 0 ? "#55efc4" : mutedColor, fontSize: 15, fontWeight: "700" }}>
                  + {fmt(totalIncomeIn)} {currencySymbol}
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
            <Text style={{ color: mutedColor, fontSize: 13 }}>{t("dashboard.listFilterIn")}</Text>
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
              {activeList ? (
                <ListGlyph list={activeList} size={14} isDark={isDark} />
              ) : null}
              <Text
                style={{ color: textColor, fontSize: 13, fontWeight: "600", flexShrink: 1 }}
                numberOfLines={1}
              >
                {activeList ? displayExpenseListName(activeList.name, t) : t("lists.defaultPrivateList")}
              </Text>
              <Ionicons name="chevron-down" size={13} color={mutedColor} />
            </Pressable>
          </View>
        </View>

        {!searchNorm ? (
          <>
            <Text style={{ color: mutedColor, fontSize: 12, paddingHorizontal: 20, marginBottom: 8 }}>
              {txFlowFilter === "expense"
                ? t("dashboard.txHintExpenseOnly")
                : txFlowFilter === "income"
                  ? t("dashboard.txHintIncomeOnly")
                  : t("dashboard.txHintAll")}
            </Text>
            <CategorySpendScroller
              categories={homeCats}
              expenses={flowFilteredExpenses}
              selectedCategoryId={null}
              onSelectCategory={openCategoryDetail}
              onLongPressCategory={openCategoryDetail}
              isDark={isDark}
              currencySymbol={currencySymbol}
            />
          </>
        ) : null}

        <PendingBankTransactionsStrip
          items={pendingBankTransactions}
          bankAutomations={bankAutomations}
          isDark={isDark}
          language={language}
          onPressItem={(item: PendingBankTransaction) => {
            const desc = [item.title, item.body].filter(Boolean).join(" · ").slice(0, 450);
            throttledPush({
              pathname: "/add",
              params: { pendingId: item.id, bankPrefill: desc },
            });
          }}
          onDismiss={(id) => removePendingBankTransaction(id)}
        />

        {/* ── Transactions ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          {grouped.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 20 }}>
              <Text style={{ color: mutedColor, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>
                {searchNorm && listFiltered.length > 0
                  ? t("dashboard.emptySearchNoMatch")
                  : txFlowFilter === "expense"
                    ? t("dashboard.emptyNoExpensePeriod")
                    : txFlowFilter === "income"
                      ? t("dashboard.emptyNoIncomePeriod")
                      : t("dashboard.emptyNoTxPeriod")}
              </Text>
              {hintExpandPeriod && (
                <Pressable
                  onPress={() => setPeriodFilter({ kind: "all_time" })}
                  style={{
                    marginTop: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    backgroundColor: isDark ? "#252528" : "#e8e8ec",
                  }}
                >
                  <Text style={{ color: PURPLE, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
                    {t("dashboard.showAllTimeHint")}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.label} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>{group.label}</Text>
                  <Text style={{ color: mutedColor, fontSize: 13 }}>
                    {formatDayNetTotal(group.total, langUi, displayCurrency)}
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

        {isAuthenticated && expensesNextPagePath ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 8, alignItems: "stretch" }}>
            <Pressable
              onPress={() => void loadMoreExpenses()}
              disabled={expensesLoadingMore}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "#333" : "#ddd",
                backgroundColor: cardBg,
                opacity: expensesLoadingMore ? 0.7 : 1,
              }}
            >
              {expensesLoadingMore ? (
                <ActivityIndicator color={PURPLE} />
              ) : (
                <>
                  <Ionicons name="chevron-down-circle-outline" size={20} color={PURPLE} />
                  <Text style={{ color: textColor, fontSize: 15, fontWeight: "600" }}>
                    {t("dashboard.loadMoreTransactions")}
                  </Text>
                </>
              )}
            </Pressable>
            <Text style={{ color: mutedColor, fontSize: 11, textAlign: "center", marginTop: 8 }}>
              {t("dashboard.paginationHint")}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      </KeyboardAvoidingView>

      {/* Ayarlar: liste en altta iken yapışkan başlık + scroll katmanı Android'de dokunmayı yutabiliyordu. */}
      {/* Absolute çocuklar SafeAreaView padding'ini saymaz; üst inset + eski 8px ile scroll içiyle hizalı. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          paddingTop: insets.top + 8,
          paddingBottom: 4,
          paddingHorizontal: 20,
          flexDirection: "row",
          justifyContent: "flex-end",
          backgroundColor: bg,
          ...(Platform.OS === "android" ? { elevation: 24 } : {}),
        }}
      >
        <Pressable
          unstable_pressDelay={0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigateToSettings(router)}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="settings-outline" size={22} color={mutedColor} />
        </Pressable>
      </View>

      {/* Liste üzerinde yüzen alt kontroller (haracamaların üstünde); klavyede arama hapı yukarı */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: floatingBarBottom,
          zIndex: 30,
          backgroundColor: "transparent",
        }}
      >
        {showSearchBar ? (
          <Animated.View
            style={{
              marginHorizontal: 16,
              marginTop: searchFloatMarginTop,
              marginBottom: searchFloatMarginBottom,
              paddingBottom: searchFloatPaddingBottom,
              opacity: searchAnim,
              transform: [{ translateY: searchTranslateY }],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: searchPillBg,
                borderRadius: 28,
                paddingLeft: 18,
                paddingRight: 6,
                paddingVertical: Platform.OS === "ios" ? 11 : 9,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: searchPillBorder,
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOpacity: 0.22,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 8 },
                  },
                  android: { elevation: 6 },
                  default: {},
                }),
              }}
            >
              <TextInput
                ref={searchInputRef}
                value={transactionSearch}
                onChangeText={setTransactionSearch}
                placeholder={t("dashboard.searchPlaceholder")}
                placeholderTextColor={isDark ? "rgba(152, 152, 159, 1)" : "rgba(110, 110, 118, 1)"}
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: textColor,
                  fontSize: 17,
                  paddingVertical: Platform.OS === "ios" ? 6 : 8,
                }}
                returnKeyType="search"
                autoCorrect={false}
              />
              <Pressable
                onPress={closeSearchBar}
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 4,
                  flexShrink: 0,
                }}
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.closeSearchA11y")}
              >
                <Ionicons name="close" size={22} color={isDark ? "#ebebf0" : "#3a3a3c"} />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {!showSearchBar ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingBottom: bottomBarInset,
              paddingTop: 12,
              backgroundColor: "transparent",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: fabSearchPillBg,
                borderRadius: 28,
                paddingLeft: 6,
                paddingRight: 8,
                paddingVertical: 8,
              }}
            >
              <Pressable
                onPress={() => setFabMenuOpen((o) => !o)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                style={{
                  width: 42,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.addMenuA11y")}
              >
                <Ionicons name="add" size={26} color={fabSearchPillIcon} />
              </Pressable>
              <Pressable
                onPress={toggleSearchBar}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                style={{
                  width: 42,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel={t("dashboard.searchTransactionsA11y")}
              >
                <Ionicons name="search-outline" size={22} color={fabSearchPillIcon} />
              </Pressable>
            </View>

            <View
              pointerEvents="box-none"
              style={{
                width: 80,
                height: 80,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: isRecording ? "rgba(255, 71, 87, 0.26)" : "transparent",
                  transform: [{ scale: isRecording ? 1.06 : 1 }],
                }}
              />
              <GestureDetector gesture={micHoldGesture}>
                <View
                  collapsable={false}
                  accessibilityRole="button"
                  accessibilityLabel={t("dashboard.voiceExpenseA11y")}
                  accessibilityHint={t("dashboard.voiceHoldHint")}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isRecording ? MICFAB_FILL_ACTIVE : micRed,
                    alignItems: "center",
                    justifyContent: "center",
                    ...Platform.select({
                      ios: {
                        shadowColor: "#FF3949",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 10,
                      },
                      android: { elevation: 6 },
                      default: {},
                    }),
                  }}
                >
                  <Ionicons name="mic" size={30} color="#FFFFFF" />
                </View>
              </GestureDetector>
            </View>
          </View>
        ) : null}
      </View>

      {/* + hızlı menü */}
      {fabMenuOpen ? (
        <>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)", zIndex: 40 }]}
            onPress={closeFabMenu}
          />
          <View
            style={{
              position: "absolute",
              left: 18,
              bottom: bottomBarBlockHeight + 12,
              zIndex: 50,
              maxWidth: "92%",
              width: 280,
            }}
            pointerEvents="box-none"
          >
            <View
              style={{
                backgroundColor: fabMenuBg,
                borderRadius: 20,
                padding: 8,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOpacity: 0.35,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 10 },
                  },
                  android: { elevation: 14 },
                  default: {},
                }),
              }}
            >
              <Pressable
                onPress={() => {
                  closeFabMenu();
                  router.push("/add" as any);
                }}
                style={({ pressed }) => ({
                  position: "relative",
                  paddingVertical: 12,
                  paddingLeft: 12,
                  paddingRight: 40,
                  borderRadius: 14,
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      marginRight: 12,
                      flexShrink: 0,
                      backgroundColor: fabIconTint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="create-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
                    <Text numberOfLines={1} style={{ color: textColor, fontSize: 16, fontWeight: "700" }}>
                      {t("dashboard.addManually")}
                    </Text>
                    <Text numberOfLines={2} style={{ color: mutedColor, fontSize: 12, marginTop: 2 }}>
                      {t("dashboard.addManuallySubtitle")}
                    </Text>
                  </View>
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 0,
                    bottom: 0,
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                </View>
              </Pressable>

              <View style={{ height: 6 }} />

              <Pressable
                onPress={() => {
                  closeFabMenu();
                  void handleImagePick();
                }}
                style={({ pressed }) => ({
                  position: "relative",
                  paddingVertical: 12,
                  paddingLeft: 12,
                  paddingRight: 40,
                  borderRadius: 14,
                  backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)") : "transparent",
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 13,
                      marginRight: 12,
                      flexShrink: 0,
                      backgroundColor: fabIconTint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="image-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
                    <Text numberOfLines={1} style={{ color: textColor, fontSize: 16, fontWeight: "700" }}>
                      {t("dashboard.uploadImage")}
                    </Text>
                    <Text numberOfLines={2} style={{ color: mutedColor, fontSize: 12, marginTop: 2 }}>
                      {t("dashboard.uploadImageSubtitle")}
                    </Text>
                  </View>
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 0,
                    bottom: 0,
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={mutedColor} />
                </View>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}

      <MonthPickerModal
        visible={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        onApply={setPeriodFilter}
        periodFilter={periodFilter}
        expenses={expenses}
        activeListId={activeListId}
        language={language}
        displayCurrency={displayCurrency}
        isDark={isDark}
      />

      <ListsPickerModal
        visible={listsModalOpen}
        onClose={() => setListsModalOpen(false)}
        lists={lists}
        activeListId={activeListId}
        onSelectList={setActiveList}
        onAddList={addList}
        onEditLists={() => navigateToSettings(router)}
        isDark={isDark}
        language={language}
      />

      <ReviewExpenseModal
        visible={reviewVisible}
        parsing={reviewParsing}
        parsingKind={reviewParsingKind}
        parsedExpenses={reviewExpenses}
        onClose={() => {
          setReviewVisible(false);
          resetReviewFlow();
        }}
        onSaved={() => {
          setReviewVisible(false);
          resetReviewFlow();
          setTimeout(() => {
            flushBudgetThresholdCheck(useStore.getState);
          }, 500);
        }}
      />
    </SafeAreaView>
  );
}
