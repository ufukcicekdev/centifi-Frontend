/** #RRGGBB → rgba for tinted surfaces */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return `rgba(128,128,128,${alpha})`;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(128,128,128,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Readable on-color for icons/text on a solid hex background */
export function foregroundOnHex(hex: string): string {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return "#111";
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#111" : "#fff";
}
