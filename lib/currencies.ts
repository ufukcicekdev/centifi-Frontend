import { ISO4217_ACTIVE_CODES } from "../constants/iso4217ActiveCodes";
import { CURRENCY_NAMES_EN } from "../constants/currencyNamesEn";
import {
  CURRENCY_DISPLAY_NAMES,
  type AppLocale,
} from "../constants/currencyDisplayNames.generated";

let cached: string[] | null = null;

const APP_LOCALES = new Set<AppLocale>(["en", "tr", "de", "fr", "es"]);

function toAppLocale(locale: string): AppLocale {
  const base = locale.split(/[-_]/)[0]?.toLowerCase();
  if (base && APP_LOCALES.has(base as AppLocale)) return base as AppLocale;
  return "en";
}

/** Full ISO 4217 active list merged with Intl.supportedValuesOf("currency") so Hermes/short CLDR lists still get every code. */
export function getAllCurrencyCodes(): string[] {
  if (cached) return cached;
  const merged = new Set<string>(ISO4217_ACTIVE_CODES);
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    const list = intl.supportedValuesOf?.("currency");
    if (Array.isArray(list)) {
      for (const c of list) merged.add(c);
    }
  } catch {
    /* static list only */
  }
  cached = [...merged].sort();
  return cached;
}

function displayNameNative(code: string, locale: string): string | undefined {
  try {
    const dn = new Intl.DisplayNames([locale], { type: "currency" });
    const name = dn.of(code);
    if (name && name !== code) return name;
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Localized currency name from pre-generated CLDR maps (see scripts/generate-currency-display-names.mjs).
 * Extra codes from Intl-only merges fall back to native Intl, then English ISO names, then the code.
 */
export function getCurrencyLabel(code: string, locale: string): string {
  const lang = toAppLocale(locale);
  const mapped = CURRENCY_DISPLAY_NAMES[lang][code] ?? CURRENCY_DISPLAY_NAMES.en[code];
  if (mapped) return mapped;
  const native = displayNameNative(code, locale) ?? displayNameNative(code, "en");
  if (native) return native;
  return CURRENCY_NAMES_EN[code] ?? code;
}
