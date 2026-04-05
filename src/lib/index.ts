export * from './tokens'      // konstanta token (ringan)
export * from './utils'       // utility fungsi-fungsi kecil
export * from './storage'     // hybrid storage engine
export * from './i18n'        // i18n core (formatter, translate)
export * from './config'      // config store & helpers
export * from './security'    // security utilities (CSP, clickjacking)
export * from './feedback'    // event bus + notification
export * from './dataEngine' 

import * as sigmaModule from './sigma'
import * as resilienceModule from './resilience'
export const sigma = sigmaModule

export const resilience = resilienceModule
export type { SigmaResult, SigmaOptions } from './sigma'
export type { ResilienceOptions, RetryConfig } from './resilience'

export async function loadPluginSystem() {
  const mod = await import(/* webpackChunkName: "pluginSystem" */ './pluginSystem')
  return mod
}

export async function loadRulesEngine() {
  const mod = await import(/* webpackChunkName: "rulesEngine" */ './rulesEngine')
  return mod
}

if (import.meta.env.DEV) {
  console.log(
    '%c[lib] 📦 Barrel exports ready — direct: storage, i18n, config, security, feedback, dataEngine | namespace: sigma, resilience | lazy: pluginSystem, realtime, rulesEngine',
    'color: #00D4FF'
  )
}
