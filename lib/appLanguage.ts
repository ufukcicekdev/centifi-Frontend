const SUPPORTED = new Set(["en", "tr", "de", "fr", "es"]);

let current = "en";

export function normalizeAppLanguage(code: string | null | undefined): string {
  const base = (code || "en").trim().toLowerCase().split("-")[0];
  return SUPPORTED.has(base) ? base : "en";
}

/** Keeps API ``X-Centifi-Language`` in sync with the active app locale. */
export function setAppLanguage(code: string): void {
  current = normalizeAppLanguage(code);
}

export function getAppLanguage(): string {
  return current;
}
