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
  emerald: '#00FF9C',     // Menggunakan standar emerald dari tailwind config
  emeraldDim: '#00FF9C33',
  danger: '#FF3B5C',      // Menggunakan standar danger dari tailwind config
  dangerDim: '#FF3B5C33',
  warn: '#FFD60A',        // Menggunakan standar warn dari tailwind config
  warnDim: '#FFD60A33',
  amber: '#FF8C00',
  
  // Text (Ink)
  ink: '#E2EEF9',
  inkMid: '#7A99B8',
  inkDim: '#4A6785',

  // Z-Index (Konvensi)
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
} as const

export type Token = typeof tokens
export type ColorToken = keyof Pick<
  Token,
  | 'bg' | 'panel' | 'surface' | 'border' | 'borderHi'
  | 'cyan' | 'cyanDim' | 'emerald' | 'emeraldDim'
  | 'danger' | 'dangerDim' | 'warn' | 'warnDim' | 'amber'
  | 'ink' | 'inkMid' | 'inkDim'
>

/* --------------------------------------------------------------------------
   HELPER: GET TOKEN VALUE
   -------------------------------------------------------------------------- */
export function getTokenValue<T extends keyof Token>(tokenPath: T): Token[T] {
  return tokens[tokenPath]
}
