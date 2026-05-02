import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Klavye kapalıyken 0; açıkken alt kenardan klavye yüksekliği (dp).
 * Mutlak `bottom` ile çakışan öğeler ve Modal alt sayfalarında kullanın (özellikle Android).
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const subHide = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return height;
}
