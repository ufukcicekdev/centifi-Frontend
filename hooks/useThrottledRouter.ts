import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";

/**
 * Çift dokunuş / hızlı ardışık aynı hedef için `router.push` tekrarını önlemek için.
 * Referans hook içinde `useRef` ile tutulunca bileşen remount olduğunda (Strict Mode dahil)
 * sıfırlanabiliyor; global son push bilgisi bu yüzden modül düzeyinde tutuluyor.
 */
let lastPushKey = "";
let lastPushAt = 0;

function hrefKey(href: Href): string {
  if (typeof href === "string") return href;
  if (href != null && typeof href === "object") {
    const o = href as { pathname?: string; params?: object };
    return `${String(o.pathname ?? "")}:${JSON.stringify(o.params ?? {})}`;
  }
  return String(href);
}

/** Ana sayfa vb. odaklanınca çağır: ayarlara gidip geri gelince hemen tekrar push engellenmesin */
export function clearRouterPushCooldown(): void {
  lastPushKey = "";
  lastPushAt = 0;
}

/**
 * Aynı `href`'e cooldown süresinde ikinci bir push yapılmaz (çift dokunuş / çift stack önlenir).
 * Settings için bypass kullanma: iki kez ayarlar sayfası açılmasına yol açıyordu.
 */
export function useThrottledRouter(cooldownMs = 420) {
  const router = useRouter();

  const push = useCallback(
    (href: Href) => {
      const key = hrefKey(href);
      const now = Date.now();
      if (key === lastPushKey && now - lastPushAt < cooldownMs) {
        return;
      }
      lastPushKey = key;
      lastPushAt = now;
      router.push(href);
    },
    [cooldownMs, router],
  );

  return push;
}
