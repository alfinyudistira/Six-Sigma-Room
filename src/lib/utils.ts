// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind class merger ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── Haptic Feedback (Vibration API) ─────────────────────────────────────────
export const haptic = {
  light:   () => navigator.vibrate?.(10),
  medium:  () => navigator.vibrate?.(25),
  heavy:   () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error:   () => navigator.vibrate?.([50, 30, 50]),
  warning: () => navigator.vibrate?.([30]),
}

// ─── View Transitions API ─────────────────────────────────────────────────────
export async function viewTransition(callback: () => void) {
  if ('startViewTransition' in document) {
    await (document as Document & { startViewTransition: (cb: () => void) => Promise<void> })
      .startViewTransition(callback)
  } else {
    callback()
  }
}

// ─── Number formatters ────────────────────────────────────────────────────────
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return Math.round(n).toLocaleString()
}

export function formatIDR(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}Rp${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `${sign}Rp${(abs / 1e9).toFixed(1)}M`
  if (abs >= 1e6)  return `${sign}Rp${(abs / 1e6).toFixed(0)}Jt`
  if (abs >= 1e3)  return `${sign}Rp${(abs / 1e3).toFixed(0)}K`
  return `${sign}Rp${Math.round(abs).toLocaleString()}`
}

// ─── Currency formatter factory ───────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', IDR: 'Rp', EUR: '€', GBP: '£',
  SGD: 'S$', AUD: 'A$', JPY: '¥', MYR: 'RM',
}

export function createCurrencyFmt(currencyCode: string) {
  const sym = CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `

  const fmt = (n: number): string => {
    if (n == null || isNaN(n)) return `${sym}0`
    if (currencyCode === 'IDR') return formatIDR(n).replace('Rp', sym)
    const sign = n < 0 ? '-' : ''
    return `${sign}${sym}${formatCompact(Math.abs(n))}`
  }

  const fmtFull = (n: number): string =>
    `${sym}${Math.round(n).toLocaleString()}`

  return { sym, fmt, fmtFull }
}

// ─── Fuzzy header matching ────────────────────────────────────────────────────
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export function fuzzyMatchHeader(
  header: string,
  candidates: string[],
  threshold = 0.7,
): string | null {
  const h = normalizeHeader(header)
  let best: string | null = null
  let bestScore = 0

  for (const c of candidates) {
    const n = normalizeHeader(c)
    // Jaccard similarity on character bigrams
    const bigrams = (s: string) => new Set(Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2)))
    const A = bigrams(h)
    const B = bigrams(n)
    const intersection = [...A].filter(x => B.has(x)).length
    const union = new Set([...A, ...B]).size
    const score = union === 0 ? 0 : intersection / union

    if (score > bestScore && score >= threshold) {
      bestScore = score
      best = c
    }
  }

  return best
}

// ─── Auto-typo correction map ─────────────────────────────────────────────────
const TYPO_MAP: Record<string, string> = {
  'sevrity': 'severity', 'occurance': 'occurrence', 'detectability': 'detection',
  'liklyhood': 'likelihood', 'proability': 'probability', 'defenition': 'definition',
  'mesure': 'measure', 'analsis': 'analysis', 'improvment': 'improvement',
  'conrtol': 'control', 'proceess': 'process', 'eficiency': 'efficiency',
}

export function autoCorrectTypo(text: string): string {
  return text
    .split(' ')
    .map(w => TYPO_MAP[w.toLowerCase()] ?? w)
    .join(' ')
}

// ─── Generate localStorage key namespace ────────────────────────────────────
export function storageKey(module: string, key: string): string {
  return `ss_v2_${module}_${key}`
}

// ─── CSV export with UTF-8 BOM ────────────────────────────────────────────────
export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ]
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Clipboard helper ────────────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
