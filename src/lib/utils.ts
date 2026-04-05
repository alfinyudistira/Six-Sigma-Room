// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): DebouncedFunction<T> {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new TypeError('delay must be a non-negative finite number')
  }
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const argsToCall = lastArgs as Parameters<T>
      lastArgs = null
      fn(...argsToCall)
    }, delay)
  }) as DebouncedFunction<T>

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      lastArgs = null
    }
  }

  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer)
      const argsToCall = lastArgs
      timer = null
      lastArgs = null
      fn(...argsToCall)
    }
  }

  return debounced
}

/**
 * Creates a throttled function that invokes `fn` at most once per `limit` ms.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/* --------------------------------------------------------------------------
   HAPTIC FEEDBACK (Vibration)
   -------------------------------------------------------------------------- */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

const vibrate = (pattern: number | number[]) => {
  if (canVibrate) navigator.vibrate(pattern)
}

export const haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(25),
  heavy: () => vibrate(50),
  success: () => vibrate([10, 50, 10]),
  error: () => vibrate([50, 30, 50]),
  warning: () => vibrate([30]),
}

/* --------------------------------------------------------------------------
   VIEW TRANSITION API
   -------------------------------------------------------------------------- */

/**
 * Wrapper for the View Transition API with fallback.
 */
export async function viewTransition(callback: () => void | Promise<void>): Promise<void> {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    await (document as any).startViewTransition(callback)
  } else {
    await callback()
  }
}

/* --------------------------------------------------------------------------
   NUMBER & CURRENCY FORMATTING (with Intl cache)
   -------------------------------------------------------------------------- */

const numberFormatterCache = new Map<string, Intl.NumberFormat>()

function getNumberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options)
  if (!numberFormatterCache.has(key)) {
    numberFormatterCache.set(key, new Intl.NumberFormat(undefined, options))
  }
  return numberFormatterCache.get(key)!
}

/**
 * Format a number with fixed decimal places.
 */
export function formatNumber(n: number, decimals: number = 0): string {
  if (!Number.isFinite(n)) return '0'
  return getNumberFormatter({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/**
 * Format a number in compact notation (K, M, B).
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return getNumberFormatter({
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

/**
 * Format as currency using Intl.
 */
export function formatCurrency(n: number, currency: string, compact: boolean = true): string {
  if (!Number.isFinite(n)) return `${currency} 0`
  
  // Perbaikan: Hindari undefined pada notation untuk mendukung exactOptionalPropertyTypes
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 1 : 0,
  }
  
  if (compact) {
    options.notation = 'compact'
  }
  
  return getNumberFormatter(options).format(n)
}

/**
 * Legacy IDR formatter.
 */
export function formatIDR(n: number): string {
  if (!Number.isFinite(n)) return 'Rp0'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${sign}Rp${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}Rp${(abs / 1e9).toFixed(1)}M`
  if (abs >= 1e6) return `${sign}Rp${Math.round(abs / 1e6)}Jt`
  if (abs >= 1e3) return `${sign}Rp${Math.round(abs / 1e3)}K`
  return `${sign}Rp${Math.round(abs).toLocaleString()}`
}

/**
 * Create a currency formatter object.
 */
export function createCurrencyFmt(currencyCode: string) {
  const sym =
    ({
      USD: '$',
      IDR: 'Rp',
      EUR: '€',
      GBP: '£',
      SGD: 'S$',
      AUD: 'A$',
      JPY: '¥',
      MYR: 'RM',
    } as Record<string, string>)[currencyCode] ?? `${currencyCode} `

  return { 
    sym, 
    fmt: (n: number) => formatCurrency(n, currencyCode, true),
    fmtFull: (n: number) => formatCurrency(n, currencyCode, false)
  }
}

/* --------------------------------------------------------------------------
   FUZZY MATCHING & TYPO CORRECTION
   -------------------------------------------------------------------------- */

export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2))
  }
  return set
}

export function fuzzyMatchHeader(
  header: string,
  candidates: string[],
  threshold: number = 0.7,
): string | null {
  const h = normalizeHeader(header)
  if (!h) return null
  const A = bigrams(h)
  let best: string | null = null
  let bestScore = 0

  for (const c of candidates) {
    const n = normalizeHeader(c)
    const B = bigrams(n)
    let intersection = 0
    A.forEach((x) => {
      if (B.has(x)) intersection++
    })
    const union = new Set([...A, ...B]).size
    const score = union === 0 ? 0 : intersection / union
    if (score > bestScore && score >= threshold) {
      bestScore = score
      best = c
    }
  }
  return best
}

const TYPO_MAP: Record<string, string> = {
  sevrity: 'severity',
  occurance: 'occurrence',
  detectability: 'detection',
  liklyhood: 'likelihood',
  proability: 'probability',
  defenition: 'definition',
  mesure: 'measure',
  analsis: 'analysis',
  improvment: 'improvement',
  conrtol: 'control',
  proceess: 'process',
  eficiency: 'efficiency',
  mesurment: 'measurement',
}

export function autoCorrectTypo(text: string): string {
  if (typeof text !== 'string') return ''
  return text.replace(/\b\w+\b/g, (word) => TYPO_MAP[word.toLowerCase()] ?? word)
}

/* --------------------------------------------------------------------------
   STORAGE KEY
   -------------------------------------------------------------------------- */

const STORAGE_PREFIX = 'ss_v3'

export function storageKey(module: string, key: string): string {
  return `${STORAGE_PREFIX}:${module}:${key}`
}

/* --------------------------------------------------------------------------
   CSV EXPORT
   -------------------------------------------------------------------------- */

function csvEscapeCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Download data as CSV file.
 */
export function downloadCSV(rows: Record<string, unknown>[], filename: string): boolean {
  // Perbaikan: Tambahkan pengecekan eksistensi baris pertama secara eksplisit (TS2769)
  if (!Array.isArray(rows) || rows.length === 0) return false
  const firstRow = rows[0]
  if (!firstRow) return false

  const headers = Object.keys(firstRow)
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvEscapeCell(r[h])).join(',')),
  ]
  try {
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   CLIPBOARD COPY
   -------------------------------------------------------------------------- */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'absolute'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    const selection = document.getSelection()
    const currentRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    textarea.select()
    const success = document.execCommand('copy')
    textarea.remove()
    if (currentRange) {
      selection?.removeAllRanges()
      selection?.addRange(currentRange)
    }
    return success
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   MISCELLANEOUS UTILITIES
   -------------------------------------------------------------------------- */

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, maxLength: number, ellipsis: string = '…'): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - ellipsis.length) + ellipsis
}

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
