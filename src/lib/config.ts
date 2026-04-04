// src/lib/config.ts
// ─── SSOT Configurability Layer ───────────────────────────────────────────────
// Every rule, threshold, color mapping, and limit lives here.
// Modules NEVER hardcode thresholds — they read from getConfig().
// Users can override via ConfigStore. App auto-adapts everywhere.

import { create } from 'zustand'
import { persist as persistMiddleware, createJSONStorage } from 'zustand/middleware'

// ─── Config shape ─────────────────────────────────────────────────────────────
export interface AppConfig {
  // Sigma thresholds
  sigma: {
    worldClass: number   // default 5.0
    excellent:  number   // default 4.0
    acceptable: number   // default 3.0
    poor:       number   // default 2.0
  }
  // Ppk thresholds
  ppk: {
    worldClass: number   // 1.67
    capable:    number   // 1.33
    marginal:   number   // 1.00
  }
  // RPN thresholds (FMEA)
  rpn: {
    critical: number     // 200
    high:     number     // 100
    medium:   number     // 50
  }
  // COPQ as % of revenue — alert thresholds
  copq: {
    criticalPct: number  // 15%
    warnPct:     number  // 5%
  }
  // SPC Western Electric rule toggles
  weco: {
    rule1: boolean  // 1 beyond 3σ
    rule2: boolean  // 9 same side
    rule3: boolean  // 6 consecutive trend
    rule4: boolean  // 14 alternating
  }
  // Pareto settings
  pareto: {
    cutoffPct: number    // 80%
    maxCategories: number // 20
  }
  // UI preferences
  ui: {
    animationsEnabled: boolean
    hapticsEnabled: boolean
    compactMode: boolean
    autoSaveInterval: number   // ms
    chartAnimationDuration: number // ms
  }
  // Locale
  locale: string
  // Feature flags
  features: {
    aiTriage:     boolean
    liveOps:      boolean
    webSockets:   boolean
    exportPDF:    boolean
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  sigma: { worldClass: 5.0, excellent: 4.0, acceptable: 3.0, poor: 2.0 },
  ppk:   { worldClass: 1.67, capable: 1.33, marginal: 1.00 },
  rpn:   { critical: 200, high: 100, medium: 50 },
  copq:  { criticalPct: 15, warnPct: 5 },
  weco:  { rule1: true, rule2: true, rule3: true, rule4: false },
  pareto: { cutoffPct: 80, maxCategories: 20 },
  ui: {
    animationsEnabled: true,
    hapticsEnabled: true,
    compactMode: false,
    autoSaveInterval: 800,
    chartAnimationDuration: 1200,
  },
  locale: 'auto',
  features: {
    aiTriage: true,
    liveOps: true,
    webSockets: true,
    exportPDF: false,
  },
}

// ─── Config store (Zustand, persisted) ───────────────────────────────────────
interface ConfigState {
  config: AppConfig
  setConfig: (partial: DeepPartial<AppConfig>) => void
  resetConfig: () => void
  getConfig: () => AppConfig
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base }
  for (const key in override) {
    const k = key as keyof T
    if (override[k] !== undefined) {
      if (typeof base[k] === 'object' && !Array.isArray(base[k]) && override[k] && typeof override[k] === 'object') {
        result[k] = deepMerge(base[k] as object, override[k] as DeepPartial<object>) as T[keyof T]
      } else {
        result[k] = override[k] as T[keyof T]
      }
    }
  }
  return result
}

export const useConfigStore = create<ConfigState>()(
  persistMiddleware(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      setConfig: (partial) => {
        set((state) => ({ config: deepMerge(state.config, partial) }))
      },

      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      getConfig: () => get().config,
    }),
    {
      name: 'sigma-config-v2',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// ─── Derived helpers — modules use these, never raw numbers ──────────────────
export function getSigmaColor(sigma: number, config: AppConfig): string {
  if (sigma >= config.sigma.worldClass)  return '#00FF9C'
  if (sigma >= config.sigma.excellent)   return '#00D4FF'
  if (sigma >= config.sigma.acceptable)  return '#FFD60A'
  if (sigma >= config.sigma.poor)        return '#FF8C00'
  return '#FF3B5C'
}

export function getPpkStatus(ppk: number, config: AppConfig): { label: string; color: string } {
  if (ppk >= config.ppk.worldClass) return { label: 'WORLD CLASS', color: '#00FF9C' }
  if (ppk >= config.ppk.capable)    return { label: 'CAPABLE',     color: '#00D4FF' }
  if (ppk >= config.ppk.marginal)   return { label: 'MARGINAL',    color: '#FFD60A' }
  return                                   { label: 'INCAPABLE',  color: '#FF3B5C' }
}

export function getRpnSeverity(rpn: number, config: AppConfig): { label: string; color: string } {
  if (rpn >= config.rpn.critical) return { label: 'CRITICAL', color: '#FF3B5C' }
  if (rpn >= config.rpn.high)     return { label: 'HIGH',     color: '#FFD60A' }
  if (rpn >= config.rpn.medium)   return { label: 'MEDIUM',   color: '#FF8C00' }
  return                                  { label: 'LOW',     color: '#00FF9C' }
}

export function getCopqAlert(copqPct: number, config: AppConfig): { level: 'critical' | 'warn' | 'ok'; color: string } {
  if (copqPct >= config.copq.criticalPct) return { level: 'critical', color: '#FF3B5C' }
  if (copqPct >= config.copq.warnPct)    return { level: 'warn',     color: '#FFD60A' }
  return                                          { level: 'ok',      color: '#00FF9C' }
}
