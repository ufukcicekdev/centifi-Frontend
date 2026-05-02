import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Modal,
  Platform,
  Alert,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { LANGUAGES, Language } from "../../i18n";
import {
  BUILTIN_CATEGORIES,
  CustomCategory,
  getCategoryMeta,
  type ExpenseList,
} from "../../constants/mockData";
import CategoryEditorModal from "../../components/CategoryEditorModal";
import {
  OnboardingCategoryGridModal,
  OnboardingCategoryEditModal,
  isBuiltinCategoryId,
} from "../../components/onboarding/OnboardingCategoryManageModals";
import { CurrencyPickerModal } from "../../components/CurrencyPickerModal";
import { getCurrencyLabel } from "../../lib/currencies";
import { currencySymbolFor } from "../../lib/formatMoney";
import { updateMe, type BackendUser } from "../../lib/backend";
import type { ApiError } from "../../lib/api";
import { isValidEmail } from "../../lib/isValidEmail";
import { ensureLocalNotificationPermissions } from "../../lib/localNotifications";

const PURPLE = "#6C63FF";
const DESTRUCTIVE = "#FF453A";

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
  iconTint,
  title,
  subtitle,
  right,
  onPress,
  dividerTop,
  destructive,
}: {
  isDark: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  title: string;
  subtitle?: string;
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
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1, marginLeft: ICON_GAP, minWidth: 0, justifyContent: "center" }}>
        <Text style={{ color: titleColor, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: mutedColor, fontSize: 13, marginTop: 3 }} numberOfLines={2}>
            {subtitle}
          </Text>
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

function EmojiLeading({
  emoji,
  isDark,
}: {
  emoji: string;
  isDark: boolean;
}) {
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
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
    </View>
  );
}

// ── Bank automation modal ─────────────────────────────────────────────────────

function AddBankModal({ visible, onSave, onClose, isDark }: {
  visible: boolean;
  onSave: (data: { name: string; emoji: string; storeUrl: string; packageName: string; enabled: boolean }) => void;
  onClose: () => void; isDark: boolean;
}) {
  const [name, setName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const inputBg = isDark ? "#111" : "#f5f5f5";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";

  React.useEffect(() => { if (visible) { setName(""); setStoreUrl(""); } }, [visible]);

  const handleSave = () => {
    if (!name.trim() || !storeUrl.trim()) { Alert.alert("Error", "Please fill in all fields."); return; }
    // Extract package name from Play Store URL if possible
    const match = storeUrl.match(/id=([a-zA-Z0-9._]+)/);
    const packageName = match?.[1] ?? name.toLowerCase().replace(/\s/g, ".");
    onSave({ name: name.trim(), emoji: "🏦", storeUrl: storeUrl.trim(), packageName, enabled: true });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#00000066" }} onPress={onClose} />
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 28,
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "#444" : "#ddd", alignSelf: "center", marginBottom: 20 }} />
        <Text style={{ color: textColor, fontSize: 18, fontWeight: "700", marginBottom: 6 }}>Add Bank App</Text>
        <Text style={{ color: mutedColor, fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
          Paste the Play Store or App Store link of your bank app. Centifi will read payment notifications to auto-log expenses.
        </Text>

        <View style={{ backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor, marginBottom: 12 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Bank name (e.g. Garanti BBVA)"
            placeholderTextColor={mutedColor} style={{ color: textColor, fontSize: 15, padding: 0 }} />
        </View>

        <View style={{ backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor, marginBottom: 20 }}>
          <TextInput value={storeUrl} onChangeText={setStoreUrl}
            placeholder="https://play.google.com/store/apps/details?id=…"
            placeholderTextColor={mutedColor} autoCapitalize="none" autoCorrect={false}
            style={{ color: textColor, fontSize: 14, padding: 0 }} />
        </View>

        <Pressable onPress={handleSave}
          style={({ pressed }) => ({ backgroundColor: PURPLE, borderRadius: 14, padding: 16, alignItems: "center", opacity: pressed ? 0.8 : 1 })}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Add Bank</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const {
    isDark, toggleTheme, language, setLanguage,
    displayCurrency, setDisplayCurrency,
    monthlyBudget, setMonthlyBudget,
    notificationsEnabled, setNotificationsEnabled,
    customCategories,
    addCategory,
    updateCategory,
    removeCategory,
    lists,
    addList,
    updateList,
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
  } = useStore();

  const [showLangModal, setShowLangModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<CustomCategory | undefined>();
  const [manageListOpen, setManageListOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const reopenListAfterAdd = useRef(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<ExpenseList | null>(null);
  const [editListName, setEditListName] = useState("");
  const [savingListEdit, setSavingListEdit] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const bg = isDark ? "#000000" : "#f5f5f5";
  const textColor = isDark ? "#fff" : "#000";
  const mutedColor = isDark ? "#888" : "#666";
  const cardBg = isDark ? "#1a1a1a" : "#fff";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  const inputBg = isDark ? "#111" : "#f5f5f5";
  const divider = isDark ? "#2a2a2a" : "#efefef";

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput.replace(",", "."));
    if (!isNaN(val) && val > 0) setMonthlyBudget(val);
  };

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
  }, [monthlyBudget]);

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
      .catch(() => Alert.alert(t("common.error"), t("settings.categorySaveFailed")));
  };

  const handleCategoryDeleteConfirm = () => {
    if (!editCategoryId || isBuiltinCategoryId(editCategoryId)) return;
    void removeCategory(editCategoryId)
      .then(() => closeCategoryEdit())
      .catch(() => Alert.alert(t("common.error"), t("settings.categoryDeleteFailed")));
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

  const budgetCurrencySymbol = useMemo(
    () => currencySymbolFor(displayCurrency, language as Language),
    [displayCurrency, language],
  );

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleSaveProfile = async () => {
    if (!user) return;
    const nameTrim = profileName.trim();
    if (!nameTrim) {
      Alert.alert(t("common.error"), t("settings.nameRequired"));
      return;
    }
    if (!profileEmail.trim()) {
      Alert.alert(t("common.error"), t("settings.emailRequired"));
      return;
    }
    if (!isValidEmail(profileEmail)) {
      Alert.alert(t("common.error"), t("settings.emailInvalid"));
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
      Alert.alert(t("common.error"), serverMsg ?? t("settings.profileSaveFailed"));
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
  const listEditDirty = !!(editingList && listEditTrim !== editingList.name.trim());
  const listEditSaveReady = !!(editingList && listEditValid && listEditDirty && !savingListEdit);

  const handleSaveListEdit = async () => {
    if (!editingList) return;
    const name = editListName.trim();
    if (!name) {
      Alert.alert(t("common.error"), t("settings.listNameRequired"));
      return;
    }
    setSavingListEdit(true);
    try {
      await updateList(editingList.id, name);
      setEditingList(null);
      setEditListName("");
    } catch {
      Alert.alert(t("common.error"), t("settings.listUpdateFailed"));
    } finally {
      setSavingListEdit(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 48 }}>

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
          <SettingsRow
            isDark={isDark}
            icon="document-text-outline"
            title={t("settings.privacyPolicy")}
            dividerTop
            onPress={() => setShowPrivacyModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="information-circle-outline"
            title={t("settings.about")}
            dividerTop
            onPress={() => setShowAboutModal(true)}
            right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
          />
          <SettingsRow
            isDark={isDark}
            icon="log-out-outline"
            title={t("settings.logOut")}
            dividerTop
            destructive
            onPress={() =>
              Alert.alert(t("settings.logOut"), t("settings.logOutConfirm"), [
                { text: t("common.cancel"), style: "cancel" },
                { text: t("settings.logOut"), style: "destructive", onPress: logout },
              ])
            }
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
            subtitle={`${langMeta.flag} ${langMeta.nativeLabel}`}
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
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: ICON_COL, alignItems: "center", paddingTop: 4 }}>
                <Ionicons name="cash-outline" size={22} color={mutedColor} />
              </View>
              <View style={{ flex: 1, marginLeft: ICON_GAP, minWidth: 0 }}>
                <Text
                  style={{
                    color: mutedColor,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {t("settings.monthlyBudget")}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isDark ? "#000000" : inputBg,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor,
                      minHeight: 48,
                    }}
                  >
                    <Text style={{ color: mutedColor, fontSize: 17, marginRight: 6, minWidth: 28 }}>
                      {budgetCurrencySymbol}
                    </Text>
                    <TextInput
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="decimal-pad"
                      style={{ flex: 1, color: textColor, fontSize: 17, fontWeight: "600", padding: 0 }}
                      returnKeyType="done"
                      onSubmitEditing={handleBudgetSave}
                    />
                  </View>
                  <Pressable
                    onPress={handleBudgetSave}
                    style={({ pressed }) => ({
                      marginLeft: 10,
                      backgroundColor: PURPLE,
                      paddingHorizontal: 18,
                      paddingVertical: 13,
                      borderRadius: 12,
                      opacity: pressed ? 0.85 : 1,
                      minWidth: 76,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t("common.save")}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
          <SettingsRow
            isDark={isDark}
            icon="pie-chart-outline"
            title={t("settings.categoryBudgets")}
            dividerTop
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert(t("budgets.signInRequiredTitle"), t("budgets.signInRequiredBody"));
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
                icon="list-outline"
                title={list.name}
                dividerTop={idx !== 0}
                onPress={
                  editable
                    ? () => {
                        setEditingList(list);
                        setEditListName(list.name);
                      }
                    : undefined
                }
                right={
                  editable ? <Ionicons name="chevron-forward" size={20} color={mutedColor} /> : undefined
                }
              />
            );
          })}
          {showAddList ? (
            <View
              style={{
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: divider,
                paddingTop: 14,
                paddingBottom: 16,
                paddingHorizontal: GUTTER,
                paddingLeft: CONTENT_INSET,
              }}
            >
              <TextInput
                value={newListName}
                onChangeText={setNewListName}
                placeholder={t("settings.listNamePlaceholder")}
                placeholderTextColor={mutedColor}
                autoFocus
                style={{
                  color: textColor,
                  fontSize: 16,
                  backgroundColor: inputBg,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor,
                  marginBottom: 14,
                }}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 18 }}>
                <Pressable
                  onPress={() => {
                    setShowAddList(false);
                    setNewListName("");
                  }}
                  hitSlop={8}
                >
                  <Text style={{ color: mutedColor, fontSize: 16, fontWeight: "500" }}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void (async () => {
                      const name = newListName.trim();
                      if (!name) return;
                      try {
                        await addList(name);
                        setNewListName("");
                        setShowAddList(false);
                      } catch {
                        Alert.alert(t("common.error"), t("settings.listSaveFailed"));
                      }
                    })();
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: PURPLE,
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 12,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t("settings.addList")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <SettingsRow
              isDark={isDark}
              icon="add-circle-outline"
              iconTint={PURPLE}
              title={t("settings.newList")}
              dividerTop={lists.length > 0}
              onPress={() => setShowAddList(true)}
              right={<Ionicons name="chevron-forward" size={20} color={mutedColor} />}
            />
          )}
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
          <Text style={{ color: isDark ? "#c4b5fd" : PURPLE, fontSize: 13, flex: 1, lineHeight: 18 }}>
            {t("settings.bankAutomationHint")}
          </Text>
        </View>
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
              <EmojiLeading emoji={bank.emoji} isDark={isDark} />
              <View style={{ flex: 1, marginLeft: ICON_GAP, minWidth: 0, justifyContent: "center" }}>
                <Text style={{ color: textColor, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>
                  {bank.name}
                </Text>
                <Pressable onPress={() => Linking.openURL(bank.storeUrl)} hitSlop={6}>
                  <Text style={{ color: PURPLE, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                    View in store ↗
                  </Text>
                </Pressable>
              </View>
              <Switch
                value={bank.enabled}
                onValueChange={() => toggleBankAutomation(bank.id)}
                trackColor={{ false: "#3a3a3c", true: PURPLE }}
                thumbColor="#fff"
                ios_backgroundColor="#3a3a3c"
              />
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

      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
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
                paddingBottom: Platform.OS === "ios" ? 34 : 22,
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
                        <Text style={{ fontSize: 22, lineHeight: 26 }}>{meta.flag}</Text>
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

      <OnboardingCategoryGridModal
        visible={manageListOpen}
        categories={allCats}
        customCategoriesLookup={customCategories}
        onClose={() => setManageListOpen(false)}
        onOpenEdit={(id) => openCategoryEdit(id)}
        onAddCategory={() => {
          reopenListAfterAdd.current = true;
          setManageListOpen(false);
          setEditingCat(undefined);
          setShowCatModal(true);
        }}
        isDark={isDark}
        labels={catManageLabels}
      />

      <OnboardingCategoryEditModal
        visible={editCategoryId != null}
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

      <CategoryEditorModal
        visible={showCatModal}
        existing={editingCat}
        onSave={async (data) => {
          if (editingCat) await updateCategory(editingCat.id, data);
          else await addCategory(data);
        }}
        onClose={closeAddCategoryModal}
        isDark={isDark}
      />
      <AddBankModal
        visible={showBankModal}
        onSave={(data) => addBankAutomation(data)}
        onClose={() => setShowBankModal(false)} isDark={isDark}
      />

      <Modal
        visible={editingList != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setEditingList(null);
          setEditListName("");
        }}
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
              onPress={() => {
                setEditingList(null);
                setEditListName("");
              }}
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
              {t("settings.editList")}
            </Text>
            <View style={{ width: 44, height: 44 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: GUTTER, paddingBottom: 32 }}>
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
              {t("settings.listNamePlaceholder")}
            </Text>
            <TextInput
              value={editListName}
              onChangeText={setEditListName}
              placeholder={t("settings.listNamePlaceholder")}
              placeholderTextColor={mutedColor}
              autoFocus
              style={{
                color: textColor,
                fontSize: 16,
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor,
              }}
            />
            <View style={{ width: "100%", paddingTop: 48 }}>
              <Pressable
                onPress={() => void handleSaveListEdit()}
                disabled={!listEditSaveReady}
                style={({ pressed }) => {
                  const active = listEditSaveReady;
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
                    opacity: pressed && active && !savingListEdit ? 0.88 : 1,
                  };
                }}
              >
                {savingListEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      width: "100%",
                      textAlign: "center",
                      color: listEditSaveReady ? "#fff" : isDark ? "rgba(255,255,255,0.72)" : "#636366",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {t("common.save")}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showProfileModal}
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

      <Modal
        visible={showPrivacyModal}
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

      <Modal
        visible={showAboutModal}
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
          <View style={{ padding: GUTTER, paddingBottom: 32 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: textColor, letterSpacing: -0.4 }}>Centifi</Text>
            <Text style={{ fontSize: 15, color: mutedColor, marginTop: 10, lineHeight: 22 }}>{t("settings.aboutTagline")}</Text>
            <View style={{ marginTop: 28, paddingTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: divider }}>
              <Text style={{ fontSize: 12, color: mutedColor, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>
                {t("settings.version")}
              </Text>
              <Text style={{ fontSize: 17, color: textColor, fontWeight: "600" }}>{appVersion}</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <CurrencyPickerModal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        onSelect={(code) => setDisplayCurrency(code)}
        selectedCode={displayCurrency}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
