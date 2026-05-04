import "../global.css";
import "../i18n";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "../store/useStore";
import { AppDialogProvider } from "../context/AppDialogContext";
import BudgetAlertForegroundListener from "../components/BudgetAlertForegroundListener";
import BankPendingBridge from "../components/BankPendingBridge";
import RevenueCatBridge from "../components/RevenueCatBridge";

const BOOTSTRAP_PURPLE = "#6C63FF";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isDark = useStore((s) => s.isDark);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const onboardingCompleted = useStore((s) => s.onboardingCompleted);
  /** Until true, `isAuthenticated` is still the default — do not route or user briefly sees login. */
  const [sessionResolved, setSessionResolved] = useState(false);

  useEffect(() => {
    void (async () => {
      const { hydrateLanguage, hydrateFromBackend } = useStore.getState();
      await hydrateLanguage();
      await hydrateFromBackend();
      setSessionResolved(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionResolved) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding = segments[1] === "onboarding";
    const onPasswordReset = segments.includes("reset-password");

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && !onboardingCompleted && !onOnboarding) {
      router.replace("/(auth)/onboarding");
    } else if (isAuthenticated && onboardingCompleted && inAuthGroup && !onPasswordReset) {
      router.replace("/(app)");
    }
  }, [sessionResolved, isAuthenticated, onboardingCompleted, segments, router]);

  return (
    <>
      {children}
      {!sessionResolved ? (
        <View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFillObject,
            {
              zIndex: 1000,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isDark ? "#0f0f0f" : "#f8f8f8",
            },
          ]}
        >
          <ActivityIndicator size="large" color={BOOTSTRAP_PURPLE} />
        </View>
      ) : null}
    </>
  );
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
