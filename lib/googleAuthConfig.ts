import Constants from "expo-constants";
import { Platform } from "react-native";

type GoogleExtra = {
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  googleWebClientId?: string;
};

function readExtra(): GoogleExtra {
  return (Constants.expoConfig?.extra ?? {}) as GoogleExtra;
}

function readGoogleEnv(
  envKey: "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" | "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID" | "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
  extraKey: keyof GoogleExtra,
): string | undefined {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  const fromExtra = readExtra()[extraKey]?.trim();
  return fromExtra || undefined;
}

/**
 * Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs.
 * Kaynak: `frontend/.env` (EXPO_PUBLIC_*) + `app.config.js` → expo.extra (Xcode build yedek).
 */
export function getGoogleOAuthClientIds(): {
  ios?: string;
  android?: string;
  web?: string;
  isConfigured: boolean;
} {
  const ios = readGoogleEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", "googleIosClientId");
  const android = readGoogleEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", "googleAndroidClientId");
  const web = readGoogleEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "googleWebClientId");
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
