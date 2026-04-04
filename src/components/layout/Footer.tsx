// src/components/layout/Footer.tsx
import { useAppStore } from '@/store/useAppStore'

const KEYBOARD_HINTS = [
  ['1–9', 'Switch modules'],
  ['0',   'Universal COPQ'],
  ['−',   'Live Ops'],
  ['=',   'Settings'],
  ['ESC', 'Back / Exit'],
  ['Click badge', 'Edit company'],
] as const

export function Footer() {
  const { company } = useAppStore()
  const year = new Date().getFullYear()

  return (
    <footer role="contentinfo" style={{ flexShrink: 0 }}>
      {/* Main footer */}
      <div style={{
        borderTop: '1px solid #112233',
        padding: '0.5rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <span style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.55rem' }}>
          © {year} Alfin Maulana Yudistira · Six Sigma Black Belt ·{' '}
          <a
            href="https://trakteer.id/alvin-maulana-yudis-hcknt"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FF3B5C', textDecoration: 'none' }}
            aria-label="Support on Trakteer"
          >
            ☕ Trakteer
          </a>
        </span>
        <span style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.52rem' }}>
          {company.isPulseDigital ? 'Demo Mode · Pulse Digital' : `Company Mode · ${company.name}`}
          {' · '}{company.processName || 'Process Efficiency'}
        </span>
      </div>

      {/* Keyboard hints bar */}
      <div
        role="complementary"
        aria-label="Keyboard shortcuts"
        style={{
          background: '#030709',
          borderTop: '1px solid #112233',
          padding: '0.3rem 1.5rem',
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        {KEYBOARD_HINTS.map(([key, desc]) => (
          <span key={key} style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.52rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <kbd style={{
              background: '#0D1520', border: '1px solid #112233',
              borderRadius: 2, padding: '0.05rem 0.3rem',
              color: '#7A99B8', fontSize: '0.48rem',
            }}>
              {key}
            </kbd>
            {desc}
          </span>
        ))}
      </div>
    </footer>
  )
}
