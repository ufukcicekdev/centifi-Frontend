import React, { useEffect, useMemo, useState } from "react";
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
import { verifyPasswordResetCode, completePasswordReset } from "../../lib/backend";
import { saveTokens, getApiErrorStatus, formatApiErrorDetailBody, type ApiError } from "../../lib/api";
import { useStore } from "../../store/useStore";
import { useAppDialog } from "../../context/AppDialogContext";
import { isValidEmail } from "../../lib/isValidEmail";

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
  const params = useLocalSearchParams<{ email?: string }>();
  const { showAlert } = useAppDialog();
  const initialEmail = useMemo(() => safeDecode(firstParam(params.email)).trim(), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const clearVerified = () => {
    setResetToken(null);
    setPassword("");
  };

  const verifyCode = async () => {
    const e = email.trim();
    if (!e || !isValidEmail(e)) {
      showAlert(t("auth.invalidEmailTitle"), t("auth.invalidEmailBody"));
      return;
    }
    const c = code.replace(/\D/g, "").slice(0, 6);
    if (c.length !== 6) {
      showAlert(t("common.error"), t("auth.resetPasswordCodeInvalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await verifyPasswordResetCode({ email: e, code: c });
      setResetToken(res.reset_token);
      setPassword("");
    } catch (err: unknown) {
      const status = getApiErrorStatus(err);
      const details = err && typeof err === "object" && "details" in err ? (err as ApiError).details : undefined;
      const msg = formatApiErrorDetailBody(details) ?? t("common.error");
      showAlert(status === 400 ? t("common.error") : t("common.error"), msg);
    } finally {
      setLoading(false);
    }
  };

  const saveNewPassword = async () => {
    if (!resetToken) return;
    if (password.length < 6) {
      showAlert(t("common.error"), t("auth.passwordMinLength"));
      return;
    }
    setLoading(true);
    try {
      await completePasswordReset({ reset_token: resetToken, new_password: password });
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

          <Text style={{ color: MUTED, fontSize: 15, lineHeight: 22, marginBottom: 22 }}>
            {resetToken ? t("auth.resetPasswordStep2Subtitle") : t("auth.resetPasswordSubtitle")}
          </Text>

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
              marginBottom: 16,
            }}
          >
            <Ionicons name="mail-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearVerified();
              }}
              placeholder="you@example.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
            />
          </View>

          <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
            {t("auth.resetPasswordCodeLabel").toUpperCase()}
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
              marginBottom: 16,
            }}
          >
            <Ionicons name="keypad-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, "").slice(0, 6));
                clearVerified();
              }}
              placeholder="000000"
              placeholderTextColor={MUTED}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              style={{ flex: 1, color: TEXT, fontSize: 20, letterSpacing: 6, paddingVertical: 14, fontVariant: ["tabular-nums"] }}
            />
          </View>

          {!resetToken ? (
            <Pressable
              onPress={() => void verifyCode()}
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
                marginBottom: 12,
              })}
            >
              {loading ? (
                <ActivityIndicator color={CTA_TEXT} />
              ) : (
                <Text style={{ color: CTA_TEXT, fontSize: 16, fontWeight: "800" }}>{t("auth.resetPasswordVerifySubmit")}</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Pressable onPress={clearVerified} disabled={loading} style={{ alignSelf: "flex-start", marginBottom: 16 }}>
                <Text style={{ color: CTA_FILL, fontSize: 14, fontWeight: "600" }}>{t("auth.resetPasswordEditCode")}</Text>
              </Pressable>

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
                  editable={!loading}
                  style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                />
              </View>

              <Pressable
                onPress={() => void saveNewPassword()}
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
