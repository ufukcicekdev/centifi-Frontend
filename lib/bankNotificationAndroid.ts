import { NativeModules, Platform } from "react-native";
import type { PendingBankTransaction } from "./pendingBankTypes";

type NativeBankModule = {
  syncAllowedPackagesJson: (json: string) => Promise<boolean>;
  syncBankSystemNotificationEnabled: (enabled: boolean) => Promise<boolean>;
  drainPendingQueueJson: () => Promise<string>;
  isNotificationListenerEnabled: () => Promise<boolean>;
  openNotificationListenerSettings: () => void;
};

function getNative(): NativeBankModule | null {
  if (Platform.OS !== "android") return null;
  const m = NativeModules.BankNotificationModule as NativeBankModule | undefined;
  return m ?? null;
}

export function isBankNotificationNativeAvailable(): boolean {
  return getNative() != null;
}

export async function syncBankListenerAllowedPackages(packageNames: string[]): Promise<void> {
  const n = getNative();
  if (!n) return;
  await n.syncAllowedPackagesJson(JSON.stringify(packageNames));
}

/** Ayarlardaki “Bildirimleri aç” ile aynı — native OS bildirimi buna göre gösterilir. */
export async function syncBankSystemNotificationFlag(enabled: boolean): Promise<void> {
  const n = getNative();
  if (!n?.syncBankSystemNotificationEnabled) return;
  try {
    await n.syncBankSystemNotificationEnabled(enabled);
  } catch {
    /* noop */
  }
}

export async function drainBankListenerNativeQueue(): Promise<PendingBankTransaction[]> {
  const n = getNative();
  if (!n) return [];
  const raw = await n.drainPendingQueueJson();
  return parseNativePendingJson(raw);
}

export async function isBankNotificationListenerEnabled(): Promise<boolean> {
  const n = getNative();
  if (!n) return false;
  try {
    return await n.isNotificationListenerEnabled();
  } catch {
    return false;
  }
}

export function openBankNotificationListenerSettings(): void {
  const n = getNative();
  if (!n) return;
  try {
    n.openNotificationListenerSettings();
  } catch {
    /* noop */
  }
}

function parseNativePendingJson(raw: string): PendingBankTransaction[] {
  try {
    const a = JSON.parse(raw) as unknown;
    if (!Array.isArray(a)) return [];
    const out: PendingBankTransaction[] = [];
    for (const x of a) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const packageName = typeof o.packageName === "string" ? o.packageName : "";
      if (!id || !packageName) continue;
      out.push({
        id,
        packageName,
        title: typeof o.title === "string" ? o.title : "",
        body: typeof o.body === "string" ? o.body : "",
        postedAtMs: typeof o.postedAtMs === "number" ? o.postedAtMs : Date.now(),
        createdAtMs: typeof o.createdAtMs === "number" ? o.createdAtMs : Date.now(),
      });
    }
    return out;
  } catch {
    return [];
  }
}
