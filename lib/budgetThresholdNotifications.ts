import { AppState, DeviceEventEmitter, Platform } from "react-native";
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
import { BUDGET_ALERT_FOREGROUND_EVENT } from "./budgetAlertEvents";
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
  displayCurrency: string;
  language: Language;
};

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Aylık kategori bütçesi tüm listelerdeki harcamayı kapsar (bütçe detayı / ortalamalarla uyumlu). */
function sumMonthSpendForCategoryAllLists(expenses: Expense[], categoryId: string, monthKey: string): number {
  let s = 0;
  for (const e of expenses) {
    if (e.category !== categoryId || e.isIncome) continue;
    if (!e.date.startsWith(monthKey)) continue;
    s += e.amount;
  }
  return s;
}

async function budgetAlertDedupeSeen(key: string): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(key));
  } catch {
    return false;
  }
}

async function budgetAlertDedupeMark(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function emitBudgetAlertOrSchedule(
  notificationsEnabled: boolean,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (AppState.currentState === "active") {
    DeviceEventEmitter.emit(BUDGET_ALERT_FOREGROUND_EVENT, {
      title: payload.title,
      body: payload.body,
    });
    return Promise.resolve();
  }
  return presentLocalNotificationIfEnabled(notificationsEnabled, payload);
}

export function queueBudgetThresholdCheck(getState: () => BudgetNotificationStateSlice): void {
  if (Platform.OS === "web") return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runBudgetThresholdCheck(getState());
  }, 280);
}

/** Bekleyen debounce’u iptal edip hemen kontrol eder — fiş/ses kaydından sonra modal kapandığında veya manuel eklemede ekran değişiminden sonra. */
export function flushBudgetThresholdCheck(getState: () => BudgetNotificationStateSlice): void {
  if (Platform.OS === "web") return;
  clearTimeout(debounceTimer);
  debounceTimer = undefined;
  void runBudgetThresholdCheck(getState());
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

    const spent = sumMonthSpendForCategoryAllLists(s.expenses, categoryId, monthKey);
    const pct = (spent / cap) * 100;
    const overCap = spent >= cap;
    const crossedThreshold = pct >= threshold;

    if (!overCap && !crossedThreshold) continue;

    const meta = getCategoryMeta(categoryId, s.customCategories, s.categoryDisplayOverrides);
    const spentStr = formatMoneyAmount(spent, lang, cur);
    const capStr = formatMoneyAmount(cap, lang, cur);

    if (overCap) {
      const dedupeKey = `${STORAGE_PREFIX}over_${monthKey}_${categoryId}`;
      if (await budgetAlertDedupeSeen(dedupeKey)) continue;

      await emitBudgetAlertOrSchedule(s.notificationsEnabled, {
        title: String(i18n.t("notifications.budgetExceededTitle")),
        body: String(
          i18n.t("notifications.budgetExceededBody", {
            category: meta.name,
            spent: spentStr,
            cap: capStr,
          }),
        ),
        data: { type: "budget_over", categoryId },
      });
      await budgetAlertDedupeMark(dedupeKey);
      continue;
    }

    const dedupeKey = `${STORAGE_PREFIX}${monthKey}_${categoryId}_${threshold}`;
    if (await budgetAlertDedupeSeen(dedupeKey)) continue;

    await emitBudgetAlertOrSchedule(s.notificationsEnabled, {
      title: String(i18n.t("notifications.budgetWarningTitle")),
      body: String(
        i18n.t("notifications.budgetWarningBody", {
          category: meta.name,
          pct: Math.round(pct),
          spent: spentStr,
          cap: capStr,
        }),
      ),
      data: { type: "budget_threshold", categoryId },
    });

    await budgetAlertDedupeMark(dedupeKey);
  }
}
