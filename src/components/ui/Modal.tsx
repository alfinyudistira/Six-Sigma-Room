// src/components/ui/Modal.tsx
import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { haptic } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: number
  hideClose?: boolean
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 680, hideClose }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { haptic.light(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Focus trap: auto-focus close button on open
  useEffect(() => {
    if (isOpen) setTimeout(() => closeRef.current?.focus(), 50)
  }, [isOpen])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { haptic.light(); onClose() } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: '#080E14',
              border: '1px solid #1A3A5C',
              borderRadius: 12,
              width: '100%',
              maxWidth,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.06)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #112233',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'sticky', top: 0,
              background: '#080E14',
              zIndex: 1,
            }}>
              <div>
                {subtitle && (
                  <div style={{ color: '#00D4FF', fontFamily: 'Space Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    {subtitle}
                  </div>
                )}
                <div id="modal-title" style={{ color: '#E2EEF9', fontFamily: 'Syne, sans-serif', fontSize: '1.05rem', fontWeight: 700 }}>
                  {title}
                </div>
              </div>
              {!hideClose && (
                <button
                  ref={closeRef}
                  onClick={() => { haptic.light(); onClose() }}
                  aria-label="Close dialog"
                  style={{
                    background: 'transparent', border: '1px solid #112233',
                    color: '#4A6785', width: 30, height: 30, borderRadius: 4,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#FF3B5C'; (e.target as HTMLButtonElement).style.color = '#FF3B5C' }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#112233'; (e.target as HTMLButtonElement).style.color = '#4A6785' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
