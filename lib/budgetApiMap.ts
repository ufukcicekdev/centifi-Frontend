import type { CategoryBudgetEntry } from "../constants/budgetTypes";

/** Maps Django `category_budgets` JSON to local store shape. */
export function mapCategoryBudgetsFromApi(raw: unknown): Record<string, CategoryBudgetEntry> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, CategoryBudgetEntry> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as { amount?: unknown; budgetColor?: unknown };
    let amount: number | null = null;
    if (o.amount != null) {
      const n = Number(o.amount);
      amount = Number.isFinite(n) ? n : null;
    }
    const budgetColor = typeof o.budgetColor === "string" ? o.budgetColor : "#FF6B6B";
    out[k] = { amount, budgetColor };
  }
  return out;
}
