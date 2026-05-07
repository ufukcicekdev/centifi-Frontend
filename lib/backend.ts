import type { BankAutomation } from "../constants/mockData";
import { apiFetch, saveTokens, type AuthTokens } from "./api";

export type BackendUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  /** False for Apple/Google-only accounts until they set a password. */
  has_password?: boolean;
  language: string;
  /** ISO 4217 — preferred display currency for UI / budgets */
  display_currency?: string;
  is_dark_mode: boolean;
  notifications_enabled: boolean;
  alert_email: string;
  onboarding_completed: boolean;
  /** ISO 8601 — RevenueCat ``pro`` entitlement bitişi */
  pro_entitlement_expires_at?: string | null;
  is_pro?: boolean;
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

export type RecurrenceRule =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly";

const RECURRENCE_RULE_VALUES: readonly RecurrenceRule[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "yearly",
];

export type ExpenseDto = {
  id: number;
  amount: string;
  description: string;
  category: string;
  date: string;
  currency: string;
  is_income?: boolean;
  recurring_expense_id?: number | null;
  recurrence_rule?: RecurrenceRule | null;
  created_at: string;
  updated_at: string;
  list_id?: number | null;
};

export type RecurringExpenseDto = {
  id: number;
  series_id: string;
  amount: string;
  description: string;
  category: string;
  currency: string;
  is_income: boolean;
  recurrence_rule: RecurrenceRule;
  next_run_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  list_id?: number | null;
  initial_expense?: ExpenseDto | null;
};

/** Maps API row to local Expense shape (callers supply fallback list id when `list_id` is null). */
export function mapExpenseDto(dto: ExpenseDto, fallbackListId: string) {
  const rule = dto.recurrence_rule;
  const recurrenceRule =
    rule != null && (RECURRENCE_RULE_VALUES as readonly string[]).includes(rule) ? rule : undefined;
  return {
    id: String(dto.id),
    amount: parseFloat(dto.amount),
    description: dto.description,
    category: dto.category,
    date: dto.date,
    currency: dto.currency,
    isIncome: !!dto.is_income,
    listId: dto.list_id != null ? String(dto.list_id) : fallbackListId,
    recurringExpenseId: dto.recurring_expense_id ?? undefined,
    recurrenceRule,
  };
}

export type ExpenseListDto = {
  id: number;
  name: string;
  is_default: boolean;
  emoji?: string;
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

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  language?: string;
  is_dark_mode?: boolean;
}) {
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
      language: params.language ?? "en",
      is_dark_mode: params.is_dark_mode ?? true,
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
  language?: string;
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

export async function requestPasswordReset(email: string) {
  return apiFetch<{ detail: string }>("/api/users/password/forgot/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function verifyPasswordResetCode(body: { email: string; code: string }) {
  return apiFetch<{ detail: string; reset_token: string }>("/api/users/password/verify-code/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email.trim(),
      code: body.code.trim(),
    }),
  });
}

export async function completePasswordReset(body: { reset_token: string; new_password: string }) {
  return apiFetch<{ detail: string }>("/api/users/password/reset/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reset_token: body.reset_token,
      new_password: body.new_password,
    }),
  });
}

export async function changePassword(body: { old_password?: string; new_password: string }) {
  return apiFetch<{ detail: string }>("/api/users/password/change/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export async function createRecurringExpense(body: {
  amount: number;
  description: string;
  category: string;
  currency: string;
  is_income?: boolean;
  recurrence_rule: RecurrenceRule;
  anchor_date: string;
  list_id?: number;
}) {
  const payload: Record<string, unknown> = {
    amount: body.amount,
    description: body.description,
    category: body.category,
    currency: body.currency,
    is_income: body.is_income ?? false,
    recurrence_rule: body.recurrence_rule,
    anchor_date: body.anchor_date,
  };
  if (body.list_id != null) payload.list_id = body.list_id;
  return apiFetch<RecurringExpenseDto>("/api/recurring-expenses/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

export type SendExpenseReportResponse = {
  ok: boolean;
  sent_to: string;
  expense_count: number;
};

/** E-posta: HTML tablo + CSV ek; tarih YYYY-MM-DD, list_id opsiyonel (yalnızca sayısal API list id). */
export async function sendExpenseReportEmail(body: {
  start_date: string;
  end_date: string;
  list_id?: number | null;
}) {
  const payload: Record<string, unknown> = {
    start_date: body.start_date,
    end_date: body.end_date,
  };
  if (body.list_id != null && Number.isFinite(body.list_id)) {
    payload.list_id = Math.floor(body.list_id);
  }
  return apiFetch<SendExpenseReportResponse>("/api/expenses/send-report-email/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listExpenseLists() {
  return apiFetch<{ results: ExpenseListDto[] }>("/api/expense-lists/", { method: "GET", auth: true });
}

export async function createExpenseList(name: string, emoji?: string) {
  const payload: { name: string; emoji?: string } = { name: name.trim() };
  const em = emoji?.trim();
  if (em) payload.emoji = em;
  return apiFetch<ExpenseListDto>("/api/expense-lists/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function patchExpenseList(id: number, body: { name: string; emoji?: string }) {
  const trimmedEmoji = body.emoji?.trim() ?? "";
  return apiFetch<ExpenseListDto>(`/api/expense-lists/${id}/`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: body.name.trim(), emoji: trimmedEmoji }),
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

export type UserBankAppDto = {
  id: number;
  name: string;
  emoji: string;
  store_url: string;
  package_name: string;
  icon_url?: string;
  enabled: boolean;
  created_at: string;
};

export type PlayStoreLookupDto = {
  package_name: string;
  name: string | null;
  icon_url: string | null;
};

/** Numeric API id from client id `ubank_<pk>` */
export function parseUserBankAppApiId(id: string): number | null {
  const m = /^ubank_(\d+)$/.exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function mapUserBankAppDto(d: UserBankAppDto): BankAutomation {
  const icon = d.icon_url?.trim();
  return {
    id: `ubank_${d.id}`,
    name: d.name,
    emoji: d.emoji,
    storeUrl: d.store_url,
    packageName: d.package_name,
    enabled: d.enabled,
    ...(icon ? { iconUrl: icon } : {}),
  };
}

export async function listUserBankApps() {
  return apiFetch<{ results: UserBankAppDto[] }>("/api/bank-apps/", {
    method: "GET",
    auth: true,
  });
}

export async function lookupPlayStoreMeta(params: { package?: string; store_url?: string }) {
  const qs = new URLSearchParams();
  if (params.package?.trim()) qs.set("package", params.package.trim());
  if (params.store_url?.trim()) qs.set("store_url", params.store_url.trim());
  const q = qs.toString();
  if (!q) {
    return Promise.reject(new Error("lookupPlayStoreMeta: pass package or store_url"));
  }
  return apiFetch<PlayStoreLookupDto>(`/api/bank-apps/play-store-lookup/?${q}`, {
    method: "GET",
    auth: true,
  });
}

export async function createUserBankApp(body: {
  name: string;
  emoji: string;
  store_url: string;
  package_name: string;
  icon_url?: string;
  enabled: boolean;
}) {
  return apiFetch<UserBankAppDto>("/api/bank-apps/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchUserBankApp(
  id: number,
  patch: Partial<{
    name: string;
    emoji: string;
    store_url: string;
    package_name: string;
    icon_url: string;
    enabled: boolean;
  }>,
) {
  return apiFetch<UserBankAppDto>(`/api/bank-apps/${id}/`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteUserBankApp(id: number) {
  return apiFetch<void>(`/api/bank-apps/${id}/`, { method: "DELETE", auth: true });
}

/** RevenueCat REST ile sunucuda ``pro`` bitişini günceller (satın alma / restore sonrası). */
export async function syncSubscriptionFromRevenueCat() {
  return apiFetch<BackendUser>("/api/users/subscription/sync/", { method: "POST", auth: true });
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

export type SpendingInsightsResponse = {
  insight: string;
  expense_count: number;
  summary?: unknown;
};

/** Gemini: dönem + isteğe bağlı liste için harcama özetinden kısa tavsiye metni. */
export async function fetchSpendingInsights(body: {
  start_date: string;
  end_date: string;
  list_id?: number | null;
  language: string;
}) {
  return apiFetch<SpendingInsightsResponse>("/api/ai/spending-insights/", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

