// src/components/layout/Footer.tsx
/**
 * ============================================================================
 * FOOTER — GLOBAL APPLICATION FOOTER WITH KEYBOARD SHORTCUTS
 * ============================================================================
 */

import { memo, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   CONSTANTS
   -------------------------------------------------------------------------- */
const KEYBOARD_HINTS = [
  ['1–9', 'Switch modules'],
  ['0', 'Universal COPQ'],
  ['−', 'Live Ops'],
  ['=', 'Settings'],
  ['ESC', 'Back / Exit'],
  ['Click badge', 'Edit company'],
] as const

/* --------------------------------------------------------------------------
   FOOTER COMPONENT
   -------------------------------------------------------------------------- */
export const Footer = memo(function Footer() {
  // 🔥 PERBAIKAN 1: Gunakan useShallow agar tidak boros render
  const { companyName, isPulseDigital, processName } = useAppStore(
    useShallow((s) => ({
      companyName: s.company.name,
      isPulseDigital: s.company.isPulseDigital,
      processName: s.company.processName,
    }))
  )

  const year = useMemo(() => new Date().getFullYear(), [])

  const companyLabel = useMemo(() => {
    return isPulseDigital
      ? 'Demo Mode · Pulse Digital'
      : `Company Mode · ${companyName}`
  }, [isPulseDigital, companyName])

  return (
    <footer role="contentinfo" className="shrink-0">
      {/* ─── MAIN FOOTER BAR ────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 px-6 py-2.5',
          'border-t border-border bg-bg/80 backdrop-blur-md'
        )}
        style={{ borderColor: tokens.border, backgroundColor: `${tokens.bg}CC` }}
      >
        {/* Copyright & Support */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[0.6rem] font-medium uppercase tracking-tight" style={{ color: tokens.textDim }}>
          <span>© {year} ALFIN MAULANA YUDISTIRA</span>
          <span className="opacity-30">|</span>
          <span className="text-cyan" style={{ color: tokens.cyan }}>SIX SIGMA BLACK BELT</span>
          <span className="opacity-30">|</span>
          <a
            href="https://trakteer.id/alvin-maulana-yudis-hcknt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold transition-all hover:brightness-125 focus:outline-none focus:underline"
            style={{ color: tokens.red }}
            aria-label="Support developer on Trakteer"
          >
            ☕ TRAKTEER
          </a>
        </div>

        {/* Company & Process Info */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[0.55rem] font-bold uppercase tracking-wider">
          <span style={{ color: tokens.cyan }}>{companyLabel}</span>
          <span className="opacity-30" style={{ color: tokens.textDim }}>·</span>
          <span style={{ color: tokens.textDim }}>{processName || 'Standard Process'}</span>
        </div>
      </div>

      {/* ─── KEYBOARD SHORTCUTS BAR ─────────────────────────────────────── */}
      <div
        role="complementary"
        aria-label="Keyboard shortcuts"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2 border-t"
        style={{ backgroundColor: '#030709', borderColor: tokens.border }}
      >
        {KEYBOARD_HINTS.map(([key, desc]) => (
          <div
            key={key}
            className="flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-tighter"
            style={{ color: tokens.textDim }}
          >
            <kbd
              className="min-w-[20px] rounded border bg-surface px-1.5 py-0.5 text-center text-[0.5rem] font-bold transition-all"
              style={{ 
                borderColor: tokens.border, 
                backgroundColor: tokens.surface,
                color: tokens.textMid 
              }}
            >
              {key}
            </kbd>
            <span className="opacity-70">{desc}</span>
          </div>
        ))}
      </div>
    </footer>
  )
})
