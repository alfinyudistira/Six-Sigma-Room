import { CONFIG_COLORS } from './config'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  description?: string
  duration?: number
  timestamp: number
  action?: {
    label: string
    onClick: () => void
  }
}

type NotificationListener = (notification: Notification) => void

const notificationListeners = new Set<NotificationListener>()
const DEFAULT_DURATION = 4000

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const createNotification = (
  type: NotificationType,
  message: string,
  options: Omit<Partial<Notification>, 'id' | 'type' | 'message' | 'timestamp'> = {},
): Notification => ({
  id: generateId(),
  type,
  message,
  timestamp: Date.now(),
  duration: DEFAULT_DURATION,
  ...options,
})

const broadcastNotification = (notification: Notification): void => {
  if (import.meta.env.DEV) {
    const colorMap: Record<NotificationType, string> = {
      success: CONFIG_COLORS.worldClass,
      error: CONFIG_COLORS.critical,
      warning: CONFIG_COLORS.warn,
      info: CONFIG_COLORS.excellent,
    }
    console.log(
      `%c[feedback] ${notification.type.toUpperCase()} → ${notification.message}`,
      `color:${colorMap[notification.type]}; font-weight:bold`,
      notification,
    )
  }

  notificationListeners.forEach((fn) => {
    try {
      fn(notification)
    } catch (err) {
      console.error('[feedback] Notification listener error:', err)
    }
  })
}

// --- Notification Public API ---
export function notify(message: string): void
export function notify(notification: Omit<Partial<Notification>, 'id' | 'timestamp'> & { message: string }): void
export function notify(
  input: string | (Omit<Partial<Notification>, 'id' | 'timestamp'> & { message: string }),
): void {
  const notif =
    typeof input === 'string'
      ? createNotification('info', input)
      : createNotification('info', input.message, input)
  broadcastNotification(notif)
}

export const notifySuccess = (message: string, options?: Omit<Partial<Notification>, 'id' | 'type' | 'message' | 'timestamp'>): void => {
  broadcastNotification(createNotification('success', message, options))
}

export const notifyError = (message: string, options?: Omit<Partial<Notification>, 'id' | 'type' | 'message' | 'timestamp'>): void => {
  broadcastNotification(createNotification('error', message, options))
}

export const notifyWarning = (message: string, options?: Omit<Partial<Notification>, 'id' | 'type' | 'message' | 'timestamp'>): void => {
  broadcastNotification(createNotification('warning', message, options))
}

export const notifyInfo = (message: string, options?: Omit<Partial<Notification>, 'id' | 'type' | 'message' | 'timestamp'>): void => {
  broadcastNotification(createNotification('info', message, options))
}

/** Subscribe ke notifikasi UI (dipakai di komponen Toast) */
export const subscribeToNotifications = (listener: NotificationListener): (() => void) => {
  notificationListeners.add(listener)
  return () => notificationListeners.delete(listener)
}

/** Hapus semua listener notifikasi */
export const unsubscribeAllNotifications = (): void => {
  notificationListeners.clear()
}

export interface EventMap {
  'notify': { message: string; type?: NotificationType }
  'company:updated': { companyId: string; changes: Partial<unknown> }
  'module:saved': { module: string; id?: string }
  'module:deleted': { module: string; id: string }
  'sync:started': { module: string }
  'sync:completed': { module: string; success: boolean }
  'auth:logout': void
  'auth:login': { userId: string }
  'config:changed': { key: string; value: unknown }
  // future: 'data:refreshed', dll.
}

type EventKey = keyof EventMap
type EventListener<K extends EventKey> = (payload: EventMap[K]) => void

const eventListeners: {
  [K in EventKey]?: Set<EventListener<K>>
} = {}

/**
 * Emit event ke semua subscriber yang terdaftar.
 * @param event Nama event
 * @param payload Data yang dikirim (sesuai tipe EventMap)
 */
function emit<K extends EventKey>(event: K, payload: EventMap[K]): void {
  const subs = eventListeners[event]
  if (!subs) return

  if (import.meta.env.DEV) {
    console.log(`%c[eventBus] 📡 ${event}`, 'color: #00D4FF', payload)
  }

  subs.forEach((fn) => {
    try {
      fn(payload)
    } catch (err) {
      console.error(`[eventBus] Listener error on "${event}"`, err)
    }
  })
}

function subscribe<K extends EventKey>(event: K, fn: EventListener<K>): () => void {
if (!eventListeners[event]) {
  eventListeners[event] = new Set() as any
}
  eventListeners[event]!.add(fn)
  return () => {
    eventListeners[event]?.delete(fn)
  }
}

function unsubscribeAllEvents(event?: EventKey): void {
  if (event) {
    eventListeners[event]?.clear()
  } else {
    Object.keys(eventListeners).forEach((key) => {
      eventListeners[key as EventKey]?.clear()
    })
  }
}

export const feedback = Object.freeze({
  notify,
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  subscribeToNotifications,
  unsubscribeAllNotifications,

  emit,
  subscribe,
  unsubscribeAllEvents,

  notifyAndEmit: (
    message: string,
    type: NotificationType = 'info',
    event?: EventKey,
    eventPayload?: EventMap[EventKey],
  ) => {
    switch (type) {
      case 'success':
        notifySuccess(message)
        break
      case 'error':
        notifyError(message)
        break
      case 'warning':
        notifyWarning(message)
        break
      default:
        notifyInfo(message)
    }
    if (event && eventPayload !== undefined) {
      emit(event, eventPayload as any)
    }
  },

  getNotificationListenerCount: () => notificationListeners.size,
  getEventListenerCount: (event?: EventKey) => {
    if (event) return eventListeners[event]?.size ?? 0
    let total = 0
    Object.values(eventListeners).forEach((set) => (total += set?.size ?? 0))
    return total
  },
})

export type { EventKey, EventListener, NotificationListener }
