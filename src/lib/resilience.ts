// src/lib/resilience.ts
// ─── Fault Tolerance / Resilience Patterns ────────────────────────────────────

// ─── Retry with exponential backoff ───────────────────────────────────────────
interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 300, maxDelayMs = 5000, onRetry } = opts
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === maxAttempts) break
      onRetry?.(attempt, lastError)
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      await new Promise(r => setTimeout(r, delay + Math.random() * 100))
    }
  }

  throw lastError
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────
// Prevents cascading failures by "opening" after N consecutive errors.
type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerOpts {
  failureThreshold?: number  // errors before opening (default 5)
  resetTimeoutMs?:   number  // ms before trying again (default 30_000)
  name?:             string
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime = 0
  private readonly threshold: number
  private readonly timeout: number
  readonly name: string

  constructor(opts: CircuitBreakerOpts = {}) {
    this.threshold = opts.failureThreshold ?? 5
    this.timeout   = opts.resetTimeoutMs ?? 30_000
    this.name      = opts.name ?? 'circuit'
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
      } else {
        if (fallback) return fallback()
        throw new Error(`Circuit breaker OPEN: ${this.name}`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      if (fallback) return fallback()
      throw err
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
      console.warn(`[CircuitBreaker:${this.name}] OPENED after ${this.failures} failures`)
    }
  }

  getState(): CircuitState { return this.state }
  isOpen(): boolean { return this.state === 'open' }
}

// Shared circuit breakers
export const aiCircuit      = new CircuitBreaker({ name: 'ai-api',   failureThreshold: 3, resetTimeoutMs: 60_000 })
export const storageCircuit = new CircuitBreaker({ name: 'idb',      failureThreshold: 5, resetTimeoutMs: 15_000 })
export const realtimeCircuit = new CircuitBreaker({ name: 'realtime', failureThreshold: 5, resetTimeoutMs: 30_000 })

// ─── Timeout wrapper ──────────────────────────────────────────────────────────
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ])
}

// ─── Safe async — never throws, returns { data, error } ──────────────────────
export async function safeAsync<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
