import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useKeyboardInset, keyboardHeightFromEvent } from "../../hooks/useKeyboardInset";
import {
  actionBarInnerBottomPad,
  keyboardLiftPaddingBottom,
} from "../../lib/keyboardFooterChrome";
import { useAppDialog } from "../../context/AppDialogContext";
import { ONBOARDING_ADD_CATEGORY_ICON_PRESETS } from "../../lib/categoryEditorEmojiIconGrid";
import { EmojiPickerSheet } from "../CategoryEditorModal";
import CategoryGlyph from "../CategoryGlyph";

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

const PURPLE = "#6C63FF";

export type OnboardingAddCategoryPayload = {
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: OnboardingAddCategoryPayload) => void | Promise<void>;
  isDark: boolean;
};

/**
 * Full-screen add category (same layout + keyboard handling as onboarding). Used from onboarding and settings (+).
 */
export function OnboardingAddCategoryFullScreenModal({ visible, onClose, onCreate, isDark }: Props) {
  const { t } = useTranslation();
  const { showAlert } = useAppDialog();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();

  const [newName, setNewName] = useState("");
  const [pickedEmoji, setPickedEmoji] = useState(ONBOARDING_ADD_CATEGORY_ICON_PRESETS[0].emoji);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [emojiSheetOpen, setEmojiSheetOpen] = useState(false);
  const [addCategoryKeyboardH, setAddCategoryKeyboardH] = useState(0);

  useEffect(() => {
    if (visible) {
      setNewName("");
      setPickedEmoji(ONBOARDING_ADD_CATEGORY_ICON_PRESETS[0].emoji);
      setNewColor(COLORS[0]);
      setEmojiSheetOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setAddCategoryKeyboardH(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvt, (e) =>
      setAddCategoryKeyboardH(keyboardHeightFromEvent(e)),
    );
    const subHide = Keyboard.addListener(hideEvt, () => setAddCategoryKeyboardH(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [visible]);

  const [addModalBaselineWinH, setAddModalBaselineWinH] = useState(0);
  useLayoutEffect(() => {
    if (!visible) {
      setAddModalBaselineWinH(0);
      return;
    }
    setAddModalBaselineWinH((prev) => (prev === 0 ? winH : prev));
  }, [visible, winH]);

  const addModalLayoutKbd =
    visible && addModalBaselineWinH > 0 ? Math.max(0, addModalBaselineWinH - winH) : 0;
  const addCatKbdFromEvents = visible ? Math.max(keyboardInset, addCategoryKeyboardH) : 0;
  const addCatModalKbdMax = Math.max(addCatKbdFromEvents, addModalLayoutKbd);
  const addCategoryModalPadBottom =
    visible && addCatModalKbdMax > 0
      ? Math.max(0, keyboardLiftPaddingBottom(addCatModalKbdMax) - addModalLayoutKbd)
      : 0;

  const bg = isDark ? "#0f0f0f" : "#f5f5f5";
  const text = isDark ? "#fff" : "#000";
  const muted = isDark ? "#777" : "#888";
  const border = isDark ? "#2a2a2a" : "#e0e0e0";
  const inputBg = isDark ? "#111" : "#f0f0f0";
  const addScreenBottomBarBg = isDark ? "#0a0a0a" : "#fff";
  const addScreenSaveBtnBg = isDark ? "#2c2c2e" : "#e2e2e6";
  const addScreenSaveLabel = isDark ? "#fff" : "#111";

  const handleCreate = async () => {
    if (!newName.trim()) {
      showAlert(t("common.formValidationTitle"), t("onboarding.categoryNameRequired"));
      return;
    }
    try {
      await Promise.resolve(
        onCreate({
          name: newName.trim(),
          emoji: pickedEmoji,
          color: newColor.color,
          bgColor: newColor.bg,
        }),
      );
      onClose();
    } catch {
      showAlert(t("common.error"), t("settings.categorySaveFailed"));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingTop: 4,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={28} color={text} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              color: text,
              fontSize: 17,
              fontWeight: "700",
              marginHorizontal: 8,
            }}
            numberOfLines={1}
          >
            {t("onboarding.newCategory")}
          </Text>
          <View style={{ width: 44, height: 44 }} />
        </View>

        <View style={{ flex: 1, paddingBottom: addCategoryModalPadBottom }}>
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
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={{ position: "relative", marginBottom: 12 }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 24,
                    backgroundColor: newColor.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CategoryGlyph emoji={pickedEmoji} size={48} color={newColor.color} />
                </View>
                <Pressable
                  onPress={() => setEmojiSheetOpen(true)}
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
                  accessibilityLabel={t("common.chooseEmoji")}
                >
                  <Ionicons name="pencil" size={16} color={text} />
                </Pressable>
              </View>
              <Text style={{ color: newColor.color, fontSize: 15, fontWeight: "700" }}>
                {newName || t("onboarding.categoryNamePlaceholder")}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: border,
                marginBottom: 20,
              }}
            >
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t("onboarding.categoryNamePlaceholder")}
                placeholderTextColor={muted}
                style={{ color: text, fontSize: 16, paddingVertical: 14 }}
              />
            </View>

            <Text
              style={{
                color: muted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              {t("onboarding.emoji")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {ONBOARDING_ADD_CATEGORY_ICON_PRESETS.map((row) => {
                const selected = row.emoji === pickedEmoji;
                return (
                <Pressable
                  key={row.emoji}
                  onPress={() => setPickedEmoji(row.emoji)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? `${PURPLE}22` : inputBg,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? PURPLE : border,
                    marginRight: 8,
                  }}
                >
                  <CategoryGlyph emoji={row.emoji} size={26} color={selected ? PURPLE : text} />
                </Pressable>
                );
              })}
            </ScrollView>

            <Text
              style={{
                color: muted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              {t("settings.categoryColorLabel")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              {COLORS.map((c) => (
                <Pressable
                  key={c.color}
                  onPress={() => setNewColor(c)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: c.color,
                    borderWidth: c.color === newColor.color ? 3 : 0,
                    borderColor: "#fff",
                    transform: [{ scale: c.color === newColor.color ? 1.15 : 1 }],
                  }}
                />
              ))}
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: actionBarInnerBottomPad(addCatModalKbdMax, insets.bottom),
              backgroundColor: addScreenBottomBarBg,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isDark ? "#222" : "#e5e5e5",
            }}
          >
            <Pressable
              onPress={handleCreate}
              style={{
                width: "100%",
                alignSelf: "stretch",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: addScreenSaveBtnBg,
                borderRadius: 16,
                paddingVertical: 16,
              }}
              accessibilityRole="button"
              accessibilityLabel={t("settings.categoryEditorCreate")}
            >
              <Ionicons name="checkmark-circle" size={22} color={addScreenSaveLabel} />
              <Text style={{ color: addScreenSaveLabel, fontSize: 17, fontWeight: "700" }}>
                {t("settings.categoryEditorCreate")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <EmojiPickerSheet
        visible={emojiSheetOpen}
        onSelect={setPickedEmoji}
        onClose={() => setEmojiSheetOpen(false)}
        isDark={isDark}
        accentColor={newColor.color}
      />
    </Modal>
  );
}
