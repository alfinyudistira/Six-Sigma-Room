// src/store/useAppStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'
import { persist as idbPersist, retrieve } from '@/lib/storage'

/* --------------------------------------------------------------------------
   TYPES & CONSTANTS
   -------------------------------------------------------------------------- */
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
  currency: strin
  laborRate: number
  monthlyVolume: number
  customerLTV: number
  slaTarget: number
  isPulseDigital: boolean
  lastModified: number
  createdAt: number
}

export type TabId =
  | 'overview' | 'sigma' | 'dmaic' | 'fmea' | 'copq'
  | 'spc' | 'pareto' | 'rootcause' | 'triage' | 'universal' | 'ops' | 'settings'

export type Theme = 'dark' | 'light' | 'system'

export interface AppState {
  company: CompanyProfile
  activeTab: TabId
  showApp: boolean
  showCompanySetup: boolean
  savedFlash: boolean
  theme: Theme

  setCompany: (partial: Partial<CompanyProfile>) => void
  resetCompany: () => void
  resetToDemo: () => void
  setActiveTab: (tab: TabId) => void
  setShowApp: (v: boolean) => void
  setShowCompanySetup: (v: boolean) => void
  setUI: (partial: Partial<Pick<AppState, 'showApp' | 'showCompanySetup' | 'savedFlash' | 'theme'>>) => void
  flashSaved: () => void
  reset: () => void
}

const now = Date.now()

export const DEMO_COMPANY: Readonly<CompanyProfile> = Object.freeze({
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
  lastModified: now,
  createdAt: now,
})

export const INDUSTRY_OPTIONS = [
  'IT / Tech Support', 'Manufacturing', 'Healthcare', 'Financial Services',
  'Retail / E-Commerce', 'Logistics & Supply Chain', 'HR / People Ops',
  'Customer Service', 'Food & Beverage', 'Construction', 'Education', 'Other',
] as const

export const CURRENCY_OPTIONS = ['USD', 'IDR', 'EUR', 'GBP', 'SGD', 'AUD', 'JPY', 'MYR'] as const

export const COMPANY_VALIDATORS = {
  name: (value: string): boolean => value.length >= 2 && value.length <= 100,
  teamSize: (value: number): boolean => value > 0 && value <= 100000,
  baselineStdDev: (value: number): boolean => isFinite(value) && value > 0,
  laborRate: (value: number): boolean => value >= 0,
} as const

function safeMergeCompany(base: CompanyProfile, partial: Partial<CompanyProfile>): CompanyProfile {
  return {
    ...base,
    ...partial,
    isPulseDigital: false,
    lastModified: Date.now(),
  }
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        company: DEMO_COMPANY,
        activeTab: 'overview',
        showApp: false,
        showCompanySetup: false,
        savedFlash: false,
        theme: 'dark',

        setCompany: (partial) => {
          const nextCompany = safeMergeCompany(get().company, partial)
          set({ company: nextCompany })

          queueMicrotask(() => {
            void idbPersist('company_profile', nextCompany).catch((err) =>
              console.warn('[useAppStore] Failed to persist company to IndexedDB', err),
            )
          })
        },

        resetCompany: () => {
          set({ company: DEMO_COMPANY })
          queueMicrotask(() => {
            void idbPersist('company_profile', DEMO_COMPANY).catch(() => {})
          })
        },

        resetToDemo: () => {
          set({ company: DEMO_COMPANY })
          queueMicrotask(() => {
            void idbPersist('company_profile', DEMO_COMPANY).catch(() => {})
          })
        },

        setActiveTab: (tab) => set({ activeTab: tab }),
        setShowApp: (v) => set({ showApp: v }),
        setShowCompanySetup: (v) => set({ showCompanySetup: v }),
        setUI: (partial) => set(partial),

        flashSaved: () => {
          set({ savedFlash: true })
          setTimeout(() => set({ savedFlash: false }), 2000)
        },

        reset: () =>
          set({
            company: DEMO_COMPANY,
            activeTab: 'overview',
            showApp: false,
            showCompanySetup: false,
            savedFlash: false,
            theme: 'dark',
          }),
      }),
      {
        name: 'sigma-war-room-v4',
        version: 4, 
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          company: state.company,
          activeTab: state.activeTab,
          theme: state.theme,
          showApp: state.showApp,
        }),
      },
    ),
    { name: 'Sigma App Store', enabled: import.meta.env.DEV },
  ),
)

/* --------------------------------------------------------------------------
   SELECTORS & HOOKS
   -------------------------------------------------------------------------- */
export const appSelectors = {
  company: (state: AppState) => state.company,
  activeTab: (state: AppState) => state.activeTab,
  ui: (state: AppState) => ({
    showApp: state.showApp,
    showCompanySetup: state.showCompanySetup,
    savedFlash: state.savedFlash,
  }),
  theme: (state: AppState) => state.theme,
}

export const useAppCompany = () => useAppStore(appSelectors.company, shallow)
export const useAppActiveTab = () => useAppStore(appSelectors.activeTab)
export const useAppUI = () => useAppStore(appSelectors.ui, shallow)
export const useAppTheme = () => useAppStore(appSelectors.theme)

/* --------------------------------------------------------------------------
   HYDRATION FROM INDEXEDDB
   -------------------------------------------------------------------------- */
export async function hydrateFromIDB(): Promise<void> {
  try {
    const storedCompany = await retrieve<CompanyProfile>('company_profile')
    if (storedCompany) {
      const mergedCompany = {
        ...DEMO_COMPANY,
        ...storedCompany,
        isPulseDigital: false,
      }
      useAppStore.setState({ company: mergedCompany })
      console.log('%c[useAppStore] ✅ Company profile hydrated', 'color: #00FF9C')
    }
  } catch (err) {
    console.warn('[useAppStore] ⚠️ Failed to hydrate company', err)
  }
}
