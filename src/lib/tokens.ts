// src/lib/tokens.ts

export function injectDesignTokens(): void {
  if (typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = `
    :root {
      /* ===== Colors (Light mode defaults, dark mode overrides) ===== */
      --color-bg: #050A0F;
      --color-panel: #080E14;
      --color-surface: #0D1520;
      --color-border: #112233;
      --color-border-hi: #1A3A5C;
      --color-cyan: #00D4FF;
      --color-cyan-dim: #00D4FF44;
      --color-green: #00FF9C;
      --color-green-dim: #00FF9C33;
      --color-red: #FF3B5C;
      --color-red-dim: #FF3B5C33;
      --color-yellow: #FFD60A;
      --color-yellow-dim: #FFD60A33;
      --color-orange: #FF8C00;
      --color-text: #E2EEF9;
      --color-text-mid: #7A99B8;
      --color-text-dim: #4A6785;

      /* ===== Typography ===== */
      --font-mono: 'Space Mono', monospace;
      --font-display: 'Syne', sans-serif;
      --font-body: 'DM Sans', sans-serif;
      --font-size-xs: 0.75rem;    /* 12px */
      --font-size-sm: 0.875rem;   /* 14px */
      --font-size-base: 1rem;     /* 16px */
      --font-size-lg: 1.125rem;   /* 18px */
      --font-size-xl: 1.25rem;    /* 20px */
      --font-size-2xl: 1.5rem;    /* 24px */
      --font-size-3xl: 1.875rem;  /* 30px */
      --font-size-4xl: 2.25rem;   /* 36px */
      --font-weight-normal: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --font-weight-bold: 700;
      --font-weight-extrabold: 800;
      --line-height-tight: 1.25;
      --line-height-normal: 1.5;
      --line-height-relaxed: 1.75;

      /* ===== Spacing (4px base) ===== */
      --spacing-0: 0;
      --spacing-1: 0.25rem;   /* 4px */
      --spacing-2: 0.5rem;    /* 8px */
      --spacing-3: 0.75rem;   /* 12px */
      --spacing-4: 1rem;      /* 16px */
      --spacing-5: 1.25rem;   /* 20px */
      --spacing-6: 1.5rem;    /* 24px */
      --spacing-8: 2rem;      /* 32px */
      --spacing-10: 2.5rem;   /* 40px */
      --spacing-12: 3rem;     /* 48px */
      --spacing-16: 4rem;     /* 64px */
      --spacing-20: 5rem;     /* 80px */
      --spacing-24: 6rem;     /* 96px */

      /* ===== Breakpoints ===== */
      --breakpoint-xs: 480px;
      --breakpoint-sm: 640px;
      --breakpoint-md: 768px;
      --breakpoint-lg: 1024px;
      --breakpoint-xl: 1280px;
      --breakpoint-2xl: 1536px;

      /* ===== Shadows ===== */
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      --shadow-glow: 0 0 20px rgba(0, 212, 255, 0.15);
      --shadow-glow-sm: 0 0 8px rgba(0, 212, 255, 0.25);
      --shadow-glow-red: 0 0 20px rgba(255, 59, 92, 0.2);
      --shadow-glow-green: 0 0 12px rgba(0, 255, 156, 0.2);

      /* ===== Borders ===== */
      --border-radius-sm: 0.25rem;   /* 4px */
      --border-radius-md: 0.5rem;    /* 8px */
      --border-radius-lg: 0.75rem;   /* 12px */
      --border-radius-xl: 1rem;      /* 16px */
      --border-radius-full: 9999px;

      /* ===== Transitions ===== */
      --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
      --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

      /* ===== Z-index layers ===== */
      --z-dropdown: 1000;
      --z-sticky: 1020;
      --z-modal: 1050;
      --z-popover: 1060;
      --z-tooltip: 1070;
      --z-toast: 1080;
    }

    /* Dark mode (default) is already set; light mode override if needed */
    @media (prefers-color-scheme: light) {
      :root {
        /* Light mode overrides (example) */
        --color-bg: #F8FAFC;
        --color-panel: #FFFFFF;
        --color-surface: #F1F5F9;
        --color-border: #E2E8F0;
        --color-border-hi: #CBD5E1;
        --color-text: #0F172A;
        --color-text-mid: #475569;
        --color-text-dim: #64748B;
      }
    }
  `
  document.head.appendChild(style)
}

/* --------------------------------------------------------------------------
   STATIC TOKENS (untuk import langsung di JS/TS)
   -------------------------------------------------------------------------- */
export const tokens = {
  // Backgrounds
  bg: 'var(--color-bg)',
  panel: 'var(--color-panel)',
  surface: 'var(--color-surface)',
  // Borders
  border: 'var(--color-border)',
  borderHi: 'var(--color-border-hi)',
  // Brand colors
  cyan: 'var(--color-cyan)',
  cyanDim: 'var(--color-cyan-dim)',
  green: 'var(--color-green)',
  greenDim: 'var(--color-green-dim)',
  red: 'var(--color-red)',
  redDim: 'var(--color-red-dim)',
  yellow: 'var(--color-yellow)',
  yellowDim: 'var(--color-yellow-dim)',
  orange: 'var(--color-orange)',
  // Text
  text: 'var(--color-text)',
  textMid: 'var(--color-text-mid)',
  textDim: 'var(--color-text-dim)',
  // Typography
  font: {
    mono: 'var(--font-mono)',
    display: 'var(--font-display)',
    body: 'var(--font-body)',
  },
  fontSize: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
    '4xl': 'var(--font-size-4xl)',
  },
  spacing: {
    0: 'var(--spacing-0)',
    1: 'var(--spacing-1)',
    2: 'var(--spacing-2)',
    3: 'var(--spacing-3)',
    4: 'var(--spacing-4)',
    5: 'var(--spacing-5)',
    6: 'var(--spacing-6)',
    8: 'var(--spacing-8)',
    10: 'var(--spacing-10)',
    12: 'var(--spacing-12)',
    16: 'var(--spacing-16)',
    20: 'var(--spacing-20)',
    24: 'var(--spacing-24)',
  },
  breakpoints: {
    xs: 'var(--breakpoint-xs)',
    sm: 'var(--breakpoint-sm)',
    md: 'var(--breakpoint-md)',
    lg: 'var(--breakpoint-lg)',
    xl: 'var(--breakpoint-xl)',
    '2xl': 'var(--breakpoint-2xl)',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    glow: 'var(--shadow-glow)',
    glowSm: 'var(--shadow-glow-sm)',
    glowRed: 'var(--shadow-glow-red)',
    glowGreen: 'var(--shadow-glow-green)',
  },
  borderRadius: {
    sm: 'var(--border-radius-sm)',
    md: 'var(--border-radius-md)',
    lg: 'var(--border-radius-lg)',
    xl: 'var(--border-radius-xl)',
    full: 'var(--border-radius-full)',
  },
  transition: {
    fast: 'var(--transition-fast)',
    base: 'var(--transition-base)',
    slow: 'var(--transition-slow)',
  },
  zIndex: {
    dropdown: 'var(--z-dropdown)',
    sticky: 'var(--z-sticky)',
    modal: 'var(--z-modal)',
    popover: 'var(--z-popover)',
    tooltip: 'var(--z-tooltip)',
    toast: 'var(--z-toast)',
  },
} as const

export type Token = typeof tokens
export type ColorToken = keyof Pick<
  Token,
  'bg' | 'panel' | 'surface' | 'border' | 'borderHi' | 'cyan' | 'cyanDim' | 'green' | 'greenDim' | 'red' | 'redDim' | 'yellow' | 'yellowDim' | 'orange' | 'text' | 'textMid' | 'textDim'
>

/* --------------------------------------------------------------------------
   UTILITY FUNCTIONS (mapping nilai ke warna)
   -------------------------------------------------------------------------- */

/**
 * Get color based on Sigma level.
 * @param sigma - Sigma value (0 … 6)
 * @returns CSS color variable
 */
export function sigmaToColor(sigma: number): string {
  if (sigma >= 5) return tokens.green
  if (sigma >= 4) return tokens.cyan
  if (sigma >= 3) return tokens.yellow
  if (sigma >= 2) return tokens.orange
  return tokens.red
}

/**
 * Get Ppk status label and color.
 * @param ppk - Ppk value
 * @returns Object with label and color
 */
export function ppkToStatus(ppk: number): { label: string; color: string } {
  if (ppk >= 1.67) return { label: 'WORLD CLASS', color: tokens.green }
  if (ppk >= 1.33) return { label: 'CAPABLE', color: tokens.cyan }
  if (ppk >= 1.0) return { label: 'MARGINAL', color: tokens.yellow }
  return { label: 'INCAPABLE', color: tokens.red }
}

/**
 * Get risk color based on RPN value.
 * @param rpn - Risk Priority Number
 * @returns CSS color variable
 */
export function riskColor(rpn: number): string {
  if (rpn >= 200) return tokens.red
  if (rpn >= 100) return tokens.yellow
  if (rpn >= 50) return tokens.orange
  return tokens.green
}

/**
 * Get status color for COPQ alert.
 * @param copqPct - COPQ percentage of revenue
 * @param criticalPct - Threshold for critical (default 15)
 * @param warnPct - Threshold for warning (default 5)
 * @returns CSS color variable
 */
export function copqColor(copqPct: number, criticalPct = 15, warnPct = 5): string {
  if (copqPct >= criticalPct) return tokens.red
  if (copqPct >= warnPct) return tokens.yellow
  return tokens.green
}

/* --------------------------------------------------------------------------
   HELPER: GET TOKEN VALUE (untuk runtime)
   -------------------------------------------------------------------------- */
export function getTokenValue<T extends keyof Token>(tokenPath: T): Token[T] {
  return tokens[tokenPath]
}
