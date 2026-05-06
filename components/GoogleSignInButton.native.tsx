import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { socialAuth } from "../lib/backend";
import { useStore } from "../store/useStore";
import { getApiErrorStatus, loadTokens, type ApiError } from "../lib/api";
import {
  getGoogleOAuthClientIds,
  googleIdsForCurrentPlatform,
} from "../lib/googleAuthConfig";
import { useAppDialog } from "../context/AppDialogContext";
import { useTranslation } from "react-i18next";

type Props = {
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  minHeight: number;
  marginBottom: number;
  renderIcon: () => React.ReactNode;
  label: string;
};

function formatGoogleNativeError(e: unknown): string {
  if (isErrorWithCode(e)) {
    const code = (e as { code?: string | number }).code;
    const msg = (e as { message?: string }).message ?? "";
    if (code === 10 || String(code) === "10" || /DEVELOPER_ERROR/i.test(String(msg))) {
      return `${msg || "DEVELOPER_ERROR"}\n\nGenelde sebep: Google Cloud → Android OAuth istemcisinde (paket: centifi.app) bu derlemenin SHA-1’i eksik.\n• Mağazadan indirilen sürüm: Play Console → Uygulama bütünlüğü → Uygulama imzalama anahtarı sertifikası → SHA-1 (çoğu zaman gerekli olan budur).\n• Yerel/AAB imzalama: upload keystore SHA-1.\nDebug ile release SHA-1 farklıdır; gerekiyorsa ikisini de ekleyin.\n\nYerel: android/ içinde ./gradlew signingReport`;
    }
    return msg ? `${String(code)}: ${msg}` : String(code);
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

function formatBackendOrNetworkError(e: unknown): string {
  const status = getApiErrorStatus(e);
  const detail =
    e &&
    typeof e === "object" &&
    "details" in e &&
    (e as ApiError).details &&
    typeof (e as ApiError).details === "object" &&
    (e as ApiError).details !== null &&
    "detail" in ((e as ApiError).details as object)
      ? String(((e as ApiError).details as { detail: unknown }).detail)
      : null;
  if (detail) return detail;
  if (status === 401) {
    return "Sunucu Google jetonunu doğrulayamadı (Invalid Google token). id_token süresi veya audience uyumsuz olabilir.";
  }
  if (e instanceof TypeError && /Network request failed|Failed to fetch/i.test(e.message)) {
    return "API’ye ulaşılamadı. Fiziksel telefonda EXPO_PUBLIC_API_BASE_URL içinde 127.0.0.1 kullanmayın; bilgisayarın yerel IP’sini yazın (örn. http://192.168.1.x:8000) ve Django’yu 0.0.0.0:8000 ile çalıştırın.";
  }
  if (e instanceof Error) return e.message;
  return "Sunucu veya ağ hatası. EXPO_PUBLIC_API_BASE_URL ve backend loglarını kontrol edin.";
}

/**
 * Google Play Services / iOS GoogleSignIn — tam ekran tarayıcı yerine sistem hesap seçici.
 */
export default function GoogleSignInButton(props: Props) {
  const { showAlert } = useAppDialog();
  const { t } = useTranslation();
  const ids = getGoogleOAuthClientIds();
  const [busy, setBusy] = useState(false);
  const configured = useRef(false);

  async function completeBackendLogin(idToken: string) {
    await socialAuth({ provider: "google", token: idToken, language: useStore.getState().language });
    const result = await useStore.getState().hydrateFromBackend();
    if (result === "unreachable") {
      const tokensKept = await loadTokens();
      if (tokensKept) {
        showAlert(t("auth.hydrateUnreachableTitle"), t("auth.googleProfileLoadFailedShort"));
      }
    }
  }

  useEffect(() => {
    const check = googleIdsForCurrentPlatform(ids);
    if (!check.ok || !ids.web) return;
    GoogleSignin.configure({
      webClientId: ids.web,
      ...(ids.ios ? { iosClientId: ids.ios } : {}),
    });
    configured.current = true;
  }, [ids.web, ids.ios, ids.android]);

  const onPress = async () => {
    const check = googleIdsForCurrentPlatform(ids);
    if (!check.ok) {
      showAlert(t("auth.googleSetupTitle"), t("auth.googleEnvMissing", { missing: check.missing }));
      return;
    }
    if (!configured.current) {
      showAlert(t("auth.googleSignInTitle"), t("auth.googleSignInNotConfiguredBody"));
      return;
    }

    setBusy(true);
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const res = await GoogleSignin.signIn();
      if (res.type !== "success") {
        return;
      }
      const idToken = res.data.idToken;
      if (!idToken) {
        showAlert(t("auth.googleSignInTitle"), t("auth.googleNoIdTokenBody"));
        return;
      }
      try {
        await completeBackendLogin(idToken);
      } catch (be: unknown) {
        showAlert(t("auth.googleSignInServerTitle"), formatBackendOrNetworkError(be));
      }
    } catch (e: unknown) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
          return;
        }
      }
      showAlert(t("auth.googleSignInTitle"), formatGoogleNativeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.socialButton,
        {
          borderColor: props.borderColor,
          backgroundColor: props.surfaceColor,
          minHeight: props.minHeight,
          marginBottom: props.marginBottom,
          opacity: pressed || busy ? 0.72 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={props.textColor} />
      ) : (
        <View style={styles.socialButtonInner}>
          {props.renderIcon()}
          <Text style={[styles.socialLabel, { color: props.textColor }]}>{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  socialButton: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 12,
  },
});
