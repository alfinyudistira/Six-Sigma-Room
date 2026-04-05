// src/components/ui/Counter.tsx
/**
 * ============================================================================
 * COUNTER — SMOOTH NUMBER ANIMATION WITH ACCESSIBILITY
 * ============================================================================
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
// 🔥 PERBAIKAN 1: Import terpusat dari barrel hooks
import { useHaptic, useReducedMotion } from '@/hooks'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export interface CounterProps {
  value: number
  decimals?: number
  duration?: number
  color?: string
  prefix?: string
  suffix?: string
  className?: string
  minDelta?: number
  easing?: (t: number) => number
  locale?: string
  onComplete?: (finalValue: number) => void
  hapticOnComplete?: boolean
  ariaLabel?: string
}

/* --------------------------------------------------------------------------
   DEFAULT EASING
   -------------------------------------------------------------------------- */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/* --------------------------------------------------------------------------
   HOOK: useFormatter
   -------------------------------------------------------------------------- */
function useFormatter(locale: string, decimals: number): Intl.NumberFormat {
  return useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [locale, decimals]
  )
}

/* --------------------------------------------------------------------------
   COUNTER COMPONENT
   -------------------------------------------------------------------------- */
export function Counter({
  value,
  decimals = 0,
  duration = 1000,
  color = tokens.cyan,
  prefix = '',
  suffix = '',
  className,
  minDelta = 0.001,
  easing = easeOutCubic,
  locale = 'en-US',
  onComplete,
  hapticOnComplete = false,
  ariaLabel,
}: CounterProps) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | null>(null)
  const startValueRef = useRef(value)
  const startTimeRef = useRef<number | null>(null)
  
  const { light } = useHaptic()
  const prefersReducedMotion = useReducedMotion()
  const formatter = useFormatter(locale, decimals)

  const shouldAnimate = !prefersReducedMotion && duration > 0

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => {
    const prev = startValueRef.current
    const delta = Math.abs(value - prev)

    // Skip animation jika perubahan terlalu kecil atau user tidak suka animasi
    if (delta < minDelta || !shouldAnimate) {
      setDisplay(value)
      startValueRef.current = value
      onComplete?.(value)
      if (hapticOnComplete && delta > 0) light()
      return
    }

    cancelAnimation()

    startTimeRef.current = null
    const baseValue = prev // Capture current value as starting point for this cycle

    const animate = (time: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = time
      }

      const elapsed = time - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easing(progress)
      
      const current = baseValue + (value - baseValue) * eased
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Selesai
        setDisplay(value)
        startValueRef.current = value
        startTimeRef.current = null
        rafRef.current = null
        onComplete?.(value)
        if (hapticOnComplete) light()
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimation()
  }, [
    value,
    duration,
    easing,
    minDelta,
    shouldAnimate,
    cancelAnimation,
    onComplete,
    hapticOnComplete,
    light,
  ])

  const formatted = useMemo(() => formatter.format(display), [display, formatter])

  return (
    <span
      className={className}
      style={{
        color,
        fontFamily: tokens.font.mono,
        fontWeight: 700,
        // 🔥 PERBAIKAN 2: tabular-nums mencegah angka "goyang" saat berubah (Layout Shift)
        fontVariantNumeric: 'tabular-nums',
      }}
      aria-label={ariaLabel ?? `${prefix}${value}${suffix}`}
      // 🔥 PERBAIKAN 3: Role "status" lebih tepat secara aksesibilitas daripada "text" yang non-standar
      role="status"
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
