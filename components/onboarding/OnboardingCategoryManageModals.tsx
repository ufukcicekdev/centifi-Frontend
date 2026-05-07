import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppDialog } from "../../context/AppDialogContext";
import {
  BUILTIN_CATEGORIES,
  CustomCategory,
  getCategoryMeta,
} from "../../constants/mockData";
import { EmojiPickerSheet } from "../CategoryEditorModal";
import { useStore } from "../../store/useStore";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import {
  actionBarInnerBottomPad,
} from "../../lib/keyboardFooterChrome";
import { ConfirmDialogCard } from "../dialog/ConfirmDialogCard";
import { buildAppDialogTheme } from "../dialog/appDialogTheme";

export { isBuiltinCategoryId } from "../../constants/mockData";

const CORAL = "#FF6B6B";
const PURPLE = "#6C63FF";

/** “Choose categories” / edit grid — keep in sync with onboarding.tsx */
const CAT_GRID_GAP = 12;
const CAT_GRID_COLS = 3;
const CONTENT_PAD = 24;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const COLORS = [
  { color: "#FF6B6B", bg: "#FF6B6B22" },
  { color: "#4ECDC4", bg: "#4ECDC422" },
  { color: "#A29BFE", bg: "#A29BFE22" },
  { color: "#55EFC4", bg: "#55EFC422" },
  { color: "#FDCB6E", bg: "#FDCB6E22" },
  { color: "#74B9FF", bg: "#74B9FF22" },
  { color: "#FD79A8", bg: "#FD79A822" },
  { color: "#6C63FF", bg: "#6C63FF22" },
];

type GridModalProps = {
  visible: boolean;
  categories: CustomCategory[];
  customCategoriesLookup: CustomCategory[];
  onClose: () => void;
  onOpenEdit: (id: string) => void;
  onAddCategory: () => void;
  isDark: boolean;
  labels: { title: string; addCategory: string };
};

/** Full-screen 3-column grid (onboarding “Choose categories” layout). */
export function OnboardingCategoryGridModal({
  visible,
  categories,
  customCategoriesLookup,
  onClose,
  onOpenEdit,
  onAddCategory,
  isDark,
  labels,
}: GridModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const layoutW = Math.max(1, windowWidth);
  const gridInnerW = layoutW - CONTENT_PAD * 2;
  const iconW = (gridInnerW - CAT_GRID_GAP * (CAT_GRID_COLS - 1)) / CAT_GRID_COLS;

  const categoryDisplayOverrides = useStore((s) => s.categoryDisplayOverrides);
  const bg = isDark ? "#000000" : "#f5f5f5";
  const text = isDark ? "#fff" : "#000";
  const muted = isDark ? "#8e8e93" : "#666";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";
  const navSecondaryBg = isDark ? "#2e2e36" : "#ffffff";
  const navSecondaryBorder = isDark ? "#4e4e58" : "#c5c5cf";

  /** Modal fullScreen: SafeAreaView alone often clips header — notch/status bar için üst inset elle */
  const statusBarTop =
    insets.top > 0 ? insets.top : Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const headerPaddingTop = Math.max(statusBarTop, 12);

  const categoryRows = useMemo(() => {
    const addTile = {
      id: "__add__",
      name: "",
      emoji: "",
      color: "#888888",
      bgColor: "",
    } as CustomCategory;
    return chunk([...categories, addTile], CAT_GRID_COLS);
  }, [categories]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View
          style={{
            paddingTop: headerPaddingTop,
            paddingBottom: 10,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: bg,
            zIndex: 2,
            elevation: 4,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color={isDark ? "#FFFFFF" : text} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              color: text,
              fontSize: 16,
              fontWeight: "700",
              paddingHorizontal: 8,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {labels.title}
          </Text>
          <View style={{ width: 44, height: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: CONTENT_PAD,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 28),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {categoryRows.map((row, rowIdx) => (
            <View
              key={`grid-row-${rowIdx}`}
              style={{
                flexDirection: "row",
                width: "100%",
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
                    <Pressable
                      onPress={onAddCategory}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        opacity: pressed ? 0.65 : 1,
                        width: "100%",
                      })}
                    >
                      <View
                        style={{
                          width: iconW,
                          height: iconW,
                          borderRadius: 16,
                          borderWidth: 2,
                          borderStyle: "dashed",
                          borderColor: navSecondaryBorder,
                          backgroundColor: navSecondaryBg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="add" size={26} color={muted} />
                      </View>
                      <Text
                        style={{
                          color: muted,
                          fontSize: 12,
                          fontWeight: "600",
                          marginTop: 8,
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {labels.addCategory}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => onOpenEdit(cat.id)}
                      style={({ pressed }) => ({
                        alignItems: "center",
                        opacity: pressed ? 0.88 : 1,
                        width: "100%",
                      })}
                    >
                      {(() => {
                        const meta = getCategoryMeta(
                          cat.id,
                          customCategoriesLookup,
                          categoryDisplayOverrides,
                        );
                        const tint = meta.bgColor || `${meta.color}28`;
                        return (
                          <>
                            <View
                              style={{
                                width: iconW,
                                height: iconW,
                                borderRadius: 16,
                                backgroundColor: tint,
                                borderWidth: 1,
                                borderColor: border,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
                            </View>
                            <Text
                              style={{
                                color: text,
                                fontSize: 12,
                                fontWeight: "600",
                                marginTop: 8,
                                textAlign: "center",
                              }}
                              numberOfLines={2}
                            >
                              {meta.name}
                            </Text>
                          </>
                        );
                      })()}
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

type EditModalProps = {
  visible: boolean;
  categoryId: string | null;
  /** Resolved display fields */
  initial: CustomCategory | null;
  isBuiltin: boolean;
  hasTransactions: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; emoji: string; color: string; bgColor: string }) => void;
  onDelete: () => void;
  isDark: boolean;
  labels: {
    delete: string;
    save: string;
    cannotDeleteBuiltin: string;
    cannotDeleteHasTx: string;
    namePlaceholder: string;
  };
};

export function OnboardingCategoryEditModal({
  visible,
  categoryId,
  initial,
  isBuiltin,
  hasTransactions,
  onClose,
  onSave,
  onDelete,
  isDark,
  labels,
}: EditModalProps) {
  const { t } = useTranslation();
  const { showAlert } = useAppDialog();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [colorPair, setColorPair] = useState(COLORS[0]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) setDeleteConfirmOpen(false);
  }, [visible]);

  const dialogTheme = useMemo(() => buildAppDialogTheme(isDark), [isDark]);

  useEffect(() => {
    if (visible && initial) {
      setName(initial.name);
      setEmoji(initial.emoji);
      const match = COLORS.find((c) => c.color === initial.color);
      setColorPair(match ?? COLORS[0]);
    }
  }, [visible, initial, categoryId]);

  const bg = isDark ? "#000000" : "#f5f5f5";
  const text = isDark ? "#fff" : "#000";
  const muted = isDark ? "#8e8e93" : "#666";
  const inputBg = isDark ? "#111" : "#f0f0f0";
  const border = isDark ? "#2c2c2c" : "#e0e0e0";

  const statusBarTop =
    insets.top > 0 ? insets.top : Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const closeRowPaddingTop = Math.max(statusBarTop, 12);

  const handleDeletePress = () => {
    if (isBuiltin) {
      showAlert(labels.cannotDeleteBuiltin);
      return;
    }
    if (hasTransactions) {
      showAlert(labels.cannotDeleteHasTx);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleSave = () => {
    if (!initial) return;
    const n = (isBuiltin ? initial.name : name).trim();
    if (!n) return;
    onSave({
      name: n,
      emoji,
      color: colorPair.color,
      bgColor: colorPair.bg,
    });
  };

  if (!visible) return null;
  if (!initial || !categoryId) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <Pressable
          onPress={onClose}
          hitSlop={{ top: 16, bottom: 12, left: 16, right: 16 }}
          style={{
            alignSelf: "flex-start",
            marginLeft: 8,
            paddingTop: closeRowPaddingTop,
            paddingLeft: 12,
            paddingBottom: 8,
            paddingRight: 12,
            minWidth: 44,
            minHeight: 44,
            justifyContent: "center",
          }}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={28} color={isDark ? "#FFFFFF" : text} />
        </Pressable>

        <View
          style={{
            flex: 1,
            /** Klavye açıkken yalnızca IME yüksekliği — Android’de +insets.bottom ve iOS’ta +KEYBOARD_GAP fazla boşluk bırakıyordu */
            paddingBottom: keyboardInset > 0 ? keyboardInset : 0,
          }}
        >
          <KeyboardAvoidingView behavior={undefined} style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 24,
                alignItems: "center",
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View style={{ position: "relative", marginBottom: 20 }}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 28,
                  backgroundColor: colorPair.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 56 }}>{emoji}</Text>
              </View>
              <Pressable
                onPress={() => setEmojiOpen(true)}
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
              >
                <Ionicons name="pencil" size={16} color={text} />
              </Pressable>
            </View>

            {isBuiltin ? (
              <>
                <Text
                  style={{
                    color: text,
                    fontSize: 28,
                    fontWeight: "700",
                    textAlign: "center",
                    marginBottom: 8,
                    minWidth: "100%",
                  }}
                >
                  {initial.name}
                </Text>
                <Text
                  style={{
                    color: muted,
                    fontSize: 13,
                    textAlign: "center",
                    lineHeight: 18,
                    marginBottom: 20,
                    paddingHorizontal: 8,
                  }}
                >
                  {t("settings.builtinCategoryNameLocked")}
                </Text>
              </>
            ) : (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={labels.namePlaceholder}
                placeholderTextColor={muted}
                style={{
                  color: text,
                  fontSize: 28,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: 20,
                  minWidth: "100%",
                }}
              />
            )}

            <Text
              style={{
                alignSelf: "flex-start",
                color: muted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              {t("settings.categoryColorLabel")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32, justifyContent: "center" }}>
              {COLORS.map((c) => (
                <Pressable
                  key={c.color}
                  onPress={() => setColorPair(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: c.color,
                    borderWidth: colorPair.color === c.color ? 3 : 0,
                    borderColor: "#fff",
                  }}
                />
              ))}
            </View>
          </ScrollView>
          </KeyboardAvoidingView>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom:
                keyboardInset > 0 ? 0 : actionBarInnerBottomPad(keyboardInset, insets.bottom),
              backgroundColor: isDark ? "#0a0a0a" : "#fff",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: border,
            }}
          >
            <Pressable
              onPress={handleDeletePress}
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
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{labels.delete}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 14,
                backgroundColor: isDark ? "#2c2c2e" : "#e2e2e6",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="checkmark" size={22} color={text} />
              <Text style={{ color: text, fontWeight: "700", fontSize: 16 }}>{labels.save}</Text>
            </Pressable>
          </View>
        </View>

        <EmojiPickerSheet visible={emojiOpen} onSelect={setEmoji} onClose={() => setEmojiOpen(false)} isDark={isDark} />

        {deleteConfirmOpen ? (
          <View
            style={[StyleSheet.absoluteFillObject, { zIndex: 2000 }]}
            pointerEvents="box-none"
          >
            <Pressable
              style={[StyleSheet.absoluteFillObject, { backgroundColor: dialogTheme.overlay }]}
              onPress={() => setDeleteConfirmOpen(false)}
              accessibilityRole="button"
            />
            <View
              pointerEvents="box-none"
              style={[
                StyleSheet.absoluteFillObject,
                { justifyContent: "center", paddingHorizontal: 24, alignItems: "stretch" },
              ]}
            >
              <ConfirmDialogCard
                isDark={isDark}
                themeOverride={dialogTheme}
                title={t("settings.deleteCategoryConfirmTitle")}
                message={t("settings.deleteCategoryConfirmMessage")}
                cancelText={t("common.cancel")}
                confirmText={labels.delete}
                destructive
                onCancel={() => setDeleteConfirmOpen(false)}
                onConfirm={() => {
                  setDeleteConfirmOpen(false);
                  onDelete();
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
