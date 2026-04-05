import React, { useState, useCallback, useMemo, memo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import { useAppStore, type TabId } from '@/store/useAppStore'
import { useHaptic } from '@/hooks'
import { viewTransition, cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(media.matches)
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [])
  return reduced
}

interface NavTab {
  id: TabId
  label: string
  shortLabel: string
  icon: string
  key: string
}

const TABS: readonly NavTab[] = [
  { id: 'overview',  label: 'Overview',    shortLabel: 'OVR', icon: '◈', key: '1' },
  { id: 'sigma',     label: 'Sigma Calc',  shortLabel: 'SIG', icon: 'σ', key: '2' },
  { id: 'dmaic',     label: 'DMAIC',       shortLabel: 'DMC', icon: '⊕', key: '3' },
  { id: 'fmea',      label: 'FMEA',        shortLabel: 'FMA', icon: '⚠', key: '4' },
  { id: 'copq',      label: 'COPQ',        shortLabel: 'CPQ', icon: '$', key: '5' },
  { id: 'spc',       label: 'SPC Charts',  shortLabel: 'SPC', icon: '~', key: '6' },
  { id: 'pareto',    label: 'Pareto',      shortLabel: 'PAR', icon: '▌', key: '7' },
  { id: 'rootcause', label: 'Root Cause',  shortLabel: 'R/C', icon: '⊸', key: '8' },
  { id: 'triage',    label: 'AI Triage',   shortLabel: 'TRG', icon: '◎', key: '9' },
  { id: 'universal', label: 'Universal',   shortLabel: 'UNI', icon: '∞', key: '0' },
  { id: 'ops',       label: 'Live Ops',    shortLabel: 'OPS', icon: '⚡', key: '-' },
  { id: 'settings',  label: 'Settings',    shortLabel: 'CFG', icon: '⚙', key: '=' },
] as const

/* --------------------------------------------------------------------------
   PROPS
   -------------------------------------------------------------------------- */
export interface NavBarProps {
  // Perbaikan 2: Dukungan untuk exactOptionalPropertyTypes
  onItemHover?: ((tabId: TabId) => void) | undefined
}

/* --------------------------------------------------------------------------
   NAVBAR COMPONENT
   -------------------------------------------------------------------------- */
export const NavBar = memo(function NavBar({ onItemHover }: NavBarProps) {
  const { activeTab, setActiveTab } = useAppStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
    }))
  )

  const [, setSearchParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { light: hapticLight } = useHaptic()
  const reducedMotion = useReducedMotion()

  const navigate = useCallback(
    (tabId: TabId) => {
      if (tabId === activeTab) return
      hapticLight()
      void viewTransition(() => {
        setActiveTab(tabId)
        setSearchParams({ tab: tabId }, { replace: true })
        setMobileOpen(false)
      })
    },
    [activeTab, hapticLight, setActiveTab, setSearchParams]
  )

  // Perbaikan 3: Memastikan currentTab selalu terdefinisi (non-null assertion pada fallback)
  const currentTab = useMemo(
    () => TABS.find((t) => t.id === activeTab) || TABS[0],
    [activeTab]
  )

  return (
    <>
      {/* ─── DESKTOP NAVIGATION ─────────────────────────────────────────── */}
      <nav
        role="tablist"
        aria-label="Module navigation"
        className="hidden shrink-0 border-b border-border bg-bg px-4 overflow-x-auto scrollbar-none md:flex"
        style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              title={`${tab.label} [${tab.key}]`}
              onClick={() => navigate(tab.id)}
              onMouseEnter={() => onItemHover?.(tab.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 px-4 py-3 text-[0.65rem] font-mono font-bold uppercase tracking-widest transition-all duration-200',
                isActive ? 'text-cyan' : 'text-ink-dim hover:text-ink hover:bg-white/5'
              )}
              style={{ color: isActive ? tokens.cyan : tokens.textDim }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: tokens.cyan }}
                  transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <span className={cn('text-base', isActive ? 'opacity-100' : 'opacity-50')}>
                {tab.icon}
              </span>
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="inline lg:hidden">{tab.shortLabel}</span>

              <span
                className={cn(
                  'ml-1 rounded px-1 text-[0.45rem] font-bold transition-colors',
                  isActive ? 'bg-cyan/20 text-cyan' : 'bg-border/50 text-ink-dim/40'
                )}
              >
                {tab.key}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ─── MOBILE NAVIGATION ──────────────────────────────────────────── */}
      <div className="block shrink-0 border-b border-border bg-panel md:hidden" style={{ borderColor: tokens.border, backgroundColor: (tokens as any).panel }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xl" style={{ color: tokens.cyan }}>{currentTab.icon}</span>
            <div>
              <div className="font-mono text-[0.5rem] uppercase opacity-50" style={{ color: tokens.textDim }}>Module</div>
              <div className="text-sm font-bold leading-none" style={{ color: tokens.text }}>{currentTab.label}</div>
            </div>
          </div>

          <button
            onClick={() => { hapticLight(); setMobileOpen(!mobileOpen) }}
            className={cn(
              'flex items-center justify-center rounded-lg border p-2 transition-all active:scale-90',
              mobileOpen ? 'border-cyan bg-cyan/10 text-cyan' : 'border-border text-ink-dim'
            )}
          >
            <span className="text-xs font-bold font-mono">{mobileOpen ? 'CLOSE' : 'MENU'}</span>
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/50 bg-bg"
            >
              <div className="grid grid-cols-3 gap-px bg-border/20">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate(tab.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-4 text-center transition-all active:bg-white/10',
                        isActive ? 'bg-cyan/10' : 'bg-panel'
                      )}
                    >
                      <span className="text-xl" style={{ color: isActive ? tokens.cyan : tokens.textDim }}>{tab.icon}</span>
                      <span className="font-mono text-[0.55rem] font-bold uppercase tracking-tighter" style={{ color: isActive ? tokens.cyan : tokens.textDim }}>
                        {tab.shortLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
})
