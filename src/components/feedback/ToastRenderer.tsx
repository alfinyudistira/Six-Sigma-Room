// src/components/feedback/ToastRenderer.tsx

import React, { createPortal } from 'react-dom'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { feedback, type Notification, type NotificationType } from '@/lib/feedback'
import { tokens } from '@/lib/tokens'

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; glow: string }> = {
  success: { icon: '✓', color: tokens.green, glow: '0 0 12px rgba(0, 255, 156, 0.4)' },
  error: { icon: '✕', color: tokens.red, glow: '0 0 12px rgba(255, 59, 92, 0.4)' },
  warning: { icon: '⚠', color: tokens.yellow, glow: '0 0 12px rgba(255, 214, 10, 0.4)' },
  info: { icon: 'ℹ', color: tokens.cyan, glow: '0 0 12px rgba(0, 212, 255, 0.4)' },
  loading: { icon: '⟳', color: tokens.cyan, glow: '0 0 12px rgba(0, 212, 255, 0.4)' },
} as const

/* --------------------------------------------------------------------------
   TOAST ITEM (memoized)
   -------------------------------------------------------------------------- */
interface ToastItemProps {
  toast: Notification
  onDismiss: (id: string) => void
}

// 🔥 PERBAIKAN: Gunakan React.memo, bukan dibungkus dengan motion()
const ToastItem = React.memo(function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const cfg = TYPE_CONFIG[toast.type]
  const [dragX, setDragX] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto‑dismiss timer
  useEffect(() => {
    if (toast.duration && toast.duration > 0 && toast.type !== 'loading') {
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id)
      }, toast.duration)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [toast.id, toast.duration, toast.type, onDismiss])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeX = info.offset.x
    if (Math.abs(swipeX) > 100) {
      onDismiss(toast.id)
    } else {
      setDragX(0)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: dragX, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDrag={(_e, info) => setDragX(info.offset.x)}
      onDragEnd={handleDragEnd}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="w-full max-w-[360px] pointer-events-auto relative overflow-hidden"
      style={{
        background: 'rgba(8, 14, 20, 0.9)',
        backdropFilter: 'blur(12px)',
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: tokens.borderRadius.md,
        boxShadow: `0 10px 30px -6px rgba(0,0,0,0.5), ${cfg.glow}`,
        cursor: 'grab',
        transition: 'box-shadow 0.2s',
      }}
      whileHover={{ boxShadow: `0 10px 30px -6px rgba(0,0,0,0.7), ${cfg.glow}` }}
    >
      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && toast.type !== 'loading' && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
          style={{ backgroundColor: cfg.color }}
        />
      )}

      <div className="flex gap-3 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 text-xl font-mono leading-none mt-px"
          style={{ color: cfg.color }}
          aria-hidden="true"
        >
          {toast.type === 'loading' ? (
            <div className="animate-spin inline-block">{cfg.icon}</div>
          ) : (
            cfg.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-ink font-mono text-xs tracking-[0.5px] uppercase font-semibold">
            {toast.message}
          </div>
          {toast.description && (
            <div className="text-ink-dim text-[13px] leading-tight mt-1">
              {toast.description}
            </div>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                onDismiss(toast.id)
              }}
              className="mt-3 text-xs font-mono tracking-wider px-3 py-1 rounded border border-border hover:border-ink hover:text-cyan transition-colors"
              style={{ borderColor: cfg.color, color: cfg.color }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="text-ink-dim hover:text-ink text-xl leading-none mt-px transition-colors"
          style={{ color: cfg.color }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}, (prev, next) => prev.toast.id === next.toast.id && prev.toast.duration === next.toast.duration)

/* --------------------------------------------------------------------------
   TOAST RENDERER (PORTAL)
   -------------------------------------------------------------------------- */
export function ToastRenderer() {
  const [toasts, setToasts] = useState<Notification[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const unsubscribe = feedback.subscribeToNotifications((notification) => {
      setToasts((prev) => [...prev, notification])
    })

    return () => {
      unsubscribe()
      setToasts([])
    }
  }, [])

  // Global escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        const newest = toasts[toasts.length - 1]
        dismiss(newest.id)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [toasts, dismiss])

  return createPortal(
    <div
      aria-label="Global notifications"
      className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
