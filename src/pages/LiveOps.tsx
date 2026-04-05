/**
 * ============================================================================
 * LIVE OPS CENTER — REAL‑TIME PERFORMANCE DASHBOARD (ENTERPRISE EDITION)
 * ============================================================================
 */

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor } from '@/lib/config'
import { useRealtime, useRealtimeEvent } from '@/providers/RealtimeProvider'
import { useHaptic } from '@/hooks'
import { feedback } from '@/lib/feedback'

import { Section, Panel, KPICard, SimpleLineChart } from '@/components/charts'
import { ConnectionIndicator } from '@/components/feedback/ConnectionIndicator'
import { Badge } from '@/components/ui/Badge'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   TYPES & INTERFACES (STRICT MODE SAFE & SCALABLE)
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

interface RealtimeSnapshotEvent {
  timestamp: number
  payload: Omit<Snapshot, 'timestamp'>
}

interface RealtimeAlertEvent {
  timestamp: number
  payload: {
    rule: string
    message: string
  }
}

/* --------------------------------------------------------------------------
   HELPERS & FORMATTERS (NATIVE & FAST)
   -------------------------------------------------------------------------- */
const numFormatter = new Intl.NumberFormat('en-US')
const pctFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 })

// 🚀 PERBAIKAN 1: Pengecekan Array Super Aman
function getTrend(snapshots: Snapshot[], key: keyof Snapshot): 'up' | 'down' | 'stable' {
  if (snapshots.length < 2) return 'stable'
  
  const prevSnap = snapshots[snapshots.length - 2]
  const lastSnap = snapshots[snapshots.length - 1]

  if (!prevSnap || !lastSnap) return 'stable'

  const a = prevSnap[key] as number
  const b = lastSnap[key] as number
  if (b > a) return 'up'
  if (b < a) return 'down'
  return 'stable'
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

/* --------------------------------------------------------------------------
   ANIMATION VARIANTS (UI/UX MASTERPIECE)
   -------------------------------------------------------------------------- */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function LiveOps() {
  const company = useAppStore((s) => s.company)
  const config = useConfigStore((s) => s.config)
  
  const realtimeContext = useRealtime() || {}
  const isMockMode = realtimeContext.isMockMode ?? false

  const { light } = useHaptic()

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [current, setCurrent] = useState<Snapshot | null>(null)

  // 🚀 TAMBAHAN: Kalkulasi Delta Throughput untuk Analisis Industri
  const throughputDelta = useMemo(() => {
    if (snapshots.length < 2) return 0
    const prev = snapshots[snapshots.length - 2]?.throughput || 0
    const curr = snapshots[snapshots.length - 1]?.throughput || 0
    return curr - prev
  }, [snapshots])

  // ─── REALTIME EVENT HANDLERS (OPTIMIZED) ──────────────────────────────
  const handleSnapshot = useCallback((rawEvent: unknown) => {
    const event = rawEvent as RealtimeSnapshotEvent
    const snap: Snapshot = {
      timestamp: event.timestamp,
      ...event.payload
    }
    setCurrent(snap)
    setSnapshots((prev) => {
      const next = [...prev, snap]
      return next.length > 50 ? next.slice(-50) : next // Buffer dinaikkan ke 50 untuk trend lebih akurat
    })
  }, [])

  const handleAlert = useCallback((rawEvent: unknown) => {
    const event = rawEvent as RealtimeAlertEvent
    const alertEvent: AlertEvent = {
      id: generateAlertId(),
      time: event.timestamp,
      rule: event.payload.rule,
      message: event.payload.message,
    }
    // Batasi maksimum 15 alert di memory agar tidak bocor
    setAlerts((prev) => [alertEvent, ...prev].slice(0, 15))
    
    feedback.notifyWarning(`SPC Rule ${alertEvent.rule} Violation`, {
      description: alertEvent.message,
      duration: 5000,
    })
    light()
  }, [light])

  useRealtimeEvent('kpi:snapshot', handleSnapshot, [handleSnapshot])
  useRealtimeEvent('alert:spc', handleAlert, [handleAlert])

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

  useEffect(() => {
    return () => {
      setSnapshots([])
      setAlerts([])
    }
  }, [])

  // ─── RENDER ───────────────────────────────────────────────────────────
  // 🚀 PERBAIKAN 2: Menggunakan Spread Operator untuk menghindari error `undefined` pada exactOptionalPropertyTypes
  return (
    <motion.div
      {...(config.ui.animationsEnabled 
        ? { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } } 
        : {}
      )}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-x-hidden"
    >
      {/* Header dengan Indikator Premium */}
      <Section
        subtitle="Module 11 — Real‑time Operations"
        title={`Live Ops Center — ${company.name}`}
        action={
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 rounded-lg border border-border bg-panel px-3 py-1.5 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 font-mono text-[0.65rem] font-bold tracking-wider uppercase">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shadow-inner',
                  isFresh ? 'animate-pulse' : ''
                )}
                style={{ 
                  backgroundColor: isFresh ? tokens.green : tokens.yellow,
                  boxShadow: isFresh ? `0 0 12px ${tokens.green}80` : 'none'
                }}
              />
              <span style={{ color: isFresh ? tokens.green : tokens.yellow }}>
                {isFresh ? 'SYS ACTIVE' : 'STALE'}
              </span>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <ConnectionIndicator />
            {isMockMode && <Badge label="SIMULATION" color="yellow" size="sm" glow />}
          </motion.div>
        }
      />

      {/* KPI Grid (Staggered Animation Level Enterprise) */}
      <motion.div 
        variants={config.ui.animationsEnabled ? containerVariants : undefined}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
      >
        <motion.div variants={itemVariants}>
          <KPICard
            label="Sigma Level"
            value={current ? current.sigma.toFixed(2) : '—'}
            color={sigmaColor}
            icon={sigmaTrend === 'up' ? '↗' : sigmaTrend === 'down' ? '↘' : 'σ'}
            sub={isFresh ? 'Real‑time Stream' : 'Delayed'}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <KPICard
            label="DPMO"
            value={current ? numFormatter.format(current.dpmo) : '—'}
            color={current && current.dpmo < 6210 ? tokens.green : tokens.red}
            icon="⊘"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <KPICard
            label="Active Alerts"
            value={current?.activeAlerts ?? '—'}
            color={current && current.activeAlerts > 0 ? tokens.red : tokens.textDim}
            icon="⚠"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <KPICard
            label="WIP Queue"
            value={current?.queueDepth ?? '—'}
            color={current && current.queueDepth > 40 ? tokens.red : tokens.cyan}
            icon="≡"
            sub={company.processUnit}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <KPICard
            label="Throughput"
            value={current ? pctFormatter.format(current.throughput) : '—'}
            color={current && current.throughput > 0.95 ? tokens.green : tokens.yellow}
            icon="⚡"
            sub={throughputDelta !== 0 ? `Δ ${(throughputDelta * 100).toFixed(2)}%` : 'Stable'}
          />
        </motion.div>
      </motion.div>

      {/* Charts dengan Layout Presisi */}
      {snapshots.length > 1 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <Panel className="border border-border/40 hover:border-border transition-colors">
            <Section subtitle="Sigma Stream" title="Process Capability Trend" color={tokens.cyan} />
            <SimpleLineChart
              data={chartData}
              xKey="index"
              lines={[{ key: 'sigma', color: sigmaColor, label: 'Sigma' }]}
              referenceLines={[
                { value: config.sigma.excellent, color: tokens.green, label: '4σ Target' },
                { value: config.sigma.acceptable, color: tokens.yellow, label: '3σ LCL' },
              ]}
              height={260}
              areas
            />
          </Panel>
          <Panel className="border border-border/40 hover:border-border transition-colors">
            <Section subtitle="Flow Metrics" title="Queue vs Throughput Analysis" color={tokens.orange} />
            <SimpleLineChart
              data={chartData}
              xKey="index"
              lines={[
                { key: 'queue', color: tokens.orange, label: 'WIP Depth' },
                { key: 'throughput', color: tokens.green, label: 'Yield %' },
              ]}
              height={260}
            />
          </Panel>
        </motion.div>
      )}

      {/* Empty State Premium */}
      {snapshots.length === 0 && (
        <Panel className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 border-border/30">
          <motion.div
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="mb-6 text-6xl drop-shadow-lg filter grayscale opacity-50"
          >
            📡
          </motion.div>
          <div className="font-display text-xl font-bold text-ink tracking-tight">Initializing Telemetry...</div>
          <div className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-dim">
            {isMockMode ? 'Establishing Simulation Uplink' : 'Awaiting Real-time Handshake'}
          </div>
        </Panel>
      )}

      {/* Alert Feed dengan Virtualized-like UX */}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <Section subtitle="Event Stream" title="Anomaly Detection Feed" color={tokens.red} />
          {alerts.length > 0 && (
            <span className="font-mono text-[10px] text-ink-dim bg-panel px-2 py-1 rounded border border-border/50">
              {alerts.length} Events Logged
            </span>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="mb-3 flex flex-col gap-1 rounded-lg border p-3.5 shadow-md hover:shadow-lg transition-all"
                style={{ 
                  borderColor: `${tokens.yellow}50`, 
                  backgroundColor: `${tokens.yellow}10`,
                  borderLeft: `4px solid ${tokens.yellow}`
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: tokens.yellow }}>
                    Rule {alert.rule} Triggered
                  </span>
                  <span className="font-mono text-[10px] uppercase opacity-80" style={{ color: tokens.textDim }}>
                    {new Date(alert.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                </div>
                <div className="font-sans text-sm font-medium mt-1 leading-relaxed text-ink/90">
                  {alert.message}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {alerts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center gap-2"
            >
              <span className="text-2xl opacity-20">🛡️</span>
              <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-40 text-textDim">
                System Nominal — Zero Anomalies
              </span>
            </motion.div>
          )}
        </div>
      </Panel>
    </motion.div>
  )
}
