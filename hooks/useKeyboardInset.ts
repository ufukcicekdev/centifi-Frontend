import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

function keyboardHeightFromEvent(e: { endCoordinates: { height: number; screenY: number } }): number {
  if (Platform.OS === "ios") return e.endCoordinates.height;
  const winH = Dimensions.get("window").height;
  const { height: reported, screenY } = e.endCoordinates;
  const fromScreenY = Math.max(0, winH - screenY);
  return Math.max(reported, fromScreenY);
}

/**
 * Klavye kapalıyken 0; açıkken alt kenardan klavye yüksekliği (dp).
 * Mutlak `bottom` ile çakışan öğeler ve Modal alt sayfalarında kullanın (özellikle Android).
 *
 * Android’de bazı cihazlarda yalnızca `height` IME ara çubuğunu eksik sayabiliyor;
 * `window.height - screenY` ile telafi edilir.
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e) => setHeight(keyboardHeightFromEvent(e)));
    const subHide = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return height;
}
