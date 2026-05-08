import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStore } from "../store/useStore";

/**
 * Native bildirim: `centifi://bank-pending?id=...`
 * Expo Router bu URL’yi dosya rotasına eşler; aksi halde +not-found kalır ve /add kapanınca o ekran görünür.
 */
export default function BankPendingDeepLinkScreen() {
  const router = useRouter();
  const isDark = useStore((s) => s.isDark);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idRaw = params.id;
  const pendingId = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const go = async () => {
      if (Platform.OS === "android") {
        try {
          const { drainBankListenerNativeQueue } = await import("../lib/bankNotificationAndroid");
          const rows = await drainBankListenerNativeQueue();
          if (rows.length) {
            useStore.getState().ingestNativePendingBankRows(rows);
          }
        } catch {
          /* ignore */
        }
      }

      if (pendingId && typeof pendingId === "string") {
        router.replace({ pathname: "/add", params: { pendingId } });
      } else {
        router.replace("/(app)");
      }
    };

    void go();
  }, [pendingId, router]);

  return (
    <View
      style={[
        styles.center,
        { backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5" },
      ]}
    >
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
