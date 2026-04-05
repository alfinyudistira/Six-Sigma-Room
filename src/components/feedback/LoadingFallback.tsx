// src/components/feedback/LoadingFallback.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { tokens } from '@/lib/tokens'

export interface LoadingFallbackProps {
  message?: string
  subtitle?: string
  mini?: boolean
  fullScreen?: boolean
  noSpinner?: boolean
  accentColor?: string
  hint?: string
  staticPhase?: boolean
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(media.matches)
    
    if (media.addEventListener) {
      const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else if (media.addListener) {
      const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [])
  return reduced
}

const DEFAULT_PHASES = [
  'Initializing core systems',
  'Loading modules',
  'Hydrating state',
  'Optimizing performance',
  'Almost ready',
]

export default function LoadingFallback({
  message = 'Initializing',
  subtitle = 'SIGMA WAR ROOM KERNEL',
  mini = false,
  fullScreen = true,
  noSpinner = false,
  accentColor = tokens?.cyan ?? '#00D4FF',
  hint,
  staticPhase = false,
}: LoadingFallbackProps) {
  const reducedMotion = useReducedMotion()
  const [phaseIndex, setPhaseIndex] = useState(0)

  useEffect(() => {
    if (staticPhase || mini) return
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % DEFAULT_PHASES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [staticPhase, mini])

  const phaseText = useMemo(() => {
    if (staticPhase) return message
    return DEFAULT_PHASES[phaseIndex]
  }, [phaseIndex, staticPhase, message])

  const spinnerSize = mini ? 'w-12 h-12' : 'w-28 h-28'
  const sigmaSize = mini ? 'text-2xl' : 'text-5xl'
  const messageSize = mini ? 'text-xs' : 'text-sm'
  const subtitleSize = mini ? 'text-[8px]' : 'text-[10px]'
  const gapY = mini ? 'mt-3' : 'mt-10'

  const accent = accentColor
  const glowStyle = { textShadow: `0 0 15px ${accent}` }
  const bgColor = tokens?.bg ?? '#050A0F'

  const containerClasses = [
    'flex flex-col items-center justify-center font-mono pointer-events-none select-none',
    fullScreen ? 'min-h-screen' : 'min-h-[200px]',
    mini ? 'p-4' : 'p-8',
  ].join(' ')

  return (
    <div
      className={containerClasses}
      style={{ backgroundColor: bgColor, color: accent }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* ─── Spinner ────────────────────────────────────────────── */}
      {!noSpinner && (
        <div className={`relative flex items-center justify-center ${spinnerSize}`}>
          {!mini && (
            <div
              className="absolute w-full h-full rounded-full blur-xl opacity-30"
              style={{ background: `radial-gradient(circle, ${accent}66, transparent 70%)` }}
            />
          )}

          <div
            className={`absolute inset-0 rounded-full border-t-2 border-r-2 ${reducedMotion ? '' : 'animate-spin'}`}
            style={{ borderColor: `${accent}cc`, animationDuration: '1.2s' }}
          />

          {!reducedMotion && !mini && (
            <div
              className="absolute inset-2 rounded-full border animate-ping"
              style={{ borderColor: `${accent}80`, animationDuration: '2s' }}
            />
          )}

          <div
            className={`${sigmaSize} font-bold ${reducedMotion ? '' : 'animate-pulse'}`}
            style={glowStyle}
            aria-hidden="true"
          >
            σ
          </div>
        </div>
      )}

      {/* ─── Text Section ──────────────────────────────────────────────── */}
      <div className={`${gapY} flex flex-col items-center text-center`}>
        <p
          className={`${messageSize} tracking-[0.35em] font-semibold uppercase ${reducedMotion ? '' : 'animate-pulse'}`}
          style={{ color: accent }}
        >
          {phaseText}
        </p>

        <p
          className={`mt-2 ${subtitleSize} tracking-widest opacity-70 uppercase`}
          style={{ color: tokens?.green ?? '#00FF9C' }}
        >
          {subtitle}
        </p>

        {/* PERBAIKAN: Menggunakan Framer Motion/CSS transisi standar alih-alih 
            menginjeksi tag <style> berulang-ulang 
        */}
        {!mini && !noSpinner && !reducedMotion && (
           <div className="mt-4 w-40 h-[2px] bg-cyan-900/40 overflow-hidden rounded relative">
             <div 
               className="absolute inset-y-0 w-[40%] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[ping_2s_linear_infinite]"
               style={{ 
                  animation: 'spin 2s linear infinite', 
                  transformOrigin: 'left center' 
               }}
             />
           </div>
        )}

        {hint && (
          <p className="mt-4 text-xs opacity-50 text-center max-w-md">{hint}</p>
        )}
      </div>

      <span className="sr-only">Loading application. Please wait.</span>
    </div>
  )
}
