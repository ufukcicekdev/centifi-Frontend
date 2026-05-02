import React, { useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal, Alert,
  StyleSheet, useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { updateMe } from "../../lib/backend";
import { saveEnabledCategoryIds } from "../../lib/categoryPrefs";
import { BUILTIN_CATEGORIES, CustomCategory, getCategoryMeta } from "../../constants/mockData";
import {
  OnboardingCategoryGridModal,
  OnboardingCategoryEditModal,
  isBuiltinCategoryId,
} from "../../components/onboarding/OnboardingCategoryManageModals";

const PURPLE = "#6C63FF";
/** Categories grid: 3 columns; horizontal padding must match ScrollView `paddingHorizontal` */
const CAT_GRID_GAP = 12;
const CAT_GRID_COLS = 3;
const CONTENT_PAD = 24;

const FOOTER_PAD = 24;
const FOOTER_BTN_GAP = 12;

const EMOJI_OPTIONS = ["🎯","🎮","🍕","✈️","🏋️","📚","🐶","💄","🎸","🏠","🌿","💡","🎁","👗","🚀","⚽"];
const COLORS = [
  { color: "#FF6B6B", bg: "#FF6B6B22" }, { color: "#4ECDC4", bg: "#4ECDC422" },
  { color: "#A29BFE", bg: "#A29BFE22" }, { color: "#55EFC4", bg: "#55EFC422" },
  { color: "#FDCB6E", bg: "#FDCB6E22" }, { color: "#74B9FF", bg: "#74B9FF22" },
  { color: "#FD79A8", bg: "#FD79A822" }, { color: "#6C63FF", bg: "#6C63FF22" },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function Onboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  /** Web + first paint: module `Dimensions` was 0 → mashed footer & clipped grid */
  const layoutW = Math.max(1, windowWidth);
  const gridInnerW = layoutW - CONTENT_PAD * 2;
  const iconW = (gridInnerW - CAT_GRID_GAP * (CAT_GRID_COLS - 1)) / CAT_GRID_COLS;
  const footerInnerW = layoutW - FOOTER_PAD * 2;
  const footerBtnW = (footerInnerW - FOOTER_BTN_GAP) / 2;

  const { isDark, addCategory, language, setCategoryDisplayOverride, expenses, categoryDisplayOverrides } = useStore();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(BUILTIN_CATEGORIES.map(c => c.id));
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [manageListOpen, setManageListOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const reopenListAfterAdd = useRef(false);

  const tr = language === "tr";
  const catManageLabels = {
    title: t("settings.chooseCategoriesTitle"),
    addCategory: t("settings.addCategory"),
  };
  const catEditLabels = {
    delete: tr ? "Sil" : "Delete",
    save: tr ? "Kaydet" : "Save",
    cannotDeleteBuiltin: tr
      ? "Varsayılan kategoriler silinemez."
      : "Built-in categories can’t be deleted.",
    cannotDeleteHasTx: tr
      ? "Bu kategoride işlem var. Önce işlemleri başka kategoriye taşıyın veya silin."
      : "This category has transactions. Remove or reassign them first.",
    namePlaceholder: tr ? "Kategori adı" : "Category name",
  };

  const editHasTransactions =
    !!editCategoryId && expenses.some((e) => e.category === editCategoryId);

  const closeCategoryEdit = () => {
    setEditCategoryId(null);
    setManageListOpen(true);
  };

  const handleCategoryEditSave = (payload: { name: string; emoji: string; color: string; bgColor: string }) => {
    if (!editCategoryId) return;
    if (isBuiltinCategoryId(editCategoryId)) {
      setCategoryDisplayOverride(editCategoryId, payload);
    } else {
      setCustomCats((prev) =>
        prev.map((c) => (c.id === editCategoryId ? { ...c, ...payload } : c)),
      );
    }
    closeCategoryEdit();
  };

  const handleCategoryDeleteConfirm = () => {
    if (!editCategoryId || isBuiltinCategoryId(editCategoryId)) return;
    setCustomCats((prev) => prev.filter((c) => c.id !== editCategoryId));
    setSelected((prev) => prev.filter((x) => x !== editCategoryId));
    closeCategoryEdit();
  };

  const openCategoryEdit = (id: string) => {
    setManageListOpen(false);
    setEditCategoryId(id);
  };

  const closeAddCategoryModal = () => {
    setShowModal(false);
    if (reopenListAfterAdd.current) {
      setManageListOpen(true);
      reopenListAfterAdd.current = false;
    }
  };

  const bg = isDark ? "#0f0f0f" : "#f5f5f5";
  const card = isDark ? "#1c1c1c" : "#fff";
  const text = isDark ? "#fff" : "#000";
  const muted = isDark ? "#777" : "#888";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";
  const iconBg = isDark ? "#1c2033" : "#eef0f8";
  const inputBg = isDark ? "#111" : "#f0f0f0";
  /** Primary CTA: purple + white text so it stays visible on dark bg (white pill + dark text failed to render contrast on some builds). */
  const primaryCtaBg = PURPLE;
  const primaryCtaText = "#fff";
  /** Footer Prev pill: lighter than page bg so it always reads as a button */
  const navSecondaryBg = isDark ? "#2e2e36" : "#ffffff";
  const navSecondaryBorder = isDark ? "#4e4e58" : "#c5c5cf";

  const STEPS = 3;
  const allCats = useMemo(() => [...BUILTIN_CATEGORIES, ...customCats], [customCats]);

  const editingResolved = useMemo((): CustomCategory | null => {
    if (!editCategoryId) return null;
    const base = allCats.find((c) => c.id === editCategoryId);
    if (!base) return null;
    const m = getCategoryMeta(editCategoryId, customCats, categoryDisplayOverrides);
    return { ...base, name: m.name, emoji: m.emoji, color: m.color, bgColor: m.bgColor };
  }, [editCategoryId, allCats, customCats, categoryDisplayOverrides]);

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addCat = () => {
    if (!newName.trim()) { Alert.alert("Name required"); return; }
    const c: CustomCategory = {
      id: `c_${Date.now()}`, name: newName.trim(),
      emoji: newEmoji, color: newColor.color, bgColor: newColor.bg,
    };
    setCustomCats(p => [...p, c]);
    setSelected(p => [...p, c.id]);
    setNewName(""); setNewEmoji("🎯"); setNewColor(COLORS[0]);
    setShowModal(false);
    if (reopenListAfterAdd.current) {
      setManageListOpen(true);
      reopenListAfterAdd.current = false;
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await updateMe({ onboarding_completed: true } as any).catch(() => {});
      const idMap = new Map<string, string>();
      for (const c of customCats) {
        const row = await addCategory({
          name: c.name,
          emoji: c.emoji,
          color: c.color,
          bgColor: c.bgColor,
        });
        idMap.set(c.id, row.id);
      }
      const mappedSelected = selected.map((id) => idMap.get(id) ?? id);
      const uid = useStore.getState().user?.uid;
      useStore.getState().setEnabledCategoryIds(mappedSelected);
      if (uid) await saveEnabledCategoryIds(uid, mappedSelected);
      await useStore.getState().hydrateFromBackend();
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round(((step + 1) / STEPS) * 100);

  const categoryRows = chunk([...allCats, { id: "__add__", name: "Add", emoji: "", color: muted, bgColor: "" }], CAT_GRID_COLS);

  function renderCategoryTile(cat: CustomCategory, w: number) {
    const sel = selected.includes(cat.id);
    const meta = getCategoryMeta(cat.id, customCats, categoryDisplayOverrides);
    const tint = meta.bgColor || `${meta.color}28`;
    return (
      <Pressable onPress={() => toggle(cat.id)} style={({ pressed }) => ({
        alignItems: "center",
        opacity: pressed ? 0.88 : 1,
        width: "100%",
      })}>
        <View style={{
          width: w,
          height: w,
          borderRadius: 16,
          backgroundColor: sel ? tint : iconBg,
          borderWidth: sel ? 2.5 : 1,
          borderColor: sel ? meta.color : border,
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
          {sel ? (
            <View style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: meta.color,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="checkmark" size={13} color="#fff" />
            </View>
          ) : null}
        </View>
        <Text style={{
          color: sel ? text : muted,
          fontSize: 12,
          fontWeight: sel ? "700" : "600",
          marginTop: 8,
          textAlign: "center",
        }} numberOfLines={1}>{meta.name}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: CONTENT_PAD, paddingTop: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View style={{ flex: 1, height: 4, backgroundColor: border, borderRadius: 2, marginRight: 10 }}>
            <View style={{ height: 4, width: `${pct}%`, backgroundColor: PURPLE, borderRadius: 2 }} />
          </View>
          <Text style={{ color: muted, fontSize: 12, fontWeight: "600" }}>{step + 1}/{STEPS}</Text>
        </View>
        {step < STEPS - 1 && (
          <Pressable onPress={() => setStep(s => s + 1)} style={{ alignSelf: "flex-end", marginBottom: 8 }} hitSlop={12}>
            <Text style={{ color: muted, fontSize: 13 }}>Skip</Text>
          </Pressable>
        )}

        {/* ── STEP 0: Welcome ── */}
        {step === 0 && (
          <View style={{ paddingTop: 24 }}>
            <Text style={{ fontSize: 56, textAlign: "center", marginBottom: 20 }}>👋</Text>
            <Text style={{ color: text, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 10 }}>
              Welcome to Centifi
            </Text>
            <Text style={{ color: muted, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 36 }}>
              Let's set up your account in a few quick steps.
            </Text>
            {[
              { emoji: "📊", title: "Track expenses", desc: "Log with text, photo or voice" },
              { emoji: "🏦", title: "Bank integration", desc: "Auto-import from your bank app" },
              { emoji: "🤖", title: "AI-powered", desc: "Smart categorization & insights" },
            ].map((item) => (
              <View key={item.title} style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: card, borderRadius: 16, padding: 16,
                borderWidth: 1, borderColor: border, marginBottom: 12,
              }}>
                <Text style={{ fontSize: 26, marginRight: 14 }}>{item.emoji}</Text>
                <View>
                  <Text style={{ color: text, fontSize: 15, fontWeight: "600" }}>{item.title}</Text>
                  <Text style={{ color: muted, fontSize: 13, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── STEP 1: Categories ── */}
        {step === 1 && (
          <View style={{ paddingTop: 16 }}>
            <Text style={{ color: text, fontSize: 24, fontWeight: "800", marginBottom: 6 }}>Choose categories</Text>
            <Text style={{ color: muted, fontSize: 14, marginBottom: 16 }}>
              Tap to select. Chosen categories show a ring and checkmark.
            </Text>
            <Pressable
              onPress={() => setManageListOpen(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                gap: 8,
                marginBottom: 20,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name="create-outline" size={20} color={PURPLE} />
              <Text style={{ color: PURPLE, fontSize: 15, fontWeight: "700" }}>
                {tr ? "Kategorileri düzenle" : "Edit categories"}
              </Text>
            </Pressable>
            {categoryRows.map((row, rowIdx) => (
              <View
                key={`row-${rowIdx}`}
                style={{
                  flexDirection: "row",
                  width: "100%",
                  maxWidth: "100%",
                  marginBottom: 18,
                }}
              >
                {row.map((cat, colIdx) => (
                  <View
                    key={cat.id}
                    style={{
                      width: iconW,
                      marginRight: colIdx < row.length - 1 ? CAT_GRID_GAP : 0,
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {cat.id === "__add__" ? (
                      <Pressable onPress={() => setShowModal(true)} style={({ pressed }) => ({
                        alignItems: "center",
                        opacity: pressed ? 0.65 : 1,
                        width: "100%",
                      })}>
                        <View style={{
                          width: iconW,
                          height: iconW,
                          borderRadius: 16,
                          borderWidth: 2,
                          borderStyle: "dashed",
                          borderColor: navSecondaryBorder,
                          backgroundColor: navSecondaryBg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <Ionicons name="add" size={26} color={muted} />
                        </View>
                        <Text style={{ color: muted, fontSize: 12, fontWeight: "600", marginTop: 8 }}>Add</Text>
                      </Pressable>
                    ) : renderCategoryTile(cat, iconW)}
                  </View>
                ))}
              </View>
            ))}
            <Text style={{ color: muted, fontSize: 13, textAlign: "center", marginTop: 4 }}>
              {selected.length} selected
            </Text>
          </View>
        )}

        {/* ── STEP 2: Bank ── */}
        {step === 2 && (
          <View style={{ paddingTop: 16, width: "100%", maxWidth: "100%" }}>
            <Text style={{ color: text, fontSize: 24, fontWeight: "800", marginBottom: 6 }}>Connect your bank</Text>
            <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              Auto-log expenses from bank notifications — no account access needed.
            </Text>
            <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: "hidden", marginBottom: 16 }}>
              {[
                { n: "1", icon: "storefront-outline" as const, title: "Open your bank app", desc: "Find it on Play Store or App Store" },
                { n: "2", icon: "copy-outline" as const, title: "Copy the store link", desc: "Tap Share → Copy link on the store page" },
                { n: "3", icon: "link-outline" as const, title: "Paste it in Settings", desc: "Settings → Bank Integrations → Add bank" },
                { n: "4", icon: "notifications-outline" as const, title: "Allow notifications", desc: "Centifi reads payment notifications only" },
              ].map((item, idx, arr) => (
                <View key={item.n}>
                  <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${PURPLE}22`, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ color: PURPLE, fontWeight: "800", fontSize: 13 }}>{item.n}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: text, fontSize: 14, fontWeight: "600" }}>{item.title}</Text>
                      <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                    <Ionicons name={item.icon} size={18} color={muted} />
                  </View>
                  {idx < arr.length - 1 && <View style={{ height: 1, backgroundColor: border, marginHorizontal: 14 }} />}
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: `${PURPLE}15`, borderRadius: 12, padding: 14, flexDirection: "row" }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PURPLE} style={{ marginRight: 10, marginTop: 1 }} />
              <Text style={{ color: muted, fontSize: 13, lineHeight: 20, flex: 1 }}>
                Centifi never accesses your bank account. It only reads notification text on your device.
              </Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Fixed footer: full-width bar so Prev / Continue always read as real buttons ── */}
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: border,
          backgroundColor: bg,
          paddingHorizontal: FOOTER_PAD,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 14),
        }}
      >
        {step > 0 ? (
          <View
            style={{
              width: footerInnerW,
              maxWidth: "100%",
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "stretch",
            }}
          >
            <View style={{ width: footerBtnW, marginRight: FOOTER_BTN_GAP, flexShrink: 0 }}>
              <Pressable
                onPress={() => setStep(s => s - 1)}
                style={({ pressed }) => ({
                  width: "100%",
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: navSecondaryBg,
                  borderWidth: 2,
                  borderColor: navSecondaryBorder,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="chevron-back" size={20} color={text} style={{ marginRight: 6 }} />
                  <Text style={{ color: text, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                    Prev
                  </Text>
                </View>
              </Pressable>
            </View>
            <View style={{ width: footerBtnW, flexShrink: 0 }}>
              <Pressable
                onPress={step < STEPS - 1 ? () => setStep(s => s + 1) : finish}
                disabled={saving}
                style={({ pressed }) => ({
                  width: "100%",
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: primaryCtaBg,
                  opacity: pressed || saving ? 0.92 : 1,
                  elevation: 6,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isDark ? 0.4 : 0.18,
                  shadowRadius: 6,
                })}
              >
                {saving ? (
                  <ActivityIndicator color={primaryCtaText} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Text
                      style={{
                        color: primaryCtaText,
                        fontSize: 16,
                        fontWeight: "700",
                        letterSpacing: 0.2,
                      }}
                      numberOfLines={1}
                    >
                      {step < STEPS - 1 ? "Continue" : "Get Started 🚀"}
                    </Text>
                    {step < STEPS - 1 ? (
                      <Ionicons name="chevron-forward" size={20} color={primaryCtaText} style={{ marginLeft: 6 }} />
                    ) : null}
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={{
              width: footerInnerW,
              maxWidth: "100%",
              alignSelf: "center",
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            <Pressable
              onPress={() => setStep(s => s + 1)}
              style={({ pressed }) => ({
                height: 52,
                paddingHorizontal: 28,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: primaryCtaBg,
                opacity: pressed ? 0.92 : 1,
                elevation: 6,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDark ? 0.4 : 0.18,
                shadowRadius: 6,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: primaryCtaText, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>
                  Continue
                </Text>
                <Ionicons name="chevron-forward" size={20} color={primaryCtaText} style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── ADD CATEGORY MODAL ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeAddCategoryModal}>
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>New category</Text>
              <Pressable onPress={closeAddCategoryModal} hitSlop={12}>
                <Ionicons name="close" size={22} color={muted} />
              </Pressable>
            </View>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: newColor.bg, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 32 }}>{newEmoji}</Text>
              </View>
              <Text style={{ color: newColor.color, fontSize: 14, fontWeight: "700" }}>{newName || "Category name"}</Text>
            </View>
            <View style={{ backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
              <TextInput
                value={newName} onChangeText={setNewName}
                placeholder="Category name" placeholderTextColor={muted}
                style={{ color: text, fontSize: 15, paddingVertical: 12 }}
              />
            </View>
            <Text style={{ color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {EMOJI_OPTIONS.map(em => (
                <Pressable key={em} onPress={() => setNewEmoji(em)} style={{
                  width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center",
                  backgroundColor: em === newEmoji ? `${PURPLE}22` : inputBg,
                  borderWidth: em === newEmoji ? 2 : 1, borderColor: em === newEmoji ? PURPLE : border,
                  marginRight: 8,
                }}>
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={{ color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10 }}>COLOR</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {COLORS.map(c => (
                <Pressable key={c.color} onPress={() => setNewColor(c)} style={{
                  width: 34, height: 34, borderRadius: 17, backgroundColor: c.color,
                  borderWidth: c.color === newColor.color ? 3 : 0, borderColor: "#fff",
                  transform: [{ scale: c.color === newColor.color ? 1.15 : 1 }],
                }} />
              ))}
            </View>
            <Pressable onPress={addCat} style={({ pressed }) => ({
              height: 52, borderRadius: 14, backgroundColor: PURPLE,
              alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1,
            })}>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Add Category</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OnboardingCategoryGridModal
        visible={manageListOpen}
        categories={allCats}
        customCategoriesLookup={customCats}
        onClose={() => setManageListOpen(false)}
        onOpenEdit={(id) => openCategoryEdit(id)}
        onAddCategory={() => {
          reopenListAfterAdd.current = true;
          setManageListOpen(false);
          setShowModal(true);
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
      </View>
    </SafeAreaView>
  );
}
