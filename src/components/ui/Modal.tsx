// src/components/ui/Modal.tsx
import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  ReactNode,
  useId,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'
// 🔥 PERBAIKAN: Import dari barrel hooks utama
import { useHaptic } from '@/hooks'

/* --------------------------------------------------------------------------
   HOOKS (Internalized for portability)
   -------------------------------------------------------------------------- */
function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => Array.from(containerRef.current!.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((el) => !el.hasAttribute('disabled'))

    const focusable = getFocusable()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const previousFocus = document.activeElement as HTMLElement
    
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isActive, containerRef])
}

function usePreventScroll(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return
    const originalStyle = window.getComputedStyle(document.body).overflow
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    
    return () => {
      document.body.style.overflow = originalStyle
      document.body.style.paddingRight = '0px'
    }
  }, [isActive])
}

/* --------------------------------------------------------------------------
   MODAL COMPONENT
   -------------------------------------------------------------------------- */
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: number
  hideClose?: boolean
  closeOnOverlayClick?: boolean
  zIndex?: number
  className?: string
  hapticFeedback?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 640,
  hideClose = false,
  closeOnOverlayClick = true,
  zIndex = 10000,
  className,
  hapticFeedback = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { light: hapticLight } = useHaptic()
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  // Hydration guard
  useEffect(() => setMounted(true), [])

  useFocusTrap(isOpen, modalRef)
  usePreventScroll(isOpen)

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hapticFeedback) hapticLight()
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, hapticFeedback, hapticLight])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" 
          style={{ zIndex }}
        >
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => closeOnOverlayClick && onClose()}
          />

          {/* Modal Content */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl',
              className
            )}
            style={{ maxWidth }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/50 bg-panel/50 px-6 py-4 backdrop-blur-sm">
              <div className="space-y-1">
                {subtitle && (
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan/80">
                    {subtitle}
                  </p>
                )}
                <h2 id={titleId} className="font-display text-xl font-bold text-ink">
                  {title}
                </h2>
              </div>
              {!hideClose && (
                <button
                  onClick={() => {
                    if (hapticFeedback) hapticLight()
                    onClose()
                  }}
                  className="group flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:border-red/50 hover:bg-red/5"
                >
                  <span className="text-lg text-ink-dim group-hover:text-red">✕</span>
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="max-h-[70vh] overflow-y-auto p-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/**
 * Hook utilitas untuk manajemen state modal
 */
export function useModal(initial = false) {
  const [isOpen, setIsOpen] = useState(initial)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)
  return { isOpen, open, close, toggle, setOpen: setIsOpen }
}
