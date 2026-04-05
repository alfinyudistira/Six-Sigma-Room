export * from './tokens'  
export * from './utils'    
export * from './storage'   
export * from './i18n'
export * from './config'
export * from './security'
export * from './feedback'
export * from './dataEngine' 

import * as sigmaModule from './sigma'
import * as resilienceModule from './resilience'
export const sigma = sigmaModule

export const resilience = resilienceModule
export type { SigmaResult, SigmaOptions } from './sigma'
export type { ResilientCallOptions, RetryOptions } from './resilience' 

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
