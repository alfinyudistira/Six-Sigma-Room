// src/store/useAppStore.ts
// ─── Zustand Store — Global App State ────────────────────────────────────────
import { create } from 'zustand'
import { persist as persistMiddleware, createJSONStorage } from 'zustand/middleware'
import { persist as idbPersist, retrieve } from '@/lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CompanyProfile {
  name: string
  dept: string
  industry: string
  country: string
  teamSize: number
  processName: string
  processUnit: string
  baselineMean: number
  baselineStdDev: number
  target: number
  usl: number
  lsl: number
  currency: string
  laborRate: number
  monthlyVolume: number
  customerLTV: number
  slaTarget: number
  isPulseDigital: boolean
}

export const DEMO_COMPANY: CompanyProfile = {
  name: 'Pulse Digital',
  dept: 'Technical Support',
  industry: 'IT / Tech Support',
  country: 'Indonesia',
  teamSize: 27,
  processName: 'Customer Complaint Resolution',
  processUnit: 'hrs',
  baselineMean: 72.1,
  baselineStdDev: 17.4,
  target: 48,
  usl: 96,
  lsl: 0,
  currency: 'USD',
  laborRate: 45,
  monthlyVolume: 295,
  customerLTV: 3200,
  slaTarget: 48,
  isPulseDigital: true,
}

export const INDUSTRY_OPTIONS = [
  'IT / Tech Support', 'Manufacturing', 'Healthcare', 'Financial Services',
  'Retail / E-Commerce', 'Logistics & Supply Chain', 'HR / People Ops',
  'Customer Service', 'Food & Beverage', 'Construction', 'Education', 'Other',
] as const

export const CURRENCY_OPTIONS = ['USD', 'IDR', 'EUR', 'GBP', 'SGD', 'AUD', 'JPY', 'MYR'] as const

export type TabId =
  | 'overview' | 'sigma' | 'dmaic' | 'fmea' | 'copq'
  | 'spc' | 'pareto' | 'rootcause' | 'triage' | 'universal' | 'ops' | 'settings'

export interface AppState {
  company: CompanyProfile
  activeTab: TabId
  showApp: boolean
  showCompanySetup: boolean
  savedFlash: boolean
  theme: 'dark' // Future: 'dark' | 'light'

  // Actions
  setCompany: (c: Partial<CompanyProfile>) => void
  setActiveTab: (tab: TabId) => void
  setShowApp: (v: boolean) => void
  setShowCompanySetup: (v: boolean) => void
  setSavedFlash: (v: boolean) => void
  flashSaved: () => void
  resetToDemo: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persistMiddleware(
    (set, get) => ({
      company: DEMO_COMPANY,
      activeTab: 'overview',
      showApp: false,
      showCompanySetup: false,
      savedFlash: false,
      theme: 'dark',

      setCompany: (partial) => {
        const next = { ...get().company, ...partial, isPulseDigital: false }
        set({ company: next })
        // Also persist to IndexedDB (async, fire-and-forget)
        void idbPersist('company_profile', next)
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowApp: (v) => set({ showApp: v }),
      setShowCompanySetup: (v) => set({ showCompanySetup: v }),
      setSavedFlash: (v) => set({ savedFlash: v }),

      flashSaved: () => {
        set({ savedFlash: true })
        setTimeout(() => set({ savedFlash: false }), 2000)
      },

      resetToDemo: () => set({ company: DEMO_COMPANY }),
    }),
    {
      name: 'sigma-war-room-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        company: state.company,
        activeTab: state.activeTab,
        showApp: state.showApp,
      }),
    },
  ),
)

// ─── Hydrate from IndexedDB on boot ──────────────────────────────────────────
export async function hydrateFromIDB(): Promise<void> {
  try {
    const company = await retrieve<CompanyProfile>('company_profile')
    if (company) useAppStore.setState({ company })
  } catch { /* noop */ }
}
