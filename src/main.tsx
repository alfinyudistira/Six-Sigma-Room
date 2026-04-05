import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { store } from '@/store/store';
import { hydrateFromIDB } from '@/store/useAppStore';
import { loadModuleData } from '@/store/moduleSlice';

import { I18nProvider } from '@/providers/I18nProvider';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastRenderer } from '@/components/feedback/ToastRenderer';
import { OnboardingOverlay } from '@/components/onboarding/Onboarding';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import LoadingFallback from '@/components/feedback/LoadingFallback';

import { injectCSPMeta, preventClickjacking } from '@/lib/security';
import { registerSW } from 'virtual:pwa-register'; // Standar Vite PWA

import App from './App';
import './index.css';

preventClickjacking();
injectCSPMeta();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     
      gcTime: 1000 * 60 * 30,    
      retry: 1,                   
      refetchOnWindowFocus: false, 
      refetchOnReconnect: true,      
    },
  },
});

async function bootstrap() {
  // 1. PWA Service Worker Registration
  if (import.meta.env.PROD) {
    registerSW({
      onNeedRefresh() {
        if (confirm('New version available. Update now?')) {
          location.reload();
        }
      },
      onOfflineReady() {
        console.info('Aplikasi siap digunakan secara Offline.');
      },
    });
  }

  // 2. Data Hydration (Paralel: IDB + Initial Redux Load)
  // Menggunakan allSettled agar jika satu gagal (misal: IDB kosong), app tetap jalan.
  await Promise.allSettled([
    hydrateFromIDB(),
    store.dispatch(loadModuleData()),
  ]);

  // 3. Mount Application
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element not found');

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary fallback={<div className="p-8 text-cyan">System error detected. Please restart engine.</div>}>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <I18nProvider>
                <RealtimeProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <App />
                    
                    {/* Feedback & Overlay System */}
                    <ToastRenderer />
                    <OnboardingOverlay />

                    {/* Vercel Monitoring (Hanya jalan jika sudah di-deploy) */}
                    <Analytics />
                    <SpeedInsights />
                  </Suspense>
                </RealtimeProvider>
              </I18nProvider>
            </BrowserRouter>
            
            {/* Devtools hanya muncul saat 'npm run dev' */}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </ReduxProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Global initialization
bootstrap().catch((err) => {
  console.error('Critical boot failure:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="background:#050A0F; color:#FF3B5C; height:100vh; display:flex; align-items:center; justify-content:center; font-family:monospace; text-align:center; padding:20px;">
        <div>
          <h1 style="font-size:3rem">σ FATAL ERROR</h1>
          <p>Kernel panic: Failed to mount application.</p>
          <button onclick="location.reload()" style="background:transparent; border:1px solid #00D4FF; color:#00D4FF; padding:10px 20px; cursor:pointer; margin-top:20px;">REBOOT SYSTEM</button>
        </div>
      </div>
    `;
  }
});
