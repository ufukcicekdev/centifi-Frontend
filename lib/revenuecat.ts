/**
 * RevenueCat — mağaza (Play / App Store) abonelikleri.
 * Anahtarlar: EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY, EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
 * Dashboard’da ``pro`` entitlement + aylık/yıllık paketler; 7 günlük deneme ürünü Play / App Store’da tanımlanır.
 */
import { Platform } from "react-native";

/** Aynı kullanıcı için tekrar `configure` çağrılmasını önler (Subscribe ile Bridge yarışını azaltır). */
let lastConfiguredUserId: string | null = null;

function publicApiKey(): string {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? "";
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
  if (Platform.OS === "ios") return ios;
  if (Platform.OS === "android") return android;
  return "";
}

export function isRevenueCatConfigured(): boolean {
  return Platform.OS !== "web" && !!publicApiKey();
}

export async function configureRevenueCatForUser(appUserId: string): Promise<void> {
  if (Platform.OS === "web") return;
  const apiKey = publicApiKey();
  if (!apiKey) return;
  if (lastConfiguredUserId === appUserId) return;
  const Purchases = (await import("react-native-purchases")).default;
  await Purchases.configure({ apiKey });
  await Purchases.logIn(appUserId);
  lastConfiguredUserId = appUserId;
}

export async function logoutRevenueCat(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Purchases = (await import("react-native-purchases")).default;
    await Purchases.logOut();
  } catch {
    /* anonim veya yapılandırılmamış */
  } finally {
    lastConfiguredUserId = null;
  }
}
