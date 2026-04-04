// src/components/ui/LocaleSwitcher.tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/providers/I18nProvider'
import { LOCALE_META, type SupportedLocale } from '@/lib/i18n'
import { haptic } from '@/lib/utils'

export function LocaleSwitcher() {
  const { locale, setLocale, availableLocales } = useI18n()
  const [open, setOpen] = useState(false)
  const current = LOCALE_META[locale]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { haptic.light(); setOpen(o => !o) }}
        aria-label={`Current language: ${current.label}. Click to change.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: 'transparent', border: '1px solid #112233', borderRadius: 4,
          color: '#7A99B8', padding: '0.25rem 0.5rem',
          fontFamily: 'Space Mono, monospace', fontSize: '0.58rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A3A5C' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#112233' }}
      >
        <span aria-hidden="true">{current.flag}</span>
        <span>{locale.split('-')[0].toUpperCase()}</span>
        <span style={{ opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0,
              background: '#0D1520', border: '1px solid #1A3A5C', borderRadius: 8,
              padding: '0.35rem', minWidth: 180, zIndex: 9999,
              listStyle: 'none', margin: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {availableLocales.map(loc => {
              const meta = LOCALE_META[loc]
              const isActive = loc === locale
              return (
                <li key={loc}>
                  <button
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { haptic.light(); setLocale(loc as SupportedLocale); setOpen(false) }}
                    style={{
                      width: '100%', background: isActive ? 'rgba(0,212,255,0.1)' : 'transparent',
                      border: 'none', borderRadius: 5,
                      color: isActive ? '#00D4FF' : '#7A99B8',
                      padding: '0.4rem 0.6rem', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span aria-hidden="true">{meta.flag}</span>
                    <span>{meta.label}</span>
                    {isActive && <span style={{ marginLeft: 'auto', color: '#00D4FF' }}>✓</span>}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
