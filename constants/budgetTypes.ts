/** Per-category monthly budget (local prefs). */
export interface CategoryBudgetEntry {
  /** Monthly limit in account currency; null = disabled */
  amount: number | null;
  /** Accent color for budget tile ring / picker */
  budgetColor: string;
}
