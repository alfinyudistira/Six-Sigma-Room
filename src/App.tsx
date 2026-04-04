// src/App.tsx
import { lazy, Suspense, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import { useAppStore, type TabId } from '@/store/useAppStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ModuleSkeleton } from '@/components/ui/Skeleton'
import { Header } from '@/components/layout/Header'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'

// ─── Lazy-loaded modules (code splitting) ─────────────────────────────────────
const Hero           = lazy(() => import('@/pages/Hero'))
const Overview       = lazy(() => import('@/pages/Overview'))
const SigmaCalc      = lazy(() => import('@/pages/SigmaCalc'))
const DMAICTracker   = lazy(() => import('@/pages/DMAICTracker'))
const FMEAScorer     = lazy(() => import('@/pages/FMEAScorer'))
const COPQEngine     = lazy(() => import('@/pages/COPQEngine'))
const SPCCharts      = lazy(() => import('@/pages/SPCCharts'))
const ParetoBuilder  = lazy(() => import('@/pages/ParetoBuilder'))
const RootCause      = lazy(() => import('@/pages/RootCause'))
const AITriage       = lazy(() => import('@/pages/AITriage'))
const UniversalCOPQ  = lazy(() => import('@/pages/UniversalCOPQ'))
const LiveOps        = lazy(() => import('@/pages/LiveOps'))
const CompanySetup   = lazy(() => import('@/pages/CompanySetup'))
const Settings       = lazy(() => import('@/pages/Settings'))

// ─── Module registry (no hardcoded switch) ────────────────────────────────────
const MODULE_REGISTRY: Record<TabId, React.LazyExoticComponent<() => JSX.Element>> = {
  overview:  Overview,
  sigma:     SigmaCalc,
  dmaic:     DMAICTracker,
  fmea:      FMEAScorer,
  copq:      COPQEngine,
  spc:       SPCCharts,
  pareto:    ParetoBuilder,
  rootcause: RootCause,
  triage:    AITriage,
  universal: UniversalCOPQ,
  ops:       LiveOps,
  settings:  Settings,
}

// ─── Scanline overlay ─────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      aria-hidden="true"
      className="scanlines"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000 }}
    />
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  const { showApp, activeTab, showCompanySetup, setActiveTab } = useAppStore()
  const [searchParams] = useSearchParams()

  // Register keyboard shortcuts
  useKeyboardNav()

  // Sync tab from URL on first load
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null
    if (tab && tab in MODULE_REGISTRY) setActiveTab(tab)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hero landing page
  if (!showApp) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050A0F' }} />}>
        <Hero />
      </Suspense>
    )
  }

  const ActiveModule = MODULE_REGISTRY[activeTab] ?? Overview

  return (
    <div
      style={{ minHeight: '100vh', background: '#050A0F', display: 'flex', flexDirection: 'column', color: '#E2EEF9' }}
    >
      <Scanlines />
      <Header />
      <NavBar />

      <main
        id={`panel-${activeTab}`}
        role="main"
        aria-label={`${activeTab} module`}
        style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', overflowX: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ErrorBoundary moduleName={activeTab}>
              <Suspense fallback={<ModuleSkeleton />}>
                <ActiveModule />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />

      {/* Company setup modal */}
      {showCompanySetup && (
        <Suspense fallback={null}>
          <CompanySetup />
        </Suspense>
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  )
}
