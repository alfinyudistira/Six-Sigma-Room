// src/components/layout/NavBar.tsx

import { useState, useCallback, useMemo, memo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type TabId } from '@/store/useAppStore'
import { useHaptic } from '@/hooks/useHaptic'
import { viewTransition } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface NavTab {
  id: TabId
  label: string
  shortLabel: string
  icon: string
  key: string
}

const TABS: readonly NavTab[] = [
  { id: 'overview',   label: 'Overview',      shortLabel: 'OVR',  icon: '◈', key: '1' },
  { id: 'sigma',      label: 'Sigma Calc',    shortLabel: 'SIG',  icon: 'σ', key: '2' },
  { id: 'dmaic',      label: 'DMAIC',         shortLabel: 'DMC',  icon: '⊕', key: '3' },
  { id: 'fmea',       label: 'FMEA',          shortLabel: 'FMA',  icon: '⚠', key: '4' },
  { id: 'copq',       label: 'COPQ',          shortLabel: 'CPQ',  icon: '$', key: '5' },
  { id: 'spc',        label: 'SPC Charts',    shortLabel: 'SPC',  icon: '~', key: '6' },
  { id: 'pareto',     label: 'Pareto',        shortLabel: 'PAR',  icon: '▌', key: '7' },
  { id: 'rootcause',  label: 'Root Cause',    shortLabel: 'R/C',  icon: '⊸', key: '8' },
  { id: 'triage',     label: 'AI Triage',     shortLabel: 'TRG',  icon: '◎', key: '9' },
  { id: 'universal',  label: 'Universal',     shortLabel: 'UNI',  icon: '∞', key: '0' },
  { id: 'ops',        label: 'Live Ops',      shortLabel: 'OPS',  icon: '⚡', key: '-' },
  { id: 'settings',   label: 'Settings',      shortLabel: 'CFG',  icon: '⚙', key: '=' },
] as const

export interface NavBarProps {
  onItemHover?: (tabId: TabId) => void
}

export const NavBar = memo(function NavBar({ onItemHover }: NavBarProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const [, setSearchParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { light: hapticLight } = useHaptic()

  const navigate = useCallback(
    (tabId: TabId) => {
      hapticLight()
      void viewTransition(() => {
        setActiveTab(tabId)
        setSearchParams({ tab: tabId }, { replace: true })
        setMobileOpen(false)
      })
    },
    [hapticLight, setActiveTab, setSearchParams]
  )

  // Handle hover (for prefetch)
  const handleHover = useCallback(
    (tabId: TabId) => {
      onItemHover?.(tabId)
    },
    [onItemHover]
  )

  // Find current tab (memoized)
  const currentTab = useMemo(
    () => TABS.find((t) => t.id === activeTab) ?? TABS[0],
    [activeTab]
  )

  return (
    <>
      {/* ─── DESKTOP NAVIGATION ─────────────────────────────────────────── */}
      <nav
        role="tablist"
        aria-label="Module navigation"
        className="hidden md:flex shrink-0 gap-0 overflow-x-auto border-b border-border bg-bg px-4 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              title={`${tab.label} [${tab.key}]`}
              onClick={() => navigate(tab.id)}
              onMouseEnter={() => handleHover(tab.id)}
              className={cn(
                'group flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[0.6rem] font-medium uppercase tracking-wide transition-all',
                isActive
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-ink-dim hover:text-ink-mid'
              )}
            >
              <span className={cn('text-sm', isActive ? 'opacity-100' : 'opacity-60')}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.shortLabel}</span>
              <span
                className={cn(
                  'ml-0.5 rounded-sm bg-border/60 px-1 text-[0.48rem] leading-tight text-ink-dim/60',
                  isActive && 'bg-cyan/20 text-cyan'
                )}
              >
                {tab.key}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ─── MOBILE NAVIGATION ──────────────────────────────────────────── */}
      <div className="block shrink-0 border-b border-border bg-panel md:hidden">
        {/* Mobile header: current tab + hamburger */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex flex-1 items-center gap-3">
            <span className="text-xl text-cyan">{currentTab.icon}</span>
            <div>
              <div className="font-mono text-[0.5rem] uppercase tracking-wider text-ink-dim">
                Current Module
              </div>
              <div className="font-display text-sm font-bold text-ink">
                {currentTab.label}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              hapticLight()
              setMobileOpen((v) => !v)
            }}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            className={cn(
              'rounded-md border px-2 py-1.5 font-mono text-xs transition-colors',
              mobileOpen
                ? 'border-cyan bg-cyan/10 text-cyan'
                : 'border-border text-ink-dim hover:border-cyan/50'
            )}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown (grid) */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="grid grid-cols-3 gap-px bg-border">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate(tab.id)}
                      onMouseEnter={() => handleHover(tab.id)}
                      aria-selected={isActive}
                      className={cn(
                        'flex flex-col items-center gap-1 py-3 text-center font-mono text-[0.6rem] uppercase transition-colors',
                        isActive
                          ? 'bg-cyan/10 text-cyan'
                          : 'bg-bg text-ink-dim hover:bg-white/5'
                      )}
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.shortLabel}</span>
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
