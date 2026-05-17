import i18n from "../i18n";

// Base category IDs (built-in)
export type BuiltinCategory =
  | "food" | "transport" | "shopping" | "health"
  | "entertainment" | "utilities" | "other";

// Category can be builtin or a custom ID
export type Category = string;

export interface CustomCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  date: string;
  currency: string;
  /** true = gelir (+), false = harcama (−) — tutar her zaman pozitif saklanır */
  isIncome?: boolean;
  listId?: string;
  receipt_url?: string;
  /** Backend `recurring_expense_id` — tekrarlayan seriyle bağlantı */
  recurringExpenseId?: number | null;
  /** Seri varsa API `recurrence_rule` (ör. daily); yoksa yok / bir kez */
  recurrenceRule?: string | null;
}

export interface ExpenseList {
  id: string;
  name: string;
  /** Matches backend default list (e.g. "Private list"). */
  isDefault?: boolean;
  /** Custom lists only — shown in picker / settings; empty → default 📋 */
  emoji?: string;
}

export interface BankAutomation {
  id: string;
  name: string;
  emoji: string;
  storeUrl: string;
  packageName: string; // Android package for notification filter
  enabled: boolean;
  /** Play Store yüksek çözünürlüklü ikon (HTTPS); yoksa emoji kullanılır */
  iconUrl?: string;
}

export interface CategorySummary {
  category: Category;
  total: number;
  emoji: string;
  color: string;
}

export const BUILTIN_CATEGORIES: CustomCategory[] = [
  { id: "food",          name: "Food",          emoji: "🍔", color: "#FF6B6B", bgColor: "#FF6B6B20" },
  { id: "transport",     name: "Transport",     emoji: "🚗", color: "#4ECDC4", bgColor: "#4ECDC420" },
  { id: "shopping",      name: "Shopping",      emoji: "🛍️", color: "#A29BFE", bgColor: "#A29BFE20" },
  { id: "health",        name: "Health",        emoji: "💊", color: "#55EFC4", bgColor: "#55EFC420" },
  { id: "entertainment", name: "Entertainment", emoji: "🎬", color: "#FDCB6E", bgColor: "#FDCB6E20" },
  { id: "utilities",     name: "Utilities",     emoji: "⚡", color: "#74B9FF", bgColor: "#74B9FF20" },
  { id: "other",         name: "Other",         emoji: "📦", color: "#B2BEC3", bgColor: "#B2BEC320" },
];

export function isBuiltinCategoryId(id: string): boolean {
  return BUILTIN_CATEGORIES.some((b) => b.id === id);
}

/**
 * Ionicons `name` — yalnızca eski / yedek kullanım; UI rozetleri `EmojiText` ile çizilir.
 * Özel kategoriler: `pricetag-outline`.
 */
export function categoryGridIonName(categoryId: string): string {
  switch (categoryId) {
    case "food":
      return "restaurant-outline";
    case "transport":
      return "car-outline";
    case "shopping":
      return "bag-handle-outline";
    case "health":
      return "medical-outline";
    case "entertainment":
      return "film-outline";
    case "utilities":
      return "flash-outline";
    case "other":
      return "cube-outline";
    default:
      return "pricetag-outline";
  }
}

// Legacy compat map — used by old components
export const CATEGORY_META: Record<string, { emoji: string; color: string; bgColor: string }> =
  Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.id, { emoji: c.emoji, color: c.color, bgColor: c.bgColor }]));

/** Device/local overrides for built-in labels & icons (onboarding + preferences). */
export type CategoryDisplayOverrides = Partial<
  Record<string, Partial<Pick<CustomCategory, "name" | "emoji" | "color" | "bgColor">>>
>;

export function getCategoryMeta(
  categoryId: string,
  customCategories: CustomCategory[],
  displayOverrides?: CategoryDisplayOverrides | null,
): { emoji: string; color: string; bgColor: string; name: string } {
  const custom = customCategories.find((c) => c.id === categoryId);
  const builtin = BUILTIN_CATEGORIES.find((c) => c.id === categoryId);
  const base =
    custom ??
    builtin ??
    ({ emoji: "📦", color: "#B2BEC3", bgColor: "#B2BEC320", name: "Other" } as CustomCategory);

  let defaultName: string;
  if (custom) {
    defaultName = base.name;
  } else if (builtin) {
    defaultName = String(i18n.t(`categories.${categoryId}`, { defaultValue: base.name }));
  } else {
    defaultName = String(i18n.t("categories.other", { defaultValue: base.name }));
  }

  const ov = displayOverrides?.[categoryId];
  /** Built-in labels always come from i18n; `name` overrides are not allowed. */
  const resolvedName = builtin ? defaultName : (ov?.name ?? defaultName);
  return {
    emoji: ov?.emoji ?? base.emoji,
    color: ov?.color ?? base.color,
    bgColor: ov?.bgColor ?? base.bgColor,
    name: resolvedName,
  };
}

export const DEFAULT_LISTS: ExpenseList[] = [
  { id: "private", name: "Private list", isDefault: true },
];

export const PRESET_BANK_AUTOMATIONS: BankAutomation[] = [
  {
    id: "google_wallet",
    name: "Google Wallet",
    emoji: "👛",
    storeUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel",
    packageName: "com.google.android.apps.walletnfcrel",
    enabled: false,
  },
  {
    id: "google_play",
    name: "Google Play",
    emoji: "▶️",
    storeUrl: "https://play.google.com/store/apps/details?id=com.android.vending",
    packageName: "com.android.vending",
    enabled: false,
  },
];

/** Ayarlarda silinemez hazır banka / cüzdan satırları */
export const PRESET_BANK_APP_IDS = new Set(PRESET_BANK_AUTOMATIONS.map((b) => b.id));

/** Backend ile birleşince `id` `ubank_*` olabilir; paket adı sabit kalır. */
export const PRESET_BANK_PACKAGES = new Set(PRESET_BANK_AUTOMATIONS.map((b) => b.packageName));

export const MOCK_EXPENSES: Expense[] = [
  { id: "1", amount: 24.5,  description: "Starbucks coffee",     category: "food",          date: "2026-05-01", currency: "USD", listId: "private" },
  { id: "2", amount: 45.0,  description: "Uber to airport",      category: "transport",     date: "2026-04-30", currency: "USD", listId: "private" },
  { id: "3", amount: 120.0, description: "Nike running shoes",   category: "shopping",      date: "2026-04-29", currency: "USD", listId: "private" },
  { id: "4", amount: 15.99, description: "Netflix",              category: "entertainment", date: "2026-04-28", currency: "USD", listId: "private" },
  { id: "5", amount: 60.0,  description: "Whole Foods grocery",  category: "food",          date: "2026-04-27", currency: "USD", listId: "private" },
];

export const MOCK_CATEGORY_SUMMARIES: CategorySummary[] = [
  { category: "food",      total: 384.5, emoji: "🍔", color: "#FF6B6B" },
  { category: "transport", total: 210.0, emoji: "🚗", color: "#4ECDC4" },
  { category: "shopping",  total: 340.0, emoji: "🛍️", color: "#A29BFE" },
];

export const TOTAL_SPENT = MOCK_EXPENSES.reduce(
  (sum, e) => sum + (e.isIncome ? e.amount : -e.amount),
  0,
);
