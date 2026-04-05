// src/components/ui/Tooltip.tsx

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  ReactNode,
  useLayoutEffect,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  title: string
  // Perbaikan: Menambahkan '| undefined' pada semua properti opsional
  description?: string | undefined
  children: ReactNode
  maxWidth?: number | undefined
  delay?: number | undefined
  followCursor?: boolean | undefined
  placement?: TooltipPlacement | undefined
  offset?: number | undefined
  arrow?: boolean | undefined
  className?: string | undefined
  triggerClassName?: string | undefined
}

/* --------------------------------------------------------------------------
   POSITIONING HELPERS
   -------------------------------------------------------------------------- */
interface Position {
  left: number
  top: number
  placement: TooltipPlacement
}

function getTooltipPosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset: number,
  followCursor?: { x: number; y: number }
): Position {
  if (followCursor) {
    return { left: followCursor.x + offset, top: followCursor.y + offset, placement: 'top' }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const margin = 12

  const tryPlacement = (p: TooltipPlacement): Position | null => {
    let l = 0, t = 0
    switch (p) {
      case 'top':
        l = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        t = triggerRect.top - tooltipRect.height - offset
        break
      case 'bottom':
        l = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        t = triggerRect.bottom + offset
        break
      case 'left':
        l = triggerRect.left - tooltipRect.width - offset
        t = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        l = triggerRect.right + offset
        t = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }
    
    // Check boundaries
    if (
      l - margin < 0 ||
      l + tooltipRect.width + margin > viewportWidth ||
      t - margin < 0 ||
      t + tooltipRect.height + margin > viewportHeight
    ) {
      return null
    }
    return { left: l, top: t, placement: p }
  }

  let result = tryPlacement(placement)
  if (!result) {
    const opposites: Record<TooltipPlacement, TooltipPlacement> = {
      top: 'bottom', bottom: 'top', left: 'right', right: 'left',
    }
    result = tryPlacement(opposites[placement])
  }
  
  if (!result) {
    // Fallback: Clamp to viewport
    let l = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
    let t = triggerRect.top - tooltipRect.height - offset
    l = Math.max(margin, Math.min(l, viewportWidth - tooltipRect.width - margin))
    t = Math.max(margin, Math.min(t, viewportHeight - tooltipRect.height - margin))
    result = { left: l, top: t, placement: 'top' }
  }
  return result
}

/* --------------------------------------------------------------------------
   TOOLTIP COMPONENT
   -------------------------------------------------------------------------- */
export function Tooltip({
  title,
  description,
  children,
  maxWidth = 280,
  delay = 300,
  followCursor = false,
  placement = 'top',
  offset = 8,
  arrow = true,
  className,
  triggerClassName,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, placement: 'top' })
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null)

  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (visible && tooltipRef.current && !tooltipRect) {
      setTooltipRect(tooltipRef.current.getBoundingClientRect())
    }
  }, [visible, tooltipRect])

  const updatePosition = useCallback(
    (cursorX?: number, cursorY?: number) => {
      if (!triggerRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      let tooltipSize = tooltipRect
      if (!tooltipSize && tooltipRef.current) {
        tooltipSize = tooltipRef.current.getBoundingClientRect()
      }
      if (!tooltipSize) return
      
      const newPos = getTooltipPosition(
        triggerRect,
        tooltipSize,
        followCursor ? 'top' : placement,
        offset,
        followCursor && cursorX !== undefined && cursorY !== undefined
          ? { x: cursorX, y: cursorY }
          : undefined
      )
      setPosition(newPos)
    },
    [tooltipRect, placement, offset, followCursor]
  )

  useEffect(() => {
    if (!visible) return
    const handleUpdate = () => updatePosition()
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    const resizeObserver = new ResizeObserver(handleUpdate)
    if (triggerRef.current) resizeObserver.observe(triggerRef.current)
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
      resizeObserver.disconnect()
    }
  }, [visible, updatePosition])

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        if (tooltipRef.current) {
          setTooltipRect(tooltipRef.current.getBoundingClientRect())
        }
        setVisible(true)
      })
    }, delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setVisible(false)
    setTooltipRect(null)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!followCursor) return
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        updatePosition(e.clientX, e.clientY)
      })
    },
    [followCursor, updatePosition]
  )

  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const handleTouchStart = () => {
    touchTimer.current = setTimeout(() => {
      updatePosition()
      setVisible(true)
    }, 500)
  }
  
  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current)
    setVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (touchTimer.current) clearTimeout(touchTimer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const arrowStyle = (): React.CSSProperties => {
    const baseArrow: React.CSSProperties = {
      position: 'absolute', width: 0, height: 0, borderStyle: 'solid', pointerEvents: 'none',
    }
    const color = tokens.panel || '#0B141E'
    
    switch (position.placement) {
      case 'top':
        return { ...baseArrow, bottom: -6, left: '50%', transform: 'translateX(-50%)', borderWidth: '6px 6px 0 6px', borderColor: `${color} transparent transparent transparent`, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }
      case 'bottom':
        return { ...baseArrow, top: -6, left: '50%', transform: 'translateX(-50%)', borderWidth: '0 6px 6px 6px', borderColor: `transparent transparent ${color} transparent` }
      case 'left':
        return { ...baseArrow, right: -6, top: '50%', transform: 'translateY(-50%)', borderWidth: '6px 0 6px 6px', borderColor: `transparent transparent transparent ${color}` }
      case 'right':
        return { ...baseArrow, left: -6, top: '50%', transform: 'translateY(-50%)', borderWidth: '6px 6px 6px 0', borderColor: `transparent ${color} transparent transparent` }
      default:
        return {}
    }
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseMove={handleMouseMove}
        onFocus={show}
        onBlur={hide}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        tabIndex={0}
        role="button"
        aria-describedby={visible ? id : undefined}
        className={cn(
          'inline-flex cursor-help items-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50',
          triggerClassName
        )}
      >
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              ref={tooltipRef}
              id={id}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: position.left,
                top: position.top,
                zIndex: 99999,
                maxWidth,
              }}
              className={cn(
                'rounded-lg border shadow-xl backdrop-blur-sm',
                'border-border bg-panel text-ink',
                className
              )}
            >
              {arrow && !followCursor && <div style={arrowStyle()} aria-hidden="true" />}
              <div className="px-3 py-2">
                <div className={cn('font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-cyan')}>
                  {title}
                </div>
                {description && (
                  <div className="mt-1 font-body text-[0.7rem] leading-relaxed text-ink-mid">
                    {description}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

/* --------------------------------------------------------------------------
   HELP ICON (convenience)
   -------------------------------------------------------------------------- */
export interface HelpTooltipProps {
  title: string
  description?: string | undefined
  placement?: TooltipPlacement | undefined
}

export function HelpTooltip({ title, description, placement }: HelpTooltipProps) {
  return (
    <Tooltip title={title} description={description} placement={placement}>
      <span
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full',
          'border border-cyan/30 bg-cyan/10 text-[0.5rem] font-mono font-bold text-cyan',
          'transition-colors hover:bg-cyan/20'
        )}
        aria-label="Help"
      >
        ?
      </span>
    </Tooltip>
  )
}
