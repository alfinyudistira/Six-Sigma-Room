// src/lib/security.ts

const MAX_STRING_LENGTH = 10_000
const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function normalizeString(input: unknown): string {
  let str = typeof input === 'string' ? input : String(input ?? '')
  if (str.length > MAX_STRING_LENGTH) {
    console.warn('[security] input truncated')
    str = str.slice(0, MAX_STRING_LENGTH)
  }
  return str.trim()
}


export function sanitizeText(input: unknown): string {
  const str = normalizeString(input)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Remove all HTML tags (and comments) from a string.
 */
export function stripTags(input: unknown): string {
  const str = normalizeString(input)
  return str.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '')
}

/**
 * Clamp string length.
 */
export function clampString(input: string, max = 255): string {
  return input.slice(0, max)
}

/**
 * Check if a value is a non‑empty string.
 */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Check if a value is a positive finite number.
 */
export function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0
}

/**
 * Validate email format (simple but effective).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)
}

/**
 * Validate UUID v4 format.
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
}

/**
 * Fast non‑cryptographic hash (simple fingerprint).
 */
export function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // convert to 32-bit integer
  }
  return hash
}

/* --------------------------------------------------------------------------
   NUMBER SAFETY
   -------------------------------------------------------------------------- */

interface SafeNumberOptions {
  min?: number
  max?: number
  fallback?: number
  allowNaN?: boolean
}

/**
 * Safely convert any input to a number with clamping and fallback.
 */
export function safeNumber(
  input: unknown,
  { min = -Infinity, max = Infinity, fallback = 0, allowNaN = false }: SafeNumberOptions = {},
): number {
  const n = typeof input === 'number' ? input : Number(String(input).trim())
  if (!isFinite(n)) {
    return allowNaN && isNaN(n) ? NaN : fallback
  }
  const clamped = Math.min(max, Math.max(min, n))
  return isFinite(clamped) ? clamped : fallback
}

/* --------------------------------------------------------------------------
   JSON SAFETY
   -------------------------------------------------------------------------- */

/**
 * Safely parse JSON with optional validation.
 */
export function safeJSONParse<T>(
  raw: string | null | undefined,
  fallback: T,
  validate?: (data: unknown) => data is T,
): T {
  if (raw == null) return fallback
  try {
    const parsed = JSON.parse(raw) as unknown
    if (validate && !validate(parsed)) {
      console.warn('[security] JSON validation failed')
      return fallback
    }
    return parsed as T
  } catch {
    return fallback
  }
}

/* --------------------------------------------------------------------------
   RATE LIMITER (SLIDING WINDOW)
   -------------------------------------------------------------------------- */
export interface RateLimiterOpts {
  maxCalls: number
  windowMs: number
}

export class RateLimiter {
  private calls: number[] = []
  private readonly maxCalls: number
  private readonly windowMs: number

  constructor(opts: RateLimiterOpts) {
    this.maxCalls = Math.max(1, Math.floor(opts.maxCalls))
    this.windowMs = Math.max(1, opts.windowMs)
  }

  private cleanup(now: number): void {
    this.calls = this.calls.filter((t) => now - t < this.windowMs)
  }

  /** Check if call is allowed, and record it if so. */
  check(): boolean {
    const now = Date.now()
    this.cleanup(now)
    if (this.calls.length >= this.maxCalls) return false
    this.calls.push(now)
    return true
  }

  /** Number of remaining calls in current window. */
  remaining(): number {
    const now = Date.now()
    this.cleanup(now)
    return Math.max(0, this.maxCalls - this.calls.length)
  }

  /** Milliseconds until the oldest recorded call expires (0 if none). */
  resetIn(): number {
    if (!this.calls.length) return 0
    const oldest = Math.min(...this.calls)
    return Math.max(0, this.windowMs - (Date.now() - oldest))
  }

  /** Clear all recorded calls (admin/debug). */
  reset(): void {
    this.calls = []
  }
}

// Shared limiters (tune as needed)
export const aiCallLimiter = new RateLimiter({ maxCalls: 10, windowMs: 60_000 })
export const exportLimiter = new RateLimiter({ maxCalls: 20, windowMs: 60_000 })
export const storageWriteLimiter = new RateLimiter({ maxCalls: 100, windowMs: 10_000 })

/* --------------------------------------------------------------------------
   URL SAFETY
   -------------------------------------------------------------------------- */
const SAFE_PROTOCOLS = ['http:', 'https:']

/**
 * Validate URL protocol and optionally hostname against allowlist.
 */
export function isSafeURL(url: string, allowlist?: string[]): boolean {
  try {
    const parsed = new URL(url, window.location?.href)
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return false
    if (Array.isArray(allowlist) && allowlist.length) {
      return allowlist.some((a) => parsed.hostname === a || parsed.hostname.endsWith(`.${a}`))
    }
    return true
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   CSP META INJECTION / REMOVAL (with nonce support)
   -------------------------------------------------------------------------- */
const CSP_META_ATTR = 'data-ss-csp'

/**
 * Inject a Content-Security-Policy meta tag (idempotent).
 * @param content optional custom CSP string
 * @param nonce optional script nonce (will be added to script-src)
 */
export function injectCSPMeta(content?: string, nonce?: string): void {
  try {
    if (typeof document === 'undefined') return
    if (document.querySelector(`meta[${CSP_META_ATTR}]`)) return

    let finalContent = content ?? DEFAULT_CSP
    if (nonce && !finalContent.includes("'nonce-")) {
      finalContent = finalContent.replace(/'unsafe-inline'/, `'nonce-${nonce}'`)
    }

    const meta = document.createElement('meta')
    meta.setAttribute(CSP_META_ATTR, '1')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = finalContent
    document.head.prepend(meta)
  } catch {
    // no‑op in restricted environments
  }
}

/**
 * Remove the CSP meta tag if present.
 */
export function removeCSPMeta(): void {
  try {
    if (typeof document === 'undefined') return
    document.querySelector(`meta[${CSP_META_ATTR}]`)?.remove()
  } catch {
    /* no‑op */
  }
}

/* --------------------------------------------------------------------------
   CLICKJACKING PROTECTION
   -------------------------------------------------------------------------- */

/**
 * Prevent framing of the page (break out of iframe).
 * @param replaceContent if true, replace document content with a denial message.
 */
export function preventClickjacking(replaceContent = true): void {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (window.top !== window.self) {
      if (replaceContent) {
        document.documentElement.innerHTML = `
          <meta charset="utf-8">
          <style>body{font-family:system-ui,monospace;color:#b00;padding:2rem}</style>
          <p>Access denied: frame embedding not permitted.</p>
        `
      }
      try {
        window.top.location.replace(window.location.href)
      } catch {
        // cross‑origin, ignore
      }
    }
  } catch {
    // no‑op
  }
}

/* --------------------------------------------------------------------------
   SAFE EXECUTION WRAPPER
   -------------------------------------------------------------------------- */

/**
 * Wrap a function in try/catch and return fallback on error.
 */
export function safeExecute<T>(fn: () => T, fallback: T, label = 'safeExecute'): T {
  try {
    return fn()
  } catch (err) {
    console.error(`[security:${label}]`, err)
    return fallback
  }
}

/* --------------------------------------------------------------------------
   GENERATE NONCE (for CSP)
   -------------------------------------------------------------------------- */

/**
 * Generate a cryptographically strong random nonce (for inline scripts).
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint8Array(16)
    crypto.getRandomValues(buffer)
    return Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // fallback for insecure contexts (not recommended)
  return Math.random().toString(36).substring(2, 18)
}
