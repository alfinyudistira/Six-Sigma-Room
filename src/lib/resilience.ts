// src/lib/resilience.ts

import { feedback } from './feedback'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
  shouldRetry?: (error: Error) => boolean
  fallback?: <T>(error: Error) => T | Promise<T>
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    timeoutMs,
    onRetry,
    shouldRetry = () => true,
    fallback,
  } = opts

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let promise: Promise<T> = fn()
      if (timeoutMs) {
        promise = withTimeout(promise, timeoutMs, `Retry attempt ${attempt}`)
      }
      return await promise
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === maxAttempts || !shouldRetry(lastError)) break

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      const jitter = delay * (0.9 + Math.random() * 0.2)
      onRetry?.(attempt, lastError, jitter)
      await new Promise((r) => setTimeout(r, jitter))
    }
  }

  if (fallback) {
    return await fallback(lastError)
  }
  throw lastError
}

/* --------------------------------------------------------------------------
   CIRCUIT BREAKER (with event emitter)
   -------------------------------------------------------------------------- */
export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerEvents {
  'open': { name: string; failures: number }
  'close': { name: string }
  'half-open': { name: string }
  'success': { name: string; latencyMs: number }
  'failure': { name: string; error: Error }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  resetTimeoutMs?: number
  name?: string
  fallback?: <T>(error: Error) => T | Promise<T>
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold: number
  private readonly timeout: number
  public readonly name: string
  private listeners: Map<keyof CircuitBreakerEvents, Set<Function>> = new Map()
  private options?: CircuitBreakerOptions // 🔥 Deklarasi

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 5
    this.timeout = opts.resetTimeoutMs ?? 30000
    this.name = opts.name ?? `circuit-${Date.now()}`
    this.options = opts // 🔥 PERBAIKAN: Pastikan options disimpan!
  }

  on<K extends keyof CircuitBreakerEvents>(
    event: K,
    callback: (payload: CircuitBreakerEvents[K]) => void,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  private emit<K extends keyof CircuitBreakerEvents>(event: K, payload: CircuitBreakerEvents[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => cb(payload))
    }
    if (event === 'open') {
      feedback.notifyWarning(`Circuit breaker "${this.name}" opened after ${(payload as any).failures} failures`)
    } else if (event === 'close') {
      feedback.notifyInfo(`Circuit breaker "${this.name}" closed`)
    }
  }

  async call<T>(fn: () => Promise<T>, fallback?: (error: Error) => T | Promise<T>): Promise<T> {
    const start = performance.now()
    const finalFallback = fallback ?? (this.options?.fallback as any)

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
        this.emit('half-open', { name: this.name })
      } else {
        const err = new Error(`Circuit breaker OPEN: ${this.name}`)
        if (finalFallback) return await finalFallback(err)
        throw err
      }
    }

    try {
      const result = await fn()
      const latency = performance.now() - start
      this.onSuccess()
      this.emit('success', { name: this.name, latencyMs: latency })
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.onFailure()
      this.emit('failure', { name: this.name, error })
      if (finalFallback) return await finalFallback(error)
      throw error
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed'
      this.failures = 0
      this.emit('close', { name: this.name })
    } else if (this.state === 'closed') {
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.state === 'half-open') {
      this.state = 'open'
      this.emit('open', { name: this.name, failures: this.failures })
    } else if (this.state === 'closed' && this.failures >= this.threshold) {
      this.state = 'open'
      this.emit('open', { name: this.name, failures: this.failures })
    }
  }

  getState(): CircuitState { return this.state }
  getFailureCount(): number { return this.failures }
  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
    this.emit('close', { name: this.name })
  }
}

export const aiCircuit = new CircuitBreaker({ name: 'ai-api', failureThreshold: 3, resetTimeoutMs: 60000 })
export const storageCircuit = new CircuitBreaker({ name: 'idb', failureThreshold: 5, resetTimeoutMs: 15000 })
export const realtimeCircuit = new CircuitBreaker({ name: 'realtime', failureThreshold: 5, resetTimeoutMs: 30000 })

/* --------------------------------------------------------------------------
   BULKHEAD (limit concurrent executions)
   -------------------------------------------------------------------------- */
export interface BulkheadOptions {
  maxConcurrent?: number
  maxQueueSize?: number
  timeoutMs?: number
}

export class Bulkhead {
  private active = 0
  private queue: Array<{ resolve: (value: Promise<unknown>) => void; reject: (reason?: unknown) => void; fn: () => Promise<unknown> }> = []
  private readonly maxConcurrent: number
  private readonly maxQueueSize: number
  private readonly timeoutMs: number

  constructor(opts: BulkheadOptions = {}) {
    this.maxConcurrent = opts.maxConcurrent ?? 10
    this.maxQueueSize = opts.maxQueueSize ?? 20
    this.timeoutMs = opts.timeoutMs ?? 5000
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active < this.maxConcurrent) {
      this.active++
      try {
        return await fn()
      } finally {
        this.active--
        this.processQueue()
      }
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Bulkhead queue full (max ${this.maxQueueSize})`)
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex((item) => item.reject === reject)
        if (index !== -1) {
          this.queue.splice(index, 1)
          reject(new Error(`Bulkhead queue timeout after ${this.timeoutMs}ms`))
        }
      }, this.timeoutMs)

      this.queue.push({
        resolve: (val) => { clearTimeout(timeoutId); resolve(val as T) },
        reject: (err) => { clearTimeout(timeoutId); reject(err) },
        fn: fn as () => Promise<unknown>,
      })
    })
  }

  private processQueue(): void {
    if (this.active >= this.maxConcurrent) return
    if (this.queue.length === 0) return

    const next = this.queue.shift()
    if (next) {
      this.active++
      next.fn()
        .then((result) => next.resolve(result))
        .catch((err) => next.reject(err))
        .finally(() => {
          this.active--
          this.processQueue()
        })
    }
  }

  getActiveCount(): number { return this.active }
  getQueueLength(): number { return this.queue.length }
}

/* --------------------------------------------------------------------------
   RATE LIMITER (sliding window)
   -------------------------------------------------------------------------- */
export interface RateLimiterOptions {
  maxRequests: number
  windowMs?: number
}

export class RateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(opts: RateLimiterOptions) {
    this.maxRequests = opts.maxRequests
    this.windowMs = opts.windowMs ?? 60000
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs)

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0]
      const waitTime = this.windowMs - (now - oldest) + 10
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      return this.execute(fn) 
    }

    this.timestamps.push(now)
    return await fn()
  }

  getRemaining(): number {
    const now = Date.now()
    const recent = this.timestamps.filter((ts) => now - ts < this.windowMs)
    return Math.max(0, this.maxRequests - recent.length)
  }
}

/* --------------------------------------------------------------------------
   TIMEOUT WRAPPER & SAFE ASYNC
   -------------------------------------------------------------------------- */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}

export async function safeAsync<T>(fn: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

/* --------------------------------------------------------------------------
   COMBINED PATTERNS
   -------------------------------------------------------------------------- */
export interface ResilientCallOptions {
  retry?: RetryOptions
  circuitBreaker?: CircuitBreaker
  timeoutMs?: number
  bulkhead?: Bulkhead
  rateLimiter?: RateLimiter
}

export async function resilientCall<T>(fn: () => Promise<T>, opts: ResilientCallOptions): Promise<T> {
  let task: () => Promise<T> = fn

  if (opts.timeoutMs) {
    const original = task
    task = () => withTimeout(original(), opts.timeoutMs!, 'Resilient call')
  }
  if (opts.retry) {
    const original = task
    task = () => withRetry(original, opts.retry!)
  }
  if (opts.circuitBreaker) {
    const original = task
    task = () => opts.circuitBreaker!.call(original)
  }
  if (opts.bulkhead) {
    const original = task
    task = () => opts.bulkhead!.execute(original)
  }
  if (opts.rateLimiter) {
    const original = task
    task = () => opts.rateLimiter!.execute(original)
  }

  return await task()
}
