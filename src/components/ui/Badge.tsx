// src/components/ui/Badge.tsx
import { cn } from '@/lib/utils'

type Color = 'cyan' | 'green' | 'red' | 'yellow' | 'orange' | 'dim'

const colorMap: Record<Color, { bg: string; border: string; text: string; glow?: string }> = {
  cyan:   { bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.3)',   text: '#00D4FF', glow: 'rgba(0,212,255,0.2)' },
  green:  { bg: 'rgba(0,255,156,0.1)',   border: 'rgba(0,255,156,0.3)',   text: '#00FF9C', glow: 'rgba(0,255,156,0.2)' },
  red:    { bg: 'rgba(255,59,92,0.1)',   border: 'rgba(255,59,92,0.3)',   text: '#FF3B5C', glow: 'rgba(255,59,92,0.2)' },
  yellow: { bg: 'rgba(255,214,10,0.1)',  border: 'rgba(255,214,10,0.3)',  text: '#FFD60A' },
  orange: { bg: 'rgba(255,140,0,0.1)',   border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  dim:    { bg: 'rgba(13,21,32,0.8)',    border: '#112233',               text: '#4A6785' },
}

interface BadgeProps {
  label: string
  color?: Color
  className?: string
  glow?: boolean
}

export function Badge({ label, color = 'cyan', glow = false, className }: BadgeProps) {
  const c = colorMap[color]
  return (
    <span
      className={cn('inline-block px-2 py-0.5 rounded text-[10px] font-mono tracking-widest uppercase', className)}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        boxShadow: glow && c.glow ? `0 0 8px ${c.glow}` : undefined,
      }}
    >
      {label}
    </span>
  )
}

// ─── Status dot (live indicator) ──────────────────────────────────────────────
interface StatusDotProps { active?: boolean; color?: string; pulse?: boolean }

export function StatusDot({ active = true, color = '#00FF9C', pulse = true }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 7, height: 7,
        borderRadius: '50%',
        background: active ? color : '#4A6785',
        boxShadow: active ? `0 0 8px ${color}` : undefined,
        animation: active && pulse ? 'pulse 2s infinite' : undefined,
        flexShrink: 0,
      }}
    />
  )
}

// ─── KPI chip for header bar ──────────────────────────────────────────────────
interface KPIChipProps {
  label: string
  value: string | number
  color?: Color
  unit?: string
}

export function KPIChip({ label, value, color = 'cyan', unit }: KPIChipProps) {
  const c = colorMap[color]
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        padding: '0.25rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <span style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: c.text, fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2 }}>
        {value}{unit ? <span style={{ fontSize: '0.55rem', opacity: 0.7, marginLeft: 2 }}>{unit}</span> : null}
      </span>
    </div>
  )
}

// ─── Demo mode tag ────────────────────────────────────────────────────────────
export function DemoTag() {
  return (
    <span style={{
      background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.3)',
      borderRadius: 3, color: '#FFD60A', fontFamily: 'Space Mono, monospace',
      fontSize: '0.48rem', padding: '0.15rem 0.4rem', letterSpacing: '0.12em',
    }}>
      DEMO
    </span>
  )
}
