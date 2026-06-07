import type { BankAutomation } from "./mockData";

export const PRESET_BANK_AUTOMATIONS: BankAutomation[] = [
  {
    id: "google_wallet",
    name: "Google Wallet",
    emoji: "👛",
    storeUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel",
    packageName: "com.google.android.apps.walletnfcrel",
    enabled: false,
  },
  {
    id: "google_play",
    name: "Google Play",
    emoji: "▶️",
    storeUrl: "https://play.google.com/store/apps/details?id=com.android.vending",
    packageName: "com.android.vending",
    enabled: false,
  },
];

export const PRESET_BANK_APP_IDS = new Set(PRESET_BANK_AUTOMATIONS.map((b) => b.id));

export const PRESET_BANK_PACKAGES = new Set(PRESET_BANK_AUTOMATIONS.map((b) => b.packageName));
