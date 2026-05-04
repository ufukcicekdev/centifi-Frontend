import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { Stack, router, useRouter } from "expo-router";
import { useStore } from "../../store/useStore";

export default function AppLayout() {
  const isDark = useStore((s) => s.isDark);
  const appRouter = useRouter();
  const handledBankDeepLink = useRef<{ id: string; at: number } | null>(null);

  /** Banka kuyruğu OS bildirimine tıklanınca: native `centifi://bank-pending?id=` → bekleyen satırla /add */
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const run = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.hostname !== "bank-pending") return;
      const raw = parsed.queryParams?.id;
      const id = raw == null ? undefined : Array.isArray(raw) ? raw[0] : raw;
      if (typeof id !== "string" || !id) return;

      const now = Date.now();
      const prev = handledBankDeepLink.current;
      if (prev?.id === id && now - prev.at < 2500) return;
      handledBankDeepLink.current = { id, at: now };

      try {
        const { drainBankListenerNativeQueue } = await import("../../lib/bankNotificationAndroid");
        const rows = await drainBankListenerNativeQueue();
        if (rows.length) {
          useStore.getState().ingestNativePendingBankRows(rows);
        }
        appRouter.push({ pathname: "/add", params: { pendingId: id } });
      } catch {
        /* noop */
      }
    };

    let alive = true;
    void Linking.getInitialURL().then((u) => {
      if (alive) void run(u);
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      void run(url);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [appRouter]);

  /** Ayarlar ~büyük chunk; ilk dokunuşta beklemeyi azaltmak için rota + modülü erken ısıt */
  useEffect(() => {
    router.prefetch("/(app)/settings");
    router.prefetch("/report" as any);
    router.prefetch("/insights" as any);
    router.prefetch("/subscribe" as any);
    void import("./settings");
    void import("./report");
    void import("./insights");
    void import("./subscribe");
    void import("./change-password");
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen
        name="expense/[id]"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen
        name="add"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
      <Stack.Screen name="processing" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="subscribe" />
      <Stack.Screen name="report" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="budgets" />
      <Stack.Screen
        name="budget/[categoryId]"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
    </Stack>
  );
}
