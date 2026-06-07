/** Shallow-deep merge for i18n resource objects (android overlay onto base). */
export function mergeTranslations<T extends Record<string, unknown>>(base: T, overlay: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overlay)) {
    const b = base[key];
    const o = overlay[key];
    if (b && o && typeof b === "object" && typeof o === "object" && !Array.isArray(b) && !Array.isArray(o)) {
      out[key] = mergeTranslations(b as Record<string, unknown>, o as Record<string, unknown>);
    } else {
      out[key] = o;
    }
  }
  return out as T;
}
