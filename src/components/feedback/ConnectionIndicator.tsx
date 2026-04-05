// src/components/feedback/ConnectionIndicator.tsx

import React, { memo, useMemo, useEffect, useRef } from 'react'
// 🔥 PERBAIKAN 1: Import langsung dari barrel utama hooks
import { useRealtime, useHaptic } from '@/hooks'
import { tokens } from '@/lib/tokens'
type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error' | 'degraded'

interface StateConfig {
  color: string
  label: string
  pulse: boolean
  description: string
}

const STATE_CONFIG: Record<ConnectionState, StateConfig> = {
  connected: {
    color: tokens.green,
    label: 'LIVE',
    pulse: true,
    description: 'Realtime connection active',
  },
  connecting: {
    color: tokens.yellow,
    label: 'CONNECTING',
    pulse: true,
    description: 'Establishing connection...',
  },
  disconnected: {
    color: tokens.textDim,
    label: 'OFFLINE',
    pulse: false,
    description: 'No connection. Using cached data.',
  },
  error: {
    color: tokens.red,
    label: 'ERROR',
    pulse: false,
    description: 'Connection failed. Retrying...',
  },
  degraded: {
    color: tokens.orange,
    label: 'MOCK',
    pulse: true,
    description: 'Offline simulation mode (mock data)',
  },
}

/* --------------------------------------------------------------------------
   COMPONENT
   -------------------------------------------------------------------------- */
export const ConnectionIndicator = memo(function ConnectionIndicator() {
  const { connectionState, isMockMode, latency, reconnectAttempts } = useRealtime()
  const { light: hapticLight } = useHaptic()

  // Determine effective state (mock overrides)
  const effectiveState: ConnectionState = isMockMode ? 'degraded' : (connectionState as ConnectionState)
  const config = STATE_CONFIG[effectiveState] ?? STATE_CONFIG.disconnected
  const displayLabel = isMockMode ? 'MOCK' : config.label

  // Haptic feedback on state change
  const prevStateRef = useRef<ConnectionState | null>(null)
  useEffect(() => {
    if (prevStateRef.current !== null && prevStateRef.current !== effectiveState && effectiveState !== 'connected') {
      hapticLight() // subtle feedback on error/degraded/connecting
    }
    prevStateRef.current = effectiveState
  }, [effectiveState, hapticLight])

  // Build detailed tooltip content
  const tooltipContent = useMemo(() => {
    const lines: string[] = [config.description]
    if (latency !== null) lines.push(`Latency: ${Math.round(latency)}ms`)
    if (reconnectAttempts > 0 && effectiveState !== 'connected') {
      lines.push(`Reconnect attempts: ${reconnectAttempts}`)
    }
    if (isMockMode) lines.push('Data is simulated for demo/offline')
    return lines.join('\n')
  }, [config.description, latency, reconnectAttempts, effectiveState, isMockMode])

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        cursor: 'default',
        fontFamily: tokens.font.mono,
      }}
      title={tooltipContent}
      aria-label={`Connection status: ${displayLabel}. ${tooltipContent}`}
      role="status"
      aria-live="polite"
    >
      {/* Status dot with pulse animation */}
      <span
        aria-hidden="true"
        // 🔥 PERBAIKAN 2: Menggunakan bawaan Tailwind `animate-pulse` agar lebih bersih dari injeksi tag <style>
        className={config.pulse ? 'animate-pulse' : ''}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 6px ${config.color}`,
          flexShrink: 0,
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
        }}
      />
      {/* Status label */}
      <span
        style={{
          color: config.color,
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          transition: 'color 0.2s ease',
        }}
      >
        {displayLabel}
      </span>
    </div>
  )
})
