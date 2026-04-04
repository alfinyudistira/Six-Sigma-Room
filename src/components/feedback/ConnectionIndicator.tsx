// src/components/feedback/ConnectionIndicator.tsx
// Shows realtime connection state in header. Used by Header.tsx.
import { useRealtime } from '@/providers/RealtimeProvider'

const STATE_CONFIG = {
  connected:    { color: '#00FF9C', label: 'LIVE',         pulse: true  },
  connecting:   { color: '#FFD60A', label: 'CONNECTING',   pulse: true  },
  disconnected: { color: '#4A6785', label: 'OFFLINE',      pulse: false },
  error:        { color: '#FF3B5C', label: 'ERROR',        pulse: false },
  degraded:     { color: '#FF8C00', label: 'MOCK',         pulse: true  },
}

export function ConnectionIndicator() {
  const { connectionState, isMockMode } = useRealtime()
  const cfg = STATE_CONFIG[connectionState] ?? STATE_CONFIG.disconnected
  const label = isMockMode ? 'MOCK' : cfg.label

  return (
    <div
      title={isMockMode ? 'Running in offline simulation mode' : `Realtime: ${connectionState}`}
      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'default' }}
      aria-label={`Connection status: ${label}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
          flexShrink: 0,
          animation: cfg.pulse ? 'pulse 2s infinite' : undefined,
        }}
      />
      <span style={{
        color: cfg.color,
        fontFamily: 'Space Mono, monospace',
        fontSize: '0.48rem',
        letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </div>
  )
}
