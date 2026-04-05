import { feedback } from './feedback'

export interface PluginContext {
  /** Dependency injection container */
  getService: <T>(name: string) => T | undefined
  /** Register service yang bisa dipakai plugin lain */
  registerService: <T>(name: string, service: T) => void
  /** Feedback engine untuk notifikasi */
  notify: typeof feedback.notify
  /** Plugin metadata */
  pluginName: string
}

export interface PluginLifecycle {
  /** Called when plugin is registered (before dependency resolution) */
  onRegister?: (ctx: PluginContext) => void | Promise<void>
  /** Called after all plugins are registered (before start) */
  onInit?: (ctx: PluginContext) => void | Promise<void>
  /** Called when app starts (after all onInit) */
  onStart?: (ctx: PluginContext) => void | Promise<void>
  /** Called when plugin is stopped (e.g., user logout) */
  onStop?: (ctx: PluginContext) => void | Promise<void>
  /** Called when app destroys (cleanup) */
  onDestroy?: (ctx: PluginContext) => void | Promise<void>
}

export interface PluginMetadata {
  name: string
  version: string
  author?: string
  description?: string
  /** Plugin dependencies (nama plugin lain yang harus di-load duluan) */
  dependencies?: string[]
}

export interface PluginDefinition {
  metadata: PluginMetadata
  lifecycle: PluginLifecycle
}

class ServiceContainer {
  private services = new Map<string, unknown>()

  register<T>(name: string, service: T): void {
    if (this.services.has(name)) {
      if (import.meta.env.DEV) {
        console.warn(`[pluginSystem] Service "${name}" already registered, overwriting`)
      }
    }
    this.services.set(name, service)
  }

  get<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined
  }

  has(name: string): boolean {
    return this.services.has(name)
  }
}

/* --------------------------------------------------------------------------
   PLUGIN REGISTRY
   -------------------------------------------------------------------------- */
interface RegisteredPlugin {
  definition: PluginDefinition
  status: 'registered' | 'initialized' | 'started' | 'stopped' | 'destroyed' | 'error'
  error?: Error
  context: PluginContext
}

class PluginRegistry {
  private plugins = new Map<string, RegisteredPlugin>()
  private serviceContainer = new ServiceContainer()
  private isInitialized = false
  private isStarted = false

  constructor() {
    // Register core services
    this.serviceContainer.register('notify', feedback.notify)
  }

  register(plugin: PluginDefinition): void {
    const name = plugin.metadata.name
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" already registered`)
    }

    // Create plugin context with isolated getService/registerService
    const context: PluginContext = {
      getService: <T>(serviceName: string) => this.serviceContainer.get<T>(serviceName),
      registerService: <T>(serviceName: string, service: T) => {
        this.serviceContainer.register(serviceName, service)
      },
      notify: feedback.notify,
      pluginName: name,
    }

    this.plugins.set(name, {
      definition: plugin,
      status: 'registered',
      context,
    })

    if (import.meta.env.DEV) {
      console.log(`%c[pluginSystem] Registered: ${name} v${plugin.metadata.version}`, 'color: #00D4FF')
    }
  }

  /**
   * Topological sort berdasarkan dependencies
   */
  private resolveOrder(): string[] {
    const names = Array.from(this.plugins.keys())
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const order: string[] = []

    const visit = (name: string) => {
      if (visited.has(name)) return
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`)
      }
      visiting.add(name)

      const plugin = this.plugins.get(name)
      const deps = plugin?.definition.metadata.dependencies ?? []
      for (const dep of deps) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${name}" depends on unknown plugin "${dep}"`)
        }
        visit(dep)
      }

      visiting.delete(name)
      visited.add(name)
      order.push(name)
    }

    for (const name of names) {
      if (!visited.has(name)) visit(name)
    }
    return order
  }

  /**
   * Initialize all plugins in dependency order
   */
  async init(): Promise<void> {
    if (this.isInitialized) return

    const order = this.resolveOrder()
    for (const name of order) {
      const registered = this.plugins.get(name)!
      if (registered.status !== 'registered') continue

      try {
        if (registered.definition.lifecycle.onInit) {
          await registered.definition.lifecycle.onInit(registered.context)
        }
        registered.status = 'initialized'
        if (import.meta.env.DEV) {
          console.log(`%c[pluginSystem] Initialized: ${name}`, 'color: #00FF9C')
        }
      } catch (err) {
        registered.status = 'error'
        registered.error = err as Error
        feedback.notifyError(`Plugin "${name}" failed to initialize: ${(err as Error).message}`)
        console.error(`[pluginSystem] Plugin "${name}" init error:`, err)
      }
    }
    this.isInitialized = true
  }

  /**
   * Start all initialized plugins
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init()
    }
    if (this.isStarted) return

    const order = this.resolveOrder()
    for (const name of order) {
      const registered = this.plugins.get(name)!
      if (registered.status !== 'initialized') continue

      try {
        if (registered.definition.lifecycle.onStart) {
          await registered.definition.lifecycle.onStart(registered.context)
        }
        registered.status = 'started'
        if (import.meta.env.DEV) {
          console.log(`%c[pluginSystem] Started: ${name}`, 'color: #00FF9C')
        }
      } catch (err) {
        registered.status = 'error'
        registered.error = err as Error
        feedback.notifyError(`Plugin "${name}" failed to start: ${(err as Error).message}`)
      }
    }
    this.isStarted = true
  }

  /**
   * Stop all plugins (reverse order)
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return

    const order = this.resolveOrder().reverse()
    for (const name of order) {
      const registered = this.plugins.get(name)!
      if (registered.status !== 'started') continue

      try {
        if (registered.definition.lifecycle.onStop) {
          await registered.definition.lifecycle.onStop(registered.context)
        }
        registered.status = 'stopped'
      } catch (err) {
        console.error(`[pluginSystem] Plugin "${name}" stop error:`, err)
      }
    }
    this.isStarted = false
  }

  /**
   * Destroy all plugins (cleanup)
   */
  async destroy(): Promise<void> {
    await this.stop()
    const order = this.resolveOrder().reverse()
    for (const name of order) {
      const registered = this.plugins.get(name)!
      try {
        if (registered.definition.lifecycle.onDestroy) {
          await registered.definition.lifecycle.onDestroy(registered.context)
        }
        registered.status = 'destroyed'
      } catch (err) {
        console.error(`[pluginSystem] Plugin "${name}" destroy error:`, err)
      }
    }
    this.plugins.clear()
    this.isInitialized = false
    this.isStarted = false
  }

  /**
   * Get plugin status (for debugging)
   */
  getStatus(name: string): RegisteredPlugin['status'] | undefined {
    return this.plugins.get(name)?.status
  }

  /**
   * Get all plugin statuses
   */
  getAllStatuses(): Record<string, { status: string; error?: string }> {
    const result: Record<string, { status: string; error?: string }> = {}
    for (const [name, reg] of this.plugins) {
      result[name] = { status: reg.status, error: reg.error?.message }
    }
    return result
  }
}

/* --------------------------------------------------------------------------
   SINGLETON INSTANCE
   -------------------------------------------------------------------------- */
const registry = new PluginRegistry()

/* --------------------------------------------------------------------------
   PUBLIC API
   -------------------------------------------------------------------------- */

/**
 * Register a plugin
 */
export function registerPlugin(plugin: PluginDefinition): void {
  registry.register(plugin)
}

/**
 * Initialize all plugins (call once after all registrations)
 */
export async function initPlugins(): Promise<void> {
  await registry.init()
}

/**
 * Start all plugins (after init)
 */
export async function startPlugins(): Promise<void> {
  await registry.start()
}

/**
 * Stop all plugins (e.g., on logout)
 */
export async function stopPlugins(): Promise<void> {
  await registry.stop()
}

/**
 * Destroy all plugins (cleanup)
 */
export async function destroyPlugins(): Promise<void> {
  await registry.destroy()
}

/**
 * Get status of a specific plugin
 */
export function getPluginStatus(name: string): string | undefined {
  return registry.getStatus(name)
}

/**
 * Get all plugin statuses (for devtools)
 */
export function getAllPluginStatuses(): Record<string, { status: string; error?: string }> {
  return registry.getAllStatuses()
}

/* --------------------------------------------------------------------------
   HELPER: Create plugin definition with metadata
   -------------------------------------------------------------------------- */
export function createPlugin(
  metadata: PluginMetadata,
  lifecycle: PluginLifecycle,
): PluginDefinition {
  return { metadata, lifecycle }
}

/* --------------------------------------------------------------------------
   DEVELOPMENT TOOLS (optional)
   -------------------------------------------------------------------------- */
if (import.meta.env.DEV) {
  // Expose for debugging via window
  ;(window as any).__pluginSystem = {
    getStatus: getAllPluginStatuses,
    registry,
  }
}
