// src/services/realtime.ts
import { feedback } from '@/lib/feedback' // 🔥 Pastikan path import benar

export type RealtimeEventType =
  | 'process:update'
  | 'alert:sigma'
  | 'alert:spc'
  | 'kpi:snapshot'
  | 'user:action'
  | 'ping'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RealtimeEvent<T = any> {
  type: RealtimeEventType
  payload: T
  timestamp: number
  source: 'sse' | 'ws' | 'mock'
}

type EventHandler<T = any> = (event: RealtimeEvent<T>) => void

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'degraded'

export interface RealtimeState {
  state: ConnectionState
  lastPing: number | null
  reconnectAttempts: number
  transport: 'sse' | 'ws' | 'mock' | null
  latency: number | null
  lastError?: string | undefined
}

class EventBus {
  private listeners = new Map<string, Set<EventHandler<any>>>()

  on<T = any>(type: RealtimeEventType | '*', handler: EventHandler<T>): () => void {
    const key = type as string
    if (!this.listeners.has(key)) this.listeners.set(key, new Set())
    this.listeners.get(key)!.add(handler)
    return () => this.off(key as RealtimeEventType, handler)
  }

  once<T = any>(type: RealtimeEventType | '*', handler: EventHandler<T>): () => void {
    const unsub = this.on(type, (e) => {
      handler(e)
      unsub()
    })
    return unsub
  }

  off(type: RealtimeEventType | '*', handler: EventHandler<any>): void {
    this.listeners.get(type as string)?.delete(handler)
  }

  emit<T = any>(event: RealtimeEvent<T>): void {
    const byType = this.listeners.get(event.type)
    if (byType) {
      for (const h of Array.from(byType)) h(event)
    }
    const all = this.listeners.get('*')
    if (all) {
      for (const h of Array.from(all)) h(event)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()

const now = () => Date.now()
const jitter = (ms: number) => Math.round(ms * (0.8 + Math.random() * 0.4))

export class RealtimeService {
  private sse: EventSource | null = null
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private mockInterval: ReturnType<typeof setInterval> | null = null
  private closed = false

  private lastWsUrl: string | null = null
  private lastSseUrl: string | null = null

  private state: RealtimeState = {
    state: 'disconnected',
    lastPing: null,
    reconnectAttempts: 0,
    transport: null,
    latency: null,
  }

  private stateListeners = new Set<(state: RealtimeState) => void>()

  private static readonly MAX_RETRIES = 6
  private static readonly MAX_BACKOFF_MS = 30_000
  private static readonly HEARTBEAT_INTERVAL_MS = 15_000
  private static readonly MOCK_INTERVAL_MS = 8_000

  private setState(partial: Partial<RealtimeState>): void {
    this.state = { ...this.state, ...partial }
    for (const cb of this.stateListeners) cb(this.state)
  }

  onStateChange(cb: (state: RealtimeState) => void): () => void {
    this.stateListeners.add(cb)
    cb(this.state)
    return () => this.stateListeners.delete(cb)
  }

  getState(): RealtimeState {
    return { ...this.state }
  }

  connect(options: { ws?: string; sse?: string }): void {
    if (typeof window === 'undefined') return
    this.closed = false
    this.clearAll()
    this.setState({ state: 'connecting', transport: null, lastError: undefined, reconnectAttempts: 0, latency: null })

    if (options.ws) {
      this.lastWsUrl = options.ws
      this.openWebSocket(options.ws)
      return
    }
    if (options.sse) {
      this.lastSseUrl = options.sse
      this.openSSE(options.sse)
      return
    }
    this.setState({ state: 'error', lastError: 'No endpoint provided' })
    this.startMockMode()
  }

  disconnect(): void {
    this.closed = true
    this.clearAll()
    this.setState({ state: 'disconnected', transport: null, reconnectAttempts: 0, lastPing: null, latency: null })
    this.lastWsUrl = null
    this.lastSseUrl = null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send<T = any>(type: RealtimeEventType, payload: T): void {
    const envelope = JSON.stringify({ type, payload, timestamp: now() })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(envelope)
    } else {
      eventBus.emit({ type, payload, timestamp: now(), source: 'mock' })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendWithAck<T = any, A = any>(
    type: RealtimeEventType,
    payload: T,
    opts?: { ackType?: RealtimeEventType; ackPredicate?: (event: RealtimeEvent<any>) => boolean; timeoutMs?: number },
  ): Promise<RealtimeEvent<A>> {
    const ackType = opts?.ackType ?? 'ping'
    const timeoutMs = opts?.timeoutMs ?? 5000

    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout>;

      const unsub = eventBus.once(ackType, (e) => {
        if (opts?.ackPredicate && !opts.ackPredicate(e)) return
        clearTimeout(timeoutId)
        resolve(e as RealtimeEvent<A>)
      })

      timeoutId = setTimeout(() => {
        unsub()
        reject(new Error(`Acknowledgement timeout for "${type}"`))
      }, timeoutMs)
      
      this.send(type, payload)
    })
  }

  private openSSE(url: string): void {
    try {
      this.sse = new EventSource(url)
      this.sse.onopen = () => {
        this.setState({ state: 'connected', transport: 'sse', reconnectAttempts: 0, lastError: undefined })
        this.startHeartbeat(false)
      }
      this.sse.onmessage = (e) => this.handleIncoming(e.data, 'sse')
      this.sse.onerror = () => { this.cleanupSSE(); this.handleDisconnect() }
    } catch (err) {
      this.setState({ lastError: String(err) })
      this.handleDisconnect()
    }
  }

  private openWebSocket(url: string): void {
    try {
      this.ws = new WebSocket(url)
      this.ws.onopen = () => {
        this.setState({ state: 'connected', transport: 'ws', reconnectAttempts: 0, lastError: undefined })
        this.startHeartbeat(true)
      }
      this.ws.onmessage = (e) => this.handleIncoming(e.data as string, 'ws')
      this.ws.onclose = () => { this.cleanupWS(); this.handleDisconnect() }
      this.ws.onerror = () => { this.cleanupWS(); this.handleDisconnect() }
    } catch (err) {
      this.setState({ lastError: String(err) })
      this.handleDisconnect()
    }
  }

  private handleIncoming(raw: unknown, source: 'sse' | 'ws'): void {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!parsed || typeof parsed.type !== 'string') return
      const event: RealtimeEvent = {
        type: parsed.type as RealtimeEventType,
        payload: parsed.payload ?? {},
        timestamp: parsed.timestamp ?? now(),
        source,
      }

      if (parsed.timestamp) this.setState({ latency: now() - parsed.timestamp })
      if (event.type === 'ping') this.setState({ lastPing: now() })
      
      eventBus.emit(event)
    } catch { /* ignore */ }
  }

  private handleDisconnect(): void {
    if (this.closed) return
    const attempts = this.state.reconnectAttempts + 1
    const degraded = attempts >= RealtimeService.MAX_RETRIES
    this.setState({ state: degraded ? 'degraded' : 'error', reconnectAttempts: attempts, transport: null })
    this.stopHeartbeat()

    if (degraded) {
      this.startMockMode()
      return
    }

    const baseDelay = Math.min(1000 * 2 ** attempts, RealtimeService.MAX_BACKOFF_MS)
    this.reconnectTimer = setTimeout(() => {
      if (this.lastWsUrl) return this.openWebSocket(this.lastWsUrl)
      if (this.lastSseUrl) return this.openSSE(this.lastSseUrl)
      this.startMockMode()
    }, jitter(baseDelay))
  }

  private startHeartbeat(sendPing: boolean): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.setState({ lastPing: now() })
      eventBus.emit({ type: 'ping', payload: {}, timestamp: now(), source: this.state.transport === 'ws' ? 'ws' : 'sse' })
      if (sendPing && this.ws?.readyState === WebSocket.OPEN) {
        try { this.ws.send(JSON.stringify({ type: 'ping', timestamp: now() })) } catch { /* ignore */ }
      }
    }, RealtimeService.HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
  }

  startMockMode(): void {
    if (this.mockInterval) return
    this.setState({ state: 'connected', transport: 'mock', reconnectAttempts: 0, lastError: undefined })
    
    eventBus.emit({
      type: 'kpi:snapshot',
      payload: { sigma: +(3.5 + Math.random() * 1.5).toFixed(2), dpmo: Math.round(1000 + Math.random() * 5000), activeAlerts: Math.floor(Math.random() * 4), queueDepth: Math.round(20 + Math.random() * 30), throughput: +(0.85 + Math.random() * 0.14).toFixed(3) },
      timestamp: now(), source: 'mock'
    })

    this.mockInterval = setInterval(() => {
      eventBus.emit({
        type: 'kpi:snapshot',
        payload: { sigma: +(3.5 + Math.random() * 1.5).toFixed(2), dpmo: Math.round(1000 + Math.random() * 5000), activeAlerts: Math.floor(Math.random() * 4), queueDepth: Math.round(20 + Math.random() * 30), throughput: +(0.85 + Math.random() * 0.14).toFixed(3) },
        timestamp: now(), source: 'mock'
      })
      if (Math.random() < 0.15) {
        eventBus.emit({ type: 'alert:spc', payload: { rule: '1', message: 'Point beyond 3σ control limit', index: Math.floor(Math.random() * 100) }, timestamp: now(), source: 'mock' })
      }
    }, RealtimeService.MOCK_INTERVAL_MS)
  }

  stopMockMode(): void {
    if (this.mockInterval) { clearInterval(this.mockInterval); this.mockInterval = null }
  }

  private cleanupWS(): void { try { this.ws?.close() } catch {} this.ws = null }
  private cleanupSSE(): void { try { this.sse?.close() } catch {} this.sse = null }

  private clearAll(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    this.stopHeartbeat()
    this.cleanupWS()
    this.cleanupSSE()
    this.stopMockMode()
  }
}

export interface RealtimeConnectionLike {
  on: <T = any>(event: string, callback: (data: T) => void) => () => void
  onRaw: (callback: (event: string, data: any) => void) => () => void
}

export function createRealtimeFromService(): RealtimeConnectionLike {
  return {
    on: (event, callback) => eventBus.on(event as RealtimeEventType, (e) => callback(e.payload)),
    onRaw: (callback) => eventBus.on('*', (e) => callback(e.type, e.payload)),
  }
}

export const realtimeService = new RealtimeService()
