import { Linking } from "react-native";
import Constants from "expo-constants";

function playSubscriptionsManageUrl(): string {
  const pkg = (Constants.expoConfig as { android?: { package?: string } } | null)?.android?.package ?? "centifi.app";
  const sku = process.env.EXPO_PUBLIC_PLAY_SUBSCRIPTION_PRODUCT_ID?.trim() || "centifi_aylik_pro";
  return `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(pkg)}&sku=${encodeURIComponent(sku)}`;
}

export function openStoreSubscriptionSettings(): void {
  void Linking.openURL(playSubscriptionsManageUrl());
}
