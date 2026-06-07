import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getDeviceAppLanguage } from "../lib/deviceLanguage";
import { mergeTranslations } from "../lib/mergeTranslations";
import en from "../locales/en.json";
import tr from "../locales/tr.json";
import de from "../locales/de.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import enAndroid from "../locales/android/en.json";
import trAndroid from "../locales/android/tr.json";
import deAndroid from "../locales/android/de.json";
import frAndroid from "../locales/android/fr.json";
import esAndroid from "../locales/android/es.json";

export const LANGUAGES = {
  en: { label: "English",  nativeLabel: "English",  flag: "🇬🇧" },
  de: { label: "German",   nativeLabel: "Deutsch",  flag: "🇩🇪" },
  fr: { label: "French",   nativeLabel: "Français", flag: "🇫🇷" },
  es: { label: "Spanish",  nativeLabel: "Español",  flag: "🇪🇸" },
  tr: { label: "Turkish",  nativeLabel: "Türkçe",   flag: "🇹🇷" },
} as const;

export type Language = keyof typeof LANGUAGES;

const androidOverlays: Record<Language, Record<string, unknown>> = {
  en: enAndroid,
  tr: trAndroid,
  de: deAndroid,
  fr: frAndroid,
  es: esAndroid,
};

function translationFor(lang: Language, base: Record<string, unknown>) {
  return mergeTranslations(base, androidOverlays[lang]);
}

i18n.use(initReactI18next).init({
  compatibilityJSON: "v3",
  resources: {
    en: { translation: translationFor("en", en as Record<string, unknown>) },
    tr: { translation: translationFor("tr", tr as Record<string, unknown>) },
    de: { translation: translationFor("de", de as Record<string, unknown>) },
    fr: { translation: translationFor("fr", fr as Record<string, unknown>) },
    es: { translation: translationFor("es", es as Record<string, unknown>) },
  },
  lng: getDeviceAppLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
