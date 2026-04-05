// src/lib/tokens.ts

export const tokens = {
  // Backgrounds
  bg: '#050A0F',
  panel: '#080E14',
  surface: '#0D1520',

  // Borders
  border: '#112233',
  borderHi: '#1A3A5C',

  // Brand / Status Colors
  cyan: '#00D4FF',
  cyanDim: '#00D4FF44',
  
  green: '#00FF9C',  
  greenDim: '#00FF9C33',
  red: '#FF3B5C',  
  redDim: '#FF3B5C44',
  yellow: '#FFD60A',
  yellowDim: '#FFD60A44',
  orange: '#FF9500',  
  
  text: '#E2EEF9',  
  textMid: '#A0B4C8', 
  textDim: '#4A6785', 

  // ─── TYPOGRAPHY ────────────────────────────────────────────────────────────
  font: {
    mono: "'Space Mono', monospace",
    sans: "'DM Sans', sans-serif",
    display: "'Syne', sans-serif",
  },
  
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },

  // ─── SHAPES & SPACING ──────────────────────────────────────────────────────
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
  },

  // ─── ELEVATION ─────────────────────────────────────────────────────────────
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    onboarding: 9990,
    modal: 10000,
    popover: 10060,
    tooltip: 10070,
    toast: 99999,
  },
} as const

export type Token = typeof tokens
export type ColorToken = keyof Pick<
  Token,
  | 'bg' | 'panel' | 'surface' | 'border' | 'borderHi'
  | 'cyan' | 'cyanDim' | 'green' | 'greenDim'
  | 'red' | 'redDim' | 'yellow' | 'yellowDim' | 'orange'
  | 'text' | 'textMid' | 'textDim'
>

/* --------------------------------------------------------------------------
   HELPER: GET TOKEN VALUE
   -------------------------------------------------------------------------- */
export function getTokenValue<T extends keyof Token>(tokenPath: T): Token[T] {
  return tokens[tokenPath]
}
