import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getAllCurrencyCodes, getCurrencyLabel } from "../lib/currencies";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selectedCode: string;
  isDark: boolean;
};

export function CurrencyPickerModal({ visible, onClose, onSelect, selectedCode, isDark }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const searchRef = useRef<TextInput>(null);
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    if (!visible) {
      setQuery("");
      return;
    }
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 320);
    return () => clearTimeout(focusTimer);
  }, [visible]);

  const locale = i18n.resolvedLanguage ?? i18n.language;

  const allCodes = useMemo(() => getAllCurrencyCodes(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? allCodes
      : allCodes.filter((code) => {
          const label = getCurrencyLabel(code, locale).toLowerCase();
          return code.toLowerCase().includes(q) || label.includes(q);
        });
    return [...base].sort((a, b) =>
      getCurrencyLabel(a, locale).localeCompare(getCurrencyLabel(b, locale), locale, { sensitivity: "base" }),
    );
  }, [allCodes, query, locale]);

  const textColor = isDark ? "#fff" : "#000";
  const muted = isDark ? "#8e8e93" : "#666";
  const card = isDark ? "#1c1c1e" : "#fff";
  const inputBg = isDark ? "#111" : "#f5f5f5";
  const border = isDark ? "#2c2c2c" : "#e5e5e5";
  const rowBorder = isDark ? "#3a3a3c" : "#efefef";
  const pillBg = isDark ? "#2c2c2e" : "#e8e8ed";
  const pillBorder = isDark ? "#3a3a3c" : "#d1d1d6";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#000" : "#f5f5f5" }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 }}>
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
            <Ionicons name="close" size={26} color={muted} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", color: textColor, fontSize: 17, fontWeight: "700" }}>
            {t("settings.currency")}
          </Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: inputBg,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: Platform.OS === "ios" ? 12 : 8,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: border,
            }}
          >
            <Ionicons name="search" size={20} color={muted} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t("settings.searchCurrency")}
              placeholderTextColor={muted}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus={visible}
              returnKeyType="search"
              clearButtonMode={Platform.OS === "ios" ? "while-editing" : undefined}
              keyboardType="default"
              style={{ flex: 1, color: textColor, fontSize: 16, padding: 0, minHeight: 22 }}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 + keyboardInset }}
          renderItem={({ item }) => {
            const label = getCurrencyLabel(item, locale);
            const sel = item === selectedCode;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: card,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: rowBorder,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: pillBg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: pillBorder,
                  }}
                >
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: "700", letterSpacing: 0.3 }}>
                    {item}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: textColor,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                  numberOfLines={2}
                >
                  {label}
                </Text>
                {sel ? <Ionicons name="checkmark-circle" size={22} color="#6C63FF" /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: muted, marginTop: 24, paddingHorizontal: 24 }}>
              {t("settings.currencyNoResults")}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
