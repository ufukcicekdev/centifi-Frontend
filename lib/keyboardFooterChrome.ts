import { Platform } from "react-native";
import { saveBarPaddingBottom } from "./saveBarPaddingBottom";

/**
 * Klavye üst kenarı ile alt aksiyon şeridi arası — tüm ekranlarda aynı değer kullanılmalı.
 */
export const KEYBOARD_ABOVE_ACTION_BAR_GAP = 10;

const INNER_PAD_WHEN_KEYBOARD_OPEN = 8;

/**
 * Klavye açıkken kök (flex) bedenin altına eklenir: klavye yüksekliği + sabit gap.
 * Absolute `bottom` kullanmadan şeridi klavyenin üstüne taşır → ScrollView gerçek flex alanında kalır, kaydırma düzgün çalışır.
 */
export function keyboardLiftPaddingBottom(keyboardInset: number): number {
  if (keyboardInset <= 0) return 0;
  return keyboardInset + KEYBOARD_ABOVE_ACTION_BAR_GAP;
}

/**
 * Masraf ekle / düzenle / bütçe ekranı ile aynı: `KeyboardAvoidingView` + scroll + alt şerit düzeninde
 * iç `View`’ün `paddingBottom`’u. Android’de 0 bırakılır (KAV `padding` klavyeyi karşılar), iOS’ta IME + sabit gap.
 */
export function expenseFormMainKeyboardLiftPad(keyboardInset: number): number {
  if (keyboardInset <= 0) return 0;
  if (Platform.OS === "android") return 0;
  return keyboardLiftPaddingBottom(keyboardInset);
}

/**
 * Alt şeridin iç alt boşluğu (butonların altı).
 * Klavye kapalı: gesture / home için tam pad.
 * Klavye açık: dışarıda zaten keyboardLift gap verildiği için ince iç pad yeter.
 */
export function actionBarInnerBottomPad(keyboardInset: number, insetsBottom: number): number {
  if (keyboardInset > 0) return INNER_PAD_WHEN_KEYBOARD_OPEN;
  return saveBarPaddingBottom(insetsBottom);
}
