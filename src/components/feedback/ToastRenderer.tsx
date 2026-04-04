// src/components/feedback/ToastRenderer.tsx
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useFeedback, type Toast } from '@/services/feedback'

const TYPE_CONFIG = {
  success: { icon: '✓', color: '#00FF9C', bg: 'rgba(0,255,156,0.08)', border: 'rgba(0,255,156,0.25)' },
  error:   { icon: '✕', color: '#FF3B5C', bg: 'rgba(255,59,92,0.08)', border: 'rgba(255,59,92,0.25)' },
  warning: { icon: '⚠', color: '#FFD60A', bg: 'rgba(255,214,10,0.08)', border: 'rgba(255,214,10,0.25)' },
  info:    { icon: 'ℹ', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.25)' },
  loading: { icon: '⟳', color: '#00D4FF', bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)' },
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useFeedback()
  const cfg = TYPE_CONFIG[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 8,
        padding: '0.75rem 1rem',
        maxWidth: 340,
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar (auto-dismiss) */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: cfg.color, transformOrigin: 'left',
          }}
        />
      )}

      {/* Content */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
        <span
          style={{ color: cfg.color, fontFamily: 'Space Mono, monospace', fontSize: '0.85rem', flexShrink: 0 }}
          aria-hidden="true"
          className={toast.type === 'loading' ? 'toast-spin' : ''}
        >
          {cfg.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#E2EEF9', fontFamily: 'Space Mono, monospace', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em' }}>
            {toast.title}
          </div>
          {toast.message && (
            <div style={{ color: '#7A99B8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', marginTop: '0.2rem', lineHeight: 1.5 }}>
              {toast.message}
            </div>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                marginTop: '0.5rem', background: 'transparent', border: `1px solid ${cfg.border}`,
                color: cfg.color, padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          style={{
            background: 'transparent', border: 'none', color: '#4A6785',
            cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem', flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .toast-spin { display: inline-block; animation: spin 1s linear infinite; }
      `}</style>
    </motion.div>
  )
}

export function ToastRenderer() {
  const { toasts } = useFeedback()

  return createPortal(
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
