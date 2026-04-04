// src/services/feedback.ts
// ─── Feedback Loop — every user action gets a response ───────────────────────
// Toasts, banners, progress, sounds — all driven from one place.

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number   // ms, 0 = persist until manually dismissed
  action?: { label: string; onClick: () => void }
  progress?: number   // 0–100, shows progress bar
}

interface FeedbackState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => string
  update: (id: string, partial: Partial<Toast>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
  // Convenience methods
  success: (title: string, message?: string) => string
  error:   (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info:    (title: string, message?: string) => string
  loading: (title: string, message?: string) => string
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => Promise<T>
}

let uid = 0
const genId = () => `toast_${++uid}_${Date.now()}`

export const useFeedback = create<FeedbackState>((set, get) => ({
  toasts: [],

  add: (toast) => {
    const id = genId()
    const duration = toast.duration ?? (toast.type === 'error' ? 6000 : toast.type === 'loading' ? 0 : 4000)

    set(s => ({ toasts: [...s.toasts.slice(-4), { ...toast, id, duration }] }))

    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }

    return id
  },

  update: (id, partial) => {
    set(s => ({ toasts: s.toasts.map(t => t.id === id ? { ...t, ...partial } : t) }))
  },

  dismiss: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  dismissAll: () => set({ toasts: [] }),

  success: (title, message) => get().add({ type: 'success', title, message }),
  error:   (title, message) => get().add({ type: 'error',   title, message }),
  warning: (title, message) => get().add({ type: 'warning', title, message }),
  info:    (title, message) => get().add({ type: 'info',    title, message }),
  loading: (title, message) => get().add({ type: 'loading', title, message, duration: 0 }),

  promise: async (promise, msgs) => {
    const id = get().loading(msgs.loading)
    try {
      const result = await promise
      get().update(id, { type: 'success', title: msgs.success, duration: 3000 })
      setTimeout(() => get().dismiss(id), 3000)
      return result
    } catch (err) {
      get().update(id, { type: 'error', title: msgs.error, message: (err as Error).message, duration: 6000 })
      setTimeout(() => get().dismiss(id), 6000)
      throw err
    }
  },
}))
