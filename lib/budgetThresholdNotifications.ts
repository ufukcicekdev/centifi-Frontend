import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Expense } from "../constants/mockData";
import type { CategoryBudgetEntry } from "../constants/budgetTypes";
import {
  getCategoryMeta,
  type CategoryDisplayOverrides,
  type CustomCategory,
} from "../constants/mockData";
import i18n, { type Language } from "../i18n";
import { formatMoneyAmount } from "./formatMoney";
import { presentLocalNotificationIfEnabled } from "./localNotifications";

const STORAGE_PREFIX = "centifi_budget_alert_";

export type BudgetNotificationStateSlice = {
  expenses: Expense[];
  customCategories: CustomCategory[];
  categoryDisplayOverrides: CategoryDisplayOverrides | null | undefined;
  categoryBudgets: Record<string, CategoryBudgetEntry>;
  budgetAlertsEnabled: boolean;
  budgetAlertThresholdPercent: number;
  notificationsEnabled: boolean;
  activeListId: string;
  displayCurrency: string;
  language: Language;
};

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function sumMonthSpendForCategory(
  expenses: Expense[],
  categoryId: string,
  monthKey: string,
  activeListId: string,
): number {
  let s = 0;
  for (const e of expenses) {
    if (e.category !== categoryId || e.isIncome) continue;
    if (!e.date.startsWith(monthKey)) continue;
    if (e.listId && e.listId !== activeListId) continue;
    s += e.amount;
  }
  return s;
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function queueBudgetThresholdCheck(getState: () => BudgetNotificationStateSlice): void {
  if (Platform.OS === "web") return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runBudgetThresholdCheck(getState());
  }, 700);
}

async function runBudgetThresholdCheck(s: BudgetNotificationStateSlice): Promise<void> {
  if (Platform.OS === "web") return;
  if (!s.notificationsEnabled || !s.budgetAlertsEnabled) return;

  const monthKey = currentMonthKey();
  const threshold = s.budgetAlertThresholdPercent;
  const lang = s.language;
  const cur = s.displayCurrency;

  for (const [categoryId, entry] of Object.entries(s.categoryBudgets)) {
    const cap = entry.amount;
    if (cap == null || cap <= 0) continue;

    const spent = sumMonthSpendForCategory(s.expenses, categoryId, monthKey, s.activeListId);
    const pct = (spent / cap) * 100;
    if (pct < threshold) continue;

    const dedupeKey = `${STORAGE_PREFIX}${monthKey}_${categoryId}_${threshold}`;
    try {
      const done = await AsyncStorage.getItem(dedupeKey);
      if (done) continue;
    } catch {
      continue;
    }

    const meta = getCategoryMeta(categoryId, s.customCategories, s.categoryDisplayOverrides);
    const spentStr = formatMoneyAmount(spent, lang, cur);
    const capStr = formatMoneyAmount(cap, lang, cur);

    await presentLocalNotificationIfEnabled(s.notificationsEnabled, {
      title: String(i18n.t("notifications.budgetWarningTitle")),
      body: String(
        i18n.t("notifications.budgetWarningBody", {
          category: meta.name,
          pct: Math.min(100, Math.round(pct)),
          spent: spentStr,
          cap: capStr,
        }),
      ),
      data: { type: "budget_threshold", categoryId },
    });

    try {
      await AsyncStorage.setItem(dedupeKey, "1");
    } catch {
      /* ignore */
    }
  }
}
