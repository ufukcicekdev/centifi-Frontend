import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getDeviceAppLanguage } from "../lib/deviceLanguage";
import en from "../locales/en.json";
import tr from "../locales/tr.json";
import de from "../locales/de.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";

export const LANGUAGES = {
  en: { label: "English",  nativeLabel: "English",  flag: "🇬🇧" },
  de: { label: "German",   nativeLabel: "Deutsch",  flag: "🇩🇪" },
  fr: { label: "French",   nativeLabel: "Français", flag: "🇫🇷" },
  es: { label: "Spanish",  nativeLabel: "Español",  flag: "🇪🇸" },
  tr: { label: "Turkish",  nativeLabel: "Türkçe",   flag: "🇹🇷" },
} as const;

export type Language = keyof typeof LANGUAGES;

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    de: { translation: de },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: getDeviceAppLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
