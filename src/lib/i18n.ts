// ─── I18N ENGINE ─────────────────────────────────────────────

type Messages = Record<string, Record<string, string>>

const messages: Messages = {
  en: {
    welcome: "Welcome",
    save: "Save",
  },
  id: {
    welcome: "Selamat datang",
    save: "Simpan",
  },
}

export function getLocale(): string {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('id')) return 'id'
  return 'en'
}

export function t(key: string): string {
  const locale = getLocale()
  return messages[locale]?.[key] ?? key
}
