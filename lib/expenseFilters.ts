import type { Expense } from "../constants/mockData";
import type { Language } from "../i18n";
import { formatMoneyAmount } from "./formatMoney";

/** Calendar month (monthIndex 0–11) or all-time. */
export type PeriodFilter =
  | { kind: "all_time" }
  | { kind: "calendar_month"; year: number; monthIndex: number };

export function defaultPeriodFilter(): PeriodFilter {
  const n = new Date();
  return { kind: "calendar_month", year: n.getFullYear(), monthIndex: n.getMonth() };
}

export function isExpenseInPeriod(dateStr: string, p: PeriodFilter): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (p.kind === "all_time") return true;
  return d.getFullYear() === p.year && d.getMonth() === p.monthIndex;
}

export function filterByPeriod(expenses: Expense[], p: PeriodFilter): Expense[] {
  return expenses.filter((e) => isExpenseInPeriod(e.date, p));
}

const LOCALE_MAP: Record<Language, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

/** Pill label for period selector (short). */
export function formatPeriodPillLabel(p: PeriodFilter, lang: Language): string {
  if (p.kind === "all_time") {
    const labels: Record<Language, string> = {
      en: "All time",
      tr: "Tüm zamanlar",
      de: "Gesamt",
      fr: "Tout",
      es: "Todo",
    };
    return labels[lang];
  }
  const locale = LOCALE_MAP[lang];
  const d = new Date(p.year, p.monthIndex, 1);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(d);
}

/** Month abbreviations for picker grid (consistent width). */
export function monthShortLabels(lang: Language): string[] {
  const locale = LOCALE_MAP[lang];
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2024, i, 1)),
  );
}

export function sumExpensesForMonth(
  expenses: Expense[],
  year: number,
  monthIndex: number,
  listId: string,
): number {
  return expenses
    .filter(
      (e) =>
        (!e.listId || e.listId === listId) &&
        isExpenseInPeriod(e.date, { kind: "calendar_month", year, monthIndex }),
    )
    .reduce((s, e) => s + (e.isIncome ? e.amount : -e.amount), 0);
}

export function distinctExpenseYears(expenses: Expense[], listId: string): number[] {
  const ys = new Set<number>();
  expenses.forEach((e) => {
    if (e.listId && e.listId !== listId) return;
    const y = new Date(e.date).getFullYear();
    if (!Number.isNaN(y)) ys.add(y);
  });
  ys.add(new Date().getFullYear());
  return Array.from(ys).sort((a, b) => b - a);
}

/** Günlük net: gelir − harcama (liste başlığında işaretli gösterim). */
export function formatDayNetTotal(total: number, lang: Language, currency: string): string {
  const cur = (currency || "USD").trim().toUpperCase();
  if (total > 1e-9) return `+ ${formatMoneyAmount(total, lang, cur)}`;
  if (total < -1e-9) return `- ${formatMoneyAmount(Math.abs(total), lang, cur)}`;
  return formatMoneyAmount(0, lang, cur);
}

export function groupByDate(expenses: Expense[]): { label: string; items: Expense[]; total: number }[] {
  const map = new Map<string, Expense[]>();
  expenses.forEach((e) => {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  });
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => {
      const label = date === today ? "Today" : date === yesterday ? "Yesterday"
        : new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric" });
      return {
        label,
        items,
        total: items.reduce((s, i) => s + (i.isIncome ? i.amount : -i.amount), 0),
      };
    });
}
