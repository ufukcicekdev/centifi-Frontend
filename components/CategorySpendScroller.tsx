import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { CustomCategory } from "../constants/mockData";
import CategoryGlyph from "./CategoryGlyph";
import type { Expense } from "../constants/mockData";

/** Tallest bar (px). Shortest non-zero scales up from BAR_MIN. */
const BAR_MAX = 148;
/** Zero spend (or flat period): thin baseline so tall categories read clearly. */
const BAR_MIN = 10;
const ITEM_W = 78;
const GAP = 12;

export default function CategorySpendScroller({
  categories,
  expenses,
  selectedCategoryId,
  onSelectCategory,
  onLongPressCategory,
  isDark,
  currencySymbol = "",
}: {
  categories: CustomCategory[];
  expenses: Expense[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onLongPressCategory: (id: string) => void;
  isDark: boolean;
  /** Prefix for category totals (user display currency). */
  currencySymbol?: string;
}) {
  const totals = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => {
      m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    });
    return m;
  }, [expenses]);

  const maxSpent = useMemo(() => {
    let mx = 0;
    categories.forEach((c) => {
      mx = Math.max(mx, totals.get(c.id) ?? 0);
    });
    return mx;
  }, [categories, totals]);

  /** En çok harcanan solda (yüksek çubuk → alçak). Eşit tutarda isim sırası. */
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ta = totals.get(a.id) ?? 0;
      const tb = totals.get(b.id) ?? 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name);
    });
  }, [categories, totals]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, gap: GAP }}
    >
      {sortedCategories.map((cat) => {
        const spent = totals.get(cat.id) ?? 0;
        const barH =
          maxSpent > 0
            ? BAR_MIN + (spent / maxSpent) * (BAR_MAX - BAR_MIN)
            : BAR_MIN;
        const selected = selectedCategoryId === cat.id;
        const rounded = Math.round(spent);

        const barFill =
          spent > 0
            ? cat.color
            : isDark
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.08)";
        const barOpacity = spent > 0 ? 1 : 0.55;

        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelectCategory(selected ? null : cat.id)}
            onLongPress={() => onLongPressCategory(cat.id)}
            android_ripple={{
              color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
              borderless: false,
              radius: ITEM_W / 2,
            }}
            style={{ width: ITEM_W }}
          >
            {({ pressed }) => (
            <View
              style={{
                borderRadius: 22,
                paddingHorizontal: 4,
                paddingTop: 10,
                paddingBottom: 10,
                alignItems: "center",
                borderWidth: selected ? 2 : 0,
                borderColor: selected ? "rgba(255,255,255,0.72)" : "transparent",
                borderStyle: selected ? "dashed" : "solid",
                backgroundColor: selected
                  ? "rgba(85, 239, 196, 0.14)"
                  : pressed
                    ? isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.07)"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: BAR_MAX,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: "86%",
                    height: Math.max(BAR_MIN, Math.round(barH)),
                    borderRadius: 16,
                    backgroundColor: barFill,
                    opacity: barOpacity,
                  }}
                />
              </View>
              <CategoryGlyph emoji={cat.emoji} size={26} color={cat.color} categoryId={cat.id} />
              <Text
                style={{
                  alignSelf: "stretch",
                  textAlign: "center",
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: "800",
                  color: spent > 0 ? (isDark ? "#fff" : "#111") : isDark ? "#666" : "#999",
                }}
                numberOfLines={1}
              >
                {currencySymbol ? `${currencySymbol}${rounded}` : rounded}
              </Text>
            </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
