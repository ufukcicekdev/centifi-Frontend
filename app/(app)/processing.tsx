import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, Pressable,
  Alert, Platform, KeyboardAvoidingView, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useStore } from "../../store/useStore";
import { getCategoryMeta } from "../../constants/mockData";
import AILoadingAnimation from "../../components/AILoadingAnimation";
import { createExpense, expenseListIdForApi } from "../../lib/backend";

function EditableField({ label, value, onChangeText, keyboardType = "default", isDark, prefix }: {
  label: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad"; isDark: boolean; prefix?: string;
}) {
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
      <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {prefix && <Text style={{ color: textColor, fontSize: 22, fontWeight: "700", marginRight: 4 }}>{prefix}</Text>}
        <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType}
          style={{ color: textColor, fontSize: prefix ? 22 : 16, fontWeight: prefix ? "700" : "500", flex: 1, padding: 0 }}
          placeholderTextColor={mutedColor} />
      </View>
    </View>
  );
}

function CategoryPicker({ selected, onSelect, isDark }: { selected: string; onSelect: (c: string) => void; isDark: boolean }) {
  const { allCategories, customCategories, categoryDisplayOverrides } = useStore();
  const categories = allCategories();
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const mutedColor = isDark ? "#888888" : "#666666";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  return (
    <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor }}>
      <Text style={{ color: mutedColor, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories.map((cat) => {
          const meta = getCategoryMeta(cat.id, customCategories, categoryDisplayOverrides);
          const isSelected = cat.id === selected;
          return (
            <Pressable key={cat.id} onPress={() => onSelect(cat.id)}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                backgroundColor: isSelected ? meta.bgColor : isDark ? "#252525" : "#f5f5f5",
                borderWidth: isSelected ? 1.5 : 1,
                borderColor: isSelected ? meta.color : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 14 }}>{meta.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: isSelected ? "600" : "400", color: isSelected ? meta.color : mutedColor }}>
                {meta.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Processing() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDark, pendingExpense, addExpense, setPendingExpense, customCategories, activeListId, categoryDisplayOverrides } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const bg = isDark ? "#0f0f0f" : "#f8f8f8";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingExpense) {
        setAmount(pendingExpense.amount.toFixed(2));
        setDescription(pendingExpense.description);
        setCategory(pendingExpense.category);
        setDate(pendingExpense.date);
      }
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    try {
      const { notificationAsync, NotificationFeedbackType } = await import("expo-haptics");
      await notificationAsync(NotificationFeedbackType.Success);
    } catch {}
    const payload = { amount: parseFloat(amount), description, category, date, currency: "USD" };
    const list_id = expenseListIdForApi(activeListId);
    try {
      const created = await createExpense({
        ...payload,
        is_income: false,
        ...(list_id != null ? { list_id } : {}),
      });
      addExpense({
        ...payload,
        id: String(created.id),
        listId: activeListId,
        currency: created.currency ?? payload.currency,
        isIncome: false,
      });
      setPendingExpense(null);
      setIsSuccess(true);
      setTimeout(() => router.replace("/(app)"), 1200);
    } catch {
      Alert.alert("Save Failed", "Could not save to server. Please try again.");
    }
  };

  const meta = getCategoryMeta(category, customCategories, categoryDisplayOverrides);

  if (isSuccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#43E97B20", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="checkmark" size={40} color="#43E97B" />
        </View>
        <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>{t("processing.successMessage")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 }}>
          <Pressable onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: cardBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor, marginRight: 14 }}>
            <Ionicons name="chevron-back" size={20} color={mutedColor} />
          </Pressable>
          <Text style={{ color: textColor, fontSize: 18, fontWeight: "700" }}>
            {isLoading ? t("processing.title") : "Review Expense"}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <AILoadingAnimation isDark={isDark} />
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <View style={{ backgroundColor: cardBg, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor, alignItems: "center" }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: meta.bgColor, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Text style={{ fontSize: 32 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{ color: mutedColor, fontSize: 18, fontWeight: "600", marginTop: 6, marginRight: 2 }}>$</Text>
                  <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
                    style={{ color: textColor, fontSize: 48, fontWeight: "800", letterSpacing: -2, minWidth: 80, padding: 0, textAlign: "center" }} />
                </View>
                <Text style={{ color: meta.color, fontSize: 13, fontWeight: "600", marginTop: 4 }}>
                  {meta.emoji} {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              <EditableField label={t("processing.description")} value={description} onChangeText={setDescription} isDark={isDark} />
              <EditableField label={t("processing.date")} value={date} onChangeText={setDate} isDark={isDark} />
              <CategoryPicker selected={category} onSelect={setCategory} isDark={isDark} />
            </Animated.View>
          )}
        </ScrollView>

        {!isLoading && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: Platform.OS === "ios" ? 36 : 24, backgroundColor: bg, borderTopWidth: 1, borderTopColor: borderColor }}>
            <Pressable onPress={handleConfirm}
              style={({ pressed }) => ({ backgroundColor: "#6C63FF", borderRadius: 18, padding: 18, alignItems: "center", opacity: pressed ? 0.85 : 1, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 })}>
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 }}>{t("processing.confirmButton")}</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
