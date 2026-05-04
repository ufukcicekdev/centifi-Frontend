/**
 * Map phone / browser locale to an app-supported language (en, tr, de, fr, es).
 * Prefers expo-localization; falls back to Intl when needed.
 */

import { getLocales } from "expo-localization";

const ALLOWED = new Set<string>(["en", "tr", "de", "fr", "es"]);

export type AppSupportedLang = "en" | "tr" | "de" | "fr" | "es";

function fromIntl(): AppSupportedLang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    const base = String(loc).split(/[-_]/)[0]?.toLowerCase() ?? "en";
    if (ALLOWED.has(base)) return base as AppSupportedLang;
  } catch {
    /* ignore */
  }
  return "en";
}

export function getDeviceAppLanguage(): AppSupportedLang {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (code && ALLOWED.has(code)) return code as AppSupportedLang;
  } catch {
    /* ignore */
  }
  return fromIntl();
}
