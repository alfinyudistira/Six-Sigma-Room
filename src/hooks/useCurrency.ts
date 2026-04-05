// src/hooks/useCurrency.ts


import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { createCurrencyFmt } from '@/lib/utils'
import { useI18n } from '@/providers/I18nProvider'
import type { SupportedCurrency } from '@/lib/i18n'

function safeNumber(n: unknown): number {
  if (typeof n === 'number' && isFinite(n)) return n
  const coerced = Number(n)
  return isFinite(coerced) ? coerced : 0
}

export function useCurrency() {
  // Get currency from Zustand store (shallow compare to avoid unnecessary re‑renders)
  const currency = useAppStore(useShallow((state) => state.company.currency)) as SupportedCurrency

  // Get current locale and i18n formatters from provider
  const { locale, fmtCurrency: i18nFmtCurrency } = useI18n()

  // Create memoized formatters based on currency only (locale changes handled by i18n)
  const { fmt: fastCompact, fmtFull, sym } = useMemo(
    () => createCurrencyFmt(currency),
    [currency],
  )

  // Memoize the entire return object
  return useMemo(() => {
    /**
     * Format a number using fast compact notation (K, M, B, T).
     * @example format(1250000) → "$1.3M" or "Rp1,3JT"
     */
    const format = (n: number): string => fastCompact(safeNumber(n))

    /**
     * Format a number without compact notation (full number with thousand separators).
     * @example formatFull(1250000) → "$1,250,000" or "Rp1.250.000"
     */
    // 🔥 PERBAIKAN: Gunakan fmtFull, bukan fastCompactFull
    const formatFull = (n: number): string => fmtFull(safeNumber(n))

    /**
     * Format a number using locale‑aware Intl (recommended for UI).
     * @param n - Number to format
     * @param compact - Whether to use compact notation (default true)
     */
    const formatIntl = (n: number, compact = true): string =>
      i18nFmtCurrency(safeNumber(n), compact)

    /**
     * Format a number as a delta with sign (+/-).
     * @example formatDelta(1500) → "+$1.5K"
     * @example formatDelta(-500) → "-$500"
     */
    const formatDelta = (n: number): string => {
      const val = safeNumber(n)
      if (val === 0) return format(0)
      const sign = val > 0 ? '+' : ''
      return `${sign}${format(Math.abs(val))}`
    }

    /**
     * Format a range of numbers.
     * @example formatRange(1000, 2000) → "$1K — $2K"
     */
    const formatRange = (min: number, max: number): string =>
      `${format(safeNumber(min))} — ${format(safeNumber(max))}`

    /**
     * Check if a number is zero.
     */
    const isZero = (n: number): boolean => safeNumber(n) === 0

    /**
     * Check if a number is negative.
     */
    const isNegative = (n: number): boolean => safeNumber(n) < 0

    return {
      /** Current currency code (e.g., 'USD', 'IDR') */
      currency,
      /** Current locale (e.g., 'en-US') */
      locale,

      // --- Core formatting methods ---
      format,
      formatFull,
      formatIntl,

      // --- Convenience helpers ---
      formatDelta,
      formatRange,
      isZero,
      isNegative,

      /** Raw currency symbol (e.g., '$', 'Rp') */
      symbol: sym,
    }
  // 🔥 PERBAIKAN: Dependency array sudah di-update menggunakan fmtFull
  }, [currency, locale, fastCompact, fmtFull, i18nFmtCurrency, sym])
}
