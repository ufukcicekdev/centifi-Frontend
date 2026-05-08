import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useStore } from "../../store/useStore";

export default function AppLayout() {
  const isDark = useStore((s) => s.isDark);

  /** Bekleyen banka deep link’i kök `bank-pending` rotasında (tekrarlı Linking dinleyicisi yok; çift /add ve +not-found önlenir). */

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
