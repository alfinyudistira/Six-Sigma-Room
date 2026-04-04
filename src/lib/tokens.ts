// src/lib/tokens.ts
// ─── DESIGN TOKENS — Single Source of Truth ──────────────────────────────────
// All raw color/spacing values live here. Components import from here, not hardcode.

export const tokens = {
  // Backgrounds
  bg:       '#050A0F',
  panel:    '#080E14',
  surface:  '#0D1520',

  // Borders
  border:   '#112233',
  borderHi: '#1A3A5C',

  // Brand colors
  cyan:      '#00D4FF',
  cyanDim:   '#00D4FF44',
  green:     '#00FF9C',
  greenDim:  '#00FF9C33',
  red:       '#FF3B5C',
  redDim:    '#FF3B5C33',
  yellow:    '#FFD60A',
  yellowDim: '#FFD60A33',
  orange:    '#FF8C00',

  // Text hierarchy
  text:    '#E2EEF9',
  textMid: '#7A99B8',
  textDim: '#4A6785',

  // Typography
  mono:    '"Space Mono", monospace',
  display: '"Syne", sans-serif',
  body:    '"DM Sans", sans-serif',
} as const

export type Token = typeof tokens
export type ColorToken = keyof Token

// ─── SIGMA → COLOR mapping (derived, never hardcoded per-component) ───────────
export function sigmaToColor(sigma: number): string {
  if (sigma >= 4) return tokens.green
  if (sigma >= 3) return tokens.cyan
  if (sigma >= 2) return tokens.yellow
  return tokens.red
}

export function ppkToStatus(ppk: number): { label: string; color: string } {
  if (ppk >= 1.67) return { label: 'WORLD CLASS', color: tokens.green }
  if (ppk >= 1.33) return { label: 'CAPABLE',     color: tokens.cyan  }
  if (ppk >= 1.0)  return { label: 'MARGINAL',    color: tokens.yellow }
  return                   { label: 'INCAPABLE',  color: tokens.red   }
}

export function riskColor(rpn: number): string {
  if (rpn >= 200) return tokens.red
  if (rpn >= 100) return tokens.yellow
  if (rpn >= 50)  return tokens.cyan
  return tokens.green
}
