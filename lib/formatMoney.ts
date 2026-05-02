import type { Language } from "../i18n";

const localeMap: Record<Language, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

export function formatMoneyAmount(amount: number, language: Language, currency = "USD"): string {
  const loc = localeMap[language] ?? "en-US";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Narrow symbol or code for inputs (e.g. $, €, ₺). */
export function currencySymbolFor(code: string, language: Language): string {
  const loc = localeMap[language] ?? "en-US";
  try {
    const parts = new Intl.NumberFormat(loc, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency")?.value;
    if (sym) return sym;
  } catch {
    /* fall through */
  }
  return code;
}
