// src/lib/config.ts

import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

export const CONFIG_COLORS = {
  worldClass: '#00FF9C', 
  excellent: '#00D4FF',  
  acceptable: '#FFD60A', 
  marginal: '#FF8C00',   
  poor: '#FF3B5C',       
  critical: '#FF3B5C',
  high: '#FFD60A',
  medium: '#FF8C00',
  low: '#00FF9C',
  warn: '#FFD60A',
  ok: '#00FF9C',
} as const

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

export type Status<T extends string> = {
  label: T
  color: string
}

export interface AppConfig {
  sigma: { worldClass: number; excellent: number; acceptable: number; poor: number }
  ppk: { worldClass: number; capable: number; marginal: number }
  rpn: { critical: number; high: number; medium: number }
  copq: { criticalPct: number; warnPct: number }
  weco: { rule1: boolean; rule2: boolean; rule3: boolean; rule4: boolean }
  pareto: { cutoffPct: number; maxCategories: number }
  ui: {
    animationsEnabled: boolean
    hapticsEnabled: boolean
    compactMode: boolean
    autoSaveInterval: number
    chartAnimationDuration: number
    theme: 'light' | 'dark' | 'system'
    fontSize: number
  }
  locale: string
  features: {
    aiTriage: boolean
    liveOps: boolean
    webSockets: boolean
    exportPDF: boolean
    advancedAnalytics: boolean 
    mobileOptimized: boolean 
     mockRealtime: boolean;
  }
  metadata: { 
    version: number
    lastModified: number
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  sigma: { worldClass: 5.0, excellent: 4.0, acceptable: 3.0, poor: 2.0 },
  ppk: { worldClass: 1.67, capable: 1.33, marginal: 1.0 },
  rpn: { critical: 200, high: 100, medium: 50 },
  copq: { criticalPct: 15, warnPct: 5 },
  weco: { rule1: true, rule2: true, rule3: true, rule4: false },
  pareto: { cutoffPct: 80, maxCategories: 20 },
  ui: {
    animationsEnabled: true,
    hapticsEnabled: true,
    compactMode: false,
    autoSaveInterval: 800,
    chartAnimationDuration: 1200,
    theme: 'system',
    fontSize: 1.0,
  },
  locale: 'auto',
  features: {
    aiTriage: true,
    liveOps: true,
    webSockets: true,
    exportPDF: false,
    advancedAnalytics: false,
    mobileOptimized: true,
     mockRealtime: false,
  },
  metadata: {
    version: 3,
    lastModified: Date.now(),
  },
}

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base } as any

  Object.keys(override).forEach((key) => {
    const k = key as keyof T
    const baseVal = (base as any)[k]
    const overrideVal = (override as any)[k]

    if (
      baseVal && 
      typeof baseVal === 'object' && 
      !Array.isArray(baseVal) && 
      overrideVal && 
      typeof overrideVal === 'object'
    ) {
      result[k] = deepMerge(baseVal, overrideVal)
    } else if (overrideVal !== undefined) {
      result[k] = overrideVal
    }
  })

  return result as T
}

/* --------------------------------------------------------------------------
   VALIDATION LAYER
   -------------------------------------------------------------------------- */
function validateConfig(config: AppConfig): AppConfig {
  const safeConfig = { ...config }
  
  if (safeConfig.sigma.poor >= safeConfig.sigma.acceptable) {
    safeConfig.sigma.poor = safeConfig.sigma.acceptable - 0.5
  }
  
  safeConfig.metadata.lastModified = Date.now()
  return safeConfig
}

/* --------------------------------------------------------------------------
   MIGRATION HANDLER
   -------------------------------------------------------------------------- */
function migrateConfig(persistedState: any, currentVersion: number): any {
  if (!persistedState?.config) return { config: DEFAULT_CONFIG }

  const oldConfig = persistedState.config
  const oldVersion = oldConfig.metadata?.version ?? 0

  if (oldVersion < currentVersion) {
    return {
      config: {
        ...DEFAULT_CONFIG,
        ...oldConfig,
        metadata: { version: currentVersion, lastModified: Date.now() }
      }
    }
  }
  return persistedState
}

/* --------------------------------------------------------------------------
   CONFIG STORE
   -------------------------------------------------------------------------- */
interface ConfigState {
  config: AppConfig
  setConfig: (partial: DeepPartial<AppConfig>) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set) => ({
        config: DEFAULT_CONFIG,
        setConfig: (partial) =>
          set((state) => ({ 
            config: validateConfig(deepMerge(state.config, partial)) 
          })),
        resetConfig: () => set({ config: DEFAULT_CONFIG }),
      }),
      {
        name: 'sigma-config-v3',
        storage: createJSONStorage(() => localStorage),
        version: 3,
        migrate: (persistedState, version) => migrateConfig(persistedState, version),
      },
    ),
    { name: 'Sigma Config Store' },
  ),
)

/* --------------------------------------------------------------------------
   CONVENIENCE HOOKS
   -------------------------------------------------------------------------- */
export const useConfig = () => useConfigStore((state) => state.config)
export const useSigmaConfig = () => useConfigStore((state) => state.config.sigma, shallow)

/* --------------------------------------------------------------------------
   DERIVED HELPERS (Perbaikan Sinkronisasi dengan Dashboard)
   -------------------------------------------------------------------------- */
export function getSigmaColor(sigma: number, config: AppConfig = DEFAULT_CONFIG): Status<string> {
  const { worldClass, excellent, acceptable, poor } = config.sigma
  const c = CONFIG_COLORS
  
  if (sigma >= worldClass) return { label: 'WORLD CLASS', color: c.worldClass }
  if (sigma >= excellent) return { label: 'EXCELLENT', color: c.excellent }
  if (sigma >= acceptable) return { label: 'ACCEPTABLE', color: c.acceptable }
  if (sigma >= poor) return { label: 'POOR', color: c.marginal }
  return { label: 'CRITICAL', color: c.poor }
}

export function getPpkStatus(ppk: number, config: AppConfig = DEFAULT_CONFIG): Status<'WORLD CLASS' | 'CAPABLE' | 'MARGINAL' | 'INCAPABLE'> {
  const { worldClass, capable, marginal } = config.ppk
  const c = CONFIG_COLORS
  if (ppk >= worldClass) return { label: 'WORLD CLASS', color: c.worldClass }
  if (ppk >= capable) return { label: 'CAPABLE', color: c.excellent }
  if (ppk >= marginal) return { label: 'MARGINAL', color: c.acceptable }
  return { label: 'INCAPABLE', color: c.poor }
}

export function getRpnSeverity(rpn: number, config: AppConfig = DEFAULT_CONFIG): Status<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> {
  const { critical, high, medium } = config.rpn
  const c = CONFIG_COLORS
  if (rpn >= critical) return { label: 'CRITICAL', color: c.critical }
  if (rpn >= high) return { label: 'HIGH', color: c.high }
  if (rpn >= medium) return { label: 'MEDIUM', color: c.medium }
  return { label: 'LOW', color: c.low }
}

export function getCopqAlert(copqPct: number, config: AppConfig = DEFAULT_CONFIG): { level: 'critical' | 'warn' | 'ok'; color: string } {
  const { criticalPct, warnPct } = config.copq
  const c = CONFIG_COLORS
  if (copqPct >= criticalPct) return { level: 'critical', color: c.critical }
  if (copqPct >= warnPct) return { level: 'warn', color: c.warn }
  return { level: 'ok', color: c.ok }
}
