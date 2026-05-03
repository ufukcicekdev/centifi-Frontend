import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useStore } from "../../store/useStore";
import { getApiErrorStatus, loadTokens, type ApiError } from "../../lib/api";
import { loginWithEmail, socialAuth } from "../../lib/backend";
import { getGoogleOAuthClientIds } from "../../lib/googleAuthConfig";
import { useAppDialog } from "../../context/AppDialogContext";
import { isValidEmail } from "../../lib/isValidEmail";
import CentifiLogo from "../../components/CentifiLogo";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import Svg, { Path } from "react-native-svg";

// Design tokens (dark-only, matching HTML)
const BG           = "#0b1326";
const SURFACE      = "#171f32";
const SURFACE_HIGH = "#222a3d";
const BORDER       = "#404758";
const TEXT         = "#dee2f1";
const MUTED        = "#bfc5d7";
const PRIMARY = "#bfc2ff";
/** Ana CTA — koyu yüzeyde net görünsün (PRIMARY_CTR ile karışmasın) */
const CTA_FILL = "#6C63FF";
const CTA_TEXT = "#ffffff";

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

const SOCIAL_BTN_HEIGHT = 52;
const SOCIAL_GAP = 12;

const styles = StyleSheet.create({
  authColumn: {
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },
  socialButton: {
    width: "100%",
    minHeight: SOCIAL_BTN_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  socialButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialLabel: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: SOCIAL_GAP,
  },
});

export default function Login() {
  const { showAlert } = useAppDialog();
  const { t } = useTranslation();
  const router = useRouter();
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** E-posta formu açıkken tam ekran minHeight klavye + ortalamayı birlikte kırıyor; yalnız sosyal girişte kullan */
  const scrollMinHeight = Math.max(winH - insets.top - insets.bottom, 520);
  const scrollRef = useRef<ScrollView>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const googleConfigured = getGoogleOAuthClientIds().isConfigured;

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      showAlert(t("auth.missingFieldsTitle"), t("auth.missingFieldsBody"));
      return;
    }
    if (!isValidEmail(email)) {
      showAlert(t("auth.invalidEmailTitle"), t("auth.invalidEmailBody"));
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      const result = await useStore.getState().hydrateFromBackend();
      if (result === "ok") return;
      if (result === "unreachable") {
        const tokensKept = await loadTokens();
        showAlert(
          t("auth.hydrateUnreachableTitle"),
          tokensKept ? t("auth.hydrateUnreachableWithTokensBody") : t("auth.hydrateUnreachableNoTokensBody"),
        );
        return;
      }
      if (result === "session_invalid") {
        showAlert(t("auth.sessionVerifyFailedTitle"), t("auth.sessionVerifyFailedBody"));
      }
    } catch (e: unknown) {
      const status = getApiErrorStatus(e);
      const details =
        e && typeof e === "object" && "details" in e ? (e as ApiError).details : undefined;
      let msg = t("auth.incorrectCredentials");
      if (e instanceof TypeError || (e instanceof Error && /network|fetch|failed/i.test(e.message))) {
        msg = t("auth.networkUnreachableLogin");
      } else if (details && typeof details === "object") {
        const d = details as Record<string, unknown>;
        if (typeof d.detail === "string") {
          msg = d.detail;
        } else if (Array.isArray(d.non_field_errors) && d.non_field_errors[0]) {
          msg = String(d.non_field_errors[0]);
        } else if (d.email) {
          const em = d.email;
          msg = Array.isArray(em) ? String(em[0]) : String(em);
        }
      }
      if (
        status === 401 &&
        (msg === t("auth.incorrectCredentials") || msg === "Incorrect email or password.")
      ) {
        msg = t("auth.wrongCredentialsLocalized");
      }
      showAlert(t("auth.loginFailedTitle"), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = [credential.fullName?.givenName ?? "", credential.fullName?.familyName ?? ""]
        .filter(Boolean).join(" ");
      await socialAuth({ provider: "apple", token: credential.identityToken ?? "", name, email: credential.email ?? "" });
      const result = await useStore.getState().hydrateFromBackend();
      if (result === "unreachable") {
        const tokensKept = await loadTokens();
        if (tokensKept) {
          showAlert(t("auth.hydrateUnreachableTitle"), t("auth.hydrateUnreachableAppleBody"));
        }
      }
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") showAlert(t("auth.appleSignInFailedTitle"), t("auth.appleSignInFailedBody"));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: showEmail ? undefined : scrollMinHeight,
            paddingHorizontal: 24,
            paddingTop: showEmail ? 16 : 12,
            paddingBottom: showEmail
              ? Math.max(insets.bottom, 24) + (Platform.OS === "android" ? 32 : 56)
              : Math.max(insets.bottom, 16),
            alignItems: "stretch",
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "android" ? "none" : "interactive"}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios" || (Platform.OS === "android" && showEmail)}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: "100%",
              flexGrow: showEmail ? 0 : 1,
              minHeight: showEmail ? undefined : 0,
              justifyContent: showEmail ? "flex-start" : "center",
              paddingVertical: showEmail ? 4 : 16,
            }}
          >
            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <View
                style={{
                  width: 76,
                  height: 76,
                  backgroundColor: "#7B71FF",
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  shadowColor: PRIMARY,
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 10,
                }}
              >
                <CentifiLogo size={44} showName={false} />
              </View>
              <Text style={{ color: TEXT, fontSize: 22, fontWeight: "700", marginBottom: 6 }}>centifi</Text>
              <Text style={{ color: MUTED, fontSize: 14, textAlign: "center" }}>Track smarter, spend wiser</Text>
            </View>

            <View style={styles.authColumn}>
              {/* Apple — iOS only (dark style matches surface buttons) */}
              {Platform.OS === "ios" && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ width: "100%", height: SOCIAL_BTN_HEIGHT, marginBottom: SOCIAL_GAP }}
                  onPress={handleApple}
                />
              )}

              {/* Google — .env’de üç OAuth client id gerekir; yoksa yapılandırma uyarısı */}
              {googleConfigured ? (
                <GoogleSignInButton
                  borderColor={BORDER}
                  surfaceColor={SURFACE}
                  textColor={TEXT}
                  minHeight={SOCIAL_BTN_HEIGHT}
                  marginBottom={SOCIAL_GAP}
                  label="Continue with Google"
                  renderIcon={() => <GoogleIcon />}
                />
              ) : (
                <Pressable
                  onPress={() =>
                    showAlert(
                      "Google Sign-In",
                      "Android/iOS: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (veya iOS), EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (idToken için Web application istemcisi) ve gerekirse iOS id. Google Cloud’da Android’e SHA-1 ekleyin. Sonra Expo’yu yeniden başlatın.",
                    )
                  }
                  style={({ pressed }) => [
                    styles.socialButton,
                    { marginBottom: SOCIAL_GAP, opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <View style={styles.socialButtonInner}>
                    <GoogleIcon />
                    <Text style={styles.socialLabel}>Continue with Google</Text>
                  </View>
                </Pressable>
              )}

              {/* Divider */}
              {!showEmail && (
                <View style={styles.dividerRow}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER }} />
                  <Text style={{ color: MUTED, marginHorizontal: 14, fontSize: 13 }}>or</Text>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER }} />
                </View>
              )}

              {/* Email button */}
              {!showEmail && (
                <Pressable
                  onPress={() => setShowEmail(true)}
                  style={({ pressed }) => [styles.socialButton, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <View style={styles.socialButtonInner}>
                    <Ionicons name="mail-outline" size={20} color={MUTED} />
                    <Text style={styles.socialLabel}>Continue with email</Text>
                  </View>
                </Pressable>
              )}
            </View>

          {/* Email form */}
          {showEmail && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
                <Text style={{ color: MUTED, marginHorizontal: 16, fontSize: 14 }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
              </View>

              <View style={{
                backgroundColor: SURFACE, borderRadius: 20,
                borderWidth: 1, borderColor: BORDER, padding: 20,
              }}>
                {/* Email */}
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
                  EMAIL
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: SURFACE_HIGH, borderRadius: 12,
                  paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 16,
                }}>
                  <Ionicons name="mail-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={MUTED}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                  />
                </View>

                {/* Password */}
                <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 }}>
                  PASSWORD
                </Text>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: SURFACE_HIGH, borderRadius: 12,
                  paddingHorizontal: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 12,
                }}>
                  <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={{ marginRight: 10 }} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => {
                      if (Platform.OS !== "android") return;
                      requestAnimationFrame(() => {
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                      });
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPass}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailLogin}
                    style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={MUTED} />
                  </Pressable>
                </View>

                <Pressable style={{ alignSelf: "flex-end", marginBottom: 20 }} hitSlop={8}>
                  <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: "600" }}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  onPress={handleEmailLogin}
                  disabled={loading}
                  style={({ pressed }) => ({
                    width: "100%",
                    minHeight: SOCIAL_BTN_HEIGHT,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    backgroundColor: CTA_FILL,
                    shadowColor: CTA_FILL,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 8,
                    opacity: pressed || loading ? 0.88 : 1,
                  })}
                >
                  {loading ? (
                    <ActivityIndicator color={CTA_TEXT} />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: CTA_TEXT, fontSize: 16, fontWeight: "800" }}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={CTA_TEXT} style={{ marginLeft: 10 }} />
                    </View>
                  )}
                </Pressable>
              </View>
            </>
          )}
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={{ flexDirection: "row", justifyContent: "center", paddingTop: 20, paddingBottom: 8 }}
          >
            <Text style={{ color: MUTED, fontSize: 14 }}>Don't have an account? </Text>
            <Text style={{ color: PRIMARY, fontSize: 14, fontWeight: "600" }}>Sign Up</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
