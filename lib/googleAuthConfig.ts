import { Platform } from "react-native";

/**
 * Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs.
 * Değerler `frontend/.env` içinde EXPO_PUBLIC_* olarak; Expo bunları yükler (başka env dosyası yok).
 * EAS build’te aynı isimlerle ortam değişkeni verin.
 */
export function getGoogleOAuthClientIds(): {
  ios?: string;
  android?: string;
  web?: string;
  isConfigured: boolean;
} {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const ids = { ios, android, web };
  const isConfigured = googleIdsForCurrentPlatform(ids).ok;
  return { ...ids, isConfigured };
}

/**
 * Web: sadece web client id.
 * iOS/Android (native Google Sign-In): platform client id + Web application client id
 * (`webClientId` — idToken için; uygulama web’de olmasa da GCloud’da “Web” tipi oluşturulur).
 */
export function googleIdsForCurrentPlatform(ids: {
  ios?: string;
  android?: string;
  web?: string;
}): { ok: boolean; missing: string } {
  if (Platform.OS === "web") {
    if (!ids.web) return { ok: false, missing: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" };
    return { ok: true, missing: "" };
  }
  if (!ids.web) {
    return {
      ok: false,
      missing: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (native idToken için zorunlu)",
    };
  }
  if (Platform.OS === "ios") {
    if (!ids.ios) return { ok: false, missing: "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" };
  } else if (Platform.OS === "android") {
    if (!ids.android) return { ok: false, missing: "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" };
  }
  return { ok: true, missing: "" };
}
