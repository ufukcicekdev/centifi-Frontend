// FILE: /frontend/components/EmptyStateCard.tsx
// NEW COMPONENT: Empty state for lists with action button

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark?: boolean;
}

export default function EmptyStateCard({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  isDark = true,
}: EmptyStateCardProps) {
  const bgColor = "transparent";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#8e8e93" : "#666";
  const buttonBg = "#6C63FF";

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bgColor,
        padding: 24,
      }}
    >
      {/* Icon */}
      <Ionicons
        name={icon}
        size={64}
        color={mutedColor}
        style={{ marginBottom: 16 }}
      />

      {/* Title */}
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: textColor,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {title}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontSize: 16,
          color: mutedColor,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 22,
        }}
      >
        {subtitle}
      </Text>

      {/* Action Button (optional) */}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={{
            backgroundColor: "#6C63FF",
            paddingVertical: 14,
            paddingHorizontal: 36,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* USAGE EXAMPLE in dashboard (index.tsx):

import EmptyStateCard from "../../components/EmptyStateCard";

if (expenses.length === 0 && onboardingCompleted) {
  return (
    <EmptyStateCard
      icon="inbox"
      title="No Expenses Yet"
      subtitle="Start tracking your spending by adding your first expense."
      actionLabel="Add Expense"
      onAction={() => router.push("/add")}
      isDark={isDark}
    />
  );
}

BENEFITS:
- Clear, inviting empty state
- CTA button guides user to next action
- Improves user onboarding experience
*/
