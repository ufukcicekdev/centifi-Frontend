import type { Language } from "../i18n";

/**
 * Tutar alanı: yalnızca rakam ve tek ondalık ayırıcı (`,` veya `.`).
 * `keyboardType="decimal-pad"` harfleri engellemez; simülatör/fiziksel klavyede ayırıcı bazen gelmez.
 */
export function sanitizeAmountInput(raw: string): string {
  const s = raw.replace(/[^\d.,]/g, "");
  const sepMatch = s.match(/[.,]/);
  if (!sepMatch || sepMatch.index == null) return s;
  const sepIdx = sepMatch.index;
  const sep = s[sepIdx];
  let intPart = s.slice(0, sepIdx);
  const fracPart = s.slice(sepIdx + 1).replace(/[.,]/g, "").slice(0, 2);
  if (intPart === "") intPart = "0";
  return `${intPart}${sep}${fracPart}`;
}

export function hasDecimalSeparator(value: string): boolean {
  return /[.,]/.test(value);
}

export function decimalSeparatorForLanguage(lang: Language): "," | "." {
  return lang === "en" ? "." : ",";
}

/** Ondalık ayırıcı ekle (kuruş) — klavye vermese de çalışır. */
export function insertDecimalSeparator(current: string, sep: "," | "."): string {
  if (hasDecimalSeparator(current)) return sanitizeAmountInput(current);
  const digits = current.replace(/[^\d]/g, "");
  const base = digits || "0";
  return sanitizeAmountInput(`${base}${sep}`);
}
