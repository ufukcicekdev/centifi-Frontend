import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (userId: string) => `centifi_enabled_categories_${userId}`;

export async function saveEnabledCategoryIds(userId: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(ids));
}

export async function loadEnabledCategoryIds(userId: string): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearEnabledCategoryIds(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId));
}
