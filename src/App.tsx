// src/App.tsx

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
  type ComponentType,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import { useAppStore, type TabId } from '@/store/useAppStore'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { ModuleSkeleton } from '@/components/ui/Skeleton'
import LoadingFallback from '@/components/feedback/LoadingFallback'
import { Header } from '@/components/layout/Header'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { useKeyboardNav } from '@/hooks'
import { tokens } from '@/lib/tokens'

const MODULE_IMPORTS: Record<TabId, () => Promise<any>> = {
  overview: () => import('@/pages/Overview'),
  sigma: () => import('@/pages/SigmaCalc'),
  dmaic: () => import('@/pages/DMAICTracker'),
  fmea: () => import('@/pages/FMEAScorer'),
  copq: () => import('@/pages/COPQEngine'),
  spc: () => import('@/pages/SPCCharts'),
  pareto: () => import('@/pages/ParetoBuilder'),
  rootcause: () => import('@/pages/RootCause'),
  triage: () => import('@/pages/AITriage'),
  universal: () => import('@/pages/UniversalCOPQ'),
  ops: () => import('@/pages/LiveOps'),
  settings: () => import('@/pages/Settings'),
}

const Hero = lazy(() => import('@/pages/Hero'))
const CompanySetup = lazy(() => import('@/pages/CompanySetup'))

const MODULE_REGISTRY: Record<TabId, React.LazyExoticComponent<ComponentType<any>>> = {
  overview: lazy(MODULE_IMPORTS.overview),
  sigma: lazy(MODULE_IMPORTS.sigma),
  dmaic: lazy(MODULE_IMPORTS.dmaic),
  fmea: lazy(MODULE_IMPORTS.fmea),
  copq: lazy(MODULE_IMPORTS.copq),
  spc: lazy(MODULE_IMPORTS.spc),
  pareto: lazy(MODULE_IMPORTS.pareto),
  rootcause: lazy(MODULE_IMPORTS.rootcause),
  triage: lazy(MODULE_IMPORTS.triage),
  universal: lazy(MODULE_IMPORTS.universal),
  ops: lazy(MODULE_IMPORTS.ops),
  settings: lazy(MODULE_IMPORTS.settings),
}

const VALID_TABS = new Set(Object.keys(MODULE_REGISTRY) as TabId[])

const Scanlines = () => (
  <div
    aria-hidden="true"
    className="scanlines pointer-events-none fixed inset-0 z-[9000]"
  />
)

function ModalPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)

    const prevFocus = document.activeElement as HTMLElement
    const timer = setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]') as HTMLElement
      modal?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      clearTimeout(timer)
      prevFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 10, 15, 0.85)', backdropFilter: 'blur(4px)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Company Setup"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  // 🔥 PERBAIKAN 1: Gunakan useShallow agar App.tsx tidak re-render secara membabi-buta!
  const { showApp, activeTab, showCompanySetup, setActiveTab, setShowCompanySetup } = useAppStore(
    useShallow((state) => ({
      showApp: state.showApp,
      activeTab: state.activeTab,
      showCompanySetup: state.showCompanySetup,
      setActiveTab: state.setActiveTab,
      setShowCompanySetup: state.setShowCompanySetup,
    }))
  )

  const [searchParams, setSearchParams] = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const didSyncRef = useRef(false)

  // Keyboard navigation (global)
  useKeyboardNav()

  // Sync URL → store (only once on mount)
  useEffect(() => {
    if (didSyncRef.current) return
    didSyncRef.current = true

    const urlTab = searchParams.get('tab') as TabId | null
    if (urlTab && VALID_TABS.has(urlTab)) {
      startTransition(() => setActiveTab(urlTab))
    }
  }, [searchParams, setActiveTab])

  // Sync store → URL (replace, avoid history clutter)
  const updateUrl = useCallback(() => {
    if (showApp && activeTab !== 'overview') {
      setSearchParams({ tab: activeTab }, { replace: true })
    } else if (showApp && activeTab === 'overview') {
      setSearchParams({}, { replace: true })
    }
  }, [showApp, activeTab, setSearchParams])

  useEffect(() => {
    updateUrl()
  }, [updateUrl])

  // 🔥 PERBAIKAN 2: Prefetch aman menggunakan MODULE_IMPORTS
  useEffect(() => {
    const importer = MODULE_IMPORTS[activeTab]
    if (importer) void importer()
  }, [activeTab])

  // Preload idle: Overview and SigmaCalc after initial render
  useEffect(() => {
    const preload = () => {
      void MODULE_IMPORTS.overview()
      void MODULE_IMPORTS.sigma()
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(preload)
    } else {
      setTimeout(preload, 1000)
    }
  }, [])

  // Handler for NavBar hover (prefetch)
  const handleNavHover = useCallback((tab: TabId) => {
    const importer = MODULE_IMPORTS[tab]
    if (importer) void importer()
  }, [])

  // Memoized active component
  const ActiveModule = useMemo(() => MODULE_REGISTRY[activeTab] ?? MODULE_REGISTRY.overview, [activeTab])

  // ==========================================================================
  // HERO (landing page)
  // ==========================================================================
  if (!showApp) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: tokens.bg }} />}>
        <Hero />
      </Suspense>
    )
  }

  // ==========================================================================
  // MAIN SHELL
  // ==========================================================================
  return (
    <div
      style={{
        minHeight: '100vh', background: tokens.bg, display: 'flex', flexDirection: 'column', color: tokens.text,
      }}
    >
      <Scanlines />

      {/* Accessibility skip link */}
      <a
        href="#main-content"
        className="skip-link focus:top-0 focus:outline-none"
        style={{
          position: 'absolute', top: '-999px', left: 0, background: tokens.cyan, color: tokens.bg,
          padding: '0.5rem 1rem', zIndex: 10001, fontFamily: tokens.font.mono,
        }}
      >
        Skip to main content
      </a>

      <Header />
      <NavBar onItemHover={handleNavHover} />

      <main
        id="main-content"
        tabIndex={-1}
        role="main"
        aria-label={`${activeTab} module`}
        aria-busy={isPending}
        style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ErrorBoundary moduleName={activeTab}>
              <Suspense fallback={<ModuleSkeleton />}>
                <ActiveModule />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>

        {/* Non‑blocking loading indicator during transition */}
        {isPending && (
          <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 10, opacity: 0.6, fontFamily: tokens.font.mono, color: tokens.cyan }}>
            switching…
          </div>
        )}
      </main>

      <Footer />

      {/* Company Setup Modal (portal) */}
      {showCompanySetup && (
        <ModalPortal onClose={() => setShowCompanySetup(false)}>
          <Suspense fallback={<LoadingFallback mini message="Opening setup..." />}>
            <CompanySetup />
          </Suspense>
        </ModalPortal>
      )}
    </div>
  )
}
