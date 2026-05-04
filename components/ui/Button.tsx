import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View, type ViewStyle, type TextStyle } from "react-native";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  /** Optional left icon node (e.g., Ionicons). */
  left?: React.ReactNode;
  /** Optional right icon node (e.g., Ionicons). */
  right?: React.ReactNode;
  /** Force full-width stretch. */
  fullWidth?: boolean;
  /** Override container style (rare). */
  style?: ViewStyle;
  /** Override label style (rare). */
  labelStyle?: TextStyle;
  accessibilityLabel?: string;
};

const PURPLE = "#6C63FF";
const DESTRUCTIVE = "#FF453A";

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  left,
  right,
  fullWidth,
  style,
  labelStyle,
  accessibilityLabel,
}: ButtonProps) {
  const sizing = useMemo(() => {
    if (size === "sm") return { minHeight: 40, padY: 10, padX: 14, fontSize: 14, radius: 12 };
    if (size === "lg") return { minHeight: 56, padY: 16, padX: 20, fontSize: 16, radius: 16 };
    return { minHeight: 48, padY: 14, padX: 18, fontSize: 15, radius: 14 };
  }, [size]);

  const colors = useMemo(() => {
    switch (variant) {
      case "secondary":
        return {
          bg: "rgba(255,255,255,0.06)",
          border: "rgba(255,255,255,0.10)",
          text: "#ffffff",
        };
      case "destructive":
        return {
          bg: DESTRUCTIVE,
          border: "transparent",
          text: "#ffffff",
        };
      case "ghost":
        return {
          bg: "transparent",
          border: "transparent",
          text: PURPLE,
        };
      default:
        return {
          bg: PURPLE,
          border: "transparent",
          text: "#ffffff",
        };
    }
  }, [variant]);

  const isDisabled = !!disabled || !!loading || !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => ({
        width: fullWidth ? "100%" : undefined,
        minHeight: sizing.minHeight,
        paddingVertical: sizing.padY,
        paddingHorizontal: sizing.padX,
        borderRadius: sizing.radius,
        borderWidth: colors.border === "transparent" ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        opacity: pressed ? 0.9 : isDisabled ? 0.6 : 1,
        ...(style ?? {}),
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {left ? <View style={{ marginLeft: -2 }}>{left}</View> : null}
          <Text
            style={{
              color: colors.text,
              fontSize: sizing.fontSize,
              fontWeight: "800",
              textAlign: "center",
              ...(labelStyle ?? {}),
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
          {right ? <View style={{ marginRight: -2 }}>{right}</View> : null}
        </>
      )}
    </Pressable>
  );
}

