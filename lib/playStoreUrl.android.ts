/** Play Store link or plain `com.foo.bar` → Android package id. */
export function extractPlayStorePackageId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const fromQuery = t.match(/[?&]id=([^&]+)/i);
  if (fromQuery) {
    try {
      return decodeURIComponent(fromQuery[1]!.trim()).trim() || null;
    } catch {
      return fromQuery[1]!.trim() || null;
    }
  }
  if (/^([a-zA-Z][\w]*\.)+[\w]+$/.test(t)) return t;
  return null;
}

export function playStoreDetailsUrl(packageName: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}`;
}
