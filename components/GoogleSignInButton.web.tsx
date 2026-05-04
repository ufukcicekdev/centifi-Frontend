import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import type { AuthSessionResult } from "expo-auth-session";

import { socialAuth } from "../lib/backend";
import { useStore } from "../store/useStore";
import { loadTokens } from "../lib/api";
import {
  getGoogleOAuthClientIds,
  googleIdsForCurrentPlatform,
} from "../lib/googleAuthConfig";
import { useAppDialog } from "../context/AppDialogContext";

type Props = {
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  minHeight: number;
  marginBottom: number;
  renderIcon: () => React.ReactNode;
  label: string;
};

function extractIdToken(res: AuthSessionResult | null): string | null {
  if (!res || res.type !== "success") return null;
  const p = res.params as Record<string, string | undefined>;
  if (p.id_token) return p.id_token;
  const auth = (res as { authentication?: { idToken?: string } }).authentication;
  if (auth?.idToken) return auth.idToken;
  return null;
}

export default function GoogleSignInButton(props: Props) {
  const { showAlert } = useAppDialog();
  const ids = getGoogleOAuthClientIds();
  const [_, response, promptAsync] = Google.useAuthRequest({
    iosClientId: ids.ios,
    androidClientId: ids.android,
    webClientId: ids.web,
  });
  const [busy, setBusy] = useState(false);
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    const idToken = extractIdToken(response);
    if (!idToken || lastHandled.current === idToken) return;
    lastHandled.current = idToken;

    (async () => {
      setBusy(true);
      try {
        await socialAuth({ provider: "google", token: idToken, language: useStore.getState().language });
        const result = await useStore.getState().hydrateFromBackend();
        if (result === "unreachable") {
          const tokensKept = await loadTokens();
          if (tokensKept) {
            showAlert(
              "Bağlantı / profil",
              "Profil yüklenemedi. EXPO_PUBLIC_API_BASE_URL ve backend adresini kontrol edin.",
            );
          }
        }
      } catch {
        showAlert("Google Sign-In", "Giriş tamamlanamadı. Tekrar deneyin.");
      } finally {
        setBusy(false);
      }
    })();
  }, [response]);

  const onPress = async () => {
    const check = googleIdsForCurrentPlatform(ids);
    if (!check.ok) {
      showAlert(
        "Google yapılandırması",
        `${check.missing} .env içinde tanımlı olmalı (Expo’yu yeniden başlatın).`,
      );
      return;
    }
    setBusy(true);
    lastHandled.current = null;
    try {
      const result = await promptAsync();
      if (result.type === "dismiss" || result.type === "cancel") {
        setBusy(false);
        return;
      }
      if (result.type === "error") {
        showAlert("Google Sign-In", "İptal edildi veya hata oluştu.");
        setBusy(false);
        return;
      }
      if (result.type === "success" && !extractIdToken(result)) {
        return;
      }
      if (result.type !== "success") {
        setBusy(false);
      }
    } catch {
      showAlert("Google Sign-In", "Bir hata oluştu.");
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
