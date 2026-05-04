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
import { requestPasswordReset } from "../../lib/backend";
import { getApiErrorStatus, formatApiErrorDetailBody, type ApiError } from "../../lib/api";
import { isValidEmail } from "../../lib/isValidEmail";
import { useAppDialog } from "../../context/AppDialogContext";

const BG = "#0b1326";
const SURFACE_HIGH = "#222a3d";
const BORDER = "#404758";
const TEXT = "#dee2f1";
const MUTED = "#bfc5d7";
const CTA_FILL = "#6C63FF";
const CTA_TEXT = "#ffffff";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppDialog();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = email.trim();
    if (!e || !isValidEmail(e)) {
      showAlert(t("auth.invalidEmailTitle"), t("auth.invalidEmailBody"));
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset(e);
      showAlert(t("auth.forgotPasswordSentTitle"), res.detail || t("auth.forgotPasswordSentBody"));
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 24 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Pressable onPress={() => router.back()} hitSlop={14} style={{ padding: 8, marginLeft: -4 }}>
              <Ionicons name="chevron-back" size={26} color={MUTED} />
            </Pressable>
            <Text style={{ flex: 1, color: TEXT, fontSize: 18, fontWeight: "800", textAlign: "center", marginRight: 26 }}>
              {t("auth.forgotPasswordTitle")}
            </Text>
          </View>

          <Text style={{ color: MUTED, fontSize: 15, lineHeight: 22, marginBottom: 22 }}>{t("auth.forgotPasswordSubtitle")}</Text>

          <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>EMAIL</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: SURFACE_HIGH,
              borderRadius: 12,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: BORDER,
              marginBottom: 24,
            }}
          >
            <Ionicons name="mail-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
            />
          </View>

          <Pressable
            onPress={() => void submit()}
            disabled={loading}
            style={({ pressed }) => ({
              width: "100%",
              minHeight: 52,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: CTA_FILL,
              opacity: pressed || loading ? 0.88 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color={CTA_TEXT} />
            ) : (
              <Text style={{ color: CTA_TEXT, fontSize: 16, fontWeight: "800" }}>{t("auth.forgotPasswordSubmit")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
