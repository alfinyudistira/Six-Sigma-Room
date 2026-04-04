// src/components/ui/Counter.tsx
import { useState, useEffect, useRef } from 'react'

interface CounterProps {
  value: number
  decimals?: number
  duration?: number
  color?: string
  prefix?: string
  suffix?: string
  className?: string
}

export function Counter({
  value,
  decimals = 0,
  duration = 1200,
  color,
  prefix = '',
  suffix = '',
  className,
}: CounterProps) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>()
  const prevValue = useRef(0)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = prevValue.current
    const end = value
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + eased * (end - start)
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplay(end)
        prevValue.current = end
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString()

  return (
    <span
      className={className}
      style={{ color, fontFamily: 'Space Mono, monospace', fontWeight: 700 }}
      aria-label={`${prefix}${value}${suffix}`}
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
