import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import am from "./locales/am.json";
import { isSupportedLanguage } from "./languages";

const storedLanguage = localStorage.getItem("astedader-language");
const savedLanguage = isSupportedLanguage(storedLanguage) ? storedLanguage : "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
