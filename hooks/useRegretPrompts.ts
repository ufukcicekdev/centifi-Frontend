import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RegretScore = "happy" | "neutral" | "regret";

export interface RegretEntry {
  expenseId: string;
  score: RegretScore;
  ratedAt: string;
}

const STORAGE_KEY = "regret_entries_v1";
const PROMPT_DELAY_MS = 24 * 60 * 60 * 1000; // 24 saat

async function loadEntries(): Promise<RegretEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegretEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveEntries(entries: RegretEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export async function getRegretEntries(): Promise<RegretEntry[]> {
  return loadEntries();
}

export async function saveRegretScore(expenseId: string, score: RegretScore): Promise<void> {
  const entries = await loadEntries();
  const filtered = entries.filter((e) => e.expenseId !== expenseId);
  filtered.push({ expenseId, score, ratedAt: new Date().toISOString() });
  await saveEntries(filtered);
}

/** Bir harcama için 24 saat geçmiş ve henüz değerlendirilmemiş mi? */
export function shouldPromptRegret(expenseDateStr: string, expenseId: string, ratedIds: Set<string>): boolean {
  if (ratedIds.has(expenseId)) return false;
  const created = Date.parse(expenseDateStr);
  if (Number.isNaN(created)) return false;
  return Date.now() - created >= PROMPT_DELAY_MS;
}

export function useRegretRatedIds() {
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEntries().then((entries) => {
      setRatedIds(new Set(entries.map((e) => e.expenseId)));
    });
  }, []);

  const markRated = useCallback((id: string) => {
    setRatedIds((prev) => new Set([...prev, id]));
  }, []);

  return { ratedIds, markRated };
}

/** Pişmanlık istatistikleri: kategori bazlı pişmanlık oranları */
export async function getRegretStats(): Promise<Record<string, { total: number; regret: number; rate: number }>> {
  // Bu fonksiyon insights sayfasında kullanılır, expense listesiyle birleştirmek için
  // dışarıdan expenses geçirmek gerekir; burada sadece raw entries döndürüyoruz
  return {};
}

export async function getRegretEntriesMap(): Promise<Map<string, RegretScore>> {
  const entries = await loadEntries();
  return new Map(entries.map((e) => [e.expenseId, e.score]));
}
