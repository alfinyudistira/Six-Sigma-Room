// src/providers/I18nProvider.tsx
// ─── I18n React Context — injects formatters into component tree ──────────────
import { createContext, useContext, useMemo, useEffect, useState, ReactNode } from 'react'
import {
  type SupportedLocale,
  type SupportedCurrency,
  type I18nFormatters,
  type TranslationKey,
  detectLocale,
  createI18n,
  translate,
  LOCALE_META,
} from '@/lib/i18n'
import { useConfigStore } from '@/lib/config'
import { useAppStore } from '@/store/useAppStore'

interface I18nContextValue extends I18nFormatters {
  t: (key: TranslationKey) => string
  setLocale: (l: SupportedLocale) => void
  availableLocales: SupportedLocale[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const currency = useAppStore(s => s.company.currency) as SupportedCurrency
  const { config, setConfig } = useConfigStore()

  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (config.locale !== 'auto') return config.locale as SupportedLocale
    return detectLocale()
  })

  // Sync html[lang] and html[dir] for accessibility
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir  = LOCALE_META[locale]?.rtl ? 'rtl' : 'ltr'
  }, [locale])

  const formatters = useMemo(
    () => createI18n(locale, currency as SupportedCurrency),
    [locale, currency],
  )

  const t = useMemo(
    () => (key: TranslationKey) => translate(locale, key),
    [locale],
  )

  const setLocale = (l: SupportedLocale) => {
    setLocaleState(l)
    setConfig({ locale: l })
    localStorage.setItem('ss_locale', l)
  }

  const value: I18nContextValue = {
    ...formatters,
    t,
    setLocale,
    availableLocales: Object.keys(LOCALE_META) as SupportedLocale[],
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
