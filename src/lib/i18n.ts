import { persist, retrieve } from '@/lib/storage'

export type SupportedLocale =
  | 'id-ID' | 'en-US' | 'en-GB' | 'ja-JP' | 'de-DE' | 'fr-FR' | 'zh-CN' | 'ms-MY'

export type SupportedCurrency =
  | 'IDR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'MYR' | 'SGD' | 'AUD' | 'CNY'

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
  'ms-MY': { label: 'Bahasa Melayu',    flag: '🇲🇾', defaultCurrency: 'MYR', rtl: false },
}

const STORAGE_KEY = 'ss_locale'
const DEFAULT_LOCALE: SupportedLocale = 'en-US'

let currentLocale: SupportedLocale = DEFAULT_LOCALE

export function detectLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null
    if (saved && saved in LOCALE_META) return saved
  } catch {
    /* ignore */
  }

  const browser = (typeof navigator !== 'undefined' && (navigator.language || navigator.languages?.[0])) || DEFAULT_LOCALE
  if (browser && browser in LOCALE_META) return browser as SupportedLocale

  const prefix = browser.split('-')[0]??
  const match = Object.keys(LOCALE_META).find((l) => l.startsWith(prefix)) as SupportedLocale | undefined
  return match ?? DEFAULT_LOCALE
}

export async function getStoredLocale(): Promise<SupportedLocale | null> {
  try {
    return (await retrieve<SupportedLocale>(STORAGE_KEY)) ?? null
  } catch {
    return null
  }
}

export async function setLocale(locale: SupportedLocale): Promise<void> {
  if (locale === currentLocale) return

  try {
    await persist<SupportedLocale>(STORAGE_KEY, locale)
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
  }

  currentLocale = locale
  notifyLocaleChange(locale)
}

export function setLocaleSync(locale: SupportedLocale): void {
  if (locale === currentLocale) return
  currentLocale = locale
  notifyLocaleChange(locale)
}

export function getLocale(): SupportedLocale {
  return currentLocale
}

type LocaleListener = (locale: SupportedLocale) => void
const localeListeners = new Set<LocaleListener>()

function notifyLocaleChange(locale: SupportedLocale): void {
  localeListeners.forEach((fn) => {
    try {
      fn(locale)
    } catch (err) {
      console.error('[i18n] Listener error:', err)
    }
  })
}

export function subscribeLocale(listener: LocaleListener): () => void {
  localeListeners.add(listener)
  return () => localeListeners.delete(listener)
}

const numberFormatterCache = new Map<string, Intl.NumberFormat>()
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>()
const rtfCache = new Map<string, Intl.RelativeTimeFormat>()

function getNumberFormatter(locale: SupportedLocale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  if (!numberFormatterCache.has(key)) {
    numberFormatterCache.set(key, new Intl.NumberFormat(locale, options))
  }
  return numberFormatterCache.get(key)!
}

function getDateFormatter(locale: SupportedLocale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, new Intl.DateTimeFormat(locale, options))
  }
  return dateFormatterCache.get(key)!
}

function getRelativeTimeFormatter(locale: SupportedLocale): Intl.RelativeTimeFormat {
  if (!rtfCache.has(locale)) {
    rtfCache.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }))
  }
  return rtfCache.get(locale)!
}

export function getCurrency(locale?: SupportedLocale): SupportedCurrency {
  const loc = locale ?? currentLocale
  return LOCALE_META[loc].defaultCurrency
}

export function fmtNumber(n: number, decimals: number = 0, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  return getNumberFormatter(loc, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtCurrency(n: number, compact: boolean = true, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  const currency = getCurrency(loc)

  if (!compact || Math.abs(n) < 1000) {
    return getNumberFormatter(loc, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  }

  return getNumberFormatter(loc, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

export function fmtPercent(n: number, decimals: number = 1, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  return getNumberFormatter(loc, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n / 100)
}

export function fmtDate(
  d: Date | string | number,
  style: 'short' | 'medium' | 'long' = 'medium',
  locale?: SupportedLocale,
): string {
  const loc = locale ?? currentLocale
  const date = d instanceof Date ? d : new Date(d)

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: '2-digit', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  }
  return getDateFormatter(loc, optionsMap[style]).format(date)
}

export function fmtRelative(d: Date | string | number, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  const date = d instanceof Date ? d : new Date(d)
  const diffMs = date.getTime() - Date.now()
  const rtf = getRelativeTimeFormatter(loc)

  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')

  const hours = Math.round(diffMs / 3600000)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')

  const days = Math.round(diffMs / 86400000)
  if (Math.abs(days) < 30) return rtf.format(days, 'day')

  const months = Math.round(days / 30)
  return rtf.format(months, 'month')
}

export function fmtCompact(n: number, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  return getNumberFormatter(loc, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

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
    'nav.overview': 'Overview',
    'nav.sigma': 'Sigma Calc',
    'nav.dmaic': 'DMAIC',
    'nav.fmea': 'FMEA',
    'nav.copq': 'COPQ',
    'nav.spc': 'SPC Charts',
    'nav.pareto': 'Pareto',
    'nav.rootcause': 'Root Cause',
    'nav.triage': 'AI Triage',
    'nav.universal': 'Universal',
    'nav.ops': 'Live Ops',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.reset': 'Reset',
    'common.add': 'Add',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.export': 'Export',
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.demo': 'Demo',
    'common.configure': 'Configure',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'kpi.sigma': 'Sigma Level',
    'kpi.ppk': 'Process Capability',
    'kpi.dpmo': 'Defects per Million',
    'kpi.copq': 'Cost of Poor Quality',
    'kpi.yield': 'Yield',
    'status.worldClass': 'World Class',
    'status.capable': 'Capable',
    'status.marginal': 'Marginal',
    'status.incapable': 'Incapable',
    'risk.critical': 'Critical',
    'risk.high': 'High',
    'risk.medium': 'Medium',
    'risk.low': 'Low',
    'onboarding.welcome': 'Welcome to DMAIC War Room',
    'onboarding.start': 'Get Started',
    'onboarding.skip': 'Skip',
    'feedback.saved': 'Saved',
    'feedback.copied': 'Copied!',
    'feedback.exported': 'Exported',
    'feedback.error': 'Something went wrong',
  },
  'id-ID': {
    'nav.overview': 'Ringkasan',
    'nav.sigma': 'Kalkulator Sigma',
    'nav.dmaic': 'DMAIC',
    'nav.fmea': 'FMEA',
    'nav.copq': 'COPQ',
    'nav.spc': 'Grafik SPC',
    'nav.pareto': 'Pareto',
    'nav.rootcause': 'Akar Masalah',
    'nav.triage': 'AI Triage',
    'nav.universal': 'Universal',
    'nav.ops': 'Operasi Langsung',
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.reset': 'Reset',
    'common.add': 'Tambah',
    'common.delete': 'Hapus',
    'common.edit': 'Edit',
    'common.export': 'Ekspor',
    'common.loading': 'Memuat…',
    'common.error': 'Error',
    'common.retry': 'Coba Lagi',
    'common.demo': 'Demo',
    'common.configure': 'Konfigurasi',
    'common.search': 'Cari',
    'common.filter': 'Filter',
    'kpi.sigma': 'Level Sigma',
    'kpi.ppk': 'Kapabilitas Proses',
    'kpi.dpmo': 'Cacat per Juta',
    'kpi.copq': 'Biaya Kualitas Buruk',
    'kpi.yield': 'Hasil',
    'status.worldClass': 'Kelas Dunia',
    'status.capable': 'Mampu',
    'status.marginal': 'Marginal',
    'status.incapable': 'Tidak Mampu',
    'risk.critical': 'Kritis',
    'risk.high': 'Tinggi',
    'risk.medium': 'Sedang',
    'risk.low': 'Rendah',
    'onboarding.welcome': 'Selamat Datang di DMAIC War Room',
    'onboarding.start': 'Mulai',
    'onboarding.skip': 'Lewati',
    'feedback.saved': 'Tersimpan',
    'feedback.copied': 'Disalin!',
    'feedback.exported': 'Diekspor',
    'feedback.error': 'Terjadi kesalahan',
  },
  'ja-JP': {
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.add': '追加',
    'common.delete': '削除',
    'common.loading': '読み込み中…',
    'nav.overview': '概要',
    'nav.dmaic': 'DMAIC',
    'nav.fmea': 'FMEA',
    'feedback.saved': '保存しました',
    'feedback.error': 'エラーが発生しました',
  },
  'de-DE': {
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.add': 'Hinzufügen',
    'common.delete': 'Löschen',
    'common.loading': 'Laden…',
    'feedback.saved': 'Gespeichert',
    'feedback.error': 'Ein Fehler ist aufgetreten',
  },
  'fr-FR': {
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.add': 'Ajouter',
    'common.loading': 'Chargement…',
    'feedback.saved': 'Enregistré',
    'feedback.error': "Une erreur s'est produite",
  },
  'en-GB': {},
  'zh-CN': {
    'common.save': '保存',
    'common.cancel': '取消',
    'common.loading': '加载中…',
    'feedback.saved': '已保存',
  },
  'ms-MY': {
    'common.save': 'Simpan',
    'common.cancel': 'Batal',
    'common.loading': 'Memuatkan…',
    'feedback.saved': 'Disimpan',
  },
}

/**
 * Translate dengan fallback ke en-US, lalu ke key itu sendiri.
 * Mendukung parameter seperti `t('common.save', { count: 5 })` -> "Save 5 items"
 * Gunakan `{{param}}` di translation string.
 */
export function t(key: TranslationKey, params?: Record<string, string | number>, locale?: SupportedLocale): string {
  const loc = locale ?? currentLocale
  let template = translations[loc]?.[key] ?? translations['en-US'][key] ?? key

  if (params) {
    template = template.replace(/\{\{(\w+)\}\}/g, (_, match) => {
      const value = params[match]
      return value !== undefined ? String(value) : `{{${match}}}`
    })
  }
  return template
}

/* --------------------------------------------------------------------------
   CONVENIENCE OBJECT (mirip feedback)
   -------------------------------------------------------------------------- */

export const i18n = Object.freeze({
  // Locale
  getLocale,
  setLocale,
  setLocaleSync,
  detectLocale,
  subscribeLocale,
  getCurrency,

  // Formatters
  fmtNumber,
  fmtCurrency,
  fmtPercent,
  fmtDate,
  fmtRelative,
  fmtCompact,

  // Translation
  t,

  // Metadata
  meta: LOCALE_META,
})

/* --------------------------------------------------------------------------
   INITIALIZATION (panggil saat bootstrap)
   -------------------------------------------------------------------------- */
export function initI18n(): void {
  const detected = detectLocale()
  currentLocale = detected
  // Tidak perlu async setLocale karena hanya inisialisasi internal
  if (import.meta.env.DEV) {
    console.log(`%c[i18n] Initialized with locale: ${detected}`, 'color: #00D4FF')
  }
}
