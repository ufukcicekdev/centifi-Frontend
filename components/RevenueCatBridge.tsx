import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useStore } from "../store/useStore";

/**
 * Giriş yapılınca RevenueCat’i kullanıcı id’si ile bağlar; çıkışta logOut.
 * Web’de ve API anahtarı yoksa işlem yok.
 */
export default function RevenueCatBridge() {
  const uid = useStore((s) => s.user?.uid);
  const authed = useStore((s) => s.isAuthenticated);
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (!authed || !uid) {
      if (lastUid.current) {
        lastUid.current = null;
        void import("../lib/revenuecat").then((m) => m.logoutRevenueCat());
      }
      return;
    }

    if (lastUid.current === uid) return;
    lastUid.current = uid;

    void (async () => {
      const { configureRevenueCatForUser, isRevenueCatConfigured } = await import("../lib/revenuecat");
      if (!isRevenueCatConfigured()) return;
      try {
        await configureRevenueCatForUser(uid);
      } catch (e) {
        if (__DEV__) {
          console.warn("[Centifi] RevenueCat configure:", e);
        }
      }
    })();
  }, [authed, uid]);

  return null;
}
