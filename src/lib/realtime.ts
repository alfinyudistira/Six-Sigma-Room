// src/lib/realtime.ts

import { feedback } from './feedback'

export type RealtimeEventMap = Record<string, unknown>

export interface RealtimeOptions {
  /** URL endpoint (SSE atau WebSocket) */
  url: string
  /** Type: 'sse' (default) atau 'websocket' */
  type?: 'sse' | 'websocket'
  /** Authorization token (untuk WebSocket atau SSE via query param) */
  token?: string
  /** Additional query params (akan ditambahkan ke URL) */
  queryParams?: Record<string, string>
  /** Reconnect delays: base delay in ms (default 1000) */
  baseDelay?: number
  /** Maximum delay in ms (default 30000) */
  maxDelay?: number
  /** Maximum number of reconnect attempts (default Infinity) */
  maxRetries?: number
  /** Enable debug logs (default: false) */
  debug?: boolean
  /** Heartbeat interval in ms (default 30000) */
  heartbeatInterval?: number
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'

export interface RealtimeConnection {
  /** Current connection status */
  status: ConnectionStatus
  /** Manually disconnect */
  disconnect: () => void
  /** Manually reconnect */
  reconnect: () => void
  /** Subscribe to specific event type */
  on: <K extends keyof T>(event: K, callback: (data: T[K]) => void) => () => void
  /** Subscribe to all events (raw) */
  onRaw: (callback: (event: string, data: unknown) => void) => () => void
  /** Send message (WebSocket only) */
  send?: (data: unknown) => void
}

/* --------------------------------------------------------------------------
   HELPER: build URL with query params
   -------------------------------------------------------------------------- */
function buildURL(baseUrl: string, params?: Record<string, string>, token?: string): string {
  const url = new URL(baseUrl)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  if (token) {
    url.searchParams.set('token', token)
  }
  return url.toString()
}

/* --------------------------------------------------------------------------
   EXPONENTIAL BACKOFF WITH JITTER
   -------------------------------------------------------------------------- */
function getBackoffDelay(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * Math.pow(2, attempt))
  // Jitter: random 0-100ms to avoid thundering herd
  const jitter = Math.random() * 100
  return exp + jitter
}

/* --------------------------------------------------------------------------
   SSE IMPLEMENTATION
   -------------------------------------------------------------------------- */
function createSSEConnection<T extends RealtimeEventMap>(
  options: RealtimeOptions,
  onEvent: (event: string, data: unknown) => void,
  onStatusChange: (status: ConnectionStatus) => void,
): { disconnect: () => void; reconnect: () => void } {
  let eventSource: EventSource | null = null
  let reconnectAttempt = 0
  let reconnectTimer: number | null = null
  let isManualDisconnect = false
  let heartbeatTimer: number | null = null

  const {
    url,
    token,
    queryParams,
    baseDelay = 1000,
    maxDelay = 30000,
    maxRetries = Infinity,
    debug = false,
    heartbeatInterval = 30000,
  } = options

  const fullUrl = buildURL(url, queryParams, token)

  const log = (...args: unknown[]) => {
    if (debug) console.log('[SSE]', ...args)
  }

  const setStatus = (status: ConnectionStatus) => {
    onStatusChange(status)
  }

  const cleanup = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const connect = () => {
    if (isManualDisconnect) return
    if (reconnectAttempt >= maxRetries) {
      setStatus('failed')
      feedback.notifyError('Realtime connection failed after max retries')
      return
    }

    setStatus('connecting')
    log(`Connecting to ${fullUrl} (attempt ${reconnectAttempt + 1})`)

    try {
      eventSource = new EventSource(fullUrl)

      eventSource.onopen = () => {
        reconnectAttempt = 0
        setStatus('connected')
        log('Connected')
        feedback.notifyInfo('Realtime connection established', { duration: 2000 })
        // Setup heartbeat ping (optional, server harus kirim event 'heartbeat')
      }

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          const eventType = data.event || 'message'
          onEvent(eventType, data.payload !== undefined ? data.payload : data)
        } catch {
          onEvent('message', e.data)
        }
      }

      eventSource.onerror = () => {
        if (isManualDisconnect) return
        setStatus('reconnecting')
        log('Connection lost, reconnecting...')
        eventSource?.close()
        eventSource = null

        const delay = getBackoffDelay(reconnectAttempt, baseDelay, maxDelay)
        reconnectTimer = window.setTimeout(() => {
          reconnectAttempt++
          connect()
        }, delay)
      }
    } catch (err) {
      log('Failed to create EventSource', err)
      setStatus('failed')
      feedback.notifyError('Failed to establish realtime connection')
    }
  }

  const disconnect = () => {
    isManualDisconnect = true
    cleanup()
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    setStatus('disconnected')
    log('Disconnected manually')
  }

  const reconnect = () => {
    if (isManualDisconnect) {
      isManualDisconnect = false
      reconnectAttempt = 0
    }
    cleanup()
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connect()
  }

  connect()

  return { disconnect, reconnect }
}

/* --------------------------------------------------------------------------
   WEBSOCKET IMPLEMENTATION (OPTIONAL)
   -------------------------------------------------------------------------- */
function createWebSocketConnection<T extends RealtimeEventMap>(
  options: RealtimeOptions,
  onEvent: (event: string, data: unknown) => void,
  onStatusChange: (status: ConnectionStatus) => void,
): { disconnect: () => void; reconnect: () => void; send: (data: unknown) => void } {
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  let reconnectTimer: number | null = null
  let isManualDisconnect = false

  const {
    url,
    token,
    queryParams,
    baseDelay = 1000,
    maxDelay = 30000,
    maxRetries = Infinity,
    debug = false,
  } = options

  const fullUrl = buildURL(url, queryParams, token).replace(/^http/, 'ws')
  const log = (...args: unknown[]) => {
    if (debug) console.log('[WebSocket]', ...args)
  }

  const setStatus = (status: ConnectionStatus) => {
    onStatusChange(status)
  }

  const cleanup = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const connect = () => {
    if (isManualDisconnect) return
    if (reconnectAttempt >= maxRetries) {
      setStatus('failed')
      feedback.notifyError('WebSocket connection failed after max retries')
      return
    }

    setStatus('connecting')
    log(`Connecting to ${fullUrl} (attempt ${reconnectAttempt + 1})`)

    try {
      ws = new WebSocket(fullUrl)

      ws.onopen = () => {
        reconnectAttempt = 0
        setStatus('connected')
        log('Connected')
        feedback.notifyInfo('WebSocket connection established', { duration: 2000 })
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          const eventType = data.event || 'message'
          onEvent(eventType, data.payload !== undefined ? data.payload : data)
        } catch {
          onEvent('message', e.data)
        }
      }

      ws.onerror = (err) => {
        log('Error', err)
      }

      ws.onclose = () => {
        if (isManualDisconnect) return
        setStatus('reconnecting')
        log('Connection closed, reconnecting...')
        ws = null

        const delay = getBackoffDelay(reconnectAttempt, baseDelay, maxDelay)
        reconnectTimer = window.setTimeout(() => {
          reconnectAttempt++
          connect()
        }, delay)
      }
    } catch (err) {
      log('Failed to create WebSocket', err)
      setStatus('failed')
    }
  }

  const disconnect = () => {
    isManualDisconnect = true
    cleanup()
    if (ws) {
      ws.close()
      ws = null
    }
    setStatus('disconnected')
    log('Disconnected manually')
  }

  const reconnect = () => {
    if (isManualDisconnect) {
      isManualDisconnect = false
      reconnectAttempt = 0
    }
    cleanup()
    if (ws) {
      ws.close()
      ws = null
    }
    connect()
  }

  const send = (data: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    } else {
      log('Cannot send, not connected')
    }
  }

  connect()

  return { disconnect, reconnect, send }
}

/* --------------------------------------------------------------------------
   MAIN FACTORY FUNCTION
   -------------------------------------------------------------------------- */
export function createRealtime<T extends RealtimeEventMap = RealtimeEventMap>(
  options: RealtimeOptions,
): RealtimeConnection {
  const type = options.type || 'sse'
  const debug = options.debug ?? false

  // Subscription management
  const eventCallbacks = new Map<string, Set<(data: unknown) => void>>()
  const rawCallbacks = new Set<(event: string, data: unknown) => void>()

  let status: ConnectionStatus = 'disconnected'
  const statusListeners = new Set<(status: ConnectionStatus) => void>()
  const setStatus = (newStatus: ConnectionStatus) => {
    status = newStatus
    statusListeners.forEach((fn) => fn(status))
    options.onStatusChange?.(status)
    if (debug) console.log(`[Realtime] Status: ${status}`)
  }

  const onEvent = (event: string, data: unknown) => {
    // Call raw callbacks first
    rawCallbacks.forEach((cb) => cb(event, data))
    // Call typed callbacks
    const cbs = eventCallbacks.get(event)
    if (cbs) {
      cbs.forEach((cb) => cb(data))
    }
  }

  let connection:
    | { disconnect: () => void; reconnect: () => void; send?: (data: unknown) => void }
    | null = null

  if (type === 'websocket') {
    const wsConn = createWebSocketConnection<T>(options, onEvent, setStatus)
    connection = wsConn
  } else {
    const sseConn = createSSEConnection<T>(options, onEvent, setStatus)
    connection = sseConn
  }

  const disconnect = () => {
    connection?.disconnect()
  }

  const reconnect = () => {
    connection?.reconnect()
  }

  const on = <K extends keyof T>(event: K, callback: (data: T[K]) => void): (() => void) => {
    const eventStr = String(event)
    if (!eventCallbacks.has(eventStr)) {
      eventCallbacks.set(eventStr, new Set())
    }
    eventCallbacks.get(eventStr)!.add(callback as (data: unknown) => void)
    return () => {
      eventCallbacks.get(eventStr)?.delete(callback as (data: unknown) => void)
    }
  }

  const onRaw = (callback: (event: string, data: unknown) => void): (() => void) => {
    rawCallbacks.add(callback)
    return () => rawCallbacks.delete(callback)
  }

  return {
    get status() {
      return status
    },
    disconnect,
    reconnect,
    on,
    onRaw,
    ...(connection?.send ? { send: connection.send } : {}),
  }
}

/* --------------------------------------------------------------------------
   SIMPLIFIED HOOK (untuk React, opsional)
   -------------------------------------------------------------------------- */
export function useRealtime<T extends RealtimeEventMap>(
  options: RealtimeOptions,
  deps: unknown[] = [],
): RealtimeConnection {
  throw new Error('useRealtime harus diimplementasikan di level React, gunakan createRealtime langsung')
}
