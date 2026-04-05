// src/components/ui/Confirm.tsx

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useHaptic } from '@/hooks'
import { tokens } from '@/lib/tokens'

export type ConfirmVariant = 'danger' | 'warning' | 'primary'

export interface ConfirmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onConfirm: () => void
  label?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  message?: React.ReactNode
  variant?: ConfirmVariant
  icon?: React.ReactNode
  'data-testid'?: string
}

const variantStyles: Record<ConfirmVariant, { bg: string; border: string; text: string; confirmBg: string }> = {
  danger: {
    bg: 'bg-red/10',
    border: 'border-red/40',
    text: 'text-red',
    confirmBg: 'bg-red',
  },
  warning: {
    bg: 'bg-yellow/10',
    border: 'border-yellow/40',
    text: 'text-yellow',
    confirmBg: 'bg-yellow',
  },
  primary: {
    bg: 'bg-cyan/10',
    border: 'border-cyan/40',
    text: 'text-cyan',
    confirmBg: 'bg-cyan',
  },
}

/* --------------------------------------------------------------------------
   HOOK: Reduced Motion
   -------------------------------------------------------------------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (ev: MediaQueryListEvent) => setReduced(ev.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/* --------------------------------------------------------------------------
   COMPONENT
   -------------------------------------------------------------------------- */
export function ConfirmButton({
  onConfirm,
  label = 'Confirm',
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  message,
  variant = 'warning',
  icon,
  className,
  'data-testid': dataTestId,
  disabled,
  ...btnProps
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const { light, medium } = useHaptic()
  const prefersReducedMotion = usePrefersReducedMotion()
  const styles = variantStyles[variant]

  // Auto‑focus confirm button
  useEffect(() => {
    if (confirming) {
      const timer = setTimeout(() => confirmRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [confirming])

  // Escape to cancel
  useEffect(() => {
    if (!confirming) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        light()
        setConfirming(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming, light])

  // Click outside to cancel
  useEffect(() => {
    if (!confirming) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        light()
        setConfirming(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [confirming, light])

  if (disabled) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border/50 bg-surface/30 px-3 py-1.5 text-xs font-mono font-bold text-ink-dim/40',
          className
        )}
        {...btnProps}
      >
        {icon && <span aria-hidden>{icon}</span>}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div ref={rootRef} className={cn('inline-flex items-center', className)} data-testid={dataTestId ?? 'confirm-root'}>
      <AnimatePresence mode="wait" initial={false}>
        {!confirming ? (
          <motion.button
            key="primary"
            type="button"
            onClick={() => {
              light()
              setConfirming(true)
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all',
              styles.bg,
              styles.border,
              styles.text,
              'hover:brightness-125 active:scale-95'
            )}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            aria-haspopup="true"
            aria-expanded="false"
            data-testid={dataTestId ?? 'confirm-button'}
            {...btnProps}
          >
            {icon && <span aria-hidden>{icon}</span>}
            <span>{label}</span>
          </motion.button>
        ) : (
          <motion.div
            key="confirm-ui"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
            className="inline-flex items-center gap-2 rounded-lg bg-panel p-1 border border-border/50 shadow-xl"
            role="group"
            aria-label="Confirm action"
            data-testid={dataTestId ?? 'confirm-ui'}
          >
            {message && (
              <span className="px-2 font-mono text-[10px] font-bold uppercase text-ink-dim/80">{message}</span>
            )}

            <button
              ref={confirmRef}
              type="button"
              onClick={() => {
                medium()
                onConfirm()
                setConfirming(false)
              }}
              className={cn(
                'inline-flex items-center rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-bg transition-transform active:scale-90',
                styles.confirmBg
              )}
              style={{ backgroundColor: tokens[variant === 'primary' ? 'cyan' : variant === 'danger' ? 'red' : 'yellow'] }}
              data-testid={dataTestId ?? 'confirm-yes'}
            >
              {confirmLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                light()
                setConfirming(false)
              }}
              className="inline-flex items-center rounded-md border border-border bg-transparent px-2 py-1 text-[10px] font-mono font-bold text-ink-dim transition-colors hover:bg-white/5 hover:text-ink"
              data-testid={dataTestId ?? 'confirm-cancel'}
            >
              {cancelLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
