// src/pages/LiveOps.tsx
/**
 * ============================================================================
 * LIVE OPS CENTER — REAL‑TIME PERFORMANCE DASHBOARD
 * ============================================================================
 */

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor } from '@/lib/config'
import { useRealtime, useRealtimeEvent } from '@/providers/RealtimeProvider'
// 🔥 PERBAIKAN 1: Gunakan barrel import untuk hooks
import { useHaptic } from '@/hooks'
import { feedback } from '@/lib/feedback'

import { Section, Panel, KPICard, SimpleLineChart } from '@/components/charts'
import { ConnectionIndicator } from '@/components/feedback/ConnectionIndicator'
import { Badge } from '@/components/ui/Badge'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   TYPES & INTERFACES (STRICT MODE SAFE)
   -------------------------------------------------------------------------- */
interface Snapshot {
  timestamp: number
  sigma: number
  dpmo: number
  activeAlerts: number
  queueDepth: number
  throughput: number
}

interface AlertEvent {
  id: string
  time: number
  rule: string
  message: string
}

// Mendefinisikan bentuk event agar tidak dianggap 'any'
interface RealtimeSnapshotEvent {
  timestamp: number
  payload: {
    sigma: number
    dpmo: number
    activeAlerts: number
    queueDepth: number
    throughput: number
  }
}

interface RealtimeAlertEvent {
  timestamp: number
  payload: {
    rule: string
    message: string
  }
}

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */
function getTrend(snapshots: Snapshot[], key: keyof Snapshot): 'up' | 'down' | 'stable' {
  if (snapshots.length < 2) return 'stable'
  const a = snapshots[snapshots.length - 2][key] as number
  const b = snapshots[snapshots.length - 1][key] as number
  if (b > a) return 'up'
  if (b < a) return 'down'
  return 'stable'
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// 🔥 PERBAIKAN 2: Gunakan native Intl API untuk menjamin keamanan tipe data
const numFormatter = new Intl.NumberFormat('en-US')
const pctFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 })

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function LiveOps() {
  const company = useAppStore((s) => s.company)
  const config = useConfigStore((s) => s.config)
  
  // 🔥 PERBAIKAN 3: Fallback ke object kosong jika useRealtime() belum siap
  const realtimeContext = useRealtime() || {}
  const isMockMode = realtimeContext.isMockMode ?? false

  const { light } = useHaptic()

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [current, setCurrent] = useState<Snapshot | null>(null)

  // ─── REALTIME EVENT HANDLERS ──────────────────────────────────────────
  useRealtimeEvent('kpi:snapshot', (rawEvent: unknown) => {
    const event = rawEvent as RealtimeSnapshotEvent
    const snap: Snapshot = {
      timestamp: event.timestamp,
      sigma: event.payload.sigma,
      dpmo: event.payload.dpmo,
      activeAlerts: event.payload.activeAlerts,
      queueDepth: event.payload.queueDepth,
      throughput: event.payload.throughput,
    }
    setCurrent(snap)
    setSnapshots((prev) => {
      const next = [...prev, snap]
      return next.length > 30 ? next.slice(-30) : next
    })
  }, [])

  useRealtimeEvent('alert:spc', (rawEvent: unknown) => {
    const event = rawEvent as RealtimeAlertEvent
    const alertEvent: AlertEvent = {
      id: generateAlertId(),
      time: event.timestamp,
      rule: event.payload.rule,
      message: event.payload.message,
    }
    setAlerts((prev) => [alertEvent, ...prev.slice(0, 9)])
    
    feedback.notifyWarning(`SPC Rule ${alertEvent.rule} Violation`, {
      description: alertEvent.message,
      duration: 5000,
    })
    light()
  }, [light])

  // ─── DERIVED DATA ─────────────────────────────────────────────────────
  const chartData = useMemo(
    () =>
      snapshots.map((s, idx) => ({
        index: idx,
        sigma: s.sigma,
        throughput: +(s.throughput * 100).toFixed(1),
        queue: s.queueDepth,
      })),
    [snapshots]
  )

  const sigmaColor = current ? getSigmaColor(current.sigma, config).color : tokens.textDim
  const sigmaTrend = getTrend(snapshots, 'sigma')
  const isFresh = current && Date.now() - current.timestamp < 8000

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSnapshots([])
      setAlerts([])
    }
  }, [])

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={config.ui.animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={config.ui.animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <Section
        subtitle="Module 11 — Real‑time Operations"
        title={`Live Ops Center — ${company.name}`}
        action={
          <div className="flex items-center gap-4 rounded-lg border border-border bg-panel px-3 py-1.5 shadow-sm">
            <div className="flex items-center gap-2 font-mono text-[0.65rem] font-bold tracking-wider uppercase">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  isFresh ? 'animate-pulse bg-green shadow-[0_0_8px_rgba(0,255,156,0.8)]' : 'bg-yellow'
                )}
                style={{ backgroundColor: isFresh ? tokens.green : tokens.yellow }}
              />
              <span style={{ color: isFresh ? tokens.green : tokens.yellow }}>
                {isFresh ? 'LIVE' : 'STALE'}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <ConnectionIndicator />
            {isMockMode && <Badge label="SIMULATION" color="yellow" size="sm" glow />}
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Sigma"
          value={current ? current.sigma.toFixed(2) : '—'}
          color={sigmaColor}
          icon={sigmaTrend === 'up' ? '↗' : sigmaTrend === 'down' ? '↘' : 'σ'}
          sub={isFresh ? 'Real‑time' : 'Delayed'}
        />
        <KPICard
          label="DPMO"
          value={current ? numFormatter.format(current.dpmo) : '—'}
          color={current && current.dpmo < 6210 ? tokens.green : tokens.red}
          icon="⊘"
        />
        <KPICard
          label="Active Alerts"
          value={current?.activeAlerts ?? '—'}
          color={current && current.activeAlerts > 0 ? tokens.red : tokens.green}
          icon="⚠"
        />
        <KPICard
          label="Queue Depth"
          value={current?.queueDepth ?? '—'}
          color={current && current.queueDepth > 40 ? tokens.red : tokens.cyan}
          icon="≡"
          sub={company.processUnit}
        />
        <KPICard
          label="Throughput"
          value={current ? pctFormatter.format(current.throughput) : '—'}
          color={current && current.throughput > 0.95 ? tokens.green : tokens.yellow}
          icon="⚡"
        />
      </div>

      {/* Charts */}
      {snapshots.length > 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel>
            <Section subtitle="Sigma Stream" title="Performance Trend" color={tokens.cyan} />
            <SimpleLineChart
              data={chartData}
              xKey="index"
              lines={[{ key: 'sigma', color: sigmaColor, label: 'Sigma' }]}
              referenceLines={[
                { value: config.sigma.excellent, color: tokens.green, label: '4σ' },
                { value: config.sigma.acceptable, color: tokens.yellow, label: '3σ' },
              ]}
              height={240}
              areas
            />
          </Panel>
          <Panel>
            <Section subtitle="Flow Metrics" title="Queue vs Throughput" color={tokens.orange} />
            <SimpleLineChart
              data={chartData}
              xKey="index"
              lines={[
                { key: 'queue', color: tokens.orange, label: 'Queue Depth' },
                { key: 'throughput', color: tokens.green, label: 'Throughput %' },
              ]}
              height={240}
            />
          </Panel>
        </div>
      )}

      {/* Empty State */}
      {snapshots.length === 0 && (
        <Panel className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="mb-4 text-5xl"
          >
            ⚡
          </motion.div>
          <div className="font-display text-lg font-bold text-ink">Awaiting Live Stream…</div>
          <div className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-dim">
            {isMockMode ? 'Simulation starting shortly' : 'Connect to realtime data source'}
          </div>
        </Panel>
      )}

      {/* Alert Feed */}
      <Panel>
        <Section subtitle="Event Stream" title="Alerts Feed" color={tokens.red} />
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-3 flex flex-col gap-1 rounded-lg border p-3 shadow-sm transition-all"
              style={{ borderColor: `${tokens.yellow}40`, backgroundColor: `${tokens.yellow}1A` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: tokens.yellow }}>
                  Rule {alert.rule}
                </span>
                <span className="font-mono text-[10px] uppercase opacity-60" style={{ color: tokens.textDim }}>
                  {new Date(alert.time).toLocaleTimeString()}
                </span>
              </div>
              <div className="font-mono text-xs font-medium" style={{ color: tokens.textMid }}>
                {alert.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {alerts.length === 0 && (
          <div className="py-10 text-center font-mono text-xs font-bold uppercase tracking-widest opacity-30" style={{ color: tokens.textDim }}>
            No alerts received yet.
          </div>
        )}
      </Panel>
    </motion.div>
  )
}
