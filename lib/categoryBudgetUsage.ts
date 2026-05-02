import type { Expense } from "../constants/mockData";
import { isExpenseInPeriod, type PeriodFilter } from "./expenseFilters";

/** Sum of spending (non-income) for a category in the given calendar month, scoped to list. */
export function spentForCategoryInCalendarMonth(
  expenses: Expense[],
  categoryId: string,
  activeListId: string,
  year: number,
  monthIndex: number,
): number {
  const p: PeriodFilter = { kind: "calendar_month", year, monthIndex };
  return expenses
    .filter(
      (e) =>
        e.category === categoryId &&
        !e.isIncome &&
        (!e.listId || e.listId === activeListId) &&
        isExpenseInPeriod(e.date, p),
    )
    .reduce((s, e) => s + e.amount, 0);
}

export function percentOfBudget(spent: number, budgetCap: number): number {
  if (!(budgetCap > 0) || !Number.isFinite(spent)) return 0;
  return Math.round((spent / budgetCap) * 100);
}

export function barFillPercent(spent: number, budgetCap: number): number {
  if (!(budgetCap > 0)) return 0;
  return Math.min(100, (spent / budgetCap) * 100);
}
