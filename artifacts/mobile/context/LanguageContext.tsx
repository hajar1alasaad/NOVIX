import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { I18nManager, Platform } from "react-native";
import { translations, type Language } from "@/constants/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)[Language];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANG_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "ar" || saved === "en") {
        applyLanguage(saved, false);
        setLangState(saved);
      }
    });
  }, []);

  const applyLanguage = (lang: Language, persist = true) => {
    const rtl = lang === "ar";
    if (Platform.OS !== "web") {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
    if (persist) {
      AsyncStorage.setItem(LANG_KEY, lang);
    }
  };

  const setLanguage = (lang: Language) => {
    applyLanguage(lang);
    setLangState(lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
        isRTL: language === "ar",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
