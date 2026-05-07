import { create } from "zustand";
import { Platform } from "react-native";
import {
  Expense, MOCK_EXPENSES,
  CustomCategory, BUILTIN_CATEGORIES, isBuiltinCategoryId,
  getCategoryMeta,
  ExpenseList, DEFAULT_LISTS,
  BankAutomation, PRESET_BANK_AUTOMATIONS, PRESET_BANK_PACKAGES,
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
  listUserBankApps,
  createUserBankApp,
  patchUserBankApp,
  deleteUserBankApp,
  mapUserBankAppDto,
  parseUserBankAppApiId,
  type BackendUser,
} from "../lib/backend";
import { mapCategoryBudgetsFromApi } from "../lib/budgetApiMap";
import { loadEnabledCategoryIds, clearEnabledCategoryIds, saveEnabledCategoryIds } from "../lib/categoryPrefs";
import { loadBudgetPrefs, saveBudgetPrefs } from "../lib/budgetPrefs";
import { loadDisplayCurrency, saveDisplayCurrency } from "../lib/currencyPrefs";
import { getDeviceAppLanguage } from "../lib/deviceLanguage";
import { loadLanguage, saveLanguage } from "../lib/languagePrefs";
import type { PendingBankTransaction } from "../lib/pendingBankTypes";
import { loadPendingBankPrefs, savePendingBankPrefs } from "../lib/pendingBankPrefs";
import type { PeriodFilter } from "../lib/expenseFilters";
import { defaultPeriodFilter } from "../lib/expenseFilters";
import { flushBudgetThresholdCheck, queueBudgetThresholdCheck } from "../lib/budgetThresholdNotifications";

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photo: string | null;
  /** From ``/me`` — false for social-only accounts. */
  hasPassword?: boolean;
}

/** Stable helper — use with useMemo in UI (avoid useStore(() => categoriesForHome()) infinite loops). */
export function buildCategoriesForHome(
  enabledCategoryIds: string[] | null,
  customCategories: CustomCategory[],
  displayOverrides?: CategoryDisplayOverrides | null,
): CustomCategory[] {
  const mapOne = (c: CustomCategory): CustomCategory => {
    const m = getCategoryMeta(c.id, customCategories, displayOverrides);
    return { ...c, name: m.name, emoji: m.emoji, color: m.color, bgColor: m.bgColor };
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
  /** RevenueCat ``pro`` — backend /subscription/sync + /me */
  isPro: boolean;
  proEntitlementExpiresAt: string | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  hydrateFromBackend: () => Promise<"ok" | "no_token" | "session_invalid" | "unreachable">;

  // User
  userName: string;

  // Expenses
  expenses: Expense[];
  addExpense: (
    expense: Omit<Expense, "id"> & { id?: string },
    opts?: { deferBudgetCheckMs?: number },
  ) => void;
  /** Fiş/ses: API sonrası toplu ekleme; bütçe kontrolü çağıran tarafın `flushBudgetThresholdCheck` ile yapılır. */
  addExpensesBatch: (items: Expense[]) => void;
  updateExpense: (id: string, patch: Partial<Omit<Expense, "id">>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  replaceExpenses: (expenses: Expense[]) => void;

  /** Relative URL path for `/api/expenses/?page=N` (null when everything loaded into store). */
  expensesNextPagePath: string | null;
  expensesLoadingMore: boolean;
  loadMoreExpenses: () => Promise<void>;

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
  /** OS bildirim izni yoksa anahtarı kapatır ve sunucuya yansıtır — anahtar ile gerçek durum uyumlu kalsın. */
  syncNotificationsWithOsPermission: () => Promise<void>;

  // Custom categories
  customCategories: CustomCategory[];
  addCategory: (cat: Omit<CustomCategory, "id">) => Promise<CustomCategory>;
  updateCategory: (id: string, patch: Partial<Omit<CustomCategory, "id">>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  allCategories: () => CustomCategory[];

  // Lists
  lists: ExpenseList[];
  activeListId: string;
  addList: (name: string, emoji?: string) => Promise<void>;
  updateList: (id: string, name: string, emoji?: string) => Promise<void>;
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
  addBankAutomation: (b: Omit<BankAutomation, "id"> & { iconUrl?: string }) => Promise<void>;
  toggleBankAutomation: (id: string) => Promise<void>;
  removeBankAutomation: (id: string) => Promise<void>;

  /** Android bank bildirimleri — kayıt öncesi ana ekranda listelenir */
  pendingBankTransactions: PendingBankTransaction[];
  hydratePendingBankTransactions: () => Promise<void>;
  ingestNativePendingBankRows: (rows: PendingBankTransaction[]) => void;
  removePendingBankTransaction: (id: string) => void;
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
  isPro: false,
  proEntitlementExpiresAt: null,
  setUser: (user) => set({ user, isAuthenticated: !!user, userName: user?.name.split(" ")[0] ?? "User" }),
  logout: () => {
    const uid = get().user?.uid;
    if (uid) void clearEnabledCategoryIds(uid);
    saveTokens(null);
    set({
      user: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      isPro: false,
      proEntitlementExpiresAt: null,
      enabledCategoryIds: null,
      customCategories: [],
      categoryDisplayOverrides: {},
      lists: DEFAULT_LISTS,
      activeListId: "private",
      categoryBudgets: {},
      budgetAlertsEnabled: true,
      budgetAlertThresholdPercent: 80,
      expensesNextPagePath: null,
      expensesLoadingMore: false,
      bankAutomations: PRESET_BANK_AUTOMATIONS,
      pendingBankTransactions: [],
    });
  },
  hydrateFromBackend: async () => {
    const tokens = await loadTokens();
    if (!tokens) {
      set({ user: null, isAuthenticated: false, isPro: false, proEntitlementExpiresAt: null });
      return "no_token";
    }
    try {
      const me: BackendUser = await getMe();
      const [listsResp, expensesPage, catsResp, banksResp] = await Promise.all([
        listExpenseLists().catch(() => null),
        fetchExpensesPage("/api/expenses/").catch(() => null),
        listUserCustomCategories().catch(() => null),
        listUserBankApps().catch(() => null),
      ]);

      const listsMapped: ExpenseList[] =
        listsResp?.results?.length ?
          listsResp.results.map((l) => ({
            id: String(l.id),
            name: l.name,
            isDefault: l.is_default,
            emoji: typeof l.emoji === "string" && l.emoji.trim() ? l.emoji.trim() : undefined,
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

      const savedPref = await loadLanguage();
      const deviceLng = getDeviceAppLanguage() as Language;
      const serverRaw = String(me.language || "en")
        .toLowerCase()
        .split("-")[0];
      const serverLng = (["en", "tr", "de", "fr", "es"].includes(serverRaw) ? serverRaw : "en") as Language;
      const resolvedLang: Language = (savedPref ?? deviceLng ?? serverLng) as Language;

      const budgetPrefs = await loadBudgetPrefs(uid).catch(() => null);

      const dcRaw = me.display_currency?.trim().toUpperCase();
      const displayCurrencyFromServer =
        dcRaw && /^[A-Z]{3}$/.test(dcRaw) ? dcRaw : undefined;

      const patch: Partial<AppState> = {
        isAuthenticated: true,
        user: {
          uid,
          name: displayName,
          email: me.email,
          photo: null,
          hasPassword: !!me.has_password,
        },
        userName: (displayName.split(" ")[0] ?? "User").trim() || "User",
        isDark: !!me.is_dark_mode,
        notificationsEnabled: !!me.notifications_enabled,
        language: resolvedLang,
        onboardingCompleted: !!me.onboarding_completed,
        isPro: !!me.is_pro,
        proEntitlementExpiresAt: me.pro_entitlement_expires_at ?? null,
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

      {
        const merged = [...PRESET_BANK_AUTOMATIONS];
        for (const dto of banksResp?.results ?? []) {
          const row = mapUserBankAppDto(dto);
          const idx = merged.findIndex((x) => x.packageName === row.packageName);
          if (idx >= 0) merged[idx] = row;
          else merged.push(row);
        }
        patch.bankAutomations = merged;
      }

      set(patch);
      try {
        await i18n.changeLanguage(resolvedLang);
      } catch {
        /* ignore bad locale from API */
      }
      if (!savedPref) {
        void saveLanguage(resolvedLang);
      }
      if (resolvedLang !== serverLng) {
        void updateMe({ language: resolvedLang }).catch(() => {});
      }
      queueBudgetThresholdCheck(get);
      void get().hydratePendingBankTransactions().catch(() => {});
      void get().syncNotificationsWithOsPermission();
      return "ok";
    } catch (e: unknown) {
      const status = getApiErrorStatus(e);
      if (status === 401 || status === 403) {
        await saveTokens(null);
      }
      set({
        user: null,
        isAuthenticated: false,
        isPro: false,
        proEntitlementExpiresAt: null,
        expensesNextPagePath: null,
        expensesLoadingMore: false,
        bankAutomations: PRESET_BANK_AUTOMATIONS,
        pendingBankTransactions: [],
      });
      if (status === 401 || status === 403) return "session_invalid";
      return "unreachable";
    }
  },

  userName: "User",

  expenses: MOCK_EXPENSES,
  addExpense: (expense, opts) => {
    set((state) => ({
      expenses: [{ ...expense, id: expense.id ?? Date.now().toString() }, ...state.expenses],
    }));
    const deferMs = opts?.deferBudgetCheckMs;
    if (typeof deferMs === "number" && deferMs >= 0) {
      setTimeout(() => flushBudgetThresholdCheck(get), deferMs);
    } else {
      queueBudgetThresholdCheck(get);
    }
  },
  addExpensesBatch: (items) => {
    if (items.length === 0) return;
    set((state) => ({
      expenses: [...items, ...state.expenses],
    }));
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

  categoryBudgets: {},
  budgetAlertsEnabled: true,
  budgetAlertThresholdPercent: 80,

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

  language: getDeviceAppLanguage() as Language,
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
    const device = getDeviceAppLanguage() as Language;
    const resolved = (saved ?? device) as Language;
    try {
      await i18n.changeLanguage(resolved);
    } catch {
      /* ignore */
    }
    set({ language: resolved });
  },

  displayCurrency: "USD",
  setDisplayCurrency: (code) => {
    const u = String(code).toUpperCase().trim();
    if (!/^[A-Z]{3}$/.test(u)) return;
    set((state) => {
      if (state.displayCurrency === u) return state;
      return {
        displayCurrency: u,
        expenses: state.expenses.map((e) => ({ ...e, currency: u })),
      };
    });
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

  syncNotificationsWithOsPermission: async () => {
    if (Platform.OS === "web") return;
    let denied = false;
    try {
      const { isOsNotificationPermissionExplicitlyDenied } = await import("../lib/localNotifications");
      denied = await isOsNotificationPermissionExplicitlyDenied();
    } catch {
      return;
    }
    if (!denied) return;
    if (!get().notificationsEnabled) return;
    set({ notificationsEnabled: false });
    if (get().isAuthenticated) {
      void updateMe({ notifications_enabled: false }).catch(() => {});
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
    set((state) => {
      const merged = { ...state.categoryDisplayOverrides[categoryId], ...patch };
      if (isBuiltinCategoryId(categoryId)) {
        const { name: _omit, ...withoutName } = merged;
        return {
          categoryDisplayOverrides: {
            ...state.categoryDisplayOverrides,
            [categoryId]: withoutName,
          },
        };
      }
      return {
        categoryDisplayOverrides: {
          ...state.categoryDisplayOverrides,
          [categoryId]: merged,
        },
      };
    }),

  // Lists
  lists: DEFAULT_LISTS,
  activeListId: "private",
  addList: async (name, emoji) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const emojiTrim = emoji?.trim() ?? "";
    if (!get().isAuthenticated) {
      set((state) => ({
        lists: [
          ...state.lists,
          {
            id: `list_${Date.now()}`,
            name: trimmed,
            ...(emojiTrim ? { emoji: emojiTrim } : {}),
          },
        ],
      }));
      return;
    }
    const dto = await createExpenseList(trimmed, emojiTrim || undefined);
    const dtoEmoji = typeof dto.emoji === "string" && dto.emoji.trim() ? dto.emoji.trim() : undefined;
    set((state) => ({
      lists: [
        ...state.lists,
        {
          id: String(dto.id),
          name: dto.name,
          isDefault: dto.is_default,
          ...(dtoEmoji ? { emoji: dtoEmoji } : {}),
        },
      ],
    }));
  },
  updateList: async (id, name, emoji) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const emojiTrim = emoji?.trim() ?? "";
    const localOnly = !get().isAuthenticated || id.startsWith("list_");
    if (localOnly) {
      set((state) => ({
        lists: state.lists.map((l) => {
          if (l.id !== id) return l;
          const next: ExpenseList = { ...l, name: trimmed };
          if (emojiTrim) next.emoji = emojiTrim;
          else delete next.emoji;
          return next;
        }),
      }));
      return;
    }
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) return;
    const dto = await patchExpenseList(numId, { name: trimmed, emoji: emojiTrim });
    const dtoEmoji = typeof dto.emoji === "string" && dto.emoji.trim() ? dto.emoji.trim() : undefined;
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === id ?
          {
            id: String(dto.id),
            name: dto.name,
            isDefault: dto.is_default,
            ...(dtoEmoji ? { emoji: dtoEmoji } : {}),
          }
        : l,
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
  addBankAutomation: async (b) => {
    if (!get().isAuthenticated) {
      set((state) => ({
        bankAutomations: [...state.bankAutomations, { ...b, id: `bank_${Date.now()}` }],
      }));
      return;
    }
    const dto = await createUserBankApp({
      name: b.name,
      emoji: b.emoji,
      store_url: b.storeUrl,
      package_name: b.packageName,
      enabled: b.enabled,
      ...(b.iconUrl?.trim() ? { icon_url: b.iconUrl.trim() } : {}),
    });
    const row = mapUserBankAppDto(dto);
    set((state) => ({ bankAutomations: [...state.bankAutomations, row] }));
  },
  toggleBankAutomation: async (id) => {
    const cur = get().bankAutomations.find((x) => x.id === id);
    if (!cur) return;
    const nextEnabled = !cur.enabled;
    set((state) => ({
      bankAutomations: state.bankAutomations.map((row) =>
        row.id === id ? { ...row, enabled: nextEnabled } : row,
      ),
    }));
    const apiId = parseUserBankAppApiId(id);
    if (!get().isAuthenticated) return;

    // Preset rows (e.g. Google Wallet / Play) have non-API ids; persist by creating a user row on first enable.
    if (apiId == null) {
      if (!nextEnabled) return;
      try {
        const dto = await createUserBankApp({
          name: cur.name,
          emoji: cur.emoji,
          store_url: cur.storeUrl,
          package_name: cur.packageName,
          enabled: true,
          ...(cur.iconUrl?.trim() ? { icon_url: cur.iconUrl.trim() } : {}),
        });
        const row = mapUserBankAppDto(dto);
        set((state) => ({
          bankAutomations: state.bankAutomations.map((b) => (b.id === id ? row : b)),
        }));
        return;
      } catch {
        // If already exists (unique package), find it and patch.
        try {
          const list = await listUserBankApps();
          const hit = list.results?.find((x) => x.package_name === cur.packageName);
          if (!hit) return;
          await patchUserBankApp(hit.id, { enabled: true });
          const row = mapUserBankAppDto({ ...hit, enabled: true } as any);
          set((state) => ({
            bankAutomations: state.bankAutomations.map((b) => (b.id === id ? row : b)),
          }));
        } catch {
          set((state) => ({
            bankAutomations: state.bankAutomations.map((row) =>
              row.id === id ? { ...row, enabled: cur.enabled } : row,
            ),
          }));
        }
        return;
      }
    }

    try {
      await patchUserBankApp(apiId, { enabled: nextEnabled });
    } catch {
      set((state) => ({
        bankAutomations: state.bankAutomations.map((row) =>
          row.id === id ? { ...row, enabled: cur.enabled } : row,
        ),
      }));
    }
  },
  removeBankAutomation: async (id) => {
    const row = get().bankAutomations.find((b) => b.id === id);
    const pkg = row?.packageName?.trim() ?? "";
    if (pkg && PRESET_BANK_PACKAGES.has(pkg)) return;

    const apiId = parseUserBankAppApiId(id);
    if (apiId != null && get().isAuthenticated) {
      try {
        await deleteUserBankApp(apiId);
      } catch {
        return;
      }
    }
    set((state) => ({ bankAutomations: state.bankAutomations.filter((b) => b.id !== id) }));
  },

  pendingBankTransactions: [],
  hydratePendingBankTransactions: async () => {
    const uid = get().user?.uid ?? "local";
    const rows = await loadPendingBankPrefs(uid);
    set({ pendingBankTransactions: rows });
  },
  ingestNativePendingBankRows: (rows) => {
    if (rows.length === 0) return;
    const uid = get().user?.uid ?? "local";
    const cur = get().pendingBankTransactions;
    const seen = new Set(cur.map((r) => r.id));
    const newRows = rows.filter((r) => !seen.has(r.id));
    if (newRows.length === 0) return;
    const merged = [...newRows, ...cur].slice(0, 80);
    set({ pendingBankTransactions: merged });
    void savePendingBankPrefs(uid, merged).catch(() => {});
    // OS bildirimi Android’de BankNotificationListener içinde gösterilir (arka planda JS çalışmaz).
  },
  removePendingBankTransaction: (id) => {
    const uid = get().user?.uid ?? "local";
    set((state) => {
      const next = state.pendingBankTransactions.filter((r) => r.id !== id);
      void savePendingBankPrefs(uid, next).catch(() => {});
      return { pendingBankTransactions: next };
    });
  },
};
});
