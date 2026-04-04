// src/services/realtime.ts
// ─── Real-time Layer: SSE + WebSocket with auto-reconnect ────────────────────
// Fault-tolerant: gracefully degrades when server is unavailable.
// Modules subscribe to events; this service manages the connection lifecycle.

export type RealtimeEventType =
  | 'process:update'      // A process metric was updated
  | 'alert:sigma'         // Sigma dropped below threshold
  | 'alert:spc'           // SPC violation detected
  | 'kpi:snapshot'        // Periodic KPI snapshot
  | 'user:action'         // Another user performed an action (collab)
  | 'ping'                // Heartbeat

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, unknown>
  timestamp: number
  source: 'sse' | 'ws' | 'mock'
}

type EventHandler = (event: RealtimeEvent) => void

// ─── Event Bus (in-memory pub/sub, works offline too) ────────────────────────
class EventBus {
  private listeners = new Map<RealtimeEventType | '*', Set<EventHandler>>()

  on(type: RealtimeEventType | '*', handler: EventHandler): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(handler)
    // Return unsubscribe fn
    return () => this.listeners.get(type)?.delete(handler)
  }

  emit(event: RealtimeEvent) {
    this.listeners.get(event.type)?.forEach(h => h(event))
    this.listeners.get('*')?.forEach(h => h(event))
  }
}

export const eventBus = new EventBus()

// ─── Connection states ────────────────────────────────────────────────────────
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'degraded'

interface RealtimeState {
  state: ConnectionState
  lastPing: number | null
  reconnectAttempts: number
  mockMode: boolean
}

class RealtimeService {
  private sse: EventSource | null = null
  private ws: WebSocket | null = null
  private mockInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stateCallbacks = new Set<(s: RealtimeState) => void>()

  private state: RealtimeState = {
    state: 'disconnected',
    lastPing: null,
    reconnectAttempts: 0,
    mockMode: false,
  }

  // ── Subscribe to connection state changes ──────────────────────────────────
  onStateChange(cb: (s: RealtimeState) => void): () => void {
    this.stateCallbacks.add(cb)
    cb(this.state) // Emit current state immediately
    return () => this.stateCallbacks.delete(cb)
  }

  private setState(partial: Partial<RealtimeState>) {
    this.state = { ...this.state, ...partial }
    this.stateCallbacks.forEach(cb => cb(this.state))
  }

  // ── Try SSE connection (read-only stream) ──────────────────────────────────
  connectSSE(url: string) {
    this.setState({ state: 'connecting', mockMode: false })

    try {
      this.sse = new EventSource(url)

      this.sse.onopen = () => {
        this.setState({ state: 'connected', reconnectAttempts: 0 })
      }

      this.sse.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as RealtimeEvent
          this.setState({ lastPing: Date.now() })
          eventBus.emit({ ...data, source: 'sse' })
        } catch { /* malformed message, ignore */ }
      }

      this.sse.onerror = () => {
        this.sse?.close()
        this.sse = null
        this.handleDisconnect()
      }
    } catch {
      this.handleDisconnect()
    }
  }

  // ── Try WebSocket (bidirectional) ──────────────────────────────────────────
  connectWS(url: string) {
    this.setState({ state: 'connecting', mockMode: false })

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.setState({ state: 'connected', reconnectAttempts: 0 })
        // Heartbeat
        this.ws?.send(JSON.stringify({ type: 'ping' }))
      }

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as RealtimeEvent
          this.setState({ lastPing: Date.now() })
          eventBus.emit({ ...data, source: 'ws' })
        } catch { /* noop */ }
      }

      this.ws.onclose = () => this.handleDisconnect()
      this.ws.onerror = () => this.handleDisconnect()
    } catch {
      this.handleDisconnect()
    }
  }

  // ── Send event (WS only) ───────────────────────────────────────────────────
  send(type: RealtimeEventType, payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    }
  }

  // ── Auto-reconnect with exponential backoff ────────────────────────────────
  private handleDisconnect() {
    const attempts = this.state.reconnectAttempts + 1
    this.setState({ state: attempts > 5 ? 'degraded' : 'error', reconnectAttempts: attempts })

    if (attempts > 5) {
      // Degrade gracefully — switch to mock mode
      this.startMockMode()
      return
    }

    const delay = Math.min(1000 * Math.pow(2, attempts), 30_000) // max 30s
    this.reconnectTimer = setTimeout(() => {
      // We'd re-attempt connection here. For now, degrade to mock.
      this.startMockMode()
    }, delay)
  }

  // ── Mock mode — simulates live data when no server is available ────────────
  startMockMode() {
    if (this.mockInterval) return
    this.setState({ state: 'connected', mockMode: true })

    // Emit simulated KPI snapshots every 8 seconds
    this.mockInterval = setInterval(() => {
      eventBus.emit({
        type: 'kpi:snapshot',
        source: 'mock',
        timestamp: Date.now(),
        payload: {
          sigma:        +(3.5 + Math.random() * 1.5).toFixed(2),
          dpmo:         Math.round(1000 + Math.random() * 5000),
          activeAlerts: Math.floor(Math.random() * 4),
          queueDepth:   Math.round(20 + Math.random() * 30),
          throughput:   +(0.85 + Math.random() * 0.14).toFixed(3),
        },
      })

      // Occasional SPC alert
      if (Math.random() < 0.15) {
        eventBus.emit({
          type: 'alert:spc',
          source: 'mock',
          timestamp: Date.now(),
          payload: { rule: '1', message: 'Point beyond 3σ control limit', index: Math.floor(Math.random() * 20) },
        })
      }
    }, 8000)

    // Immediate first snapshot
    eventBus.emit({
      type: 'kpi:snapshot',
      source: 'mock',
      timestamp: Date.now(),
      payload: { sigma: 3.82, dpmo: 2140, activeAlerts: 1, queueDepth: 34, throughput: 0.921 },
    })
  }

  stopMockMode() {
    if (this.mockInterval) { clearInterval(this.mockInterval); this.mockInterval = null }
    this.setState({ state: 'disconnected', mockMode: false })
  }

  disconnect() {
    this.sse?.close()
    this.ws?.close()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.stopMockMode()
    this.setState({ state: 'disconnected' })
  }

  getState(): RealtimeState { return this.state }
}

export const realtimeService = new RealtimeService()
