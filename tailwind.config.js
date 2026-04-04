/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       '#050A0F',
        panel:    '#080E14',
        surface:  '#0D1520',
        border:   { DEFAULT: '#112233', hi: '#1A3A5C' },
        cyan:     { DEFAULT: '#00D4FF', dim: '#00D4FF44' },
        emerald:  { DEFAULT: '#00FF9C', dim: '#00FF9C33' },
        danger:   { DEFAULT: '#FF3B5C', dim: '#FF3B5C33' },
        warn:     { DEFAULT: '#FFD60A', dim: '#FFD60A33' },
        amber:    { DEFAULT: '#FF8C00' },
        ink:      { DEFAULT: '#E2EEF9', mid: '#7A99B8', dim: '#4A6785' },
      },
      fontFamily: {
        mono:    ['"Space Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        glow:       '0 0 20px rgba(0,212,255,0.15)',
        'glow-sm':  '0 0 8px rgba(0,212,255,0.25)',
        'glow-red': '0 0 20px rgba(255,59,92,0.2)',
        'glow-grn': '0 0 12px rgba(0,255,156,0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan':       'scan 8s linear infinite',
        'flicker':    'flicker 0.1s infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.97 },
        },
      },
      backdropBlur: { xs: '2px' },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
}
