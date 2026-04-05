// src/components/ui/Badge.tsx
/**
 * ============================================================================
 * BADGE & STATUS COMPONENTS — REUSABLE, ACCESSIBLE, TAILWIND + TOKENS
 * ============================================================================
 */

import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export type BadgeColor = 'cyan' | 'green' | 'red' | 'yellow' | 'orange' | 'dim'
export type BadgeSize = 'sm' | 'md'

/* --------------------------------------------------------------------------
   STYLING CONFIGURATION
   -------------------------------------------------------------------------- */
// 🔥 PERBAIKAN 1: Sinkronisasi warna dengan tokens.ts (green, red, yellow)
const badgeColorStyles: Record<BadgeColor, { bg: string; border: string; text: string; glow: string }> = {
  cyan: {
    bg: 'bg-cyan/10',
    border: 'border-cyan/30',
    text: 'text-cyan',
    glow: 'shadow-[0_0_8px_rgba(0,212,255,0.3)]',
  },
  green: {
    bg: 'bg-green/10',
    border: 'border-green/30',
    text: 'text-green',
    glow: 'shadow-[0_0_8px_rgba(0,255,156,0.3)]',
  },
  red: {
    bg: 'bg-red/10',
    border: 'border-red/30',
    text: 'text-red',
    glow: 'shadow-[0_0_8px_rgba(255,59,92,0.3)]',
  },
  yellow: {
    bg: 'bg-yellow/10',
    border: 'border-yellow/30',
    text: 'text-yellow',
    glow: 'shadow-[0_0_8px_rgba(255,214,10,0.3)]',
  },
  orange: {
    bg: 'bg-orange/10',
    border: 'border-orange/30',
    text: 'text-orange',
    glow: 'shadow-[0_0_8px_rgba(255,140,0,0.3)]',
  },
  dim: {
    bg: 'bg-surface/80',
    border: 'border-border',
    text: 'text-ink-dim',
    glow: '',
  },
}

const badgeSizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[0.6rem]',
  md: 'px-2 py-0.5 text-[0.65rem]',
}

/* --------------------------------------------------------------------------
   BADGE COMPONENT
   -------------------------------------------------------------------------- */
export interface BadgeProps {
  label: string
  color?: BadgeColor
  size?: BadgeSize
  glow?: boolean
  outline?: boolean
  className?: string
  'aria-label'?: string
}

export function Badge({
  label,
  color = 'cyan',
  size = 'sm',
  glow = false,
  outline = false,
  className,
  'aria-label': ariaLabel,
}: BadgeProps) {
  const styles = badgeColorStyles[color]
  const sizeClass = badgeSizeStyles[size]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-mono font-bold uppercase tracking-wider border',
        sizeClass,
        outline
          ? 'bg-transparent'
          : `${styles.bg} ${styles.border} ${styles.text}`,
        outline ? styles.border : '',
        !outline && styles.text,
        glow && styles.glow,
        className
      )}
      style={outline ? { color: tokens[color === 'dim' ? 'textDim' : color] } : undefined}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </span>
  )
}

/* --------------------------------------------------------------------------
   STATUS DOT
   -------------------------------------------------------------------------- */
export interface StatusDotProps {
  active?: boolean
  color?: string
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

export function StatusDot({
  active = true,
  color = tokens.green,
  pulse = true,
  size = 'sm',
  className,
  'aria-label': ariaLabel,
}: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'

  return (
    <span
      className={cn(
        'inline-block rounded-full transition-all',
        sizeClass,
        active ? (pulse ? 'animate-pulse' : '') : 'bg-white/20',
        className
      )}
      style={{
        backgroundColor: active ? color : undefined,
        boxShadow: active && pulse ? `0 0 8px ${color}` : undefined,
      }}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel ?? (active ? 'Active' : 'Inactive')}
    />
  )
}

/* --------------------------------------------------------------------------
   KPI CHIP
   -------------------------------------------------------------------------- */
export interface KPIChipProps {
  label: string
  value: string | number
  color?: BadgeColor
  unit?: string
  className?: string
}

export function KPIChip({ label, value, color = 'cyan', unit, className }: KPIChipProps) {
  const styles = badgeColorStyles[color]

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border px-3 py-1.5 text-center',
        styles.bg,
        styles.border,
        className
      )}
    >
      <span className="font-mono text-[0.5rem] font-bold uppercase tracking-[0.1em] opacity-60" style={{ color: tokens.textDim }}>
        {label}
      </span>
      <span className={cn('font-mono text-sm font-bold leading-tight', styles.text)}>
        {value}
        {unit && <span className="ml-0.5 text-[0.6rem] font-normal opacity-50">{unit}</span>}
      </span>
    </div>
  )
}

/* --------------------------------------------------------------------------
   DEMO TAG
   -------------------------------------------------------------------------- */
export function DemoTag({ className }: { className?: string }) {
  return <Badge label="DEMO" color="yellow" size="sm" glow className={className} />
}
