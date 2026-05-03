import "../global.css";
import "../i18n";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "../store/useStore";
import { AppDialogProvider } from "../context/AppDialogContext";
import BudgetAlertForegroundListener from "../components/BudgetAlertForegroundListener";
import BankPendingBridge from "../components/BankPendingBridge";
import RevenueCatBridge from "../components/RevenueCatBridge";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const onboardingCompleted = useStore((s) => s.onboardingCompleted);
  const hydrateFromBackend = useStore((s) => s.hydrateFromBackend);
  const hydrateLanguage = useStore((s) => s.hydrateLanguage);

  useEffect(() => {
    void (async () => {
      await hydrateLanguage();
      await hydrateFromBackend();
    })();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding = segments[1] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && !onboardingCompleted && !onOnboarding) {
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && onboardingCompleted && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isAuthenticated, onboardingCompleted, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const isDark = useStore((s) => s.isDark);

  useEffect(() => {
    void import("../lib/localNotifications")
      .then((m) => m.initLocalNotifications())
      .catch((e) => {
        if (__DEV__) {
          console.warn("[Centifi] initLocalNotifications import/init failed:", e);
        }
      });
  }, []);

  useEffect(() => {
    void useStore.getState().hydrateDisplayCurrency();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDialogProvider>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0f0f0f" : "#f8f8f8" }}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <AuthGuard>
              <>
                <BudgetAlertForegroundListener />
                <BankPendingBridge />
                <RevenueCatBridge />
                <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(app)" />
                </Stack>
              </>
            </AuthGuard>
          </View>
        </SafeAreaProvider>
      </AppDialogProvider>
    </GestureHandlerRootView>
  );
}
