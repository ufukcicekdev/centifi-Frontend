import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "centifi_display_currency_v1";

function isIso4217(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export async function loadDisplayCurrency(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && isIso4217(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "USD";
}

export async function saveDisplayCurrency(code: string): Promise<void> {
  const upper = code.toUpperCase();
  if (!isIso4217(upper)) return;
  await AsyncStorage.setItem(KEY, upper);
}
