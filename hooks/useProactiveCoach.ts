import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchProactiveCoach } from "../lib/backend";

export interface CoachMessage {
  text: string;
  type: "warning" | "info" | "positive";
  generatedAt: string;
}

const CACHE_KEY = "proactive_coach_v2";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 saat — fazla API çağrısı yapmasın

interface CacheEntry {
  message: CoachMessage;
  savedAt: number;
}

async function loadCached(): Promise<CoachMessage | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
    return entry.message;
  } catch {
    return null;
  }
}

async function saveCache(message: CoachMessage): Promise<void> {
  try {
    const entry: CacheEntry = { message, savedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

export function useProactiveCoach(
  expenses: Array<{ amount: number; date: string; isIncome?: boolean }>,
  language: string,
  isAuthenticated: boolean,
) {
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || expenses.length === 0) return;

    loadCached().then(async (cached) => {
      if (cached) {
        setMessage(cached);
        return;
      }

      try {
        const res = await fetchProactiveCoach(language);
        const msg: CoachMessage = { ...res, generatedAt: new Date().toISOString() };
        setMessage(msg);
        void saveCache(msg);
      } catch {
        // API başarısız olursa sessizce geç — koç kartı gösterilmez
      }
    });
  }, [isAuthenticated, language]);

  const dismiss = () => setDismissed(true);

  return { message: dismissed ? null : message, dismiss };
}
