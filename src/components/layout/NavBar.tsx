// src/components/layout/NavBar.tsx
import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type TabId } from '@/store/useAppStore'
import { haptic, viewTransition } from '@/lib/utils'

interface NavTab {
  id: TabId
  label: string
  shortLabel: string
  icon: string
  key: string
}

const TABS: NavTab[] = [
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
]

export function NavBar() {
  const { activeTab, setActiveTab } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = useCallback((tabId: TabId) => {
    haptic.light()
    void viewTransition(() => {
      setActiveTab(tabId)
      // URL-driven state — tab is reflected in URL
      setSearchParams({ tab: tabId }, { replace: true })
      setMobileOpen(false)
    })
  }, [setActiveTab, setSearchParams])

  return (
    <>
      {/* ─── Desktop Nav ──────────────────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="Module navigation"
        className="desktop-nav"
        style={{
          background: '#050A0F',
          borderBottom: '1px solid #112233',
          padding: '0 1rem',
          display: 'flex',
          gap: '0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              title={`${tab.label} [${tab.key}]`}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #00D4FF' : '2px solid transparent',
                color: isActive ? '#00D4FF' : '#4A6785',
                padding: '0.65rem 0.85rem',
                fontFamily: 'Space Mono, monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0,
                marginBottom: -1,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#7A99B8'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#4A6785'
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{
                background: '#112233', color: '#4A6785',
                borderRadius: 2, padding: '0 0.2rem',
                fontSize: '0.48rem', lineHeight: '1.4',
                opacity: 0.6,
              }}>
                {tab.key}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ─── Mobile Nav ────────────────────────────────────────────────────── */}
      <div
        className="mobile-nav"
        style={{
          background: '#080E14',
          borderBottom: '1px solid #112233',
          flexShrink: 0,
        }}
      >
        {/* Current tab bar + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            {(() => {
              const t = TABS.find(t => t.id === activeTab)!
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#00D4FF', fontSize: '1rem' }}>{t.icon}</span>
                  <div>
                    <div style={{ color: '#4A6785', fontFamily: 'Space Mono', fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Module</div>
                    <div style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '0.85rem', fontWeight: 700 }}>{t.label}</div>
                  </div>
                </div>
              )
            })()}
          </div>
          <button
            onClick={() => { haptic.light(); setMobileOpen(o => !o) }}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            style={{
              background: mobileOpen ? 'rgba(0,212,255,0.1)' : 'transparent',
              border: '1px solid #112233', borderRadius: 6,
              color: mobileOpen ? '#00D4FF' : '#7A99B8',
              padding: '0.4rem 0.6rem',
              fontFamily: 'Space Mono', fontSize: '0.65rem', cursor: 'pointer',
            }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', borderTop: '1px solid #112233' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#112233' }}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate(tab.id)}
                      aria-selected={isActive}
                      style={{
                        background: isActive ? 'rgba(0,212,255,0.12)' : '#050A0F',
                        border: 'none',
                        color: isActive ? '#00D4FF' : '#7A99B8',
                        padding: '0.75rem 0.5rem',
                        fontFamily: 'Space Mono', fontSize: '0.58rem',
                        cursor: 'pointer', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>{tab.shortLabel}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-nav  { display: none !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: block !important; }
        }
      `}</style>
    </>
  )
}
