// src/providers/I18nProvider.tsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react'

import {
  type SupportedLocale,
  type TranslationKey,
  LOCALE_META,
  getLocale as getGlobalLocale,
  setLocale as setGlobalLocale,
  subscribeLocale,
  t as translateFn,
  fmtNumber,
  fmtPercent,
  fmtDate,
  fmtRelative,
  fmtCompact,
} from '@/lib/i18n'

import { useConfigStore } from '@/lib/config'
import { useAppStore } from '@/store/useAppStore'

export interface I18nContextValue {
  locale: SupportedLocale
  availableLocales: readonly SupportedLocale[]
  setLocale: (locale: SupportedLocale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  
  // Formatters
  fmtNumber: (n: number, decimals?: number) => string
  fmtCurrency: (n: number, compact?: boolean) => string
  fmtPercent: (n: number, decimals?: number) => string
  fmtDate: (d: Date | string | number, style?: 'short' | 'medium' | 'long') => string
  fmtRelative: (d: Date | string | number) => string
  fmtCompact: (n: number) => string
}
export function I18nProvider({ children }: { children: ReactNode }) {
  // Ambil currency dari profile perusahaan agar format uang selalu akurat
  const companyCurrency = useAppStore((state) => state.company.currency)
  const setConfig = useConfigStore((state) => state.setConfig)

  const [locale, setLocaleState] = useState<SupportedLocale>(getGlobalLocale())

  // Sinkronisasi dengan Event Bus dari lib/i18n
  useEffect(() => {
    // Saat inisialisasi, pastikan HTML tag benar
    document.documentElement.lang = locale
    document.documentElement.dir = LOCALE_META[locale]?.rtl ? 'rtl' : 'ltr'

    const unsub = subscribeLocale((newLocale) => {
      setLocaleState(newLocale)
      document.documentElement.lang = newLocale
      document.documentElement.dir = LOCALE_META[newLocale]?.rtl ? 'rtl' : 'ltr'
    })

    return unsub
  }, [locale])

  // Fungsi untuk mengganti bahasa (mengubah config dan storage sekaligus)
  const handleSetLocale = useCallback(
    (newLocale: SupportedLocale) => {
      setConfig({ locale: newLocale })
      setGlobalLocale(newLocale) // Ini akan men-trigger subscribeLocale di atas
    },
    [setConfig],
  )

  // Wrapper untuk translasi agar terikat dengan locale React saat ini
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translateFn(key, params, locale)
    },
    [locale],
  )

  // Memoize semua formatters agar child components tidak re-render tanpa alasan
  const value: I18nContextValue = useMemo(
    () => ({
      locale,
      availableLocales: Object.keys(LOCALE_META) as readonly SupportedLocale[],
      setLocale: handleSetLocale,
      t,
      fmtNumber: (n, dec) => fmtNumber(n, dec, locale),
      // 🔥 Khusus Currency, kita paksa pakai mata uang dari Company Profile
      fmtCurrency: (n, compact = true) => {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: companyCurrency || LOCALE_META[locale].defaultCurrency,
          notation: compact ? 'compact' : undefined,
          maximumFractionDigits: compact ? 1 : 0,
        }).format(n)
      },
      fmtPercent: (n, dec) => fmtPercent(n, dec, locale),
      fmtDate: (d, style) => fmtDate(d, style, locale),
      fmtRelative: (d) => fmtRelative(d, locale),
      fmtCompact: (n) => fmtCompact(n, locale),
    }),
    [locale, companyCurrency, handleSetLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/* --------------------------------------------------------------------------
   CONTEXT HOOK
   -------------------------------------------------------------------------- */
const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return ctx
}
