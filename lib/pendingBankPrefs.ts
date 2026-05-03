import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PendingBankTransaction } from "./pendingBankTypes";

const key = (userId: string) => `centifi_pending_bank_${userId}`;

export async function loadPendingBankPrefs(userId: string): Promise<PendingBankTransaction[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingRow);
  } catch {
    return [];
  }
}

export async function savePendingBankPrefs(userId: string, rows: PendingBankTransaction[]): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(rows));
}

export async function clearPendingBankPrefs(userId: string): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}

function isPendingRow(x: unknown): x is PendingBankTransaction {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.packageName === "string" &&
    typeof o.title === "string" &&
    typeof o.body === "string" &&
    typeof o.postedAtMs === "number" &&
    typeof o.createdAtMs === "number"
  );
}
