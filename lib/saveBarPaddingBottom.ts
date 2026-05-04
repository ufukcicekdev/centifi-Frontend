import { Platform } from "react-native";

/**
 * Sabit alt “Kaydet” şeridi: Android 3 tuş / gesture alanına yapışmasın.
 * `insets.bottom` ile birlikte ekstra tampon (iOS home indicator için daha az).
 */
export function saveBarPaddingBottom(insetsBottom: number): number {
  const cushion = Platform.OS === "android" ? 22 : 10;
  const minimum = Platform.OS === "android" ? 40 : 28;
  return Math.max(insetsBottom + cushion, minimum);
}
