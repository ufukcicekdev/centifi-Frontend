import { apiFetch, saveTokens, type AuthTokens } from "./api";

export type BackendUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  monthly_budget: string;
  language: string;
  /** ISO 4217 — preferred display currency for UI / budgets */
  display_currency?: string;
  is_dark_mode: boolean;
  notifications_enabled: boolean;
  alert_email: string;
  onboarding_completed: boolean;
  /** Per-category budgets (synced when logged in). */
  category_budgets?: Record<string, { amount: number | null; budgetColor: string }> | null;
  budget_alerts_enabled?: boolean;
  budget_alert_threshold_percent?: number;
};

/** Tek AI yanıtında bir veya birden fazla harcama */
export type ParsedExpenseItem = {
  amount: number;
  description: string;
  category: string;
  date: string;
  currency: string;
};

export type ParseResult = {
  expenses: ParsedExpenseItem[];
  receipt_url?: string;
};

export type ExpenseDto = {
  id: number;
  amount: string;
  description: string;
  category: string;
  date: string;
  currency: string;
  is_income?: boolean;
  created_at: string;
  updated_at: string;
  list_id?: number | null;
};

/** Maps API row to local Expense shape (callers supply fallback list id when `list_id` is null). */
export function mapExpenseDto(dto: ExpenseDto, fallbackListId: string) {
  return {
    id: String(dto.id),
    amount: parseFloat(dto.amount),
    description: dto.description,
    category: dto.category,
    date: dto.date,
    currency: dto.currency,
    isIncome: !!dto.is_income,
    listId: dto.list_id != null ? String(dto.list_id) : fallbackListId,
  };
}

export type ExpenseListDto = {
  id: number;
  name: string;
  is_default: boolean;
};

/** When omitted or legacy `"private"`, API attaches the user's default list. */
export function expenseListIdForApi(listId: string | undefined): number | undefined {
  if (listId == null || listId === "private") return undefined;
  const n = Number(listId);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export async function loginWithEmail(email: string, password: string) {
  const tokens = await apiFetch<AuthTokens>("/api/users/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await saveTokens(tokens);
  return tokens;
}

export async function registerUser(params: { name: string; email: string; password: string }) {
  const username = params.email; // simplest: username = email
  const [first_name, ...rest] = params.name.trim().split(/\s+/);
  const last_name = rest.join(" ");

  await apiFetch("/api/users/register/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: params.email,
      password: params.password,
      first_name,
      last_name,
    }),
  });

  // Then login to obtain tokens
  return loginWithEmail(params.email, params.password);
}

export async function getMe() {
  return apiFetch<BackendUser>("/api/users/me/", { method: "GET", auth: true });
}

export async function socialAuth(params: {
  provider: "google" | "apple";
  token: string;
  name?: string;
  email?: string;
}) {
  const tokens = await apiFetch<AuthTokens>("/api/users/social-auth/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await saveTokens(tokens);
  return tokens;
}

export async function updateMe(patch: Partial<BackendUser>) {
  return apiFetch<BackendUser>("/api/users/me/", {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function createExpense(expense: {
  amount: number;
  description: string;
  category: string;
  date: string;
  currency: string;
  is_income?: boolean;
  list_id?: number;
}) {
  const body: Record<string, unknown> = {
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    date: expense.date,
    currency: expense.currency,
    is_income: expense.is_income ?? false,
  };
  if (expense.list_id != null) body.list_id = expense.list_id;
  return apiFetch<ExpenseDto>("/api/expenses/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchExpense(
  id: number,
  patch: Partial<{
    amount: number;
    description: string;
    category: string;
    date: string;
    currency: string;
    is_income: boolean;
    list_id: number | null;
  }>,
) {
  const body: Record<string, unknown> = {};
  if (patch.amount !== undefined) body.amount = patch.amount;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.date !== undefined) body.date = patch.date;
  if (patch.currency !== undefined) body.currency = patch.currency;
  if (patch.is_income !== undefined) body.is_income = patch.is_income;
  if (patch.list_id !== undefined) body.list_id = patch.list_id;
  return apiFetch<ExpenseDto>(`/api/expenses/${id}/`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteExpense(id: number) {
  await apiFetch<unknown>(`/api/expenses/${id}/`, { method: "DELETE", auth: true });
}

/** DRF PageNumberPagination (`settings.PAGE_SIZE`); use `fetchExpensesPage` + `nextPath` for extra pages. */
type ExpenseListPage = { results: ExpenseDto[]; next: string | null };

function pathFromPaginationNext(next: string | null | undefined): string | null {
  if (!next) return null;
  try {
    const { pathname, search } = new URL(next);
    return `${pathname}${search}`;
  } catch {
    return null;
  }
}

export type ExpensesFetchPage = { results: ExpenseDto[]; nextPath: string | null };

/** One API page (~`PAGE_SIZE` rows); append older rows via `nextPath`. */
export async function fetchExpensesPage(relativePath = "/api/expenses/"): Promise<ExpensesFetchPage> {
  const norm = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  const p = await apiFetch<ExpenseListPage>(norm, { method: "GET", auth: true });
  return { results: p.results, nextPath: pathFromPaginationNext(p.next) };
}

export async function listExpenseLists() {
  return apiFetch<{ results: ExpenseListDto[] }>("/api/expense-lists/", { method: "GET", auth: true });
}

export async function createExpenseList(name: string) {
  return apiFetch<ExpenseListDto>("/api/expense-lists/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function patchExpenseList(id: number, name: string) {
  return apiFetch<ExpenseListDto>(`/api/expense-lists/${id}/`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() }),
  });
}

export async function deleteExpenseList(id: number) {
  return apiFetch<void>(`/api/expense-lists/${id}/`, { method: "DELETE", auth: true });
}

export type UserCustomCategoryDto = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  bg_color: string;
  created_at: string;
};

export function mapUserCustomCategoryDto(d: UserCustomCategoryDto) {
  return {
    id: `custom_${d.id}`,
    name: d.name,
    emoji: d.emoji,
    color: d.color,
    bgColor: d.bg_color,
  };
}

export async function listUserCustomCategories() {
  return apiFetch<{ results: UserCustomCategoryDto[] }>("/api/custom-categories/", {
    method: "GET",
    auth: true,
  });
}

export async function createUserCustomCategory(body: {
  name: string;
  emoji: string;
  color: string;
  bg_color: string;
}) {
  return apiFetch<UserCustomCategoryDto>("/api/custom-categories/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchUserCustomCategory(
  id: number,
  patch: Partial<{ name: string; emoji: string; color: string; bg_color: string }>,
) {
  return apiFetch<UserCustomCategoryDto>(`/api/custom-categories/${id}/`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteUserCustomCategory(id: number) {
  return apiFetch<void>(`/api/custom-categories/${id}/`, { method: "DELETE", auth: true });
}

export async function parseText(input: string, language = "en") {
  return apiFetch<ParseResult>("/api/ai/parse-text/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, language }),
  });
}

export async function parseImage(imageBase64: string, mimeType = "image/jpeg") {
  return apiFetch<ParseResult>("/api/ai/parse-image/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64, mime_type: mimeType }),
  });
}

export async function parseAudio(audioBase64: string, mimeType = "audio/m4a", language = "en") {
  return apiFetch<ParseResult>("/api/ai/parse-audio/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: audioBase64, mime_type: mimeType, language }),
  });
}

