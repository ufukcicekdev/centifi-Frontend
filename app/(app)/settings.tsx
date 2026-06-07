import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Modal,
  Platform,
  Linking,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  InteractionManager,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardInset, keyboardHeightFromEvent } from "../../hooks/useKeyboardInset";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../../store/useStore";
import { LANGUAGES, Language } from "../../i18n";
import {
  BUILTIN_CATEGORIES,
  CustomCategory,
  getCategoryMeta,
  PRESET_BANK_APP_IDS,
  PRESET_BANK_PACKAGES,
  type ExpenseList,
} from "../../constants/mockData";
import { EmojiPickerSheet, ListEmojiPickerSheet } from "../../components/CategoryEditorModal";
import {
  OnboardingCategoryGridModal,
  OnboardingCategoryEditModal,
  isBuiltinCategoryId,
} from "../../components/onboarding/OnboardingCategoryManageModals";
import { OnboardingAddCategoryFullScreenModal } from "../../components/onboarding/OnboardingAddCategoryFullScreenModal";
import { CurrencyPickerModal } from "../../components/CurrencyPickerModal";
import { getCurrencyLabel } from "../../lib/currencies";
import EmojiText from "../../components/EmojiText";
import { currencySymbolFor } from "../../lib/formatMoney";
import { deleteMe, lookupPlayStoreMeta, updateMe, type BackendUser } from "../../lib/backend";
import { accountDeletionMailto, centifiLegalUrls } from "../../lib/legalUrls";
import { extractPlayStorePackageId, playStoreDetailsUrl } from "../../lib/playStoreUrl";
import type { ApiError } from "../../lib/api";
import { isValidEmail } from "../../lib/isValidEmail";
import { ensureLocalNotificationPermissions } from "../../lib/localNotifications";
import { clearRouterPushCooldown } from "../../hooks/useThrottledRouter";
import { useAppDialog } from "../../context/AppDialogContext";
import { displayExpenseListName, displayListEmoji } from "../../lib/listDisplayName";
import ListGlyph from "../../components/ListGlyph";
import { EmojiPreviewBadge } from "../../components/EmojiPickerCell";
import LanguageFlag from "../../components/LanguageFlag";
import {
  actionBarInnerBottomPad,
  keyboardLiftPaddingBottom,
  expenseFormMainKeyboardLiftPad,
} from "../../lib/keyboardFooterChrome";

const PURPLE = "#6C63FF";
const DESTRUCTIVE = "#FF453A";
/** Kategori düzenleme alt şeridi ile aynı silme rengi */
const CORAL = "#FF6B6B";

function splitDisplayName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

function firstFieldError(details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const d = details as Record<string, unknown>;
  for (const k of Object.keys(d)) {
    const v = d[k];
    if (Array.isArray(v) && v.length > 0 && v[0]) return String(v[0]);
  }
  return undefined;
}

const GUTTER = 16;
const ICON_COL = 44;
const ICON_GAP = 12;
/** Satırda ikon yokken metni ikonlu satırlarla hizalamak için sol boşluk */
const CONTENT_INSET = GUTTER + ICON_COL + ICON_GAP;

// ── layout helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ label, isDark, first }: { label: string; isDark: boolean; first?: boolean }) {
  return (
    <Text
      style={{
        color: isDark ? "#6b6b70" : "#888",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: 8,
        marginTop: first ? 4 : 20,
      }}
    >
      {label}
    </Text>
  );
}

function Card({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <View
      style={{
        backgroundColor: isDark ? "#1c1c1e" : "#fff",
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function SettingsRow({
  isDark,
  icon,
  leading,
  iconTint,
  title,
  subtitle,
  right,
  onPress,
  dividerTop,
  destructive,
}: {
  isDark: boolean;
  /** `leading` yoksa zorunlu */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Varsa sol sütunda ikon yerine özel içerik (ör. liste emojisi) */
  leading?: React.ReactNode;
  iconTint?: string;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  /** İlk satırda üst çizgi yok */
  dividerTop?: boolean;
  destructive?: boolean;
}) {
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const divider = isDark ? "#3a3a3c" : "#efefef";
  const tint = destructive ? DESTRUCTIVE : iconTint ?? mutedColor;
  const titleColor = destructive ? DESTRUCTIVE : textColor;

  const rightSlot =
    right != null ? (
      <View style={{ flexShrink: 0, marginLeft: 8, justifyContent: "center" }}>{right}</View>
    ) : null;

  const body = (
    <>
      <View
        style={{
          width: ICON_COL,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {leading ?? <Ionicons name={icon ?? "ellipse-outline"} size={22} color={tint} />}
      </View>
      <View style={{ flex: 1, marginLeft: ICON_GAP, minWidth: 0, justifyContent: "center" }}>
        <Text style={{ color: titleColor, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && subtitle !== "" ? (
          typeof subtitle === "string" ? (
            <Text style={{ color: mutedColor, fontSize: 13, marginTop: 3 }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : (
            <View style={{ marginTop: 3, flexDirection: "row", alignItems: "center", gap: 6 }}>{subtitle}</View>
          )
        ) : null}
      </View>
      {rightSlot}
    </>
  );

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: GUTTER,
    paddingVertical: subtitle ? 11 : 13,
    borderTopWidth: dividerTop ? StyleSheet.hairlineWidth : 0,
    borderTopColor: divider,
    width: "100%" as const,
  };

  return onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
      accessibilityRole="button"
    >
      <View style={rowStyle}>{body}</View>
    </Pressable>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

function EmojiLeading({ emoji, isDark }: { emoji: string; isDark: boolean }) {
  return (
    <View
      style={{
        width: ICON_COL,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <EmojiText emoji={emoji} size={22} />
      </View>
    </View>
  );
}

function StoreIconOrEmoji({
  emoji,
  iconUrl,
  isDark,
}: {
  emoji: string;
  iconUrl?: string | null;
  isDark: boolean;
}) {
  const u = iconUrl?.trim();
  if (u && /^https?:\/\//i.test(u)) {
    return (
      <View
        style={{
          width: ICON_COL,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={{ uri: u }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7",
          }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }
  return <EmojiLeading emoji={emoji} isDark={isDark} />;
}

function fallbackAppLabelFromPackage(pkg: string): string {
  const parts = pkg.split(".").filter(Boolean);
  const last = parts[parts.length - 1] ?? pkg;
  if (!last) return pkg;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

// ── Bank automation modal ─────────────────────────────────────────────────────

function AddBankModal({
  visible,
  onSave,
  onClose,
  isDark,
  isAuthenticated,
}: {
  visible: boolean;
  onSave: (
    data: {
      name: string;
      emoji: string;
      storeUrl: string;
      packageName: string;
      enabled: boolean;
      iconUrl?: string;
    },
  ) => void | Promise<void>;
  onClose: () => void;
  isDark: boolean;
  isAuthenticated: boolean;
}) {
  const { t } = useTranslation();
  const { showAlert } = useAppDialog();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  const [bankKeyboardH, setBankKeyboardH] = useState(0);
  const [bankModalBaselineWinH, setBankModalBaselineWinH] = useState(0);
  const [storeUrl, setStoreUrl] = useState("");
  const [manualName, setManualName] = useState("");
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [resolvedPkg, setResolvedPkg] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolvedIcon, setResolvedIcon] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg = isDark ? "#0f0f0f" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const inputBg = isDark ? "#111" : "#f0f0f0";
  const borderColor = isDark ? "#2a2a2a" : "#e0e0e0";
  const bankScreenBottomBarBg = isDark ? "#0a0a0a" : "#fff";
  const bankScreenSaveBtnBg = isDark ? "#2c2c2e" : "#e2e2e6";
  const bankScreenSaveLabel = isDark ? "#fff" : "#111";

  const reset = React.useCallback(() => {
    setStoreUrl("");
    setManualName("");
    setShowNameEdit(false);
    setResolvedPkg("");
    setResolvedName("");
    setResolvedIcon("");
    setLookupLoading(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  React.useEffect(() => {
    if (!visible) {
      setBankKeyboardH(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvt, (e) =>
      setBankKeyboardH(keyboardHeightFromEvent(e)),
    );
    const subHide = Keyboard.addListener(hideEvt, () => setBankKeyboardH(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) {
      setBankModalBaselineWinH(0);
      return;
    }
    setBankModalBaselineWinH((prev) => (prev === 0 ? winH : prev));
  }, [visible, winH]);

  const bankModalLayoutKbd =
    visible && bankModalBaselineWinH > 0 ? Math.max(0, bankModalBaselineWinH - winH) : 0;
  const bankKbdFromEvents = visible ? Math.max(keyboardInset, bankKeyboardH) : 0;
  const bankModalKbdMax = Math.max(bankKbdFromEvents, bankModalLayoutKbd);
  const bankModalPadBottom =
    visible && bankModalKbdMax > 0
      ? Math.max(0, keyboardLiftPaddingBottom(bankModalKbdMax) - bankModalLayoutKbd)
      : 0;

  React.useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const trimmed = storeUrl.trim();
        if (!trimmed) {
          setResolvedPkg("");
          setResolvedName("");
          setResolvedIcon("");
          return;
        }
        const pkg = extractPlayStorePackageId(trimmed);
        if (!pkg) {
          setResolvedPkg("");
          setResolvedName("");
          setResolvedIcon("");
          return;
        }
        setResolvedPkg(pkg);
        setLookupLoading(true);
        try {
          if (isAuthenticated) {
            const meta = trimmed.includes("http")
              ? await lookupPlayStoreMeta({ store_url: trimmed })
              : await lookupPlayStoreMeta({ package: pkg });
            setResolvedName((meta.name ?? "").trim() || fallbackAppLabelFromPackage(meta.package_name || pkg));
            setResolvedIcon((meta.icon_url ?? "").trim());
          } else if (Platform.OS === "android") {
            const { fetchPlayStoreMetaClient } = await import("../../lib/playStoreClientLookup.android");
            const meta = await fetchPlayStoreMetaClient(pkg);
            setResolvedName((meta.name ?? "").trim() || fallbackAppLabelFromPackage(pkg));
            setResolvedIcon((meta.iconUrl ?? "").trim());
          }
        } catch {
          setResolvedName(fallbackAppLabelFromPackage(pkg));
          setResolvedIcon("");
        } finally {
          setLookupLoading(false);
        }
      })();
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [storeUrl, visible, isAuthenticated]);

  const displayName = manualName.trim() || resolvedName.trim();
  const previewIcon = resolvedIcon;

  const handleSave = async () => {
    const trimmedUrl = storeUrl.trim();
    const pkg = resolvedPkg || extractPlayStorePackageId(trimmedUrl);
    if (!pkg) {
      showAlert(t("common.error"), t("settings.bankInvalidStoreUrl"));
      return;
    }
    const name = displayName.trim() || fallbackAppLabelFromPackage(pkg);
    if (!name) {
      showAlert(t("common.error"), t("settings.bankFillFields"));
      return;
    }
    const normalizedStoreUrl =
      trimmedUrl.includes("http") ? trimmedUrl : playStoreDetailsUrl(pkg);
    try {
      await Promise.resolve(
        onSave({
          name,
          emoji: "🏦",
          storeUrl: normalizedStoreUrl,
          packageName: pkg,
          enabled: true,
          ...(previewIcon ? { iconUrl: previewIcon } : {}),
        }),
      );
      onClose();
    } catch {
      showAlert(t("common.error"), t("settings.bankAddFailed"));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "left", "right"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color={textColor} />
          </Pressable>
          <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>
            {t("settings.addBankModalTitle")}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ flex: 1, paddingBottom: bankModalPadBottom }}>
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: 32,
            }}
          >
            <Text style={{ color: mutedColor, fontSize: 14, marginBottom: 18, lineHeight: 20 }}>
              {t("settings.addBankModalBody")}
            </Text>

            <View
              style={{
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor,
                marginBottom: 14,
              }}
            >
              <TextInput
                value={storeUrl}
                onChangeText={setStoreUrl}
                placeholder={t("settings.bankStoreUrlPlaceholder")}
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ color: textColor, fontSize: 16, paddingVertical: 14 }}
              />
            </View>

            {lookupLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <ActivityIndicator color={PURPLE} />
                <Text style={{ color: mutedColor, fontSize: 13 }}>{t("settings.bankFetchingMeta")}</Text>
              </View>
            ) : resolvedPkg ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#252528" : "#f0f0f5",
                }}
              >
                <StoreIconOrEmoji emoji="🏦" iconUrl={previewIcon} isDark={isDark} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: "700" }} numberOfLines={2}>
                    {displayName || resolvedName || fallbackAppLabelFromPackage(resolvedPkg)}
                  </Text>
                  <Text style={{ color: mutedColor, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                    {resolvedPkg}
                  </Text>
                </View>
              </View>
            ) : null}

            {showNameEdit ? (
              <View
                style={{
                  backgroundColor: inputBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor,
                  marginBottom: 12,
                }}
              >
                <TextInput
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder={t("settings.bankNamePlaceholder")}
                  placeholderTextColor={mutedColor}
                  style={{ color: textColor, fontSize: 16, paddingVertical: 14 }}
                />
              </View>
            ) : null}

            <Pressable
              onPress={() => setShowNameEdit((v) => !v)}
              style={{ marginBottom: 8, alignSelf: "flex-start" }}
            >
              <Text style={{ color: PURPLE, fontSize: 14, fontWeight: "600" }}>
                {showNameEdit ? t("settings.bankHideNameEdit") : t("settings.bankEditNameHint")}
              </Text>
            </Pressable>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: actionBarInnerBottomPad(bankModalKbdMax, insets.bottom),
              backgroundColor: bankScreenBottomBarBg,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isDark ? "#222" : "#e5e5e5",
            }}
          >
            <Pressable
              onPress={() => void handleSave()}
              style={{
                width: "100%",
                alignSelf: "stretch",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: bankScreenSaveBtnBg,
                borderRadius: 16,
                paddingVertical: 16,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("common.save")}
            >
              <Ionicons name="checkmark-circle" size={22} color={bankScreenSaveLabel} />
              <Text style={{ color: bankScreenSaveLabel, fontSize: 17, fontWeight: "700" }}>
                {t("common.save")}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm } = useAppDialog();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      return () => {
        clearRouterPushCooldown();
      };
    }, []),
  );

  const [bankListenerOn, setBankListenerOn] = useState(false);

  /** Bildirim sync + banka listener sorgusu ilk kareyi geciktirmesin (liste/transition bittikten sonra). */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const handle = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        void useStore.getState().syncNotificationsWithOsPermission();
        if (cancelled || Platform.OS !== "android") return;
        void (async () => {
          try {
            const { isBankNotificationListenerEnabled } = await import("../../lib/bankNotificationAndroid");
            const on = await isBankNotificationListenerEnabled();
            if (!cancelled) setBankListenerOn(on);
          } catch {
            if (!cancelled) setBankListenerOn(false);
          }
        })();
      });
      return () => {
        cancelled = true;
        handle.cancel?.();
      };
    }, []),
  );

  const {
    isDark, toggleTheme, language, setLanguage,
    displayCurrency, setDisplayCurrency,
    notificationsEnabled, setNotificationsEnabled,
    customCategories,
    addCategory,
    updateCategory,
    removeCategory,
    lists,
    addList,
    updateList,
    removeList,
    bankAutomations,
    addBankAutomation,
    toggleBankAutomation,
    removeBankAutomation,
    logout,
    expenses,
    categoryDisplayOverrides,
    setCategoryDisplayOverride,
    isAuthenticated,
    user,
    setUser,
  } = useStore(
    useShallow((s) => ({
      isDark: s.isDark,
      toggleTheme: s.toggleTheme,
      language: s.language,
      setLanguage: s.setLanguage,
      displayCurrency: s.displayCurrency,
      setDisplayCurrency: s.setDisplayCurrency,
      notificationsEnabled: s.notificationsEnabled,
      setNotificationsEnabled: s.setNotificationsEnabled,
      customCategories: s.customCategories,
      addCategory: s.addCategory,
      updateCategory: s.updateCategory,
      removeCategory: s.removeCategory,
      lists: s.lists,
      addList: s.addList,
      updateList: s.updateList,
      removeList: s.removeList,
      bankAutomations: s.bankAutomations,
      addBankAutomation: s.addBankAutomation,
      toggleBankAutomation: s.toggleBankAutomation,
      removeBankAutomation: s.removeBankAutomation,
      logout: s.logout,
      expenses: s.expenses,
      categoryDisplayOverrides: s.categoryDisplayOverrides,
      setCategoryDisplayOverride: s.setCategoryDisplayOverride,
      isAuthenticated: s.isAuthenticated,
      user: s.user,
      setUser: s.setUser,
    })),
  );

  const [showLangModal, setShowLangModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [manageListOpen, setManageListOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const reopenListAfterAdd = useRef(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [editingList, setEditingList] = useState<ExpenseList | null>(null);
  const [editListName, setEditListName] = useState("");
  const [editListEmoji, setEditListEmoji] = useState("📋");
  const [listEmojiPickerOpen, setListEmojiPickerOpen] = useState(false);
  const [savingListEdit, setSavingListEdit] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  const win = useWindowDimensions();
  const [profileEmail, setProfileEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const listEditKeyboardLiftPad = expenseFormMainKeyboardLiftPad(keyboardInset);
  const settingsScrollRef = useRef<ScrollView>(null);

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const cardBg = isDark ? "#1a1a1a" : "#fff";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  const inputBg = isDark ? "#111" : "#f5f5f5";
  const divider = isDark ? "#2a2a2a" : "#efefef";

  useEffect(() => {
    if (showProfileModal && user) {
      setProfileEmail(user.email);
      setProfileName(user.name);
    }
  }, [showProfileModal, user]);

  const allCats = useMemo(() => [...BUILTIN_CATEGORIES, ...customCategories], [customCategories]);

  const editingResolved = useMemo((): CustomCategory | null => {
    if (!editCategoryId) return null;
    const base = allCats.find((c) => c.id === editCategoryId);
    if (!base) return null;
    const m = getCategoryMeta(editCategoryId, customCategories, categoryDisplayOverrides);
    return { ...base, name: m.name, emoji: m.emoji, color: m.color, bgColor: m.bgColor };
  }, [editCategoryId, allCats, customCategories, categoryDisplayOverrides]);

  const editHasTransactions =
    !!editCategoryId && expenses.some((e) => e.category === editCategoryId);

  const closeCategoryEdit = () => {
    setEditCategoryId(null);
    setManageListOpen(true);
  };

  const handleCategoryEditSave = (payload: {
    name: string;
    emoji: string;
    color: string;
    bgColor: string;
  }) => {
    if (!editCategoryId) return;
    if (isBuiltinCategoryId(editCategoryId)) {
      setCategoryDisplayOverride(editCategoryId, payload);
      closeCategoryEdit();
      return;
    }
    void updateCategory(editCategoryId, payload)
      .then(() => closeCategoryEdit())
      .catch(() => showAlert(t("common.error"), t("settings.categorySaveFailed")));
  };

  const handleCategoryDeleteConfirm = () => {
    if (!editCategoryId || isBuiltinCategoryId(editCategoryId)) return;
    void removeCategory(editCategoryId)
      .then(() => closeCategoryEdit())
      .catch(() => showAlert(t("common.error"), t("settings.categoryDeleteFailed")));
  };

  const openCategoryEdit = (id: string) => {
    setManageListOpen(false);
    setEditCategoryId(id);
  };

  const catManageLabels = {
    title: t("settings.chooseCategoriesTitle"),
    addCategory: t("settings.addCategory"),
  };

  const catEditLabels = {
    delete: t("common.delete"),
    save: t("common.save"),
    cannotDeleteBuiltin: t("settings.cannotDeleteBuiltinCategory"),
    cannotDeleteHasTx: t("settings.cannotDeleteCategoryHasTransactions"),
    namePlaceholder: t("settings.categoryNamePlaceholder"),
  };

  const closeAddCategoryModal = () => {
    setShowCatModal(false);
    if (reopenListAfterAdd.current) {
      setManageListOpen(true);
      reopenListAfterAdd.current = false;
    }
  };

  const langMeta = LANGUAGES[language as Language];

  const currencySubtitle = useMemo(
    () =>
      `${displayCurrency} — ${getCurrencyLabel(displayCurrency, i18n.resolvedLanguage ?? i18n.language)}`,
    [displayCurrency, i18n.language, i18n.resolvedLanguage],
  );

  const appVersion =
    (Constants as any).nativeAppVersion ??
    Constants.expoConfig?.version ??
    (Constants as any).manifest?.version ??
    "1.0.0";
  const buildVersion =
    (Constants as any).nativeBuildVersion ??
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    (Constants.expoConfig as any)?.android?.versionCode ??
    "";
  const supportEmail = "info@centifi.app";
  const websiteUrl = "https://centifi.app";

  const handleSaveProfile = async () => {
    if (!user) return;
    const nameTrim = profileName.trim();
    if (!nameTrim) {
      showAlert(t("common.error"), t("settings.nameRequired"));
      return;
    }
    if (!profileEmail.trim()) {
      showAlert(t("common.error"), t("settings.emailRequired"));
      return;
    }
    if (!isValidEmail(profileEmail)) {
      showAlert(t("common.error"), t("settings.emailInvalid"));
      return;
    }
    const trimmedEmail = profileEmail.trim().toLowerCase();
    const emailChanged = trimmedEmail !== user.email.toLowerCase();
    const nameChanged = nameTrim !== user.name.trim();
    if (!emailChanged && !nameChanged) return;

    const { first_name, last_name } = splitDisplayName(profileName);
    const patch: Partial<BackendUser> = {};
    if (emailChanged) patch.email = trimmedEmail;
    if (nameChanged) {
      patch.first_name = first_name;
      patch.last_name = last_name;
    }

    setSavingProfile(true);
    try {
      const me = await updateMe(patch);
      const bu = me as BackendUser;
      const displayName =
        [bu.first_name, bu.last_name].filter(Boolean).join(" ").trim() || bu.username;
      setUser({
        uid: String(bu.id),
        name: displayName,
        email: bu.email,
        photo: null,
      });
    } catch (e: unknown) {
      const details = (e as ApiError)?.details;
      const serverMsg = firstFieldError(details);
      showAlert(t("common.error"), serverMsg ?? t("settings.profileSaveFailed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const emailTrim = profileEmail.trim();
  const emailEmpty = emailTrim.length === 0;
  const emailDirty = !!(user && emailTrim.toLowerCase() !== user.email.toLowerCase());
  const nameTrim = profileName.trim();
  const nameEmpty = nameTrim.length === 0;
  const nameDirty = !!(user && nameTrim !== user.name.trim());
  const emailFormatOk = isValidEmail(profileEmail);
  const emailShowError = !!(user && emailDirty && (!emailFormatOk || emailEmpty));
  const nameShowError = !!(user && nameDirty && nameEmpty);
  const profileDirty = !!(user && (emailDirty || nameDirty));
  const profileValid = !emailEmpty && emailFormatOk && !nameEmpty;
  const profileSaveReady = !!(user && profileDirty && profileValid && !savingProfile);

  const listEditTrim = editListName.trim();
  const listEditValid = listEditTrim.length > 0;
  const storedListEmojiNorm =
    editingList ? ((editingList.emoji ?? "").trim() || "📋") : "";
  const editListEmojiNorm = editListEmoji.trim() || "📋";
  const listEditDirty = !!(
    editingList &&
    (listEditTrim !== editingList.name.trim() || editListEmojiNorm !== storedListEmojiNorm)
  );
  const listEditSaveReady = addingList
    ? listEditValid && !savingListEdit
    : !!(editingList && listEditValid && listEditDirty && !savingListEdit && !deletingList);

  const editListExpenseCount = useMemo(() => {
    if (!editingList) return 0;
    return expenses.filter((e) => e.listId === editingList.id).length;
  }, [editingList, expenses]);

  const canDeleteEditedList =
    !!editingList &&
    editingList.id !== "private" &&
    !editingList.isDefault &&
    editListExpenseCount === 0;

  const handleSaveListEdit = async () => {
    if (!editingList && !addingList) return;
    const name = editListName.trim();
    if (!name) {
      showAlert(t("common.error"), t("settings.listNameRequired"));
      return;
    }
    setSavingListEdit(true);
    try {
      const rawEmoji = editListEmoji.trim();
      const emojiForStore = rawEmoji === "" || rawEmoji === "📋" ? "" : rawEmoji;
      if (addingList) {
        await addList(name, emojiForStore);
        setAddingList(false);
      } else if (editingList) {
        await updateList(editingList.id, name, emojiForStore);
        setEditingList(null);
      }
      setEditListName("");
      setEditListEmoji("📋");
      setListEmojiPickerOpen(false);
    } catch {
      showAlert(
        t("common.error"),
        addingList ? t("settings.listSaveFailed") : t("settings.listUpdateFailed"),
      );
    } finally {
      setSavingListEdit(false);
    }
  };

  const handleConfirmDeleteEditedList = async () => {
    if (!editingList || !canDeleteEditedList) return;
    const ok = await showConfirm({
      title: t("settings.deleteListConfirmTitle"),
      message: t("settings.deleteListConfirmMessage"),
      destructive: true,
      confirmText: t("settings.deleteList"),
    });
    if (!ok) return;
    setDeletingList(true);
    try {
      await removeList(editingList.id);
      setEditingList(null);
      setEditListName("");
      setEditListEmoji("📋");
      setListEmojiPickerOpen(false);
    } catch {
      showAlert(t("common.error"), t("settings.listDeleteFailed"));
    } finally {
      setDeletingList(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        /** Android: `adjustResize` already handles keyboard; this wrapper can cause scroll jitter. */
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
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
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        ref={settingsScrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        /** Android: klavye açıkken altta ekstra kaydırma alanı (özellikle “Yeni liste”). */
        contentContainerStyle={{
          paddingHorizontal: GUTTER,
          paddingBottom:
            24 +
            Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0) +
            (Platform.OS === "android" ? keyboardInset : 0),
        }}
      >

        {/* ACCOUNT */}
        <SectionLabel label={t("settings.account")} isDark={isDark} first />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="person-outline"
            title={t("settings.profile")}
            subtitle={isAuthenticated && user ? user.email : t("settings.accountNotSignedIn")}
            dividerTop={false}
            onPress={() => setShowProfileModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          {isAuthenticated ? (
            <SettingsRow
              isDark={isDark}
              icon="key-outline"
              title={t("settings.changePassword")}
              subtitle={user?.hasPassword ? t("settings.changePasswordSubtitle") : t("settings.changePasswordSubtitleSet")}
              dividerTop
              onPress={() => router.push("/(app)/change-password")}
              right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
            />
          ) : null}
          <SettingsRow
            isDark={isDark}
            icon="document-text-outline"
            title={t("settings.privacyPolicy")}
            dividerTop
            onPress={() => void Linking.openURL(centifiLegalUrls(language).privacy)}
            right={<Ionicons name="open-outline" size={18} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="reader-outline"
            title={t("settings.termsOfUse")}
            dividerTop
            onPress={() => void Linking.openURL(centifiLegalUrls(language).terms)}
            right={<Ionicons name="open-outline" size={18} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="information-circle-outline"
            title={t("settings.about")}
            dividerTop
            onPress={() => setShowAboutModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          {isAuthenticated ? (
            <SettingsRow
              isDark={isDark}
              icon="trash-outline"
              title={t("settings.deleteAccount")}
              subtitle={t("settings.deleteAccountSubtitle")}
              dividerTop
              destructive
              onPress={() => {
                void (async () => {
                  const ok = await showConfirm({
                    title: t("settings.deleteAccountConfirmTitle"),
                    message: t("settings.deleteAccountConfirmMessage"),
                    confirmText: t("settings.deleteAccountConfirmButton"),
                    cancelText: t("common.cancel"),
                    destructive: true,
                    confirmIcon: "trash-outline",
                  });
                  if (!ok) return;
                  try {
                    await deleteMe();
                    showAlert(t("settings.deleteAccountSuccessTitle"), t("settings.deleteAccountSuccessBody"));
                    logout();
                  } catch {
                    showAlert(t("common.error"), t("settings.deleteAccountFailed"));
                  }
                })();
              }}
            />
          ) : null}
          {isAuthenticated ? (
            <SettingsRow
              isDark={isDark}
              icon="mail-outline"
              title={t("settings.deleteAccountByEmail")}
              subtitle={t("settings.deleteAccountByEmailSubtitle")}
              dividerTop
              onPress={() => void Linking.openURL(accountDeletionMailto(user?.email))}
              right={<Ionicons name="open-outline" size={18} color={mutedColor} />}
            />
          ) : null}
          <SettingsRow
            isDark={isDark}
            icon="log-out-outline"
            title={t("settings.logOut")}
            dividerTop
            destructive
            onPress={() => {
              void (async () => {
                const ok = await showConfirm({
                  title: t("settings.logOut"),
                  message: t("settings.logOutConfirm"),
                  confirmText: t("settings.logOut"),
                  cancelText: t("common.cancel"),
                  destructive: true,
                  confirmIcon: "log-out-outline",
                });
                if (ok) logout();
              })();
            }}
          />
        </Card>

        {/* APPEARANCE */}
        <SectionLabel label={t("settings.appearance")} isDark={isDark} />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="moon-outline"
            title={t("settings.darkMode")}
            dividerTop={false}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#3a3a3c", true: PURPLE }}
                thumbColor="#fff"
                ios_backgroundColor="#3a3a3c"
              />
            }
          />
          <SettingsRow
            isDark={isDark}
            icon="language-outline"
            title={t("settings.language")}
            subtitle={
              <>
                <LanguageFlag language={language as Language} size={18} isDark={isDark} />
                <Text style={{ color: mutedColor, fontSize: 13 }} numberOfLines={1}>
                  {langMeta.nativeLabel}
                </Text>
              </>
            }
            dividerTop
            onPress={() => setShowLangModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="logo-usd"
            title={t("settings.currency")}
            subtitle={currencySubtitle}
            dividerTop
            onPress={() => setShowCurrencyModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>

        {/* BUDGET */}
        <SectionLabel label={t("settings.budget")} isDark={isDark} />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="pie-chart-outline"
            title={t("settings.categoryBudgets")}
            dividerTop={false}
            onPress={() => {
              if (!isAuthenticated) {
                showAlert(t("budgets.signInRequiredTitle"), t("budgets.signInRequiredBody"));
                return;
              }
              router.push("/budgets");
            }}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>

        {/* CATEGORIES */}
        <SectionLabel label={t("settings.categories")} isDark={isDark} />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="color-palette-outline"
            title={t("settings.editCategories")}
            dividerTop={false}
            onPress={() => setManageListOpen(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>

        {/* LISTS */}
        <SectionLabel label={t("settings.lists")} isDark={isDark} />
        <Card isDark={isDark}>
          {lists.map((list, idx) => {
            const editable = !list.isDefault;
            return (
              <SettingsRow
                key={list.id}
                isDark={isDark}
                leading={
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: isDark ? "#2c2c2e" : "#f2f2f7",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ListGlyph list={list} size={20} isDark={isDark} />
                  </View>
                }
                title={displayExpenseListName(list.name, t)}
                dividerTop={idx !== 0}
                onPress={
                  editable
                    ? () => {
                        setEditingList(list);
                        setEditListName(list.name);
                        setEditListEmoji(displayListEmoji(list));
                      }
                    : undefined
                }
                right={
                  editable ? <Ionicons name="chevron-forward" size={20} color={mutedColor} /> : undefined
                }
              />
            );
          })}
          <SettingsRow
            isDark={isDark}
            icon="add-circle-outline"
            iconTint={PURPLE}
            title={t("settings.newList")}
            dividerTop={lists.length > 0}
            onPress={() => {
              setEditListName("");
              setEditListEmoji("📋");
              setListEmojiPickerOpen(false);
              setAddingList(true);
            }}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>

        {/* BANK AUTOMATION */}
        <SectionLabel label={t("settings.bankAutomation")} isDark={isDark} />
        <View
          style={{
            backgroundColor: isDark ? "rgba(108,99,255,0.12)" : `${PURPLE}15`,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Ionicons name="information-circle-outline" size={18} color={PURPLE} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {Platform.OS === "android" ? (
              <>
                <Text
                  style={{
                    color: isDark ? "#e8e4ff" : "#2d2652",
                    fontSize: 13,
                    fontWeight: "700",
                    marginBottom: 8,
                    lineHeight: 18,
                  }}
                >
                  {t("settings.bankAutomationChecklistTitle")}
                </Text>
                <Text style={{ color: isDark ? "#c4b5fd" : PURPLE, fontSize: 13, lineHeight: 20 }}>
                  {t("settings.bankAutomationStepsAndroid")}
                </Text>
              </>
            ) : (
              <Text style={{ color: isDark ? "#c4b5fd" : PURPLE, fontSize: 13, flex: 1, lineHeight: 18 }}>
                {t("settings.bankAutomationHintIos")}
              </Text>
            )}
          </View>
        </View>
        {Platform.OS === "android" ? (
          <Pressable
            onPress={() => {
              void import("../../lib/bankNotificationAndroid").then((m) => m.openBankNotificationListenerSettings());
            }}
            style={{
              marginBottom: 12,
              marginTop: -4,
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: divider,
            }}
          >
            <Ionicons
              name={bankListenerOn ? "notifications-outline" : "notifications-off-outline"}
              size={22}
              color={PURPLE}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
                {bankListenerOn ? t("settings.bankListenerStatusOn") : t("settings.bankListenerStatusOff")}
              </Text>
              <Text style={{ color: PURPLE, fontSize: 13, fontWeight: "600", marginTop: 6 }}>
                {t("settings.bankListenerOpenSettings")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={mutedColor} />
          </Pressable>
        ) : null}
        {Platform.OS === "android" ? (
        <Card isDark={isDark}>
          {bankAutomations.map((bank, idx) => (
            <View
              key={bank.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: GUTTER,
                paddingVertical: 12,
                borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: divider,
              }}
            >
              <StoreIconOrEmoji emoji={bank.emoji} iconUrl={bank.iconUrl} isDark={isDark} />
              <View style={{ flex: 1, marginLeft: ICON_GAP, minWidth: 0, justifyContent: "center" }}>
                <Text style={{ color: textColor, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>
                  {bank.name}
                </Text>
                <Pressable onPress={() => Linking.openURL(bank.storeUrl)} hitSlop={6}>
                  <Text style={{ color: PURPLE, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                    {t("settings.viewInStore")}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {!PRESET_BANK_APP_IDS.has(bank.id) &&
                !PRESET_BANK_PACKAGES.has(bank.packageName.trim()) ? (
                  <Pressable
                    hitSlop={10}
                    onPress={() => {
                      void (async () => {
                        const ok = await showConfirm({
                          title: t("settings.bankDeleteTitle"),
                          message: t("settings.bankDeleteMessage", { name: bank.name }),
                          confirmText: t("common.delete"),
                          destructive: true,
                        });
                        if (ok) void removeBankAutomation(bank.id);
                      })();
                    }}
                    accessibilityLabel={t("settings.bankDeleteA11y")}
                  >
                    <Ionicons name="trash-outline" size={22} color={DESTRUCTIVE} />
                  </Pressable>
                ) : null}
                <Switch
                  value={bank.enabled}
                  onValueChange={() => toggleBankAutomation(bank.id)}
                  trackColor={{ false: "#3a3a3c", true: PURPLE }}
                  thumbColor="#fff"
                  ios_backgroundColor="#3a3a3c"
                />
              </View>
            </View>
          ))}
          <SettingsRow
            isDark={isDark}
            icon="add-circle-outline"
            iconTint={PURPLE}
            title={t("settings.addBank")}
            dividerTop={bankAutomations.length > 0}
            onPress={() => setShowBankModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>
        ) : null}

        {/* REPORT */}
        <SectionLabel label={t("settings.reportSection")} isDark={isDark} />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="star-outline"
            title={t("settings.centifiPro")}
            subtitle={t("settings.centifiProSubtitle")}
            dividerTop={false}
            onPress={() => router.push("/subscribe" as any)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="mail-outline"
            title={t("settings.reportMenu")}
            subtitle={t("settings.reportMenuSubtitle")}
            dividerTop
            onPress={() => router.push("/report" as any)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="sparkles-outline"
            iconTint={PURPLE}
            title={t("settings.insightsMenu")}
            subtitle={t("settings.insightsMenuSubtitle")}
            dividerTop
            onPress={() => router.push("/insights" as any)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
        </Card>

        {/* NOTIFICATIONS */}
        <SectionLabel label={t("settings.notifications")} isDark={isDark} />
        <Card isDark={isDark}>
          <SettingsRow
            isDark={isDark}
            icon="notifications-outline"
            title={t("settings.enableNotifications")}
            dividerTop={false}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={(v) => {
                  if (v) {
                    void (async () => {
                      const ok = await ensureLocalNotificationPermissions();
                      if (ok) setNotificationsEnabled(true);
                    })();
                  } else {
                    setNotificationsEnabled(false);
                  }
                }}
                trackColor={{ false: "#3a3a3c", true: PURPLE }}
                thumbColor="#fff"
                ios_backgroundColor="#3a3a3c"
              />
            }
          />
          <Text
            style={{
              color: mutedColor,
              fontSize: 13,
              lineHeight: 18,
              paddingHorizontal: GUTTER,
              paddingLeft: CONTENT_INSET,
              paddingBottom: 14,
              marginTop: -2,
            }}
          >
            {t("settings.notificationsLocalHint")}
          </Text>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>

      {showLangModal ? (
      <Modal visible transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <View style={{ flex: 1 }}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]}
            onPress={() => setShowLangModal(false)}
          />
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end" }]}>
            <View
              style={{
                width: "100%",
                backgroundColor: isDark ? "#1a1a1a" : "#fff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingBottom:
                  16 +
                  Math.max(
                    insets.bottom,
                    Platform.OS === "android" ? 32 : Platform.OS === "ios" ? 8 : 0,
                  ),
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "#444" : "#ddd",
                  alignSelf: "center",
                  marginBottom: 14,
                }}
              />
              <Text
                style={{
                  color: textColor,
                  fontSize: 18,
                  fontWeight: "700",
                  paddingHorizontal: GUTTER,
                  marginBottom: 8,
                }}
              >
                {t("settings.language")}
              </Text>
              {(Object.entries(LANGUAGES) as [Language, typeof LANGUAGES[Language]][]).map(([code, meta], index, arr) => {
                const isSelected = code === language;
                const isLast = index === arr.length - 1;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setLanguage(code);
                      setShowLangModal(false);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: isSelected ? `${PURPLE}16` : "transparent",
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        minHeight: 52,
                        paddingVertical: 12,
                        paddingHorizontal: GUTTER,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: divider,
                      }}
                    >
                      <View style={{ width: 36, alignItems: "center", justifyContent: "center" }}>
                        <LanguageFlag language={code} size={22} isDark={isDark} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          marginLeft: 10,
                          color: textColor,
                          fontSize: 16,
                          fontWeight: isSelected ? "700" : "500",
                        }}
                        numberOfLines={1}
                      >
                        {meta.nativeLabel}
                      </Text>
                      <View style={{ width: 28, alignItems: "center", justifyContent: "center" }}>
                        {isSelected ? <Ionicons name="checkmark-circle" size={24} color={PURPLE} /> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      ) : null}

      {manageListOpen ? (
      <OnboardingCategoryGridModal
        visible
        categories={allCats}
        customCategoriesLookup={customCategories}
        onClose={() => setManageListOpen(false)}
        onOpenEdit={(id) => openCategoryEdit(id)}
        onAddCategory={() => {
          reopenListAfterAdd.current = true;
          setManageListOpen(false);
          setShowCatModal(true);
        }}
        isDark={isDark}
        labels={catManageLabels}
      />
      ) : null}

      {editCategoryId != null ? (
      <OnboardingCategoryEditModal
        visible
        categoryId={editCategoryId}
        initial={editingResolved}
        isBuiltin={!!editCategoryId && isBuiltinCategoryId(editCategoryId)}
        hasTransactions={editHasTransactions}
        onClose={closeCategoryEdit}
        onSave={handleCategoryEditSave}
        onDelete={handleCategoryDeleteConfirm}
        isDark={isDark}
        labels={catEditLabels}
      />
      ) : null}

      {showCatModal ? (
        <OnboardingAddCategoryFullScreenModal
          visible
          onClose={closeAddCategoryModal}
          onCreate={async (data) => {
            await addCategory(data);
          }}
          isDark={isDark}
        />
      ) : null}
      {Platform.OS === "android" && showBankModal ? (
      <AddBankModal
        visible
        onSave={(data) => addBankAutomation(data)}
        onClose={() => setShowBankModal(false)}
        isDark={isDark}
        isAuthenticated={isAuthenticated}
      />
      ) : null}

      {editingList != null || addingList ? (
      <Modal
        visible
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (savingListEdit || deletingList) return;
          setEditingList(null);
          setAddingList(false);
          setEditListName("");
          setEditListEmoji("📋");
          setListEmojiPickerOpen(false);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "android" ? "padding" : undefined}
            enabled={Platform.OS !== "android" || keyboardInset > 0}
          >
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={() => {
                  if (savingListEdit || deletingList) return;
                  setEditingList(null);
                  setAddingList(false);
                  setEditListName("");
                  setEditListEmoji("📋");
                  setListEmojiPickerOpen(false);
                }}
                hitSlop={{ top: 16, bottom: 12, left: 16, right: 16 }}
                style={{
                  alignSelf: "flex-start",
                  marginLeft: 8,
                  paddingTop: 12,
                  paddingLeft: 12,
                  paddingBottom: 8,
                  paddingRight: 12,
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: "center",
                }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={28} color={isDark ? "#FFFFFF" : textColor} />
              </Pressable>

              <View
                style={{
                  flex: 1,
                  paddingBottom: listEditKeyboardLiftPad,
                }}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                  nestedScrollEnabled
                  contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingTop: 8,
                    paddingBottom: 24,
                    alignItems: "center",
                  }}
                  showsVerticalScrollIndicator={false}
                >
              <View style={{ position: "relative", marginBottom: 20 }}>
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 28,
                    backgroundColor: isDark ? "rgba(108,99,255,0.18)" : `${PURPLE}18`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <EmojiPreviewBadge emoji={editListEmoji.trim() || "📋"} isDark={isDark} size={56} />
                </View>
                <Pressable
                  onPress={() => setListEmojiPickerOpen(true)}
                  disabled={savingListEdit || deletingList}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? "#2c2c2e" : "#e8e8ec",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: bg,
                  }}
                  accessibilityLabel={t("settings.listIconHint")}
                >
                  <Ionicons name="pencil" size={16} color={textColor} />
                </Pressable>
              </View>

              <TextInput
                value={editListName}
                onChangeText={setEditListName}
                placeholder={t("settings.listNamePlaceholder")}
                placeholderTextColor={mutedColor}
                editable={!savingListEdit && !deletingList}
                autoFocus
                style={{
                  color: textColor,
                  fontSize: 28,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: 12,
                  minWidth: "100%",
                }}
              />

              {editingList && !canDeleteEditedList && editingList.id !== "private" && !editingList.isDefault ? (
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 18,
                    color: mutedColor,
                    textAlign: "center",
                    paddingHorizontal: 12,
                  }}
                >
                  {t("settings.cannotDeleteListHasExpenses")}
                </Text>
              ) : null}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: actionBarInnerBottomPad(keyboardInset, insets.bottom),
                backgroundColor: isDark ? "#0a0a0a" : "#fff",
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: divider,
              }}
            >
              {canDeleteEditedList ? (
                <Pressable
                  onPress={() => void handleConfirmDeleteEditedList()}
                  disabled={savingListEdit || deletingList}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: CORAL,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    opacity: savingListEdit || deletingList ? 0.45 : 1,
                  }}
                >
                  {deletingList ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text
                        style={{ color: "#fff", fontWeight: "700", fontSize: 15, flexShrink: 1, textAlign: "center" }}
                      >
                        {t("settings.deleteList")}
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => void handleSaveListEdit()}
                disabled={!listEditSaveReady || savingListEdit || deletingList}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#2c2c2e" : "#e2e2e6",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  opacity: !listEditSaveReady || deletingList ? 0.55 : 1,
                }}
              >
                {savingListEdit ? (
                  <ActivityIndicator color={textColor} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={22} color={textColor} />
                    <Text
                      style={{
                        color: listEditSaveReady ? textColor : mutedColor,
                        fontWeight: "700",
                        fontSize: 16,
                      }}
                    >
                      {t("common.save")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
              </View>
            </View>
          </KeyboardAvoidingView>
          <ListEmojiPickerSheet
            visible={listEmojiPickerOpen}
            onSelect={setEditListEmoji}
            onClose={() => setListEmojiPickerOpen(false)}
            isDark={isDark}
          />
        </SafeAreaView>
      </Modal>
      ) : null}

      {showProfileModal ? (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: cardBg }} edges={["top", "left", "right", "bottom"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 8,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: divider,
            }}
          >
            <Pressable
              onPress={() => setShowProfileModal(false)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color={mutedColor} />
            </Pressable>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                color: textColor,
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              {t("settings.profileModalTitle")}
            </Text>
            <View style={{ width: 44, height: 44 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: GUTTER, paddingBottom: 32 }}>
            {isAuthenticated && user ? (
              <View style={{ width: "100%" }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: mutedColor,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {t("settings.displayNameLabel")}
                </Text>
                <TextInput
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder={t("settings.displayNamePlaceholder")}
                  placeholderTextColor={mutedColor}
                  autoCapitalize="words"
                  autoCorrect
                  style={{
                    color: textColor,
                    fontSize: 16,
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: nameShowError ? DESTRUCTIVE : borderColor,
                  }}
                />
                {nameShowError ? (
                  <Text style={{ color: DESTRUCTIVE, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                    {t("settings.nameRequired")}
                  </Text>
                ) : null}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: mutedColor,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    marginTop: 20,
                    marginBottom: 8,
                  }}
                >
                  {t("settings.emailLabel")}
                </Text>
                <TextInput
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  placeholder={t("settings.emailPlaceholder")}
                  placeholderTextColor={mutedColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  style={{
                    color: textColor,
                    fontSize: 16,
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: emailShowError ? DESTRUCTIVE : borderColor,
                  }}
                />
                {emailShowError ? (
                  <Text style={{ color: DESTRUCTIVE, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                    {emailEmpty ? t("settings.emailRequired") : t("settings.emailInvalid")}
                  </Text>
                ) : null}
                <View
                  style={{
                    width: "100%",
                    paddingTop: nameShowError || emailShowError ? 28 : 48,
                  }}
                >
                  <Pressable
                    onPress={() => void handleSaveProfile()}
                    disabled={!profileSaveReady}
                    android_ripple={
                      profileSaveReady ? { color: "rgba(255,255,255,0.25)" } : undefined
                    }
                    style={({ pressed }) => {
                      const active = profileSaveReady;
                      return {
                        width: "100%",
                        alignSelf: "stretch",
                        borderRadius: 14,
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        minHeight: 54,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: active ? PURPLE : isDark ? "rgba(44, 44, 46, 0.6)" : "#e8e8ed",
                        borderWidth: active ? 0 : 1.5,
                        borderColor: active
                          ? "transparent"
                          : isDark
                            ? "rgba(255,255,255,0.28)"
                            : "rgba(0,0,0,0.1)",
                        ...(active && Platform.OS === "ios"
                          ? {
                              shadowColor: PURPLE,
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.35,
                              shadowRadius: 8,
                            }
                          : {}),
                        elevation: active ? 4 : 0,
                        opacity: pressed && active && !savingProfile ? 0.88 : 1,
                      };
                    }}
                  >
                    {savingProfile ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text
                        style={{
                          width: "100%",
                          textAlign: "center",
                          color: profileSaveReady ? "#fff" : isDark ? "rgba(255,255,255,0.72)" : "#636366",
                          fontWeight: "700",
                          fontSize: 16,
                          letterSpacing: 0.2,
                        }}
                      >
                        {t("settings.saveProfile")}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 16, color: textColor, lineHeight: 24 }}>{t("settings.profileSignInHint")}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      ) : null}

      {showPrivacyModal ? (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: cardBg }} edges={["top", "left", "right", "bottom"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 48,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: divider,
            }}
          >
            <Pressable onPress={() => setShowPrivacyModal(false)} style={{ position: "absolute", left: 8, padding: 8 }} hitSlop={12}>
              <Ionicons name="close" size={26} color={mutedColor} />
            </Pressable>
            <Text style={{ color: textColor, fontSize: 17, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
              {t("settings.privacyPolicyTitle")}
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: GUTTER, paddingBottom: 40 }}>
            <Text style={{ fontSize: 15, color: textColor, lineHeight: 22 }}>{t("settings.privacyPolicyBody")}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      ) : null}

      {showAboutModal ? (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: cardBg }} edges={["top", "left", "right", "bottom"]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: divider,
            }}
          >
            <Pressable onPress={() => setShowAboutModal(false)} style={{ position: "absolute", left: 8, padding: 8 }} hitSlop={12}>
              <Ionicons name="close" size={26} color={mutedColor} />
            </Pressable>
            <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>{t("settings.aboutModalTitle")}</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: GUTTER, paddingBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: textColor, letterSpacing: -0.4 }}>Centifi</Text>
            <Text style={{ fontSize: 15, color: mutedColor, marginTop: 10, lineHeight: 22 }}>{t("settings.aboutTagline")}</Text>
            <View style={{ marginTop: 22 }}>
              <Card isDark={isDark}>
                <SettingsRow
                  isDark={isDark}
                  icon="document-text-outline"
                  title={t("settings.privacyPolicy")}
                  dividerTop={false}
                  onPress={() => {
                    setShowAboutModal(false);
                    InteractionManager.runAfterInteractions(() => setShowPrivacyModal(true));
                  }}
                  right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
                />
                <SettingsRow
                  isDark={isDark}
                  icon="globe-outline"
                  title={t("settings.website")}
                  dividerTop
                  onPress={() => void Linking.openURL(websiteUrl)}
                  right={<Ionicons name="open-outline" size={18} color={mutedColor} />}
                />
                <SettingsRow
                  isDark={isDark}
                  icon="mail-outline"
                  title={t("settings.contact")}
                  subtitle={supportEmail}
                  dividerTop
                  onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
                  right={<Ionicons name="open-outline" size={18} color={mutedColor} />}
                />
              </Card>
            </View>

            <View style={{ marginTop: 22, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: divider }}>
              <Text style={{ fontSize: 12, color: mutedColor, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
                {t("settings.version")}
              </Text>
              <Text style={{ fontSize: 17, color: textColor, fontWeight: "700" }}>
                {buildVersion ? `${appVersion} (${t("settings.build")} ${String(buildVersion)})` : appVersion}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      ) : null}

      {showCurrencyModal ? (
      <CurrencyPickerModal
        visible
        onClose={() => setShowCurrencyModal(false)}
        onSelect={(code) => setDisplayCurrency(code)}
        selectedCode={displayCurrency}
        isDark={isDark}
      />
      ) : null}
    </SafeAreaView>
  );
}
