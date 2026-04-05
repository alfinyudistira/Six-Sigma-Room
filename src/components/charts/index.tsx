// src/components/charts/index.tsx

import React, { memo, useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  Area,
  AreaChart,
} from 'recharts'

import { tokens } from '@/lib/tokens'
import { useConfigStore } from '@/lib/config'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   HOOK: CHART CONFIG (theme + animation)
   -------------------------------------------------------------------------- */
function useChartConfig() {
  const { config } = useConfigStore()
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(media.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  const animated = config.ui.animationsEnabled && !prefersReduced

  return useMemo(
    () => ({
      animated,
      axis: {
        tick: {
          fill: tokens.textDim,
          fontFamily: tokens.font.mono,
          fontSize: 9, // Menggunakan angka murni untuk Recharts
        },
        axisLine: { stroke: tokens.border },
        tickLine: { stroke: tokens.border },
      },
      tooltip: {
        contentStyle: {
          background: tokens.panel,
          border: `1px solid ${tokens.borderHi}`,
          borderRadius: tokens.borderRadius.md,
          fontFamily: tokens.font.mono,
          fontSize: '0.65rem',
          color: tokens.text,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        },
        labelStyle: { color: tokens.cyan, fontSize: '0.6rem' },
        itemStyle: { color: tokens.textMid, fontSize: '0.62rem' },
      },
    }),
    [animated]
  )
}

/* --------------------------------------------------------------------------
   KPI CARD
   -------------------------------------------------------------------------- */
export interface KPICardProps {
  label: string
  value: React.ReactNode
  sub?: string
  color?: string
  icon?: string
  trend?: number
  onClick?: () => void
}

export const KPICard = memo(function KPICard({
  label,
  value,
  sub,
  color = tokens.cyan,
  icon,
  trend,
  onClick,
}: KPICardProps) {
  const interactive = !!onClick

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) onClick?.()
      }}
      className={cn(
        'relative flex flex-col gap-1 rounded-xl border p-5 transition-all',
        interactive && 'cursor-pointer hover:scale-[1.02] active:scale-95'
      )}
      style={{
        background: tokens.panel,
        borderColor: tokens.border,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-20"
        style={{ background: color }}
      />

      <div className="flex items-start justify-between">
        <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-[1px]" style={{ color: tokens.textDim }}>
          {label}
        </span>
        {icon && <span className="text-xl" style={{ color }} aria-hidden="true">{icon}</span>}
      </div>

      <div className="font-mono text-2xl font-bold tracking-tighter" style={{ color }}>
        {value}
      </div>

      <div className="flex items-center gap-3">
        {sub && <span className="font-mono text-[10px]" style={{ color: tokens.textDim }}>{sub}</span>}
        {trend !== undefined && (
          <span
            className="font-mono text-[10px] flex items-center gap-px font-bold"
            style={{ color: trend >= 0 ? tokens.green : tokens.red }}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
})

/* --------------------------------------------------------------------------
   SECTION HEADER
   -------------------------------------------------------------------------- */
export interface SectionProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  color?: string
}

export function Section({ title, subtitle, action, color = tokens.cyan }: SectionProps) {
  return (
    <div className="mb-6 flex items-end justify-between px-1">
      <div>
        {subtitle && (
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
            {subtitle}
          </div>
        )}
        <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: tokens.text }}>{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* --------------------------------------------------------------------------
   PANEL WRAPPER
   -------------------------------------------------------------------------- */
export function Panel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border bg-panel p-6 shadow-sm', className)}
      style={{ borderColor: tokens.border }}
      {...props}
    >
      {children}
    </div>
  )
}

/* --------------------------------------------------------------------------
   BAR CHART
   -------------------------------------------------------------------------- */
export interface SimpleBarChartProps {
  data: Record<string, unknown>[]
  xKey: string
  bars: { key: string; color: string; label?: string }[]
  height?: number
  referenceLines?: { value: number; color: string; label: string }[]
}

export const SimpleBarChart = memo(function SimpleBarChart({
  data,
  xKey,
  bars,
  height = 240,
  referenceLines,
}: SimpleBarChartProps) {
  const cfg = useChartConfig()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
        <CartesianGrid stroke={tokens.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} {...cfg.axis} />
        <YAxis {...cfg.axis} />
        <Tooltip {...cfg.tooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

        {referenceLines?.map((rl) => (
          <ReferenceLine
            key={rl.label}
            y={rl.value}
            stroke={rl.color}
            strokeDasharray="4 4"
            label={{ value: rl.label, fill: rl.color, fontSize: 10, fontFamily: tokens.font.mono }}
          />
        ))}

        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label ?? bar.key}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
            isAnimationActive={cfg.animated}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
})

/* --------------------------------------------------------------------------
   LINE / AREA CHART
   -------------------------------------------------------------------------- */
export interface SimpleLineChartProps {
  data: Record<string, unknown>[]
  xKey: string
  lines: { key: string; color: string; label?: string; dashed?: boolean }[]
  areas?: boolean
  height?: number
  referenceLines?: { value: number; color: string; label: string }[]
}

export const SimpleLineChart = memo(function SimpleLineChart({
  data,
  xKey,
  lines,
  areas = false,
  height = 240,
  referenceLines,
}: SimpleLineChartProps) {
  const cfg = useChartConfig()
  const ChartComponent = areas ? AreaChart : LineChart

  const gradientIds = useMemo(() => lines.map((line) => `grad-${line.key}`), [lines])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
        <defs>
          {lines.map((line, i) => (
            <linearGradient key={line.key} id={gradientIds[i]} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={line.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid stroke={tokens.border} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} {...cfg.axis} />
        <YAxis {...cfg.axis} />
        <Tooltip {...cfg.tooltip} />

        {referenceLines?.map((rl) => (
          <ReferenceLine
            key={rl.label}
            y={rl.value}
            stroke={rl.color}
            strokeDasharray="4 4"
            label={{ value: rl.label, fill: rl.color, fontSize: 10, fontFamily: tokens.font.mono }}
          />
        ))}

        {lines.map((line, i) =>
          areas ? (
            <Area
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label ?? line.key}
              stroke={line.color}
              strokeWidth={2}
              fill={`url(#${gradientIds[i]})`}
              strokeDasharray={line.dashed ? '5 5' : undefined}
              isAnimationActive={cfg.animated}
            />
          ) : (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label ?? line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: tokens.bg, strokeWidth: 2 }}
              strokeDasharray={line.dashed ? '5 5' : undefined}
              isAnimationActive={cfg.animated}
            />
          )
        )}
      </ChartComponent>
    </ResponsiveContainer>
  )
})

/* --------------------------------------------------------------------------
   RADAR CHART
   -------------------------------------------------------------------------- */
export interface SimpleRadarChartProps {
  data: { subject: string; value: number; fullMark?: number }[]
  color?: string
  height?: number
}

export const SimpleRadarChart = memo(function SimpleRadarChart({
  data,
  color = tokens.cyan,
  height = 260,
}: SimpleRadarChartProps) {
  const cfg = useChartConfig()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke={tokens.border} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: tokens.textDim, fontFamily: tokens.font.mono, fontSize: 9 }}
        />
        <PolarRadiusAxis tick={{ fill: tokens.textDim, fontSize: 8 }} axisLine={false} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        <Tooltip {...cfg.tooltip} />
      </RadarChart>
    </ResponsiveContainer>
  )
})

/* --------------------------------------------------------------------------
   GAUGE / PROGRESS RING
   -------------------------------------------------------------------------- */
export interface GaugeProps {
  value: number
  max: number
  color: string
  size?: number
  label?: string
}

export const Gauge = memo(function Gauge({
  value, max, color, size = 88, label,
}: GaugeProps) {
  const percent = Math.min(Math.max(value / max, 0), 1)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} role="img" aria-label={label ? `${label}: ${value}` : undefined}>
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tokens.border} strokeWidth={8} />

        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#gauge-glow)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />

        <text
          x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontFamily={tokens.font.mono} fontWeight={700} fontSize={size < 80 ? 14 : 18}
        >
          {Math.round(percent * 100)}%
        </text>
      </svg>
      {label && <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: tokens.textDim }}>{label}</span>}
    </div>
  )
})

/* --------------------------------------------------------------------------
   PARETO CHART (COMPOSED)
   -------------------------------------------------------------------------- */
export interface ParetoChartProps {
  data: { category: string; count: number; cumPct: number; color?: string }[]
  cutoff?: number
  height?: number
}

export const ParetoChart = memo(function ParetoChart({
  data, cutoff = 80, height = 300,
}: ParetoChartProps) {
  const cfg = useChartConfig()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 40, left: -20, bottom: 40 }}>
        <CartesianGrid stroke={tokens.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="category"
          {...cfg.axis}
          angle={-30}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis yAxisId="left" {...cfg.axis} />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          {...cfg.axis}
        />
        <Tooltip {...cfg.tooltip} />

        <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={cfg.animated}>
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color ?? tokens.cyan} />
          ))}
        </Bar>

        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumPct"
          stroke={tokens.red}
          strokeWidth={2}
          dot={{ fill: tokens.red, r: 3, strokeWidth: 0 }}
          name="Cumulative %"
          isAnimationActive={cfg.animated}
        />

        <ReferenceLine
          yAxisId="right"
          y={cutoff}
          stroke={tokens.yellow}
          strokeDasharray="5 5"
          label={{
            value: `${cutoff}%`,
            fill: tokens.yellow,
            fontSize: 10,
            position: 'insideTopRight',
            fontFamily: tokens.font.mono
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
})
