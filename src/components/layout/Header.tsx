// src/components/layout/Header.tsx
/**
 * ============================================================================
 * HEADER — GLOBAL APPLICATION HEADER WITH KPIs AND COMPANY BADGE
 * ============================================================================
 */

import { useCallback, useMemo, memo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'

import { useAppStore } from '@/store/useAppStore'
import { StatusDot, DemoTag, KPIChip } from '@/components/ui/Badge'
// 🔥 PERBAIKAN 1: Gunakan barrel import untuk hooks
import { useCurrency, useHaptic } from '@/hooks'
import { calcPpk, dpmoToSigma } from '@/lib/sigma'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   HEADER COMPONENT
   -------------------------------------------------------------------------- */
export const Header = memo(function Header() {
  const {
    company,
    showApp,
    savedFlash,
    setShowApp,
    setShowCompanySetup,
  } = useAppStore(
    useShallow((state) => ({
      company: state.company,
      showApp: state.showApp,
      savedFlash: state.savedFlash,
      setShowApp: state.setShowApp,
      setShowCompanySetup: state.setShowCompanySetup,
    }))
  )

  // 🔥 PERBAIKAN 2: Sesuaikan dengan hook useCurrency (biasanya mengembalikan 'format')
  const { format } = useCurrency()
  const { light: hapticLight } = useHaptic()

  // ─── DERIVED KPIs (memoized) ─────────────────────────────────────────
  const stats = useMemo(() => {
    const ppkVal = calcPpk(
      company.baselineMean,
      company.baselineStdDev,
      company.usl,
      company.lsl
    )

    // Estimasi Sigma sederhana berdasarkan Ppk (Ppk * 3)
    const sigmaEst = Math.max(0, ppkVal * 3)
    // Konversi balik ke DPMO untuk fungsi dpmoToSigma
    const dpmo = Math.round((1 - 0.9973) * 1_000_000 * (sigmaEst / 3))
    const sigmaVal = dpmoToSigma(dpmo)

    // Estimasi COPQ bulanan
    const copq = company.laborRate * company.monthlyVolume * 0.15 // Misal 15% wastage

    return {
      ppk: ppkVal,
      sigma: sigmaVal,
      monthlyCopq: copq,
    }
  }, [
    company.baselineMean,
    company.baselineStdDev,
    company.usl,
    company.lsl,
    company.laborRate,
    company.monthlyVolume,
  ])

  // ─── HANDLERS ─────────────────────────────────────────────────────────
  const handleCompanyClick = useCallback(() => {
    hapticLight()
    setShowCompanySetup(true)
  }, [hapticLight, setShowCompanySetup])

  const handleExit = useCallback(() => {
    hapticLight()
    setShowApp(false)
  }, [hapticLight, setShowApp])

  if (!showApp) return null

  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5',
        'border-b border-border bg-panel/80 backdrop-blur-md'
      )}
      style={{ borderColor: tokens.border, backgroundColor: `${tokens.panel}CC` }}
    >
      {/* ─── BRAND / LOGO ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <StatusDot active color={tokens.green} pulse />
        <div>
          <div className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.25em] text-cyan" style={{ color: tokens.cyan }}>
            Six Sigma War Room
          </div>
          <div className="font-display text-[1.1rem] font-black leading-none tracking-tighter text-ink" style={{ color: tokens.text }}>
            PULSE <span className="text-cyan" style={{ color: tokens.cyan }}>DIGITAL</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT SECTION ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Save feedback animation */}
        <AnimatePresence>
          {savedFlash && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-full bg-green/10 px-2 py-1 font-mono text-[0.5rem] font-bold text-green"
              style={{ backgroundColor: `${tokens.green}20`, color: tokens.green }}
            >
              <StatusDot color={tokens.green} active={false} pulse={false} size="sm" />
              SYNCED
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company profile badge */}
        <button
          onClick={handleCompanyClick}
          className={cn(
            'flex flex-col items-start rounded-lg border px-3 py-1 transition-all active:scale-95',
            'border-cyan/20 bg-cyan/5 hover:border-cyan/40 hover:bg-cyan/10'
          )}
          style={{ borderColor: `${tokens.cyan}33` }}
        >
          <span className="font-mono text-[0.45rem] font-bold uppercase tracking-widest opacity-50" style={{ color: tokens.textDim }}>
            {company.dept || 'Department'}
          </span>
          <span className="font-display text-[0.8rem] font-bold" style={{ color: tokens.text }}>
            {company.name}
          </span>
        </button>

        {/* KPI chips group */}
        <div className="flex items-center gap-1.5">
          <KPIChip
            label="Ppk"
            value={stats.ppk.toFixed(2)}
            color={stats.ppk >= 1.33 ? 'green' : stats.ppk >= 1.0 ? 'yellow' : 'red'}
          />
          <KPIChip
            label="Sigma"
            value={stats.sigma.toFixed(1)}
            color={stats.sigma >= 4 ? 'green' : stats.sigma >= 3 ? 'cyan' : 'yellow'}
          />
          <KPIChip
            label="COPQ"
            value={format(stats.monthlyCopq)}
            color="red"
          />
        </div>

        {company.isPulseDigital && <DemoTag />}

        {/* Exit to Landing */}
        <button
          onClick={handleExit}
          className={cn(
            'ml-2 rounded-lg border border-border px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-tighter',
            'text-ink-dim transition-all hover:border-red/50 hover:text-red active:bg-red/5'
          )}
          style={{ borderColor: tokens.border }}
        >
          ✕ Exit
        </button>
      </div>
    </header>
  )
})
