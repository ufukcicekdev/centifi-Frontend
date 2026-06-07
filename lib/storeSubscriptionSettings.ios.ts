import { Linking } from "react-native";

export function openStoreSubscriptionSettings(): void {
  void Linking.openURL("https://apps.apple.com/account/subscriptions");
}
