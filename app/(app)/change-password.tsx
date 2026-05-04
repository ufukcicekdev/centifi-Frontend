import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";
import { changePassword } from "../../lib/backend";
import { getApiErrorStatus, formatApiErrorDetailBody, type ApiError } from "../../lib/api";
import { useAppDialog } from "../../context/AppDialogContext";

const PURPLE = "#6C63FF";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const isDark = useStore((s) => s.isDark);
  const hasPassword = useStore((s) => s.user?.hasPassword === true);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);

  const bg = isDark ? "#0f0f0f" : "#f5f5f5";
  const card = isDark ? "#1c1c1e" : "#fff";
  const text = isDark ? "#fff" : "#111";
  const muted = isDark ? "#8e8e93" : "#666";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const inputBg = isDark ? "#2c2c2e" : "#f2f2f7";

  const submit = async () => {
    if (newPass.length < 6) {
      showAlert(t("common.error"), t("auth.passwordMinLength"));
      return;
    }
    if (hasPassword && !oldPass) {
      showAlert(t("common.error"), t("auth.missingFieldsBody"));
      return;
    }
    setLoading(true);
    try {
      await changePassword({
        ...(hasPassword ? { old_password: oldPass } : {}),
        new_password: newPass,
      });
      await useStore.getState().hydrateFromBackend();
      showAlert(t("auth.changePasswordSuccessTitle"), t("auth.changePasswordSuccessBody"));
      router.back();
    } catch (err: unknown) {
      const status = getApiErrorStatus(err);
      const details = err && typeof err === "object" && "details" in err ? (err as ApiError).details : undefined;
      const msg = formatApiErrorDetailBody(details) ?? t("common.error");
      showAlert(status === 400 ? t("common.error") : t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 12,
            minHeight: 48,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={14} style={{ position: "absolute", left: 8, padding: 8, zIndex: 1 }}>
            <Ionicons name="chevron-back" size={24} color={muted} />
          </Pressable>
          <Text style={{ color: text, fontSize: 17, fontWeight: "700" }}>{t("auth.changePasswordTitle")}</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: muted, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
            {hasPassword ? t("settings.changePasswordSubtitle") : t("auth.changePasswordSetSubtitle")}
          </Text>

          <View style={{ backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16 }}>
            {hasPassword ? (
              <>
                <Text style={{ color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
                  {t("auth.changePasswordCurrentLabel").toUpperCase()}
                </Text>
                <TextInput
                  value={oldPass}
                  onChangeText={setOldPass}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={muted}
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    color: text,
                    marginBottom: 16,
                  }}
                />
              </>
            ) : null}
            <Text style={{ color: muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
              {t("auth.changePasswordNewLabel").toUpperCase()}
            </Text>
            <TextInput
              value={newPass}
              onChangeText={setNewPass}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={muted}
              style={{
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                color: text,
                marginBottom: 20,
              }}
            />
            <Pressable
              onPress={() => void submit()}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: PURPLE,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: pressed || loading ? 0.88 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{t("auth.changePasswordSubmit")}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
