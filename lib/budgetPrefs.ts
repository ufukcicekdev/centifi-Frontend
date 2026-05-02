import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CategoryBudgetEntry } from "../constants/budgetTypes";

const key = (userId: string) => `centifi_budget_prefs_${userId}`;

export type SerializedBudgetPrefs = {
  categoryBudgets: Record<string, CategoryBudgetEntry>;
  budgetAlertsEnabled: boolean;
  budgetAlertThresholdPercent: number;
};

export async function loadBudgetPrefs(userId: string): Promise<SerializedBudgetPrefs | null> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SerializedBudgetPrefs>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      categoryBudgets:
        parsed.categoryBudgets && typeof parsed.categoryBudgets === "object" ?
          parsed.categoryBudgets as Record<string, CategoryBudgetEntry> :
        {},
      budgetAlertsEnabled: typeof parsed.budgetAlertsEnabled === "boolean" ? parsed.budgetAlertsEnabled : true,
      budgetAlertThresholdPercent:
        typeof parsed.budgetAlertThresholdPercent === "number" &&
        Number.isFinite(parsed.budgetAlertThresholdPercent) ?
          Math.min(100, Math.max(50, Math.round(parsed.budgetAlertThresholdPercent))) :
        90,
    };
  } catch {
    return null;
  }
}

export async function saveBudgetPrefs(userId: string, data: SerializedBudgetPrefs): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(data));
}

export async function clearBudgetPrefs(userId: string): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}
