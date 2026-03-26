"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import en from "@/locales/en.json";
import zh from "@/locales/zh.json";

const locales: Record<string, Record<string, string>> = { en, zh };

type Locale = "en" | "zh";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  return "en";
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: detectLocale(),
      setLocale: (locale: Locale) => set({ locale }),
    }),
    { name: "agent-admin-locale" },
  ),
);

export function useT() {
  const locale = useI18nStore((s) => s.locale);
  const messages = locales[locale] ?? locales.en;

  return function t(key: string, params?: Record<string, string>): string {
    let value = messages[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, v);
      });
    }
    return value;
  };
}
