import type { Expense } from "../constants/mockData";

/**
 * Average monthly spend for a category (expenses only), from distinct calendar months
 * that have at least one expense in that category.
 */
export function averageMonthlySpendForCategory(expenses: Expense[], categoryId: string): number {
  const byMonth = new Map<string, number>();
  for (const e of expenses) {
    if (e.category !== categoryId || e.isIncome) continue;
    const month = e.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + e.amount);
  }
  if (byMonth.size === 0) return 0;
  let sum = 0;
  for (const v of byMonth.values()) sum += v;
  return sum / byMonth.size;
}
