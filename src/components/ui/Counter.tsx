// src/components/ui/Counter.tsx
/**
 * ============================================================================
 * COUNTER — SMOOTH NUMBER ANIMATION WITH PRECISION LOGIC
 * ============================================================================
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useHaptic } from '@/hooks'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export interface CounterProps {
  value: number
  decimals?: number | undefined
  duration?: number | undefined
  color?: string | undefined
  prefix?: string | undefined
  suffix?: string | undefined
  className?: string | undefined
  minDelta?: number | undefined
  easing?: ((t: number) => number) | undefined
  locale?: string | undefined
  onComplete?: ((finalValue: number) => void) | undefined
  hapticOnComplete?: boolean | undefined
  ariaLabel?: string | undefined
}

/* --------------------------------------------------------------------------
   LOCAL HOOK: Reduced Motion (Safety Fix)
   -------------------------------------------------------------------------- */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(media.matches)
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])
  return reduced
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/* --------------------------------------------------------------------------
   COUNTER COMPONENT
   -------------------------------------------------------------------------- */
export function Counter({
  value,
  decimals = 0,
  duration = 1000,
  color,
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

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
    [locale, decimals]
  )

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

    if (delta < minDelta || !shouldAnimate) {
      setDisplay(value)
      startValueRef.current = value
      onComplete?.(value)
      if (hapticOnComplete && delta > 0) light()
      return
    }

    cancelAnimation()
    startTimeRef.current = null
    const baseValue = prev 

    const animate = (time: number) => {
      if (startTimeRef.current === null) startTimeRef.current = time
      const elapsed = time - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easing(progress)
      
      const current = baseValue + (value - baseValue) * eased
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
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
  }, [value, duration, easing, minDelta, shouldAnimate, cancelAnimation, onComplete, hapticOnComplete, light])

  const formatted = useMemo(() => formatter.format(display), [display, formatter])

  return (
    <span
      className={className}
      style={{
        color: color || (tokens as any).cyan,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums', // Top Tier: Angka tidak goyang saat ganti
      }}
      aria-label={ariaLabel ?? `${prefix}${value}${suffix}`}
      role="status"
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
