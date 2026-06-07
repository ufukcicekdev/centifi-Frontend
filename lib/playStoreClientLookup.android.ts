/**
 * Cihazdan Play Store HTML çeker (oturum yokken veya API yedeği).
 * Google sayfa yapısına bağlıdır; başarısız olursa null döner.
 */

const PLAY_STORE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function ogContent(page: string, prop: string): string | null {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pats = [
    new RegExp(`<meta\\s+property="${esc}"\\s+content="([^"]*)"`, "i"),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+property="${esc}"`, "i"),
  ];
  for (const re of pats) {
    const m = page.match(re);
    if (m?.[1]) return m[1].trim() || null;
  }
  return null;
}

function stripPlayTitle(title: string): string {
  let s = title.trim();
  for (const suf of [" - Apps on Google Play", " – Apps on Google Play", "\u2013 Apps on Google Play"]) {
    if (s.endsWith(suf)) s = s.slice(0, -suf.length).trim();
  }
  return s;
}

export async function fetchPlayStoreMetaClient(packageName: string): Promise<{
  name: string | null;
  iconUrl: string | null;
}> {
  const pkg = packageName.trim();
  if (!pkg) return { name: null, iconUrl: null };
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": PLAY_STORE_UA, "Accept-Language": "en-US,en;q=0.9" } });
    if (!res.ok) return { name: null, iconUrl: null };
    const html = await res.text();
    const icon = ogContent(html, "og:image");
    const titleRaw = ogContent(html, "og:title");
    const name = titleRaw ? stripPlayTitle(titleRaw) : null;
    return { name, iconUrl: icon };
  } catch {
    return { name: null, iconUrl: null };
  }
}
