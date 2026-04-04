import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

/* --------------------------------------------------------------------------
   COLOR PALETTE (Sinkron dengan Tailwind)
   -------------------------------------------------------------------------- */
export const CONFIG_COLORS = {
  worldClass: '#00FF9C', // emerald
  excellent: '#00D4FF',  // cyan
  acceptable: '#FFD60A', // warn
  marginal: '#FF8C00',   // amber
  poor: '#FF3B5C',       // danger
  critical: '#FF3B5C',
  high: '#FFD60A',
  medium: '#FF8C00',
  low: '#00FF9C',
  warn: '#FFD60A',
  ok: '#00FF9C',
} as const

/* --------------------------------------------------------------------------
   TYPES & UTILITIES
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   APP CONFIG SHAPE
   -------------------------------------------------------------------------- */
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
  }
  metadata: { 
    version: number
    lastModified: number
  }
}

/* --------------------------------------------------------------------------
   DEFAULT CONFIG
   -------------------------------------------------------------------------- */
export const DEFAULT_CONFIG: DeepReadonly<AppConfig> = Object.freeze({
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
  },
  metadata: {
    version: 3,
    lastModified: Date.now(),
  },
}) as AppConfig

/* --------------------------------------------------------------------------
   DEEP MERGE
   -------------------------------------------------------------------------- */
function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  if (!override) return base
  const output = { ...base } as T
  for (const key in override) {
    const k = key as keyof T
    const baseValue = base[k]
    const overrideValue = override[k]
    if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === 'object' &&
      overrideValue !== null
    ) {
      output[k] = deepMerge(baseValue as object, overrideValue as DeepPartial<object>) as T[keyof T]
    } else if (overrideValue !== undefined) {
      output[k] = overrideValue as T[keyof T]
    }
  }
  return output
}

/* --------------------------------------------------------------------------
   VALIDATION LAYER (Diperkuat dengan logika matematis B)
   -------------------------------------------------------------------------- */
function validateConfig(config: AppConfig): AppConfig {
  const safeConfig = { ...config }

  // Fallback safety checks
  if (safeConfig.sigma.poor >= safeConfig.sigma.acceptable) {
    safeConfig.sigma.poor = safeConfig.sigma.acceptable - 1
  }
  if (safeConfig.copq.warnPct >= safeConfig.copq.criticalPct) {
    const temp = safeConfig.copq.warnPct
    safeConfig.copq.warnPct = safeConfig.copq.criticalPct
    safeConfig.copq.criticalPct = temp
  }
  if (safeConfig.ui.fontSize <= 0 || safeConfig.ui.fontSize > 2) {
    safeConfig.ui.fontSize = 1.0
  }
  
  safeConfig.metadata.lastModified = Date.now()
  return safeConfig
}

/* --------------------------------------------------------------------------
   MIGRATION HANDLER
   -------------------------------------------------------------------------- */
function migrateConfig(persistedState: unknown, currentVersion: number): AppConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = persistedState as any
  if (!state?.config) return DEFAULT_CONFIG as AppConfig

  let oldConfig = state.config
  const oldVersion = oldConfig.metadata?.version ?? oldConfig.configVersion ?? 0

  if (oldVersion === currentVersion) return oldConfig as AppConfig

  // Migrate ke versi 3 (Format struktur baru gabungan A+B)
  if (oldVersion < 3) {
    oldConfig = {
      ...DEFAULT_CONFIG,
      ...oldConfig,
      ui: { ...DEFAULT_CONFIG.ui, ...oldConfig.ui },
      features: { ...DEFAULT_CONFIG.features, ...oldConfig.features },
      metadata: { version: 3, lastModified: Date.now() }
    }
    // Hapus sisa key lama jika ada
    delete oldConfig.configVersion 
  }

  return oldConfig as AppConfig
}

/* --------------------------------------------------------------------------
   CONFIG STORE
   -------------------------------------------------------------------------- */
interface ConfigState {
  config: AppConfig
  setConfig: (partial: DeepPartial<AppConfig>) => void
  resetConfig: () => void
  getSigma: () => AppConfig['sigma']
  getUI: () => AppConfig['ui']
  getFeatures: () => AppConfig['features']
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        config: DEFAULT_CONFIG as AppConfig,
        setConfig: (partial) =>
          set((state) => ({ config: validateConfig(deepMerge(state.config, partial)) })),
        resetConfig: () => set({ config: DEFAULT_CONFIG as AppConfig }),
        getSigma: () => get().config.sigma,
        getUI: () => get().config.ui,
        getFeatures: () => get().config.features,
      }),
      {
        name: 'sigma-config-v3',
        storage: createJSONStorage(() => localStorage),
        version: 3,
        migrate: migrateConfig,
      },
    ),
    { name: 'Sigma Config Store', enabled: import.meta.env.DEV },
  ),
)

/* --------------------------------------------------------------------------
   CONVENIENCE HOOKS
   -------------------------------------------------------------------------- */
export const useConfig = () => useConfigStore((state) => state.config)
export function useConfigSelector<T>(selector: (config: AppConfig) => T): T {
  return useConfigStore((state) => selector(state.config), shallow)
}
export const useSigmaConfig = () => useConfigStore((state) => state.config.sigma, shallow)
export const useUIConfig = () => useConfigStore((state) => state.config.ui, shallow)
export const useFeatureFlags = () => useConfigStore((state) => state.config.features, shallow)

/* --------------------------------------------------------------------------
   DERIVED HELPERS
   -------------------------------------------------------------------------- */
export function getSigmaColor(sigma: number, config: AppConfig = DEFAULT_CONFIG as AppConfig): string {
  const { worldClass, excellent, acceptable, poor } = config.sigma
  const c = CONFIG_COLORS
  if (sigma >= worldClass) return c.worldClass
  if (sigma >= excellent) return c.excellent
  if (sigma >= acceptable) return c.acceptable
  if (sigma >= poor) return c.marginal
  return c.poor
}

export function getPpkStatus(ppk: number, config: AppConfig = DEFAULT_CONFIG as AppConfig): Status<'WORLD CLASS' | 'CAPABLE' | 'MARGINAL' | 'INCAPABLE'> {
  const { worldClass, capable, marginal } = config.ppk
  const c = CONFIG_COLORS
  if (ppk >= worldClass) return { label: 'WORLD CLASS', color: c.worldClass }
  if (ppk >= capable) return { label: 'CAPABLE', color: c.excellent }
  if (ppk >= marginal) return { label: 'MARGINAL', color: c.acceptable }
  return { label: 'INCAPABLE', color: c.poor }
}

export function getRpnSeverity(rpn: number, config: AppConfig = DEFAULT_CONFIG as AppConfig): Status<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> {
  const { critical, high, medium } = config.rpn
  const c = CONFIG_COLORS
  if (rpn >= critical) return { label: 'CRITICAL', color: c.critical }
  if (rpn >= high) return { label: 'HIGH', color: c.high }
  if (rpn >= medium) return { label: 'MEDIUM', color: c.medium }
  return { label: 'LOW', color: c.low }
}

export function getCopqAlert(copqPct: number, config: AppConfig = DEFAULT_CONFIG as AppConfig): { level: 'critical' | 'warn' | 'ok'; color: string } {
  const { criticalPct, warnPct } = config.copq
  const c = CONFIG_COLORS
  if (copqPct >= criticalPct) return { level: 'critical', color: c.critical }
  if (copqPct >= warnPct) return { level: 'warn', color: c.warn }
  return { level: 'ok', color: c.ok }
}
