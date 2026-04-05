// src/main.tsx

import React, { Suspense } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider as ReduxProvider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { store } from '@/store/store'
import { hydrateFromIDB } from '@/store/useAppStore'
import { loadModuleData } from '@/store/moduleSlice'

import { I18nProvider } from '@/providers/I18nProvider'
import { RealtimeProvider } from '@/providers/RealtimeProvider'
import { ToastRenderer } from '@/components/feedback/ToastRenderer'
import { OnboardingOverlay } from '@/components/onboarding/Onboarding'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import LoadingFallback from '@/components/feedback/LoadingFallback'

import { injectCSPMeta, preventClickjacking } from '@/lib/security'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import './index.css'
const IS_PROD = import.meta.env.PROD
const IS_DEV = import.meta.env.DEV

function initSecurity() {
  try {
    preventClickjacking()
    injectCSPMeta()
  } catch (err) {
    console.warn('[security] initialization failed', err)
  }
}
initSecurity()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,          // 5 minutes
      gcTime: 1000 * 60 * 30,            // 30 minutes
      retry: (failureCount, error: unknown) => {
        if (failureCount >= 2) return false
        if ((error as any)?.status === 404) return false
        return true
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

function AppRoot() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center font-mono text-red p-8">
          <div className="text-center">
            <h1 className="text-5xl mb-4 text-red glow-text-red">σ KERNEL PANIC</h1>
            <p className="text-ink-dim mb-8">System encountered a critical error.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-base neon-cyan px-8 py-3 text-sm tracking-widest"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      }
    >
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <I18nProvider>
              <RealtimeProvider>
                <Suspense fallback={<LoadingFallback />}>
                  <App />
                  <ToastRenderer />
                  <OnboardingOverlay />
                </Suspense>
              </RealtimeProvider>
            </I18nProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ReduxProvider>
    </ErrorBoundary>
  )
}

/* --------------------------------------------------------------------------
   MOUNTING (SSR‑aware)
   -------------------------------------------------------------------------- */
function mountApp(container: HTMLElement) {
  const shouldHydrate = container.hasChildNodes()
  if (shouldHydrate) {
    hydrateRoot(container, <React.StrictMode><AppRoot /></React.StrictMode>)
  } else {
    createRoot(container).render(<React.StrictMode><AppRoot /></React.StrictMode>)
  }
}

/* --------------------------------------------------------------------------
   BOOTSTRAP SEQUENCE
   -------------------------------------------------------------------------- */
async function bootstrap() {
  performance.mark('app_start')
  if (IS_DEV) {
    console.log(
      '%c🚀 SIGMA WAR ROOM v' + (import.meta.env.VITE_APP_VERSION || 'dev') + ' — BOOT SEQUENCE STARTED',
      'color:#00D4FF; font-family:Space Mono; font-size:13px; font-weight:700;'
    )
  }

  // 1. PWA Service Worker (production only)
  if (IS_PROD) {
    try {
      registerSW({
        onNeedRefresh() {
          if (confirm('🚀 Versi baru tersedia. Update sekarang?')) {
            window.location.reload()
          }
        },
        onOfflineReady() {
          console.log('%c📴 Aplikasi siap digunakan offline', 'color:#00FF9C')
        },
      })
    } catch (err) {
      console.warn('[SW] registration failed', err)
    }
  }

  // 2. Parallel data hydration (IndexedDB + Redux)
  if (IS_DEV) console.log('%c📥 Hydrating persistent data...', 'color:#FFD60A')
  await Promise.allSettled([hydrateFromIDB(), store.dispatch(loadModuleData())])

  // 3. Mount React app
  const container = document.getElementById('root')
  if (!container) throw new Error('Root element #root not found')
  mountApp(container)

  performance.mark('app_mounted')
  performance.measure('app_boot_time', 'app_start', 'app_mounted')
  if (IS_DEV && performance.getEntriesByType('measure').length) {
    const measure = performance.getEntriesByType('measure')[0]
    console.log(`%c⚡ Boot time: ${measure.duration.toFixed(2)}ms`, 'color:#00FF9C')
  }

  // 4. Lazy load devtools & analytics (non‑blocking)
  if (IS_DEV) {
    import('@tanstack/react-query-devtools')
      .then(({ ReactQueryDevtools }) => {
        const devtoolsRoot = document.createElement('div')
        devtoolsRoot.id = 'devtools-root'
        document.body.appendChild(devtoolsRoot)
        createRoot(devtoolsRoot).render(<ReactQueryDevtools initialIsOpen={false} />)
      })
      .catch((e) => console.warn('Failed to load devtools', e))
  }

  if (IS_PROD) {
    Promise.all([
      import('@vercel/analytics/react'),
      import('@vercel/speed-insights/react'),
    ])
      .then(([{ Analytics }, { SpeedInsights }]) => {
        const analyticsRoot = document.createElement('div')
        analyticsRoot.id = 'analytics-root'
        analyticsRoot.style.display = 'none'
        document.body.appendChild(analyticsRoot)
        createRoot(analyticsRoot).render(
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )
      })
      .catch((err) => console.warn('Analytics failed to load', err))
  }

  if (IS_DEV) {
    console.log('%c✅ SIGMA WAR ROOM — BOOT SEQUENCE COMPLETE', 'color:#00FF9C; font-weight:700')
  }
}

/* --------------------------------------------------------------------------
   GLOBAL ERROR HANDLERS (last line of defence)
   -------------------------------------------------------------------------- */
window.addEventListener('error', (e) => {
  console.error('%c❌ Global error', 'color:#FF3B5C', e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('%c❌ Unhandled promise rejection', 'color:#FF3B5C', e.reason)
})

/* --------------------------------------------------------------------------
   START ENGINE (with fatal fallback)
   -------------------------------------------------------------------------- */
bootstrap().catch((err) => {
  console.error('%c💥 CRITICAL BOOT FAILURE', 'color:#FF3B5C; font-size:18px; font-weight:800', err)

  const root = document.getElementById('root')
  if (!root) return

  root.innerHTML = `
    <div style="background:#050A0F; color:#FF3B5C; height:100vh; display:flex; align-items:center; justify-content:center; font-family:'Space Mono',monospace; text-align:center; padding:40px;">
      <div>
        <h1 style="font-size:4rem; margin:0; text-shadow:0 0 30px #FF3B5C;">σ FATAL ERROR</h1>
        <p style="margin:20px 0 40px; font-size:1.1rem; opacity:0.9;">Kernel panic: Failed to initialize Sigma War Room.</p>
        <button id="reboot-btn" 
                style="background:transparent; border:2px solid #00D4FF; color:#00D4FF; padding:14px 32px; font-size:1rem; cursor:pointer; transition:all 0.2s;">
          REBOOT SYSTEM
        </button>
      </div>
    </div>
  `
  const btn = document.getElementById('reboot-btn')
  if (btn) btn.addEventListener('click', () => location.reload())
})
