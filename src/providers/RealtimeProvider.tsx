// src/providers/RealtimeProvider.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'

import {
  realtimeService,
  eventBus,
  type ConnectionState,
  type RealtimeEvent,
  type RealtimeEventType,
} from '@/services/realtime'

import { useConfigStore } from '@/lib/config'
interface RealtimeContextValue {
  connectionState: ConnectionState
  isMockMode: boolean
  lastPing: number | null
  reconnectAttempts: number
  latency: number | null
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe: (type: RealtimeEventType | '*', handler: (event: RealtimeEvent<any>) => void) => () => void
  send: (type: RealtimeEventType, payload: Record<string, unknown>) => void
}

type LocalState = {
  state: ConnectionState
  mockMode: boolean
  lastPing: number | null
  reconnectAttempts: number
  latency: number | null
}

type Action =
  | { type: 'SET_STATE'; payload: Partial<LocalState> }
  | { type: 'RESET' }

const initialState: LocalState = {
  state: 'disconnected',
  mockMode: false,
  lastPing: null,
  reconnectAttempts: 0,
  latency: null,
}

function reducer(state: LocalState, action: Action): LocalState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

/* --------------------------------------------------------------------------
   CONTEXT
   -------------------------------------------------------------------------- */
const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { config } = useConfigStore()
  const [localState, dispatch] = useReducer(reducer, initialState)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlersRef = useRef<Map<string, Set<(event: RealtimeEvent<any>) => void>>>(new Map())

  // ---------- Subscription (stable) ----------
  const subscribe = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (type: RealtimeEventType | '*', handler: (event: RealtimeEvent<any>) => void) => {
      const key = type as string

      let set = handlersRef.current.get(key)
      if (!set) {
        set = new Set()
        handlersRef.current.set(key, set)
      }
      set.add(handler)

      // 🔥 PERBAIKAN: Gunakan format event utuh agar sesuai dengan expectasi Component
      const globalUnsub = eventBus.on(type, (eventObj) => {
        const currentSet = handlersRef.current.get(key)
        if (!currentSet) return
        currentSet.forEach((h) => {
          try {
             // Pastikan handler menerima event lengkap (bukan cuma payload)
            h(eventObj as RealtimeEvent)
          } catch (err) {
            console.error(`[RealtimeProvider] Handler error for ${type}:`, err)
          }
        })
      })

      return () => {
        const currentSet = handlersRef.current.get(key)
        if (currentSet) {
          currentSet.delete(handler)
          if (currentSet.size === 0) {
            handlersRef.current.delete(key)
          }
        }
        globalUnsub()
      }
    },
    [],
  )

  // ---------- Send (stable) ----------
  const send = useCallback(
    (type: RealtimeEventType, payload: Record<string, unknown>) => {
      realtimeService.send(type, payload)
    },
    [],
  )

  // ---------- Sync local state with realtimeService ----------
  useEffect(() => {
    const enabled = config.features.webSockets || config.features.liveOps
    if (!enabled) return

    const unsubState = realtimeService.onStateChange((svcState) => {
      dispatch({
        type: 'SET_STATE',
        payload: {
          state: svcState.state,
          mockMode: svcState.transport === 'mock',
          lastPing: svcState.lastPing ?? null,
          reconnectAttempts: svcState.reconnectAttempts,
          latency: svcState.latency ?? null,
        },
      })
    })

    if (config.features.mockRealtime) {
      realtimeService.startMockMode()
    } else if (config.features.webSockets) {
      const wsUrl = import.meta.env.VITE_REALTIME_WS_URL
      if (wsUrl) {
        realtimeService.connect({ ws: wsUrl })
      } else {
        realtimeService.startMockMode()
      }
    } else if (config.features.liveOps) {
      const sseUrl = import.meta.env.VITE_REALTIME_SSE_URL
      if (sseUrl) {
        realtimeService.connect({ sse: sseUrl })
      } else {
        realtimeService.startMockMode()
      }
    } else {
      realtimeService.startMockMode()
    }

    return () => {
      unsubState()
      realtimeService.disconnect()
      dispatch({ type: 'RESET' })
      handlersRef.current.clear()
    }
  }, [config.features.webSockets, config.features.liveOps, config.features.mockRealtime])

  // ---------- Memoized context value ----------
  const contextValue = useMemo<RealtimeContextValue>(
    () => ({
      connectionState: localState.state,
      isMockMode: localState.mockMode,
      lastPing: localState.lastPing,
      reconnectAttempts: localState.reconnectAttempts,
      latency: localState.latency,
      subscribe,
      send,
    }),
    [localState.state, localState.mockMode, localState.lastPing, localState.reconnectAttempts, localState.latency, subscribe, send],
  )

  return <RealtimeContext.Provider value={contextValue}>{children}</RealtimeContext.Provider>
}

/* --------------------------------------------------------------------------
   HOOKS
   -------------------------------------------------------------------------- */
export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext)
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider')
  }
  return ctx
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeEvent(
  type: RealtimeEventType | '*',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (event: RealtimeEvent<any>) => void,
  deps: React.DependencyList = [],
) {
  const { subscribe } = useRealtime()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const unsub = subscribe(type, (event) => handlerRef.current(event))
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subscribe, ...deps])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeSelector<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selector: (event: RealtimeEvent<any>) => T,
  deps: React.DependencyList = [],
): T | null {
  const [value, setValue] = React.useState<T | null>(null)

  useRealtimeEvent(
    '*',
    (event) => {
      const next = selector(event)
      setValue((prev) => (prev !== next ? next : prev))
    },
    deps,
  )

  return value
}
