// FILE: /frontend/constants/designSystem.ts
// NEW FILE: Design system constants for consistent styling

// ========== COLOR PALETTE ==========
export const COLORS = {
  // Primary
  PRIMARY: "#6C63FF",
  PRIMARY_LIGHT: "#8A7FFF",
  PRIMARY_DARK: "#5050CC",

  // Accent
  ACCENT: "#FF6B6B",
  ACCENT_LIGHT: "#FF8E8E",
  ACCENT_DARK: "#CC5555",

  // Semantic
  SUCCESS: "#4CAF50",
  WARNING: "#FFC107",
  ERROR: "#F44336",
  INFO: "#2196F3",

  // Alert
  BUDGET_ALERT_GOLD: "#E6C229",
  MIC_ACTIVE: "#FF5252",

  // Neutral - Dark Mode
  DARK_BG: "#000000",
  DARK_BG_SECONDARY: "#1a1a1a",
  DARK_BG_TERTIARY: "#1c1c1e",
  DARK_TEXT: "#ffffff",
  DARK_TEXT_SECONDARY: "#888888",
  DARK_BORDER: "rgba(255,255,255,0.08)",

  // Neutral - Light Mode
  LIGHT_BG: "#f5f5f5",
  LIGHT_BG_SECONDARY: "#ffffff",
  LIGHT_BG_TERTIARY: "#fafafa",
  LIGHT_TEXT: "#0f0f0f",
  LIGHT_TEXT_SECONDARY: "#666666",
  LIGHT_BORDER: "rgba(0,0,0,0.06)",
};

// ========== TYPOGRAPHY ==========
export const TYPOGRAPHY = {
  heading1: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 34,
  },
  heading2: {
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
  },
};

// ========== SPACING ==========
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

// ========== BORDER RADIUS ==========
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// ========== SHADOWS ==========
export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
};

// ========== HELPER: Dynamic Colors by Theme ==========
export function getThemedColors(isDark: boolean) {
  return {
    bg: isDark ? COLORS.DARK_BG : COLORS.LIGHT_BG,
    bgSecondary: isDark ? COLORS.DARK_BG_SECONDARY : COLORS.LIGHT_BG_SECONDARY,
    text: isDark ? COLORS.DARK_TEXT : COLORS.LIGHT_TEXT,
    textSecondary: isDark ? COLORS.DARK_TEXT_SECONDARY : COLORS.LIGHT_TEXT_SECONDARY,
    border: isDark ? COLORS.DARK_BORDER : COLORS.LIGHT_BORDER,
  };
}

/* USAGE EXAMPLE:

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, getThemedColors } from "../../constants/designSystem";

export default function MyComponent() {
  const isDark = useStore((s) => s.isDark);
  const colors = getThemedColors(isDark);

  return (
    <View style={{ padding: SPACING.lg }}>
      <Text style={[TYPOGRAPHY.heading2, { color: colors.text }]}>
        Title
      </Text>
      <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
        Subtitle
      </Text>
    </View>
  );
}

BENEFITS:
- Consistent spacing, typography, colors across app
- Easy to maintain and update design tokens
- Reduces inline style duplication
- Improves code readability
*/
