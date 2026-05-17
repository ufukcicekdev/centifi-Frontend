import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { CategorySummary } from "../constants/mockData";
import CategoryGlyph from "./CategoryGlyph";

interface CategoryBarProps {
  categories: CategorySummary[];
  maxValue: number;
  currency?: string;
  isDark?: boolean;
}

function Bar({ item, maxValue, currency, isDark, delay }: {
  item: CategorySummary;
  maxValue: number;
  currency: string;
  isDark: boolean;
  delay: number;
}) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const targetWidth = (item.total / maxValue) * 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animWidth, {
        toValue: targetWidth,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [targetWidth]);

  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CategoryGlyph emoji={item.emoji} size={16} color={item.color} categoryId={item.category} />
          <Text style={{ color: textColor, fontSize: 13, fontWeight: "500" }}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
        <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>
          {currency}{item.total.toFixed(0)}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: isDark ? "#2a2a2a" : "#e5e5e5", borderRadius: 3, overflow: "hidden" }}>
        <Animated.View
          style={{
            height: "100%",
            width: animWidth.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
            backgroundColor: item.color,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

export default function CategoryBar({ categories, maxValue, currency = "$", isDark = true }: CategoryBarProps) {
  return (
    <View>
      {categories.map((item, index) => (
        <Bar key={item.category} item={item} maxValue={maxValue} currency={currency} isDark={isDark} delay={index * 150} />
      ))}
    </View>
  );
}
