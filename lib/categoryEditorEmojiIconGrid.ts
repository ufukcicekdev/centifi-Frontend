import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type EditorEmojiIon = ComponentProps<typeof Ionicons>["name"];

function stripVs(s: string): string {
  return s.replace(/\uFE0F/g, "");
}

/**
 * Kategori düzenleyici / emoji sheet. iOS’ta emoji `<Text>` tofu verebiliyor; UI’da `ion` çizilir, API’ye `emoji` yazılır.
 */
export const EDITOR_EMOJI_ICON_GRID: { emoji: string; ion: EditorEmojiIon }[] = [
  { emoji: "🔒", ion: "lock-closed-outline" },
  { emoji: "📋", ion: "clipboard-outline" },
  { emoji: "📝", ion: "create-outline" },
  { emoji: "💼", ion: "briefcase-outline" },
  { emoji: "✈️", ion: "airplane-outline" },
  { emoji: "🍔", ion: "fast-food-outline" },
  { emoji: "🍕", ion: "pizza-outline" },
  { emoji: "🍜", ion: "restaurant-outline" },
  { emoji: "☕", ion: "cafe-outline" },
  { emoji: "🍺", ion: "wine-outline" },
  { emoji: "🥗", ion: "nutrition-outline" },
  { emoji: "🚗", ion: "car-outline" },
  { emoji: "🚌", ion: "bus-outline" },
  { emoji: "🚂", ion: "train-outline" },
  { emoji: "🛵", ion: "bicycle-outline" },
  { emoji: "⛽", ion: "color-filter-outline" },
  { emoji: "🛍️", ion: "bag-handle-outline" },
  { emoji: "👗", ion: "shirt-outline" },
  { emoji: "👟", ion: "footsteps-outline" },
  { emoji: "💻", ion: "laptop-outline" },
  { emoji: "📱", ion: "phone-portrait-outline" },
  { emoji: "🎮", ion: "game-controller-outline" },
  { emoji: "💊", ion: "medical-outline" },
  { emoji: "🏥", ion: "medkit-outline" },
  { emoji: "🏋️", ion: "barbell-outline" },
  { emoji: "🧘", ion: "fitness-outline" },
  { emoji: "🎬", ion: "film-outline" },
  { emoji: "🎵", ion: "musical-notes-outline" },
  { emoji: "🎸", ion: "musical-notes-outline" },
  { emoji: "🎯", ion: "locate-outline" },
  { emoji: "📚", ion: "library-outline" },
  { emoji: "⚡", ion: "flash-outline" },
  { emoji: "💧", ion: "water-outline" },
  { emoji: "🔥", ion: "flame-outline" },
  { emoji: "🏠", ion: "home-outline" },
  { emoji: "📦", ion: "cube-outline" },
  { emoji: "💰", ion: "wallet-outline" },
  { emoji: "💎", ion: "diamond-outline" },
  { emoji: "🌟", ion: "star-outline" },
  { emoji: "🎁", ion: "gift-outline" },
  { emoji: "🐶", ion: "happy-outline" },
  { emoji: "💄", ion: "color-palette-outline" },
  { emoji: "🌿", ion: "leaf-outline" },
  { emoji: "💡", ion: "bulb-outline" },
  { emoji: "🚀", ion: "rocket-outline" },
  { emoji: "⚽", ion: "football-outline" },
  { emoji: "🐾", ion: "paw-outline" },
];

export function editorPresetIonForEmoji(emoji: string): EditorEmojiIon {
  const key = stripVs(emoji.trim());
  const hit = EDITOR_EMOJI_ICON_GRID.find((x) => stripVs(x.emoji) === key);
  return hit?.ion ?? "pricetag-outline";
}

/** iOS emoji seçici hücresi — her satır farklı renk (mor tek renk yerine). */
const PICKER_CELL_TINTS: { fg: string; bgDark: string; bgLight: string }[] = [
  { fg: "#6C63FF", bgDark: "rgba(108,99,255,0.28)", bgLight: "rgba(108,99,255,0.14)" },
  { fg: "#FF6B6B", bgDark: "rgba(255,107,107,0.28)", bgLight: "rgba(255,107,107,0.14)" },
  { fg: "#4ECDC4", bgDark: "rgba(78,205,196,0.28)", bgLight: "rgba(78,205,196,0.14)" },
  { fg: "#FDCB6E", bgDark: "rgba(253,203,110,0.30)", bgLight: "rgba(253,203,110,0.16)" },
  { fg: "#74B9FF", bgDark: "rgba(116,185,255,0.28)", bgLight: "rgba(116,185,255,0.14)" },
  { fg: "#FD79A8", bgDark: "rgba(253,121,168,0.28)", bgLight: "rgba(253,121,168,0.14)" },
  { fg: "#55EFC4", bgDark: "rgba(85,239,196,0.26)", bgLight: "rgba(85,239,196,0.13)" },
  { fg: "#A29BFE", bgDark: "rgba(162,155,254,0.28)", bgLight: "rgba(162,155,254,0.14)" },
  { fg: "#E17055", bgDark: "rgba(225,112,85,0.28)", bgLight: "rgba(225,112,85,0.14)" },
  { fg: "#00B894", bgDark: "rgba(0,184,148,0.26)", bgLight: "rgba(0,184,148,0.13)" },
];

export function emojiPickerCellTint(gridIndex: number, isDark: boolean): { color: string; backgroundColor: string } {
  const p = PICKER_CELL_TINTS[gridIndex % PICKER_CELL_TINTS.length];
  return { color: p.fg, backgroundColor: isDark ? p.bgDark : p.bgLight };
}

export function emojiGridIndexForEmoji(emoji: string): number {
  const key = stripVs(emoji.trim());
  const ix = EDITOR_EMOJI_ICON_GRID.findIndex((x) => stripVs(x.emoji) === key);
  return ix >= 0 ? ix : 0;
}

/** Onboarding “yeni kategori” tam ekranı — kısa şerit (UI Ionicons; API’ye emoji). */
export const ONBOARDING_ADD_CATEGORY_ICON_PRESETS: { emoji: string; ion: EditorEmojiIon }[] = [
  { emoji: "🎯", ion: "locate-outline" },
  { emoji: "🎮", ion: "game-controller-outline" },
  { emoji: "🍕", ion: "pizza-outline" },
  { emoji: "✈️", ion: "airplane-outline" },
  { emoji: "🏋️", ion: "barbell-outline" },
  { emoji: "📚", ion: "library-outline" },
  { emoji: "🐶", ion: "happy-outline" },
  { emoji: "💄", ion: "color-palette-outline" },
  { emoji: "🎸", ion: "musical-notes-outline" },
  { emoji: "🏠", ion: "home-outline" },
  { emoji: "🌿", ion: "leaf-outline" },
  { emoji: "💡", ion: "bulb-outline" },
  { emoji: "🎁", ion: "gift-outline" },
  { emoji: "👗", ion: "shirt-outline" },
  { emoji: "🚀", ion: "rocket-outline" },
  { emoji: "⚽", ion: "football-outline" },
];
