import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '#/locales/en/common.json'
import zh from '#/locales/zh/common.json'

export const DEFAULT_LANGUAGE = 'zh'
export const LANGUAGE_STORAGE_KEY = 'i18nextLng'
export const SUPPORTED_LANGUAGES = ['en', 'zh'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
}

export function resolvePreferredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored && isSupportedLanguage(stored)) {
    return stored
  }

  const browserLanguage = window.navigator.language.toLowerCase()
  if (browserLanguage.startsWith('zh')) {
    return 'zh'
  }
  if (browserLanguage.startsWith('en')) {
    return 'en'
  }

  return DEFAULT_LANGUAGE
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      zh: { common: zh },
    },
    defaultNS: 'common',
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
