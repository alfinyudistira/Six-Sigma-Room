// src/lib/security.ts
// ─── Security by Design ───────────────────────────────────────────────────────
// All user input passes through here before being stored or rendered.
// Defense-in-depth: sanitize, validate, encode.

// ─── HTML sanitizer (strips tags, keeps text) ─────────────────────────────────
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return String(input ?? '')
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// ─── Strip all HTML tags ───────────────────────────────────────────────────────
export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

// ─── Validate and clamp numeric input ────────────────────────────────────────
export function safeNumber(
  input: unknown,
  { min = -Infinity, max = Infinity, fallback = 0 } = {},
): number {
  const n = typeof input === 'number' ? input : parseFloat(String(input))
  if (!isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// ─── Safe JSON parse with fallback ────────────────────────────────────────────
export function safeJSONParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ─── Rate limiter (for AI calls, export triggers, etc.) ───────────────────────
interface RateLimiterOpts {
  maxCalls: number
  windowMs: number
}

export class RateLimiter {
  private calls: number[] = []
  constructor(private opts: RateLimiterOpts) {}

  check(): boolean {
    const now = Date.now()
    this.calls = this.calls.filter(t => now - t < this.opts.windowMs)
    if (this.calls.length >= this.opts.maxCalls) return false
    this.calls.push(now)
    return true
  }

  remaining(): number {
    const now = Date.now()
    this.calls = this.calls.filter(t => now - t < this.opts.windowMs)
    return Math.max(0, this.opts.maxCalls - this.calls.length)
  }

  resetIn(): number {
    if (!this.calls.length) return 0
    return this.opts.windowMs - (Date.now() - Math.min(...this.calls))
  }
}

// Shared rate limiters
export const aiCallLimiter     = new RateLimiter({ maxCalls: 10, windowMs: 60_000 })
export const exportLimiter     = new RateLimiter({ maxCalls: 20, windowMs: 60_000 })
export const storageWriteLimiter = new RateLimiter({ maxCalls: 100, windowMs: 10_000 })

// ─── Content Security Policy meta tag helper ─────────────────────────────────
export function injectCSPMeta() {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return

  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join('; ')

  document.head.prepend(meta)
}

// ─── Prevent clickjacking ─────────────────────────────────────────────────────
export function preventClickjacking() {
  if (window.top !== window.self) {
    document.body.innerHTML = '<p style="color:red;font-family:monospace;padding:2rem">Access denied: frame embedding not permitted.</p>'
    window.top?.location.replace(window.location.href)
  }
}

// ─── Safe URL validator ───────────────────────────────────────────────────────
export function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
