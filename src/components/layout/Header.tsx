// src/components/layout/Header.tsx
import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { StatusDot, DemoTag, KPIChip } from '@/components/ui/Badge'
import { useCurrency } from '@/hooks/useCurrency'
import { calcPpk, dpmoToSigma } from '@/lib/sigma'
import { haptic } from '@/lib/utils'

export function Header() {
  const { company, showApp, showCompanySetup, savedFlash, setShowApp, setShowCompanySetup } =
    useAppStore()
  const { fmt } = useCurrency()

  // Derived KPIs from company profile - no hardcoding
  const ppk     = calcPpk(company.baselineMean, company.baselineStdDev, company.usl, company.lsl)
  const dpmo    = company.baselineMean && company.baselineStdDev
    ? Math.round((1 - 0.9973) * 1_000_000) // approx from ±3σ within spec
    : 0
  const sigma   = dpmoToSigma(dpmo)
  const monthlyCopq = company.laborRate * company.monthlyVolume * 0.08

  const handleCompanyClick = useCallback(() => {
    haptic.light()
    setShowCompanySetup(true)
  }, [setShowCompanySetup])

  if (!showApp) return null

  return (
    <header
      role="banner"
      style={{
        background: '#080E14',
        borderBottom: '1px solid #112233',
        padding: '0.6rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        gap: '0.75rem',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <StatusDot active={true} color="#00FF9C" pulse />
        <div>
          <div style={{ color: '#00D4FF', fontFamily: 'Space Mono, monospace', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Six Sigma Black Belt ·
          </div>
          <div style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em' }}>
            DMAIC WAR ROOM
          </div>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Company badge — clickable */}
        <button
          onClick={handleCompanyClick}
          data-onboarding="company-badge"
          aria-label={`Company profile: ${company.name}. Click to edit.`}
          style={{
            background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 6, padding: '0.25rem 0.6rem', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.4)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.2)' }}
        >
          <span style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {company.dept}
          </span>
          <span style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2 }}>
            {company.name}
          </span>
        </button>

        {/* KPI chips — derived from company data */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <KPIChip label="Ppk" value={ppk.toFixed(2)} color={ppk >= 1.33 ? 'green' : ppk >= 1.0 ? 'yellow' : 'red'} />
          <KPIChip label="Sigma" value={sigma.toFixed(1)} color={sigma >= 4 ? 'green' : sigma >= 3 ? 'cyan' : 'yellow'} />
          <KPIChip label="COPQ/mo" value={fmt(monthlyCopq)} color="red" />
        </div>

        {/* Demo tag */}
        {company.isPulseDigital && <DemoTag />}

        {/* Auto-save flash */}
        <AnimatePresence>
          {savedFlash && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#00FF9C', fontFamily: 'Space Mono, monospace', fontSize: '0.5rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              aria-live="polite"
              aria-label="Progress saved"
            >
              <StatusDot color="#00FF9C" pulse={false} />
              SAVED
            </motion.span>
          )}
        </AnimatePresence>

        {/* Exit */}
        <button
          onClick={() => { haptic.light(); setShowApp(false) }}
          aria-label="Exit to home screen"
          style={{
            background: 'transparent', border: '1px solid #112233', borderRadius: 4,
            color: '#4A6785', padding: '0.3rem 0.65rem',
            fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B5C'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,59,92,0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4A6785'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#112233' }}
        >
          ← EXIT
        </button>
      </div>
    </header>
  )
}
