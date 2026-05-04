import React, { useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { resetPasswordWithToken } from "../../lib/backend";
import { saveTokens, getApiErrorStatus, formatApiErrorDetailBody, type ApiError } from "../../lib/api";
import { useStore } from "../../store/useStore";
import { useAppDialog } from "../../context/AppDialogContext";

const BG = "#0b1326";
const SURFACE_HIGH = "#222a3d";
const BORDER = "#404758";
const TEXT = "#dee2f1";
const MUTED = "#bfc5d7";
const CTA_FILL = "#6C63FF";
const CTA_TEXT = "#ffffff";

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ uid?: string; token?: string }>();
  const { showAlert } = useAppDialog();
  const uid = useMemo(() => safeDecode(firstParam(params.uid)), [params.uid]);
  const token = useMemo(() => safeDecode(firstParam(params.token)), [params.token]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validLink = uid.length > 0 && token.length > 0;

  const submit = async () => {
    if (!validLink) {
      showAlert(t("common.error"), t("auth.resetPasswordMissingParams"));
      return;
    }
    if (password.length < 6) {
      showAlert(t("common.error"), t("auth.passwordMinLength"));
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithToken({ uid, token, new_password: password });
      await saveTokens(null);
      useStore.setState({ user: null, isAuthenticated: false });
      showAlert(t("auth.resetPasswordSuccessTitle"), t("auth.resetPasswordSuccessBody"));
      router.replace("/(auth)/login");
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
            <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={14} style={{ padding: 8, marginLeft: -4 }}>
              <Ionicons name="chevron-back" size={26} color={MUTED} />
            </Pressable>
            <Text style={{ flex: 1, color: TEXT, fontSize: 18, fontWeight: "800", textAlign: "center", marginRight: 26 }}>
              {t("auth.resetPasswordTitle")}
            </Text>
          </View>

          {!validLink ? (
            <Text style={{ color: MUTED, fontSize: 15, lineHeight: 22 }}>{t("auth.resetPasswordMissingParams")}</Text>
          ) : (
            <>
              <Text style={{ color: MUTED, fontSize: 15, lineHeight: 22, marginBottom: 22 }}>{t("auth.resetPasswordSubtitle")}</Text>
              <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
                {t("auth.resetPasswordNewLabel").toUpperCase()}
              </Text>
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
                <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED}
                  secureTextEntry
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
                  <Text style={{ color: CTA_TEXT, fontSize: 16, fontWeight: "800" }}>{t("auth.resetPasswordSubmit")}</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
