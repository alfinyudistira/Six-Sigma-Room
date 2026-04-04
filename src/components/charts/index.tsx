// src/components/charts/index.tsx
// ─── Chart Component Library — consistent dark-theme wrappers ─────────────────
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, Area, AreaChart,
} from 'recharts'
import { tokens as T } from '@/lib/tokens'
import { useConfigStore } from '@/lib/config'

// ─── Shared tooltip style ─────────────────────────────────────────────────────
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0D1520', border: `1px solid ${T.borderHi}`,
    borderRadius: 8, fontFamily: T.mono, fontSize: '0.65rem', color: T.text,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: T.cyan, fontFamily: T.mono, fontSize: '0.6rem', marginBottom: 4 },
  itemStyle:  { color: T.textMid, fontFamily: T.mono, fontSize: '0.62rem' },
}

const AXIS_STYLE = {
  tick:  { fill: T.textDim, fontFamily: T.mono, fontSize: '0.58rem' },
  axisLine:  { stroke: T.border },
  tickLine:  { stroke: T.border },
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KPICardProps {
  label: string
  value: React.ReactNode
  sub?: string
  color?: string
  icon?: string
  trend?: number   // positive = up, negative = down
  onClick?: () => void
}

export function KPICard({ label, value, sub, color = T.cyan, icon, trend, onClick }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label}: ${value}. Click for details.` : undefined}
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: '1rem 1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = color }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = T.border }}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }}
    >
      {/* Glow bg */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '50%', background: `${color}08`, filter: 'blur(20px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {icon && <span style={{ color, fontSize: '0.9rem', opacity: 0.7 }} aria-hidden="true">{icon}</span>}
      </div>

      <div style={{ color, fontFamily: T.mono, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {sub && <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.58rem' }}>{sub}</span>}
        {trend !== undefined && (
          <span style={{ color: trend >= 0 ? T.green : T.red, fontFamily: T.mono, fontSize: '0.55rem' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
interface SectionProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  color?: string
}

export function Section({ title, subtitle, action, color = T.cyan }: SectionProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
      <div>
        {subtitle && (
          <div style={{ color, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {subtitle}
          </div>
        )}
        <h2 style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: '1.25rem', ...style }}>
      {children}
    </div>
  )
}

// ─── Bar chart wrapper ────────────────────────────────────────────────────────
interface SimpleBarChartProps {
  data: Record<string, unknown>[]
  xKey: string
  bars: { key: string; color: string; label?: string }[]
  height?: number
  referenceLines?: { value: number; color: string; label: string }[]
}

export function SimpleBarChart({ data, xKey, bars, height = 220, referenceLines }: SimpleBarChartProps) {
  const { config } = useConfigStore()
  const animated = config.ui.animationsEnabled

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        {referenceLines?.map(rl => (
          <ReferenceLine key={rl.label} y={rl.value} stroke={rl.color} strokeDasharray="4 4"
            label={{ value: rl.label, fill: rl.color, fontFamily: T.mono, fontSize: '0.55rem' }} />
        ))}
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label ?? b.key} fill={b.color}
            radius={[3, 3, 0, 0]} isAnimationActive={animated} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Line chart wrapper ───────────────────────────────────────────────────────
interface SimpleLineChartProps {
  data: Record<string, unknown>[]
  xKey: string
  lines: { key: string; color: string; label?: string; dashed?: boolean }[]
  height?: number
  referenceLines?: { value: number; color: string; label: string }[]
  areas?: boolean
}

export function SimpleLineChart({ data, xKey, lines, height = 220, referenceLines, areas }: SimpleLineChartProps) {
  const { config } = useConfigStore()
  const animated = config.ui.animationsEnabled
  const ChartComp = areas ? AreaChart : LineChart

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComp data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {lines.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={l.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={l.color} stopOpacity={0} />
            </linearGradient>
          ))}
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        {referenceLines?.map(rl => (
          <ReferenceLine key={rl.label} y={rl.value} stroke={rl.color} strokeDasharray="4 4"
            label={{ value: rl.label, fill: rl.color, fontFamily: T.mono, fontSize: '0.55rem', position: 'insideTopRight' }} />
        ))}
        {lines.map(l => (
          areas
            ? <Area key={l.key} type="monotone" dataKey={l.key} name={l.label ?? l.key}
                stroke={l.color} strokeWidth={2} fill={`url(#grad-${l.key})`}
                strokeDasharray={l.dashed ? '5 5' : undefined} isAnimationActive={animated} />
            : <Line key={l.key} type="monotone" dataKey={l.key} name={l.label ?? l.key}
                stroke={l.color} strokeWidth={2} dot={{ fill: l.color, r: 3 }}
                strokeDasharray={l.dashed ? '5 5' : undefined} isAnimationActive={animated} />
        ))}
      </ChartComp>
    </ResponsiveContainer>
  )
}

// ─── Radar chart ──────────────────────────────────────────────────────────────
interface SimpleRadarChartProps {
  data: { subject: string; value: number; fullMark?: number }[]
  color?: string
  height?: number
}

export function SimpleRadarChart({ data, color = T.cyan, height = 240 }: SimpleRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke={T.border} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: T.textDim, fontFamily: T.mono, fontSize: '0.55rem' }} />
        <PolarRadiusAxis tick={{ fill: T.textDim, fontSize: '0.5rem' }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── Gauge / progress ring ────────────────────────────────────────────────────
interface GaugeProps { value: number; max: number; color: string; size?: number; label?: string }

export function Gauge({ value, max, color, size = 80, label }: GaugeProps) {
  const pct     = Math.min(value / max, 1)
  const r       = (size - 10) / 2
  const circ    = 2 * Math.PI * r
  const offset  = circ * (1 - pct)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <svg width={size} height={size} aria-label={label ? `${label}: ${value}` : undefined} role="img">
        <defs>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.surface} strokeWidth={8} />
        {/* Progress */}
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          filter="url(#gauge-glow)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontFamily={T.mono} fontWeight={700}
          fontSize={size < 70 ? '0.65rem' : '0.8rem'}>
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>}
    </div>
  )
}

// ─── Pareto combo chart ───────────────────────────────────────────────────────
interface ParetoChartProps {
  data: { category: string; count: number; cumPct: number; color?: string }[]
  cutoff?: number
  height?: number
}

export function ParetoChart({ data, cutoff = 80, height = 280 }: ParetoChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
        <XAxis dataKey="category" {...AXIS_STYLE} angle={-35} textAnchor="end" interval={0} height={60} />
        <YAxis yAxisId="left" {...AXIS_STYLE} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} {...AXIS_STYLE}
          tickFormatter={v => `${v}%`} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Bar yAxisId="left" dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? T.cyan} />)}
        </Bar>
        <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={T.red}
          strokeWidth={2} dot={{ fill: T.red, r: 3 }} name="Cumulative %" />
        <ReferenceLine yAxisId="right" y={cutoff} stroke={T.yellow} strokeDasharray="6 3"
          label={{ value: `${cutoff}%`, fill: T.yellow, fontFamily: T.mono, fontSize: '0.55rem', position: 'insideTopRight' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

