// ─── SECURITY HELPERS ──────────────────────────────────────

export function sanitize(input: string): string {
  return input.replace(/[<>]/g, '')
}

export function safeJSONParse<T>(str: string): T | null {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
