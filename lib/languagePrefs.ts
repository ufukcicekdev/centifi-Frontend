import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Language } from "../i18n";

const KEY = "centifi_language_v1";

const ALLOWED = new Set<string>(["en", "de", "fr", "es", "tr"]);

export async function loadLanguage(): Promise<Language | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw && ALLOWED.has(raw)) return raw as Language;
  } catch {
    /* ignore */
  }
  return null;
}

export async function saveLanguage(lang: Language): Promise<void> {
  if (!ALLOWED.has(lang)) return;
  await AsyncStorage.setItem(KEY, lang);
}
