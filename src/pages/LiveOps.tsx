// src/pages/LiveOps.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor } from '@/lib/config'
import { useRealtime, useRealtimeEvent } from '@/providers/RealtimeProvider'
import { useI18n } from '@/providers/I18nProvider'
import { useFeedback } from '@/services/feedback'
import { Section, Panel, KPICard, SimpleLineChart } from '@/components/charts'
import { ConnectionIndicator } from '@/components/feedback/ConnectionIndicator'
import { Badge } from '@/components/ui/Badge'
import { tokens as T } from '@/lib/tokens'
import { formatNumber } from '@/lib/utils'

interface Snapshot {
  timestamp: number
  sigma: number
  dpmo: number
  activeAlerts: number
  queueDepth: number
  throughput: number
}

export default function LiveOps() {
  const { company }   = useAppStore()
  const { config }    = useConfigStore()
  const { isMockMode } = useRealtime()
  const { fmtCurrency } = useI18n()
  const toast         = useFeedback()

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [alerts, setAlerts]       = useState<{ time:number; rule:string; message:string }[]>([])
  const [current, setCurrent]     = useState<Snapshot | null>(null)

  // Subscribe to live KPI snapshots
  useRealtimeEvent('kpi:snapshot', (e) => {
    const snap: Snapshot = {
      timestamp:    e.timestamp,
      sigma:        e.payload.sigma as number,
      dpmo:         e.payload.dpmo as number,
      activeAlerts: e.payload.activeAlerts as number,
      queueDepth:   e.payload.queueDepth as number,
      throughput:   e.payload.throughput as number,
    }
    setCurrent(snap)
    setSnapshots(prev => [...prev.slice(-29), snap]) // keep last 30 points
  }, [])

  // Subscribe to SPC alerts
  useRealtimeEvent('alert:spc', (e) => {
    const alert = { time: e.timestamp, rule: e.payload.rule as string, message: e.payload.message as string }
    setAlerts(prev => [alert, ...prev.slice(0, 9)])
    toast.warning('SPC Alert', alert.message)
  }, [toast])

  // Chart data from snapshots
  const chartData = snapshots.map((s, i) => ({
    t: `T-${snapshots.length - i - 1}`,
    sigma: s.sigma,
    throughput: +(s.throughput * 100).toFixed(1),
    queue: s.queueDepth,
  }))

  const sigmaColor = current ? getSigmaColor(current.sigma, config) : T.textDim

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section
        subtitle="Module 11 — Real-time Operations"
        title={`Live Ops Center — ${company.name}`}
        action={
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <ConnectionIndicator />
            {isMockMode && <Badge label="SIMULATION" color="yellow" />}
          </div>
        }
      />

      {/* ── Live KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
        <KPICard
          label="Live Sigma"
          value={current ? current.sigma.toFixed(2) : '—'}
          color={sigmaColor}
          icon="σ"
          sub={current ? (Date.now() - current.timestamp < 10000 ? 'Just updated' : 'Last update') : 'Awaiting data'}
        />
        <KPICard label="Live DPMO"      value={current ? formatNumber(current.dpmo) : '—'}  color={current && current.dpmo < 6210 ? T.green : T.red}    icon="⊘" />
        <KPICard label="Active Alerts"  value={current?.activeAlerts ?? '—'}                 color={current && current.activeAlerts > 0 ? T.red : T.green} icon="⚠" />
        <KPICard label="Queue Depth"    value={current?.queueDepth ?? '—'}                   color={current && current.queueDepth > 40 ? T.red : T.cyan}   icon="≡" sub={`${company.processUnit} pending`} />
        <KPICard label="Throughput"     value={current ? `${(current.throughput * 100).toFixed(1)}%` : '—'} color={current && current.throughput > 0.95 ? T.green : T.yellow} icon="⚡" />
        <KPICard label="Snapshots Recv" value={snapshots.length}                             color={T.cyan} icon="·" sub="last 30 points" />
      </div>

      {/* ── Charts row ── */}
      {snapshots.length > 1 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1rem' }}>
          <Panel>
            <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.52rem', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem' }}>Live Sigma Trend</div>
            <SimpleLineChart data={chartData} xKey="t"
              lines={[{ key:'sigma', color:sigmaColor, label:'Sigma' }]}
              referenceLines={[
                { value: config.sigma.excellent,  color:T.green,  label:'4σ' },
                { value: config.sigma.acceptable, color:T.yellow, label:'3σ' },
              ]}
              height={180} areas />
          </Panel>
          <Panel>
            <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.52rem', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem' }}>Queue Depth & Throughput</div>
            <SimpleLineChart data={chartData} xKey="t"
              lines={[
                { key:'queue',      color:T.orange, label:'Queue' },
                { key:'throughput', color:T.green,  label:'Throughput %' },
              ]}
              height={180} />
          </Panel>
        </div>
      )}

      {/* No data yet */}
      {snapshots.length === 0 && (
        <Panel style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ color:T.cyan, fontSize:'2rem', marginBottom:'0.75rem' }}>⚡</div>
          <div style={{ color:T.text, fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:'1rem', marginBottom:'0.5rem' }}>Waiting for live data…</div>
          <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.65rem' }}>
            {isMockMode ? 'Mock data will arrive in ~8 seconds' : 'Connect to a real-time data source to see live metrics'}
          </div>
        </Panel>
      )}

      {/* ── Alert feed ── */}
      <Panel>
        <Section subtitle="Event Feed" title="Real-time Alerts" />
        {alerts.length === 0 ? (
          <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.65rem', padding:'1rem 0', textAlign:'center' }}>
            No alerts yet. {isMockMode ? 'Alerts will appear as simulation runs.' : 'Monitoring active processes.'}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            <AnimatePresence>
              {alerts.map((a, i) => (
                <motion.div key={a.time} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
                  style={{ display:'flex', gap:'0.75rem', alignItems:'center', background:`${T.yellow}06`, border:`1px solid ${T.yellow}25`, borderRadius:6, padding:'0.5rem 0.75rem' }}>
                  <span style={{ color:T.yellow, fontFamily:T.mono, fontSize:'0.7rem' }}>⚠</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:T.yellow, fontFamily:T.mono, fontSize:'0.6rem', fontWeight:700 }}>Rule {a.rule}</div>
                    <div style={{ color:T.textMid, fontFamily:T.mono, fontSize:'0.58rem' }}>{a.message}</div>
                  </div>
                  <span style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.52rem' }}>
                    {new Date(a.time).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Panel>

      {/* ── Info ── */}
      <Panel style={{ background:`${T.cyan}04`, borderColor:`${T.cyan}33` }}>
        <div style={{ color:T.textMid, fontFamily:T.mono, fontSize:'0.6rem', lineHeight:1.8 }}>
          <strong style={{ color:T.cyan }}>ℹ Live Ops</strong> streams real-time process metrics via Server-Sent Events (SSE) or WebSocket.
          {isMockMode && ' Currently running in <strong>simulation mode</strong> — no server required. Replace with realtimeService.connectSSE("/api/events") in production.'}
          {` Alerts trigger on WECO violations and sigma drops below threshold (${config.sigma.acceptable}σ).`}
        </div>
      </Panel>
    </motion.div>
  )
}
