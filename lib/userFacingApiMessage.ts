import { formatApiErrorDetailBody, getApiErrorDetailCode } from "./api";

/** Sunucu/AI hata metinlerinde kullanıcıya gösterilmemesi gereken ipuçları. */
function looksLikeInternalErrorText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("railway") ||
    lower.includes("gemini") ||
    lower.includes("deploy log") ||
    lower.includes("api_key") ||
    lower.includes("ai.views") ||
    lower.includes("google-genai") ||
    lower.includes("gemini_model")
  );
}

/**
 * API hata gövdesinden kullanıcıya gösterilecek metin.
 * GEMINI_* kodları ve geliştirici notları asla ham olarak döndürülmez.
 */
export function userFacingApiMessage(
  details: unknown,
  resolve: (key: string) => string,
  fallbackKey: string,
  opts?: { unavailableKey?: string },
): string {
  const code = getApiErrorDetailCode(details);
  if (code?.startsWith("GEMINI_")) {
    if (code === "GEMINI_CLIENT_UNAVAILABLE" && opts?.unavailableKey) {
      return resolve(opts.unavailableKey);
    }
    return resolve(fallbackKey);
  }

  const raw = formatApiErrorDetailBody(details);
  if (raw && looksLikeInternalErrorText(raw)) {
    return resolve(fallbackKey);
  }
  return raw ?? resolve(fallbackKey);
}
