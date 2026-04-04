// src/components/ui/Tooltip.tsx
import { useState, useRef, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  title: string
  description?: string
  children: ReactNode
  maxWidth?: number
}

export function Tooltip({ title, description, children, maxWidth = 280 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const triggerRef            = useRef<HTMLSpanElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
      setVisible(true)
    }, 350)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
        tabIndex={0}
        role="button"
        aria-describedby={visible ? 'tooltip-content' : undefined}
      >
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              id="tooltip-content"
              role="tooltip"
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -100%)',
                zIndex: 99999,
                maxWidth,
                background: '#0D1520',
                border: '1px solid #1A3A5C',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(0,212,255,0.08)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ color: '#00D4FF', fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.08em', marginBottom: description ? '0.4rem' : 0 }}>
                {title}
              </div>
              {description && (
                <div style={{ color: '#7A99B8', fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', lineHeight: 1.6 }}>
                  {description}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

// ─── Help icon trigger ────────────────────────────────────────────────────────
interface HelpTooltipProps { title: string; description?: string }

export function HelpTooltip({ title, description }: HelpTooltipProps) {
  return (
    <Tooltip title={title} description={description}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)',
        color: '#00D4FF', fontSize: '0.5rem', fontFamily: 'Space Mono, monospace',
        flexShrink: 0, userSelect: 'none',
      }}>
        ?
      </span>
    </Tooltip>
  )
}
