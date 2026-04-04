// src/components/ui/Confirm.tsx
import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '@/lib/utils'

interface ConfirmButtonProps {
  onConfirm: () => void
  label: string
  confirmLabel?: string
  cancelLabel?: string
  message?: string
  variant?: 'danger' | 'warning' | 'primary'
  icon?: string
  children?: ReactNode
}

const variantStyles = {
  danger:  { color: '#FF3B5C', bg: 'rgba(255,59,92,0.08)',  border: 'rgba(255,59,92,0.3)'  },
  warning: { color: '#FFD60A', bg: 'rgba(255,214,10,0.08)', border: 'rgba(255,214,10,0.3)' },
  primary: { color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.3)'  },
}

export function ConfirmButton({
  onConfirm, label, confirmLabel = 'Yes', cancelLabel = 'Cancel',
  message, variant = 'warning', icon, children,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const v = variantStyles[variant]

  if (confirming) return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
          background: v.bg, border: `1px solid ${v.border}`,
          borderRadius: 6, padding: '0.4rem 0.75rem',
        }}
      >
        {message && (
          <span style={{ color: v.color, fontFamily: 'Space Mono, monospace', fontSize: '0.6rem' }}>
            {message}
          </span>
        )}
        <button
          onClick={() => { haptic.medium(); onConfirm(); setConfirming(false) }}
          style={{
            background: v.color, border: 'none', color: '#050A0F',
            padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', fontWeight: 700,
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={() => { haptic.light(); setConfirming(false) }}
          style={{
            background: 'transparent', border: '1px solid #112233', color: '#4A6785',
            padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'Space Mono, monospace', fontSize: '0.6rem',
          }}
        >
          {cancelLabel}
        </button>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <button
      onClick={() => { haptic.light(); setConfirming(true) }}
      style={{
        background: v.bg, border: `1px solid ${v.border}`, color: v.color,
        padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer',
        fontFamily: 'Space Mono, monospace', fontSize: '0.65rem',
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        transition: 'all 0.15s',
      }}
    >
      {icon && <span>{icon}</span>}
      {children ?? label}
    </button>
  )
}
