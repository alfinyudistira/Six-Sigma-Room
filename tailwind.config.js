/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Tambahan jika ada library yang butuh
  ],
  safelist: [
    // Mencegah class dinamis terhapus PurgeCSS
    'border-cyan-dim',
    'bg-emerald-dim',
    'text-danger-dim',
    'hover:glow',
    'hover:glow-red',
    'hover:glow-grn',
    // Warna-warna yang mungkin muncul dari API
    /^bg-(cyan|emerald|danger|warn|amber)-(50|100|200|300|400|500|600|700|800|900)$/,
    /^text-(cyan|emerald|danger|warn|amber)-(50|100|200|300|400|500|600|700|800|900)$/,
  ],
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
        // Tambahan top tier
        'spin-slow':  'spin 3s linear infinite',
        'ping-once':  'ping 1s cubic-bezier(0, 0, 0.2, 1) 1',
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
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      // Tambahan top tier: transitionTimingFunction custom
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth':    'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Container queries (plugin terpisah, tapi bisa ditambah)
    },
  },
  plugins: [
    // Top tier plugins yang sangat berguna (install dulu)
    require('@tailwindcss/forms')({ strategy: 'class' }), // styling form konsisten
    require('@tailwindcss/typography'), // untuk konten rich text
    require('tailwindcss-animate'), // animasi siap pakai (fade, slide, dll)
  ],
        }
