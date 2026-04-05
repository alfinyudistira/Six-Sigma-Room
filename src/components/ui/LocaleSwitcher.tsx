// src/components/ui/LocaleSwitcher.tsx

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '@/providers/I18nProvider'
import { useHaptic } from '@/hooks' 
import { LOCALE_META, type SupportedLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, handler, enabled])
}

/* --------------------------------------------------------------------------
   COMPONENT
   -------------------------------------------------------------------------- */
export function LocaleSwitcher() {
  const { locale, setLocale, availableLocales } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const { light: hapticLight } = useHaptic()

  // 🔥 PERBAIKAN: Fallback safety untuk menghindari error 'undefined'
  const currentMeta = useMemo(() => 
    LOCALE_META[locale] ?? { flag: '🌐', label: 'Language' }, 
  [locale])

  useClickOutside(containerRef, () => setIsOpen(false), isOpen)

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setIsOpen(false)
          buttonRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev < availableLocales.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < availableLocales.length) {
            const selected = availableLocales[focusedIndex]
            if (selected && selected !== locale) {
              hapticLight()
              setLocale(selected)
            }
            setIsOpen(false)
            buttonRef.current?.focus()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, focusedIndex, availableLocales, locale, setLocale, hapticLight])

  // Sync scroll
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  const toggleDropdown = useCallback(() => {
    hapticLight()
    setIsOpen((prev) => !prev)
  }, [hapticLight])

  const selectLocale = useCallback(
    (loc: SupportedLocale) => {
      if (loc === locale) {
        setIsOpen(false)
        return
      }
      hapticLight()
      setLocale(loc)
      setIsOpen(false)
      buttonRef.current?.focus()
    },
    [locale, setLocale, hapticLight]
  )

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        aria-label={`Current language: ${currentMeta.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono transition-all',
          'hover:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan',
          isOpen ? 'border-cyan bg-cyan/5 text-cyan' : 'border-border text-ink-dim'
        )}
        style={{ borderColor: isOpen ? tokens.cyan : tokens.border }}
      >
        <span aria-hidden="true" className="text-sm">{currentMeta.flag}</span>
        <span className="font-bold uppercase tracking-wider">{locale.split('-')[0]}</span>
        <span className="opacity-40">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            aria-label="Select language"
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={cn(
              'absolute right-0 top-full z-[100] mt-2 min-w-[200px] overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md',
              'border-border bg-panel/90'
            )}
            style={{ 
              backgroundColor: `${tokens.panel}E6`, // 90% opacity hex
              borderColor: tokens.border 
            }}
          >
            <div className="max-h-[280px] overflow-y-auto p-1.5 custom-scrollbar">
              {availableLocales.map((loc, idx) => {
                const meta = LOCALE_META[loc] ?? { flag: '🌐', label: loc }
                const isActive = loc === locale
                const isFocused = idx === focusedIndex

                return (
                  <li key={loc} role="none">
                    <button
                      ref={(el) => { itemRefs.current[idx] = el }}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => selectLocale(loc)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-mono text-xs transition-all',
                        isActive 
                          ? 'bg-cyan text-bg font-bold shadow-lg shadow-cyan/20' 
                          : 'text-ink-dim hover:bg-white/5',
                        isFocused && !isActive && 'bg-white/10 text-ink'
                      )}
                      style={isActive ? { backgroundColor: tokens.cyan, color: tokens.bg } : {}}
                    >
                      <span aria-hidden="true" className="text-base">{meta.flag}</span>
                      <span className="flex-1">{meta.label}</span>
                      {isActive && <span className="text-[10px]">ACTIVE</span>}
                    </button>
                  </li>
                )
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
