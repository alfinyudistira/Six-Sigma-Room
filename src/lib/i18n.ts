// src/lib/i18n.ts
// ─── Internationalization (i18n) — SSOT for all locale-aware formatting ───────
// Auto-detects user locale from browser. All modules import from here.

export type SupportedLocale =
  | 'id-ID' // Indonesian (Bahasa)
  | 'en-US' // English (US)
  | 'en-GB' // English (UK)
  | 'ja-JP' // Japanese
  | 'de-DE' // German
  | 'fr-FR' // French
  | 'zh-CN' // Simplified Chinese
  | 'ms-MY' // Malay

export type SupportedCurrency =
  | 'IDR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'MYR' | 'SGD' | 'AUD' | 'CNY'

// ─── Locale metadata ──────────────────────────────────────────────────────────
export const LOCALE_META: Record<SupportedLocale, {
  label: string
  flag: string
  defaultCurrency: SupportedCurrency
  rtl: boolean
}> = {
  'id-ID': { label: 'Bahasa Indonesia', flag: '🇮🇩', defaultCurrency: 'IDR', rtl: false },
  'en-US': { label: 'English (US)',     flag: '🇺🇸', defaultCurrency: 'USD', rtl: false },
  'en-GB': { label: 'English (UK)',     flag: '🇬🇧', defaultCurrency: 'GBP', rtl: false },
  'ja-JP': { label: '日本語',            flag: '🇯🇵', defaultCurrency: 'JPY', rtl: false },
  'de-DE': { label: 'Deutsch',          flag: '🇩🇪', defaultCurrency: 'EUR', rtl: false },
  'fr-FR': { label: 'Français',         flag: '🇫🇷', defaultCurrency: 'EUR', rtl: false },
  'zh-CN': { label: '中文 (简体)',        flag: '🇨🇳', defaultCurrency: 'CNY', rtl: false },
  'ms-MY': { label: 'Bahasa Melayu',   flag: '🇲🇾', defaultCurrency: 'MYR', rtl: false },
}

// ─── Auto-detect locale from browser ─────────────────────────────────────────
export function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem('ss_locale') as SupportedLocale | null
  if (saved && saved in LOCALE_META) return saved

  const browser = navigator.language || 'en-US'
  // Exact match
  if (browser in LOCALE_META) return browser as SupportedLocale
  // Language prefix match (e.g. 'id' → 'id-ID')
  const prefix = browser.split('-')[0]
  const match = Object.keys(LOCALE_META).find(l => l.startsWith(prefix)) as SupportedLocale | undefined
  return match ?? 'en-US'
}

// ─── Formatter factory — created once per locale ──────────────────────────────
export interface I18nFormatters {
  locale: SupportedLocale
  currency: SupportedCurrency

  /** Format a number as currency, auto-compact for large values */
  fmtCurrency: (n: number, compact?: boolean) => string
  /** Format a number with locale-aware separators */
  fmtNumber: (n: number, decimals?: number) => string
  /** Format a percentage */
  fmtPercent: (n: number, decimals?: number) => string
  /** Format a date */
  fmtDate: (d: Date | string | number, style?: 'short' | 'medium' | 'long') => string
  /** Format relative time (e.g. "3 days ago") */
  fmtRelative: (d: Date | string | number) => string
  /** Compact large numbers (1.2M, 3.4B, etc.) locale-aware */
  fmtCompact: (n: number) => string
}

export function createI18n(locale: SupportedLocale, currency: SupportedCurrency): I18nFormatters {
  const numFmt   = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, opts)
  const dateFmt  = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, opts)
  const rtf      = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const fmtCurrency = (n: number, compact = true): string => {
    if (!compact || Math.abs(n) < 1000) {
      return numFmt({ style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
    }
    // Compact: use notation + currency symbol
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    const sym = numFmt({ style: 'currency', currency, maximumFractionDigits: 0 })
      .formatToParts(1)
      .find(p => p.type === 'currency')?.value ?? currency

    if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(1)}T`
    if (abs >= 1e9)  return `${sign}${sym}${(abs / 1e9).toFixed(1)}B`
    if (abs >= 1e6)  return `${sign}${sym}${(abs / 1e6).toFixed(1)}M`
    if (abs >= 1e3)  return `${sign}${sym}${(abs / 1e3).toFixed(0)}K`
    return numFmt({ style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  }

  const fmtNumber = (n: number, decimals = 0): string =>
    numFmt({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)

  const fmtPercent = (n: number, decimals = 1): string =>
    numFmt({ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n / 100)

  const fmtDate = (d: Date | string | number, style: 'short' | 'medium' | 'long' = 'medium'): string => {
    const date = d instanceof Date ? d : new Date(d)
    const opts: Record<string, Intl.DateTimeFormatOptions> = {
      short:  { year: '2-digit', month: 'numeric', day: 'numeric' },
      medium: { year: 'numeric', month: 'short',   day: 'numeric' },
      long:   { year: 'numeric', month: 'long',    day: 'numeric', weekday: 'long' },
    }
    return dateFmt(opts[style]).format(date)
  }

  const fmtRelative = (d: Date | string | number): string => {
    const date = d instanceof Date ? d : new Date(d)
    const diffMs = date.getTime() - Date.now()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (Math.abs(diffDays) < 1) {
      const diffHrs = Math.round(diffMs / (1000 * 60 * 60))
      if (Math.abs(diffHrs) < 1) {
        const diffMin = Math.round(diffMs / (1000 * 60))
        return rtf.format(diffMin, 'minute')
      }
      return rtf.format(diffHrs, 'hour')
    }
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
    const diffMonths = Math.round(diffDays / 30)
    return rtf.format(diffMonths, 'month')
  }

  const fmtCompact = (n: number): string =>
    numFmt({ notation: 'compact', maximumFractionDigits: 1 }).format(n)

  return { locale, currency, fmtCurrency, fmtNumber, fmtPercent, fmtDate, fmtRelative, fmtCompact }
}

// ─── Translation strings (extensible) ────────────────────────────────────────
export type TranslationKey =
  | 'nav.overview' | 'nav.sigma' | 'nav.dmaic' | 'nav.fmea' | 'nav.copq'
  | 'nav.spc' | 'nav.pareto' | 'nav.rootcause' | 'nav.triage' | 'nav.universal' | 'nav.ops'
  | 'common.save' | 'common.cancel' | 'common.reset' | 'common.add' | 'common.delete'
  | 'common.edit' | 'common.export' | 'common.loading' | 'common.error' | 'common.retry'
  | 'common.demo' | 'common.configure' | 'common.search' | 'common.filter'
  | 'kpi.sigma' | 'kpi.ppk' | 'kpi.dpmo' | 'kpi.copq' | 'kpi.yield'
  | 'status.worldClass' | 'status.capable' | 'status.marginal' | 'status.incapable'
  | 'risk.critical' | 'risk.high' | 'risk.medium' | 'risk.low'
  | 'onboarding.welcome' | 'onboarding.start' | 'onboarding.skip'
  | 'feedback.saved' | 'feedback.copied' | 'feedback.exported' | 'feedback.error'

type TranslationMap = Record<TranslationKey, string>

const translations: Record<SupportedLocale, Partial<TranslationMap>> = {
  'en-US': {
    'nav.overview': 'Overview', 'nav.sigma': 'Sigma Calc', 'nav.dmaic': 'DMAIC',
    'nav.fmea': 'FMEA', 'nav.copq': 'COPQ', 'nav.spc': 'SPC Charts',
    'nav.pareto': 'Pareto', 'nav.rootcause': 'Root Cause', 'nav.triage': 'AI Triage',
    'nav.universal': 'Universal', 'nav.ops': 'Live Ops',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.reset': 'Reset',
    'common.add': 'Add', 'common.delete': 'Delete', 'common.edit': 'Edit',
    'common.export': 'Export', 'common.loading': 'Loading…', 'common.error': 'Error',
    'common.retry': 'Retry', 'common.demo': 'Demo', 'common.configure': 'Configure',
    'common.search': 'Search', 'common.filter': 'Filter',
    'kpi.sigma': 'Sigma Level', 'kpi.ppk': 'Process Capability',
    'kpi.dpmo': 'Defects per Million', 'kpi.copq': 'Cost of Poor Quality', 'kpi.yield': 'Yield',
    'status.worldClass': 'World Class', 'status.capable': 'Capable',
    'status.marginal': 'Marginal', 'status.incapable': 'Incapable',
    'risk.critical': 'Critical', 'risk.high': 'High', 'risk.medium': 'Medium', 'risk.low': 'Low',
    'onboarding.welcome': 'Welcome to DMAIC War Room',
    'onboarding.start': 'Get Started', 'onboarding.skip': 'Skip',
    'feedback.saved': 'Saved', 'feedback.copied': 'Copied!',
    'feedback.exported': 'Exported', 'feedback.error': 'Something went wrong',
  },
  'id-ID': {
    'nav.overview': 'Ringkasan', 'nav.sigma': 'Kalkulator Sigma', 'nav.dmaic': 'DMAIC',
    'nav.fmea': 'FMEA', 'nav.copq': 'COPQ', 'nav.spc': 'Grafik SPC',
    'nav.pareto': 'Pareto', 'nav.rootcause': 'Akar Masalah', 'nav.triage': 'AI Triage',
    'nav.universal': 'Universal', 'nav.ops': 'Operasi Langsung',
    'common.save': 'Simpan', 'common.cancel': 'Batal', 'common.reset': 'Reset',
    'common.add': 'Tambah', 'common.delete': 'Hapus', 'common.edit': 'Edit',
    'common.export': 'Ekspor', 'common.loading': 'Memuat…', 'common.error': 'Error',
    'common.retry': 'Coba Lagi', 'common.demo': 'Demo', 'common.configure': 'Konfigurasi',
    'common.search': 'Cari', 'common.filter': 'Filter',
    'kpi.sigma': 'Level Sigma', 'kpi.ppk': 'Kapabilitas Proses',
    'kpi.dpmo': 'Cacat per Juta', 'kpi.copq': 'Biaya Kualitas Buruk', 'kpi.yield': 'Hasil',
    'status.worldClass': 'Kelas Dunia', 'status.capable': 'Mampu',
    'status.marginal': 'Marginal', 'status.incapable': 'Tidak Mampu',
    'risk.critical': 'Kritis', 'risk.high': 'Tinggi', 'risk.medium': 'Sedang', 'risk.low': 'Rendah',
    'onboarding.welcome': 'Selamat Datang di DMAIC War Room',
    'onboarding.start': 'Mulai', 'onboarding.skip': 'Lewati',
    'feedback.saved': 'Tersimpan', 'feedback.copied': 'Disalin!',
    'feedback.exported': 'Diekspor', 'feedback.error': 'Terjadi kesalahan',
  },
  'ja-JP': {
    'common.save': '保存', 'common.cancel': 'キャンセル', 'common.add': '追加',
    'common.delete': '削除', 'common.loading': '読み込み中…',
    'nav.overview': '概要', 'nav.dmaic': 'DMAIC', 'nav.fmea': 'FMEA',
    'feedback.saved': '保存しました', 'feedback.error': 'エラーが発生しました',
  },
  'de-DE': {
    'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.add': 'Hinzufügen',
    'common.delete': 'Löschen', 'common.loading': 'Laden…',
    'feedback.saved': 'Gespeichert', 'feedback.error': 'Ein Fehler ist aufgetreten',
  },
  'fr-FR': {
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.add': 'Ajouter',
    'common.loading': 'Chargement…',
    'feedback.saved': 'Enregistré', 'feedback.error': 'Une erreur s\'est produite',
  },
  'en-GB': {},
  'zh-CN': {
    'common.save': '保存', 'common.cancel': '取消', 'common.loading': '加载中…',
    'feedback.saved': '已保存',
  },
  'ms-MY': {
    'common.save': 'Simpan', 'common.cancel': 'Batal', 'common.loading': 'Memuatkan…',
    'feedback.saved': 'Disimpan',
  },
}

// Fallback to en-US for missing keys
export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return translations[locale]?.[key]
    ?? translations['en-US'][key]
    ?? key
}
