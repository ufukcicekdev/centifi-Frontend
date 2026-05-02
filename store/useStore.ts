import { create } from "zustand";
import {
  Expense, MOCK_EXPENSES, MONTHLY_BUDGET,
  CustomCategory, BUILTIN_CATEGORIES,
  ExpenseList, DEFAULT_LISTS,
  BankAutomation, PRESET_BANK_AUTOMATIONS,
  type CategoryDisplayOverrides,
} from "../constants/mockData";
import type { CategoryBudgetEntry } from "../constants/budgetTypes";
import i18n, { Language } from "../i18n";
import { getApiErrorStatus, loadTokens, saveTokens } from "../lib/api";
import {
  getMe,
  fetchExpensesPage,
  listExpenseLists,
  listUserCustomCategories,
  createExpenseList,
  patchExpenseList,
  deleteExpenseList,
  createUserCustomCategory,
  patchUserCustomCategory,
  deleteUserCustomCategory,
  mapUserCustomCategoryDto,
  mapExpenseDto,
  patchExpense,
  deleteExpense as deleteExpenseRemote,
  expenseListIdForApi,
  updateMe,
  type BackendUser,
} from "../lib/backend";
import { mapCategoryBudgetsFromApi } from "../lib/budgetApiMap";
import { loadEnabledCategoryIds, clearEnabledCategoryIds, saveEnabledCategoryIds } from "../lib/categoryPrefs";
import { loadBudgetPrefs, saveBudgetPrefs } from "../lib/budgetPrefs";
import { loadDisplayCurrency, saveDisplayCurrency } from "../lib/currencyPrefs";
import { loadLanguage, saveLanguage } from "../lib/languagePrefs";
import type { PeriodFilter } from "../lib/expenseFilters";
import { defaultPeriodFilter } from "../lib/expenseFilters";
import { queueBudgetThresholdCheck } from "../lib/budgetThresholdNotifications";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
}

/** Stable helper — use with useMemo in UI (avoid useStore(() => categoriesForHome()) infinite loops). */
export function buildCategoriesForHome(
  enabledCategoryIds: string[] | null,
  customCategories: CustomCategory[],
  displayOverrides?: CategoryDisplayOverrides | null,
): CustomCategory[] {
  const mapOne = (c: CustomCategory): CustomCategory => {
    const ov = displayOverrides?.[c.id];
    if (!ov) return c;
    return {
      ...c,
      name: ov.name ?? c.name,
      emoji: ov.emoji ?? c.emoji,
      color: ov.color ?? c.color,
      bgColor: ov.bgColor ?? c.bgColor,
    };
  };
  const all = [...BUILTIN_CATEGORIES, ...customCategories].map(mapOne);
  if (enabledCategoryIds == null) return all;
  const idSet = new Set(enabledCategoryIds);
  return all.filter((c) => idSet.has(c.id));
}

interface AppState {
  // Auth
  user: AuthUser | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  hydrateFromBackend: () => Promise<"ok" | "no_token" | "session_invalid" | "unreachable">;

  // User
  userName: string;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, "id"> & { id?: string }) => void;
  updateExpense: (id: string, patch: Partial<Omit<Expense, "id">>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  replaceExpenses: (expenses: Expense[]) => void;

  /** Relative URL path for `/api/expenses/?page=N` (null when everything loaded into store). */
  expensesNextPagePath: string | null;
  expensesLoadingMore: boolean;
  loadMoreExpenses: () => Promise<void>;

  // Budget
  monthlyBudget: number;
  setMonthlyBudget: (budget: number) => void;

  /** Per-category monthly limits + alert prefs (persisted locally). */
  categoryBudgets: Record<string, CategoryBudgetEntry>;
  setCategoryBudget: (categoryId: string, patch: Partial<CategoryBudgetEntry>) => void;
  removeCategoryBudgetEntry: (categoryId: string) => void;
  budgetAlertsEnabled: boolean;
  setBudgetAlertsEnabled: (v: boolean) => void;
  budgetAlertThresholdPercent: number;
  setBudgetAlertThresholdPercent: (n: number) => void;

  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  hydrateLanguage: () => Promise<void>;

  /** ISO 4217 — display & formatMoney */
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  hydrateDisplayCurrency: () => Promise<void>;

  // Pending (AI parsed, awaiting confirmation)
  pendingExpense: Omit<Expense, "id"> | null;
  setPendingExpense: (expense: Omit<Expense, "id"> | null) => void;

  // Notifications
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;

  // Custom categories
  customCategories: CustomCategory[];
  addCategory: (cat: Omit<CustomCategory, "id">) => Promise<CustomCategory>;
  updateCategory: (id: string, patch: Partial<Omit<CustomCategory, "id">>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  allCategories: () => CustomCategory[];

  // Lists
  lists: ExpenseList[];
  activeListId: string;
  addList: (name: string) => Promise<void>;
  updateList: (id: string, name: string) => Promise<void>;
  removeList: (id: string) => Promise<void>;
  setActiveList: (id: string) => void;

  /** Date range for dashboard & category screens */
  periodFilter: PeriodFilter;
  setPeriodFilter: (p: PeriodFilter) => void;

  /** null = show every category (legacy); otherwise only these ids on home */
  enabledCategoryIds: string[] | null;
  setEnabledCategoryIds: (ids: string[]) => void;
  categoriesForHome: () => CustomCategory[];

  /** Rename / re-icon built-in categories for display (merged in getCategoryMeta / home grid). */
  categoryDisplayOverrides: CategoryDisplayOverrides;
  setCategoryDisplayOverride: (
    categoryId: string,
    patch: Partial<Pick<CustomCategory, "name" | "emoji" | "color" | "bgColor">>,
  ) => void;

  // Bank automations
  bankAutomations: BankAutomation[];
  addBankAutomation: (b: Omit<BankAutomation, "id">) => void;
  toggleBankAutomation: (id: string) => void;
  removeBankAutomation: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => {
  const persistBudgetSettings = () => {
    const s = get();
    const localPayload = {
      categoryBudgets: s.categoryBudgets,
      budgetAlertsEnabled: s.budgetAlertsEnabled,
      budgetAlertThresholdPercent: s.budgetAlertThresholdPercent,
    };
    if (!s.isAuthenticated) {
      void saveBudgetPrefs(s.user?.uid ?? "local", localPayload).catch(() => {});
      return;
    }
    void updateMe({
      category_budgets: s.categoryBudgets,
      budget_alerts_enabled: s.budgetAlertsEnabled,
      budget_alert_threshold_percent: s.budgetAlertThresholdPercent,
    }).catch(() => {});
  };

  return {
  user: null,
  isAuthenticated: false,
  onboardingCompleted: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, userName: user?.name.split(" ")[0] ?? "User" }),
  logout: () => {
    const uid = get().user?.uid;
    if (uid) void clearEnabledCategoryIds(uid);
    saveTokens(null);
    set({
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      enabledCategoryIds: null,
      customCategories: [],
      categoryDisplayOverrides: {},
      lists: DEFAULT_LISTS,
      activeListId: "private",
      categoryBudgets: {},
      budgetAlertsEnabled: true,
      budgetAlertThresholdPercent: 90,
      expensesNextPagePath: null,
      expensesLoadingMore: false,
    });
  },
  hydrateFromBackend: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ user: null, isAuthenticated: false });
      return "no_token";
    }
    try {
      const me: BackendUser = await getMe();
      const [listsResp, expensesPage, catsResp] = await Promise.all([
        listExpenseLists().catch(() => null),
        fetchExpensesPage("/api/expenses/").catch(() => null),
        listUserCustomCategories().catch(() => null),
      ]);

      const listsMapped: ExpenseList[] =
        listsResp?.results?.length ?
          listsResp.results.map((l) => ({
            id: String(l.id),
            name: l.name,
            isDefault: l.is_default,
          })) :
          DEFAULT_LISTS;

      const defaultDto = listsResp?.results?.find((l) => l.is_default);
      const fallbackListId = defaultDto ?
        String(defaultDto.id) :
        listsMapped[0]?.id ??
        "private";

      const prevActive = get().activeListId;
      const activeListId = listsMapped.some((l) => l.id === prevActive) ?
        prevActive :
        fallbackListId;

      const displayName = [me.first_name, me.last_name].filter(Boolean).join(" ").trim() || me.username;
      const uid = String(me.id);
      const savedCats = await loadEnabledCategoryIds(uid).catch(() => null);

      const mbRaw = parseFloat(String(me.monthly_budget ?? "0"));
      const monthlyBudget = Number.isFinite(mbRaw) ? mbRaw : MONTHLY_BUDGET;

      const budgetPrefs = await loadBudgetPrefs(uid).catch(() => null);

      const dcRaw = me.display_currency?.trim().toUpperCase();
      const displayCurrencyFromServer =
        dcRaw && /^[A-Z]{3}$/.test(dcRaw) ? dcRaw : undefined;

      const patch: Partial<AppState> = {
        isAuthenticated: true,
        user: { uid, name: displayName, email: me.email, photo: null },
        userName: (displayName.split(" ")[0] ?? "User").trim() || "User",
        isDark: !!me.is_dark_mode,
        notificationsEnabled: !!me.notifications_enabled,
        monthlyBudget,
        language: (me.language as Language) ?? "en",
        onboardingCompleted: !!me.onboarding_completed,
        enabledCategoryIds: savedCats,
        lists: listsMapped,
        activeListId,
        ...(displayCurrencyFromServer ? { displayCurrency: displayCurrencyFromServer } : {}),
      };

      if (displayCurrencyFromServer) {
        void saveDisplayCurrency(displayCurrencyFromServer);
      }

      const mb = me as BackendUser;
      const hasServerBudgetFields =
        mb.category_budgets !== undefined ||
        mb.budget_alerts_enabled !== undefined ||
        mb.budget_alert_threshold_percent !== undefined;

      if (mb.category_budgets !== undefined) {
        patch.categoryBudgets = mapCategoryBudgetsFromApi(mb.category_budgets);
      } else if (!hasServerBudgetFields && budgetPrefs) {
        patch.categoryBudgets = budgetPrefs.categoryBudgets;
      }

      if (typeof mb.budget_alerts_enabled === "boolean") {
        patch.budgetAlertsEnabled = mb.budget_alerts_enabled;
      } else if (!hasServerBudgetFields && budgetPrefs) {
        patch.budgetAlertsEnabled = budgetPrefs.budgetAlertsEnabled;
      }

      if (
        typeof mb.budget_alert_threshold_percent === "number" &&
        Number.isFinite(mb.budget_alert_threshold_percent)
      ) {
        patch.budgetAlertThresholdPercent = Math.min(
          100,
          Math.max(50, Math.round(mb.budget_alert_threshold_percent)),
        );
      } else if (!hasServerBudgetFields && budgetPrefs) {
        patch.budgetAlertThresholdPercent = budgetPrefs.budgetAlertThresholdPercent;
      }

      if (expensesPage?.results) {
        patch.expenses = expensesPage.results.map((e) => mapExpenseDto(e, fallbackListId));
        patch.expensesNextPagePath = expensesPage.nextPath;
      } else {
        patch.expensesNextPagePath = null;
      }

      if (catsResp?.results) {
        patch.customCategories = catsResp.results.map(mapUserCustomCategoryDto);
      }

      set(patch);
      try {
        const lng = (me.language as Language) ?? "en";
        i18n.changeLanguage(lng);
        void saveLanguage(lng);
      } catch {
        /* ignore bad locale from API */
      }
      queueBudgetThresholdCheck(get);
      return "ok";
    } catch (e: unknown) {
      const status = getApiErrorStatus(e);
      if (status === 401 || status === 403) {
        await saveTokens(null);
      }
      set({
        user: null,
        isAuthenticated: false,
        expensesNextPagePath: null,
        expensesLoadingMore: false,
      });
      if (status === 401 || status === 403) return "session_invalid";
      return "unreachable";
    }
  },

  userName: "User",

  expenses: MOCK_EXPENSES,
  addExpense: (expense) => {
    set((state) => ({
      expenses: [{ ...expense, id: expense.id ?? Date.now().toString() }, ...state.expenses],
    }));
    queueBudgetThresholdCheck(get);
  },
  updateExpense: async (id, patch) => {
    const cur = get().expenses.find((e) => e.id === id);
    if (!cur) return;
    const optimistic: Expense = { ...cur, ...patch };
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? optimistic : e)),
    }));
    queueBudgetThresholdCheck(get);
    if (!get().isAuthenticated) return;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) return;
    try {
      const dto = await patchExpense(numId, {
        amount: optimistic.amount,
        description: optimistic.description,
        category: optimistic.category,
        date: optimistic.date,
        currency: optimistic.currency,
        is_income: optimistic.isIncome ?? false,
        list_id: expenseListIdForApi(optimistic.listId),
      });
      const lists = get().lists;
      const fb = lists.find((l) => l.isDefault)?.id ?? lists[0]?.id ?? "private";
      const row = mapExpenseDto(dto, fb);
      set((s) => ({
        expenses: s.expenses.map((e) => (e.id === id ? row : e)),
      }));
      queueBudgetThresholdCheck(get);
    } catch {
      set((s) => ({
        expenses: s.expenses.map((e) => (e.id === id ? cur : e)),
      }));
      throw new Error("Could not save expense.");
    }
  },
  removeExpense: async (id) => {
    if (!get().expenses.some((e) => e.id === id)) return;
    if (get().isAuthenticated) {
      const numId = Number(id);
      if (Number.isFinite(numId) && numId > 0) {
        await deleteExpenseRemote(numId);
      }
    }
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
    queueBudgetThresholdCheck(get);
  },
  replaceExpenses: (expenses) => {
    set({ expenses, expensesNextPagePath: null });
    queueBudgetThresholdCheck(get);
  },

  expensesNextPagePath: null,
  expensesLoadingMore: false,
  loadMoreExpenses: async () => {
    const s = get();
    if (!s.isAuthenticated || !s.expensesNextPagePath || s.expensesLoadingMore) return;

    const defaultList = s.lists.find((l) => l.isDefault) ?? s.lists[0];
    const fallbackListId = defaultList?.id ?? "private";

    set({ expensesLoadingMore: true });
    try {
      const page = await fetchExpensesPage(s.expensesNextPagePath);
      const seen = new Set(get().expenses.map((e) => e.id));
      const incoming = page.results
        .filter((dto) => !seen.has(String(dto.id)))
        .map((dto) => mapExpenseDto(dto, fallbackListId));
      set((prev) => ({
        expenses: [...prev.expenses, ...incoming],
        expensesNextPagePath: page.nextPath,
        expensesLoadingMore: false,
      }));
      queueBudgetThresholdCheck(get);
    } catch {
      set({ expensesLoadingMore: false });
    }
  },

  monthlyBudget: MONTHLY_BUDGET,
  setMonthlyBudget: (budget) => set({ monthlyBudget: budget }),

  categoryBudgets: {},
  budgetAlertsEnabled: true,
  budgetAlertThresholdPercent: 90,

  setCategoryBudget: (categoryId, patch) => {
    set((state) => {
      const cur = state.categoryBudgets[categoryId];
      const next: CategoryBudgetEntry = {
        amount: patch.amount !== undefined ? patch.amount : cur?.amount ?? null,
        budgetColor: patch.budgetColor ?? cur?.budgetColor ?? "#FF6B6B",
      };
      return {
        categoryBudgets: { ...state.categoryBudgets, [categoryId]: next },
      };
    });
    persistBudgetSettings();
    queueBudgetThresholdCheck(get);
  },

  removeCategoryBudgetEntry: (categoryId) => {
    set((state) => {
      const { [categoryId]: _, ...rest } = state.categoryBudgets;
      return { categoryBudgets: rest };
    });
    persistBudgetSettings();
    queueBudgetThresholdCheck(get);
  },

  setBudgetAlertsEnabled: (v) => {
    set({ budgetAlertsEnabled: v });
    persistBudgetSettings();
    queueBudgetThresholdCheck(get);
  },

  setBudgetAlertThresholdPercent: (n) => {
    const clamped = Math.min(100, Math.max(50, Math.round(n)));
    set({ budgetAlertThresholdPercent: clamped });
    persistBudgetSettings();
    queueBudgetThresholdCheck(get);
  },

  isDark: true,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),

  language: "en",
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
    void saveLanguage(lang);
    if (get().isAuthenticated) {
      void updateMe({ language: lang }).catch(() => {});
    }
  },
  hydrateLanguage: async () => {
    const saved = await loadLanguage();
    if (!saved) return;
    try {
      await i18n.changeLanguage(saved);
    } catch {
      /* ignore */
    }
    set({ language: saved });
  },

  displayCurrency: "USD",
  setDisplayCurrency: (code) => {
    const u = String(code).toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(u)) return;
    set({ displayCurrency: u });
    void saveDisplayCurrency(u);
    if (get().isAuthenticated) {
      void updateMe({ display_currency: u }).catch(() => {});
    }
  },
  hydrateDisplayCurrency: async () => {
    const c = await loadDisplayCurrency();
    set({ displayCurrency: c });
  },

  pendingExpense: null,
  setPendingExpense: (expense) => set({ pendingExpense: expense }),

  notificationsEnabled: true,
  setNotificationsEnabled: (v) => {
    set({ notificationsEnabled: v });
    if (get().isAuthenticated) {
      void updateMe({ notifications_enabled: v }).catch(() => {});
    }
    if (v) {
      queueBudgetThresholdCheck(get);
    }
  },

  // Categories
  customCategories: [],
  addCategory: async (cat) => {
    if (!get().isAuthenticated) {
      const row: CustomCategory = { ...cat, id: `custom_${Date.now()}` };
      set((state) => ({ customCategories: [...state.customCategories, row] }));
      return row;
    }
    const dto = await createUserCustomCategory({
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      bg_color: cat.bgColor,
    });
    const row = mapUserCustomCategoryDto(dto);
    set((state) => ({ customCategories: [...state.customCategories, row] }));
    const uid = get().user?.uid;
    const cur = get().enabledCategoryIds;
    if (uid && cur != null) {
      const next = [...new Set([...cur, row.id])];
      set({ enabledCategoryIds: next });
      await saveEnabledCategoryIds(uid, next);
    }
    return row;
  },
  updateCategory: async (id, patch) => {
    const m = /^custom_(\d+)$/.exec(id);
    if (get().isAuthenticated && m) {
      await patchUserCustomCategory(Number(m[1]), {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.bgColor !== undefined ? { bg_color: patch.bgColor } : {}),
      });
    }
    set((state) => ({
      customCategories: state.customCategories.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  },
  removeCategory: async (id) => {
    const m = /^custom_(\d+)$/.exec(id);
    if (get().isAuthenticated && m) {
      await deleteUserCustomCategory(Number(m[1]));
    }
    const uid = get().user?.uid;
    const prevEnabled = get().enabledCategoryIds;
    const nextEnabled =
      prevEnabled == null ? null : prevEnabled.filter((x) => x !== id);
    set((state) => ({
      customCategories: state.customCategories.filter((c) => c.id !== id),
      enabledCategoryIds: nextEnabled,
    }));
    if (uid && prevEnabled != null && nextEnabled != null) {
      await saveEnabledCategoryIds(uid, nextEnabled);
    }
  },
  allCategories: () => [...BUILTIN_CATEGORIES, ...get().customCategories],

  enabledCategoryIds: null,
  setEnabledCategoryIds: (ids) => set({ enabledCategoryIds: ids }),
  categoriesForHome: () =>
    buildCategoriesForHome(get().enabledCategoryIds, get().customCategories, get().categoryDisplayOverrides),

  categoryDisplayOverrides: {},
  setCategoryDisplayOverride: (categoryId, patch) =>
    set((state) => ({
      categoryDisplayOverrides: {
        ...state.categoryDisplayOverrides,
        [categoryId]: { ...state.categoryDisplayOverrides[categoryId], ...patch },
      },
    })),

  // Lists
  lists: DEFAULT_LISTS,
  activeListId: "private",
  addList: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!get().isAuthenticated) {
      set((state) => ({
        lists: [...state.lists, { id: `list_${Date.now()}`, name: trimmed }],
      }));
      return;
    }
    const dto = await createExpenseList(trimmed);
    set((state) => ({
      lists: [...state.lists, { id: String(dto.id), name: dto.name, isDefault: dto.is_default }],
    }));
  },
  updateList: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const localOnly = !get().isAuthenticated || id.startsWith("list_");
    if (localOnly) {
      set((state) => ({
        lists: state.lists.map((l) => (l.id === id ? { ...l, name: trimmed } : l)),
      }));
      return;
    }
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) return;
    const dto = await patchExpenseList(numId, trimmed);
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === id ? { id: String(dto.id), name: dto.name, isDefault: dto.is_default } : l,
      ),
    }));
  },
  removeList: async (id) => {
    const numId = Number(id);
    if (get().isAuthenticated && Number.isFinite(numId) && numId > 0) {
      await deleteExpenseList(numId);
    }
    set((state) => {
      const lists = state.lists.filter((l) => l.id !== id);
      const fallback =
        lists.find((l) => l.isDefault)?.id ?? lists[0]?.id ?? "private";
      return {
        lists,
        activeListId: state.activeListId === id ? fallback : state.activeListId,
      };
    });
  },
  setActiveList: (id) => set({ activeListId: id }),

  periodFilter: defaultPeriodFilter(),
  setPeriodFilter: (p) => set({ periodFilter: p }),

  // Bank automations
  bankAutomations: PRESET_BANK_AUTOMATIONS,
  addBankAutomation: (b) =>
    set((state) => ({
      bankAutomations: [...state.bankAutomations, { ...b, id: `bank_${Date.now()}` }],
    })),
  toggleBankAutomation: (id) =>
    set((state) => ({
      bankAutomations: state.bankAutomations.map((b) => b.id === id ? { ...b, enabled: !b.enabled } : b),
    })),
  removeBankAutomation: (id) =>
    set((state) => ({ bankAutomations: state.bankAutomations.filter((b) => b.id !== id) })),
};
});
