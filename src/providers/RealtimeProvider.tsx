// src/providers/RealtimeProvider.tsx
// ─── Realtime React Provider — SSE/WS state available anywhere in the tree ────
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { realtimeService, eventBus, type ConnectionState, type RealtimeEvent, type RealtimeEventType } from '@/services/realtime'
import { useConfigStore } from '@/lib/config'

interface RealtimeContextValue {
  connectionState: ConnectionState
  isMockMode: boolean
  lastPing: number | null
  reconnectAttempts: number
  /** Subscribe to a specific event type. Returns unsubscribe fn. */
  subscribe: (type: RealtimeEventType | '*', handler: (e: RealtimeEvent) => void) => () => void
  /** Send an event (WS only, no-op in mock/SSE mode) */
  send: (type: RealtimeEventType, payload: Record<string, unknown>) => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { config } = useConfigStore()
  const [connState, setConnState] = useState<{
    state: ConnectionState; mockMode: boolean; lastPing: number | null; reconnectAttempts: number
  }>({ state: 'disconnected', mockMode: false, lastPing: null, reconnectAttempts: 0 })

  useEffect(() => {
    if (!config.features.webSockets && !config.features.liveOps) return

    // Subscribe to state changes
    const unsub = realtimeService.onStateChange(s => setConnState(s))

    // Start in mock mode (no backend in this client-only app).
    // In production: replace with realtimeService.connectSSE('/api/events')
    realtimeService.startMockMode()

    return () => {
      unsub()
      realtimeService.disconnect()
    }
  }, [config.features.webSockets, config.features.liveOps])

  const subscribe = useCallback(
    (type: RealtimeEventType | '*', handler: (e: RealtimeEvent) => void) =>
      eventBus.on(type, handler),
    [],
  )

  const send = useCallback(
    (type: RealtimeEventType, payload: Record<string, unknown>) =>
      realtimeService.send(type, payload),
    [],
  )

  return (
    <RealtimeContext.Provider value={{
      connectionState: connState.state,
      isMockMode: connState.mockMode,
      lastPing: connState.lastPing,
      reconnectAttempts: connState.reconnectAttempts,
      subscribe,
      send,
    }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider')
  return ctx
}

// ─── Convenience hook: subscribe to a specific event type ────────────────────
export function useRealtimeEvent(
  type: RealtimeEventType | '*',
  handler: (e: RealtimeEvent) => void,
  deps: React.DependencyList = [],
) {
  const { subscribe } = useRealtime()
  useEffect(() => {
    const unsub = subscribe(type, handler)
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps])
}
