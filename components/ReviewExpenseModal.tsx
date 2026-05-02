import React, { useState, useEffect, useRef } from "react";
import {
  Modal, View, Text, TextInput, ScrollView, Pressable,
  Platform, KeyboardAvoidingView, Animated, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getCategoryMeta, Category } from "../constants/mockData";
import { createExpense, expenseListIdForApi } from "../lib/backend";
import { useStore } from "../store/useStore";

interface ParsedExpense {
  amount: number;
  description: string;
  category: Category;
  date: string;
  currency: string;
}

interface Props {
  visible: boolean;
  parsing: boolean; // true = still waiting for Gemini response
  parsedExpense: ParsedExpense | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReviewExpenseModal({ visible, parsing, parsedExpense, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { isDark, addExpense, activeListId, allCategories, customCategories, categoryDisplayOverrides } = useStore();
  const categories = allCategories();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const bg = isDark ? "#0f0f0f" : "#f8f8f8";
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";

  useEffect(() => {
    if (parsedExpense && !parsing) {
      setAmount(parsedExpense.amount.toFixed(2));
      setDescription(parsedExpense.description);
      setCategory(parsedExpense.category);
      setDate(parsedExpense.date);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [parsedExpense, parsing]);

  // reset on close
  useEffect(() => {
    if (!visible) {
      setSuccess(false);
      setSaving(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible]);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setSaving(true);
    try {
      const { notificationAsync, NotificationFeedbackType } = await import("expo-haptics");
      await notificationAsync(NotificationFeedbackType.Success);
    } catch {}
    try {
      const list_id = expenseListIdForApi(activeListId);
      const dto = await createExpense({
        amount: parseFloat(amount),
        description,
        category,
        date,
        currency: "USD",
        is_income: false,
        ...(list_id != null ? { list_id } : {}),
      });
      addExpense({
        id: String(dto.id),
        amount: parseFloat(amount),
        description,
        category,
        date,
        currency: dto.currency ?? "USD",
        listId: activeListId,
        isIncome: false,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 900);
    } catch {
      setSaving(false);
    }
  };

  const meta = getCategoryMeta(category, customCategories, categoryDisplayOverrides);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: bg }}
      >
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 20 : 16, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: borderColor,
        }}>
          <Pressable onPress={onClose} style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: cardBg, alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor,
          }}>
            <Ionicons name="close" size={18} color={mutedColor} />
          </Pressable>
          <Text style={{ color: textColor, fontSize: 16, fontWeight: "700" }}>
            {parsing ? "Analyzing…" : success ? "Saved!" : "Review Expense"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {parsing ? (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={{ color: mutedColor, marginTop: 20, fontSize: 15 }}>Gemini is reading your receipt…</Text>
            </View>
          ) : success ? (
            <View style={{ alignItems: "center", paddingTop: 80 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: "#43E97B20", alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <Ionicons name="checkmark" size={38} color="#43E97B" />
              </View>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>Expense Saved!</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* Amount hero card */}
              <View style={{
                backgroundColor: cardBg, borderRadius: 24, padding: 24, marginBottom: 16,
                borderWidth: 1, borderColor, alignItems: "center",
              }}>
                <View style={{
                  width: 60, height: 60, borderRadius: 18,
                  backgroundColor: meta.bgColor, alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{ color: mutedColor, fontSize: 18, fontWeight: "600", marginTop: 6, marginRight: 2 }}>$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    style={{
                      color: textColor, fontSize: 48, fontWeight: "800",
                      letterSpacing: -2, minWidth: 80, padding: 0, textAlign: "center",
                    }}
                  />
                </View>
                <Text style={{ color: meta.color, fontSize: 13, fontWeight: "600", marginTop: 4 }}>
                  {meta.emoji} {meta.name}
                </Text>
              </View>

              {/* Description */}
              <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
                <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  style={{ color: textColor, fontSize: 16, fontWeight: "500", padding: 0 }}
                  placeholderTextColor={mutedColor}
                />
              </View>

              {/* Date */}
              <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
                <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>Date</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  style={{ color: textColor, fontSize: 16, fontWeight: "500", padding: 0 }}
                  placeholderTextColor={mutedColor}
                />
              </View>

              {/* Category picker */}
              <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
                <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {categories.map((cat) => {
                    const m = getCategoryMeta(cat.id, customCategories, categoryDisplayOverrides);
                    const isSelected = cat.id === category;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", gap: 6,
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: isSelected ? m.bgColor : isDark ? "#252525" : "#f5f5f5",
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected ? m.color : "transparent",
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                        <Text style={{ fontSize: 12, fontWeight: isSelected ? "600" : "400", color: isSelected ? m.color : mutedColor }}>
                          {m.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom buttons */}
        {!parsing && !success && (
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24,
            backgroundColor: bg, borderTopWidth: 1, borderTopColor: borderColor,
            flexDirection: "row", gap: 12,
          }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1, borderRadius: 16, padding: 16, alignItems: "center",
                backgroundColor: cardBg, borderWidth: 1, borderColor,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: mutedColor, fontSize: 15, fontWeight: "600" }}>Discard</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => ({
                flex: 2, borderRadius: 16, padding: 16, alignItems: "center",
                backgroundColor: "#6C63FF", opacity: pressed || saving ? 0.8 : 1,
                shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
              })}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Save Expense</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
