// src/lib/rulesEngine.ts

import { feedback } from './feedback'
import { withTimeout } from './resilience' 

export interface RuleMetadata {
  version: number
  description?: string | undefined
  tags?: string[] | undefined
  author?: string | undefined
  dependsOn?: string[] | undefined
  condition?: ((context: RuleContext) => boolean | Promise<boolean>) | undefined
}

export interface Rule<TInput = any, TOutput = any> {
  key: string
  metadata: RuleMetadata
  compute: (input: TInput, context: RuleContext) => TOutput | Promise<TOutput>
}

export interface RuleContext {
  input: unknown
  previousResult?: unknown
  results: Map<string, unknown>
  config: Record<string, unknown>
  getService: <T>(name: string) => T | undefined
}

export interface ExecutionOptions {
  stopOnError?: boolean
  debug?: boolean
  timeoutMs?: number
}

export interface ExecutionResult<T = any> {
  success: boolean
  data?: T | undefined
  errors: Array<{ ruleKey: string; error: string }>
  results: Map<string, unknown>
  duration: number
}

class RuleRegistry {
  private rules = new Map<string, Rule>()
  private validationSchemas = new Map<string, any>()

  register(rule: Rule): void {
    if (this.rules.has(rule.key)) {
      const existing = this.rules.get(rule.key)!
      if (existing.metadata.version >= rule.metadata.version) {
        throw new Error(`Rule "${rule.key}" version ${rule.metadata.version} is not newer than existing v${existing.metadata.version}`)
      }
      feedback.notifyWarning(`Rule "${rule.key}" upgraded from v${existing.metadata.version} to v${rule.metadata.version}`)
    }
    this.rules.set(rule.key, rule)
    if (import.meta.env.DEV) {
      console.log(`%c[RulesEngine] Registered: ${rule.key} v${rule.metadata.version}`, 'color: #00D4FF')
    }
  }

  get(key: string): Rule | undefined { return this.rules.get(key) }
  has(key: string): boolean { return this.rules.has(key) }
  getAll(): Rule[] { return Array.from(this.rules.values()) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerSchema(key: string, schema: any): void { this.validationSchemas.set(key, schema) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSchema(key: string): any | undefined { return this.validationSchemas.get(key) }
  unregister(key: string): boolean { return this.rules.delete(key) }
  clear(): void { this.rules.clear(); this.validationSchemas.clear() }
}

const registry = new RuleRegistry()

function topologicalSort(rules: Rule[]): Rule[] {
  const graph = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()
  const ruleMap = new Map<string, Rule>()

  for (const rule of rules) {
    ruleMap.set(rule.key, rule)
    inDegree.set(rule.key, 0)
    graph.set(rule.key, new Set())
  }

  for (const rule of rules) {
    for (const dep of rule.metadata.dependsOn || []) {
      if (graph.has(dep)) {
        graph.get(dep)!.add(rule.key)
        inDegree.set(rule.key, (inDegree.get(rule.key) || 0) + 1)
      } else {
        feedback.notifyWarning(`Rule "${rule.key}" depends on unknown rule "${dep}"`)
      }
    }
  }

  const queue: string[] = []
  for (const [key, deg] of inDegree) {
    if (deg === 0) queue.push(key)
  }

  const result: Rule[] = []
  while (queue.length) {
    const key = queue.shift()!
    const rule = ruleMap.get(key)
    if (rule) result.push(rule)
    for (const neighbor of graph.get(key) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  if (result.length !== rules.length) {
    throw new Error('Circular dependency detected in rules')
  }
  return result
}

export async function executeRules<T = any>(
  ruleKeys: string[],
  input: unknown,
  config: Record<string, unknown> = {},
  options: ExecutionOptions = {},
): Promise<ExecutionResult<T>> {
  const startTime = performance.now()
  const { stopOnError = false, debug = false, timeoutMs = 5000 } = options
  const results = new Map<string, unknown>()
  const errors: Array<{ ruleKey: string; error: string }> = []
  let lastResult: unknown = input

  const rulesToRun: Rule[] = []
  for (const key of ruleKeys) {
    const rule = registry.get(key)
    if (rule) {
      rulesToRun.push(rule)
    } else {
      errors.push({ ruleKey: key, error: `Rule "${key}" not found` })
      if (stopOnError) {
        return { success: false, data: undefined, errors, results, duration: performance.now() - startTime }
      }
    }
  }

  let sortedRules: Rule[]
  try {
    sortedRules = topologicalSort(rulesToRun)
  } catch (err) {
    const errorMsg = (err as Error).message
    errors.push({ ruleKey: 'topology', error: errorMsg })
    return { success: false, data: undefined, errors, results, duration: performance.now() - startTime }
  }

  if (debug) console.log('[RulesEngine] Execution order:', sortedRules.map(r => r.key))

  const context: RuleContext = {
    input,
    previousResult: undefined,
    results,
    config,
    getService: () => undefined, // Stub for DI container if needed later
  }

  for (const rule of sortedRules) {
    let shouldRun = true
    if (rule.metadata.condition) {
      try {
        shouldRun = await rule.metadata.condition(context)
      } catch (err) {
        shouldRun = false
        if (debug) console.warn(`[RulesEngine] Condition error for ${rule.key}:`, err)
      }
    }

    if (!shouldRun) {
      if (debug) console.log(`[RulesEngine] Skipped: ${rule.key} (condition false)`)
      continue
    }

    let ruleResult: unknown
    try {
      const computePromise = Promise.resolve(rule.compute(input, context))
      ruleResult = await withTimeout(computePromise, timeoutMs, `Rule "${rule.key}"`)
      
      results.set(rule.key, ruleResult)
      lastResult = ruleResult
      context.previousResult = ruleResult
      
      if (debug) console.log(`%c[RulesEngine] Executed: ${rule.key}`, 'color: #00FF9C', ruleResult)
    } catch (err) {
      const errorMsg = (err as Error).message
      errors.push({ ruleKey: rule.key, error: errorMsg })
      feedback.notifyError(`Rule "${rule.key}" failed: ${errorMsg}`)
      if (stopOnError) {
        return { success: false, data: undefined, errors, results, duration: performance.now() - startTime }
      }
    }
  }

  const duration = performance.now() - startTime
  const success = errors.length === 0
  if (debug) {
    console.log(`%c[RulesEngine] Execution completed in ${duration.toFixed(2)}ms`, success ? 'color: #00FF9C' : 'color: #FF3B5C')
  }

  return { success, data: lastResult as T, errors, results, duration }
}

export const rulesEngine = {
  register: (rule: Rule): void => registry.register(rule),
  get: (key: string): Rule | undefined => registry.get(key),
  has: (key: string): boolean => registry.has(key),
  getAll: (): Rule[] => registry.getAll(),
  execute: executeRules,
  
  executeOne: async <TInput = any, TOutput = any>(
    key: string,
    input: TInput,
    config: Record<string, unknown> = {},
    options?: ExecutionOptions,
  ): Promise<TOutput> => {
    const result = await executeRules<TOutput>([key], input, config, options)
    if (!result.success && result.errors.length) {
      throw new Error(result.errors[0]?.error ?? 'Unknown rule execution error')
    }
    return result.data as TOutput
  },
  
  registerSchema: (key: string, schema: any): void => registry.registerSchema(key, schema),
  unregister: (key: string): boolean => registry.unregister(key),
  clear: (): void => registry.clear(),
}

export function createRule<TInput = any, TOutput = any>(
  key: string,
  compute: (input: TInput, context: RuleContext) => TOutput | Promise<TOutput>,
  metadata: Partial<RuleMetadata> = {},
): Rule<TInput, TOutput> {
  return {
    key,
    metadata: {
      version: metadata.version ?? 1,
      description: metadata.description,
      tags: metadata.tags ?? [],
      author: metadata.author,
      dependsOn: metadata.dependsOn ?? [],
      condition: metadata.condition,
    },
    compute: compute as any,
  }
}

/* --------------------------------------------------------------------------
   DEVELOPMENT TOOLS
   -------------------------------------------------------------------------- */
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__rulesEngine = {
    list: () => rulesEngine.getAll().map(r => ({ key: r.key, version: r.metadata.version, dependsOn: r.metadata.dependsOn })),
    execute: rulesEngine.execute,
    clear: rulesEngine.clear,
  }
}
