// src/services/feedback.ts

import { create } from 'zustand'
import { feedback } from '@/lib/feedback'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string | undefined
  duration: number
  action?: ToastAction | undefined
  progress?: number | undefined
  createdAt: number
  replaced?: boolean | undefined
}

export interface ToastPayload {
  id?: string | undefined
  type: ToastType
  title: string
  message?: string | undefined
  duration?: number | undefined
  action?: ToastAction | undefined
  progress?: number | undefined
}

const DEFAULT_MAX_TOASTS = 5
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 3500,
  warning: 4500,
  error: 6000,
  loading: 0,
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function scheduleAutoDismiss(id: string, duration: number, dismissFn: (id: string) => void): void {
  const existing = timers.get(id)
  if (existing) {
    clearTimeout(existing)
    timers.delete(id)
  }
  if (duration > 0) {
    const timer = setTimeout(() => {
      timers.delete(id)
      dismissFn(id)
    }, duration)
    timers.set(id, timer)
  }
}

function clearTimer(id: string): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

interface FeedbackState {
  toasts: Toast[]
  add: (toast: ToastPayload, options?: { replace?: boolean | undefined }) => string
  update: (id: string, patch: Partial<Toast>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
  getById: (id: string) => Toast | undefined

  success: (title: string, message?: string | undefined) => string
  error: (title: string, message?: string | undefined) => string
  warning: (title: string, message?: string | undefined) => string
  info: (title: string, message?: string | undefined) => string
  loading: (title: string, message?: string | undefined) => string

  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>
}


export const useFeedback = create<FeedbackState>((set, get) => ({
  toasts: [],

  add: (toast, options = {}) => {
    const id = toast.id || generateId()
    const now = Date.now()
    const type = toast.type
    const duration = toast.duration ?? DEFAULT_DURATIONS[type]

    const baseToast: Toast = {
      id,
      type,
      title: toast.title,
      message: toast.message,
      duration,
      action: toast.action,
      progress: toast.progress,
      createdAt: now,
      replaced: false,
    }

    set((state) => {
      if (options.replace) {
        const index = state.toasts.findIndex(
          (t) => t.title === baseToast.title && t.type === baseToast.type
        )
        if (index !== -1) {
          const replaced = [...state.toasts]
          const oldId = replaced[index]!.id
          replaced[index] = { ...replaced[index]!, ...baseToast, replaced: true }
          clearTimer(oldId)
          scheduleAutoDismiss(replaced[index]!.id, replaced[index]!.duration, get().dismiss)
          return { toasts: replaced }
        }
      }

      let next = [...state.toasts, baseToast]
      if (next.length > DEFAULT_MAX_TOASTS) {
        next = next.slice(-DEFAULT_MAX_TOASTS)
      }
      return { toasts: next }
    })

    scheduleAutoDismiss(id, duration, get().dismiss)
    return id
  },

  update: (id, patch) => {
    set((state) => {
      const index = state.toasts.findIndex((t) => t.id === id)
      if (index === -1) return state
      const updated = [...state.toasts]
      updated[index] = { ...updated[index]!, ...patch }

      if (patch.duration !== undefined) {
        clearTimer(id)
        scheduleAutoDismiss(id, patch.duration, get().dismiss)
      }
      return { toasts: updated }
    })
  },

  dismiss: (id) => {
    clearTimer(id)
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  dismissAll: () => {
    for (const id of timers.keys()) clearTimer(id)
    set({ toasts: [] })
  },

  getById: (id) => get().toasts.find((t) => t.id === id),

  success: (title, message) => get().add({ type: 'success', title, message }),
  error: (title, message) => get().add({ type: 'error', title, message }),
  warning: (title, message) => get().add({ type: 'warning', title, message }),
  info: (title, message) => get().add({ type: 'info', title, message }),
  loading: (title, message) => get().add({ type: 'loading', title, message, duration: 0 }),

  promise: async (promise, messages) => {
    const id = get().loading(messages.loading)
    try {
      const result = await promise
      get().update(id, {
        type: 'success',
        title: messages.success,
        message: undefined,
        duration: DEFAULT_DURATIONS.success,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      get().update(id, {
        type: 'error',
        title: messages.error,
        message: errorMessage,
        duration: DEFAULT_DURATIONS.error,
      })
      throw err
    }
  },
}))

/* --------------------------------------------------------------------------
   🔥 THE BRIDGE (Menghubungkan lib/feedback dengan Zustand UI)
   -------------------------------------------------------------------------- */
if (typeof window !== 'undefined') {
  // Subscribe ke pure event bus
  feedback.subscribeToNotifications((notif) => {
    useFeedback.getState().add({
      id: notif.id,
      type: notif.type as ToastType,
      title: notif.message,           // Map 'message' dari lib jadi 'title' di UI
      message: notif.description,     // Map 'description' dari lib jadi 'message' di UI
      duration: notif.duration ?? DEFAULT_DURATIONS[notif.type as ToastType],
      action: notif.action,
    })
  })
}
