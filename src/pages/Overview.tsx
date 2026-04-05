// src/pages/Overview.tsx
/**
 * ============================================================================
 * OVERVIEW — DASHBOARD INTELLIGENCE PLATFORM
 * ============================================================================
 */

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor, getPpkStatus, getCopqAlert } from '@/lib/config'
import { calcPpk, dpmoToSigma, calcYield, calcControlLimits } from '@/lib/sigma'

import { useCurrency } from '@/hooks'
import { useRealtimeEvent } from '@/providers/RealtimeProvider'

import { KPICard, Section, Panel, SimpleLineChart, SimpleRadarChart, Gauge } from '@/components/charts'
import { Counter } from '@/components/ui/Counter'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   TYPES & FORMATTERS
   -------------------------------------------------------------------------- */
interface KPISnapshot {
  sigma?: number
  throughput?: number
  dpmo?: number
  activeAlerts?: number
  queueDepth?: number
}

const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const safeDiv = (a: number, b: number): number => (b === 0 ? 0 : a / b)

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function Overview() {
  const { company, setActiveTab } = useAppStore(
    useShallow((s) => ({
      company: s.company,
      setActiveTab: s.setActiveTab,
    }))
  )
  
  const config = useConfigStore((s) => s.config)
  const { format: formatCurrency } = useCurrency()
  const animated = config.ui.animationsEnabled

  const [liveKPI, setLiveKPI] = useState<KPISnapshot>({})

  // ─── Realtime Listener ────────────────────────────────────────────────
  useRealtimeEvent('kpi:snapshot', (rawEvent: unknown) => {
    const event = rawEvent as { payload: KPISnapshot }
    if (event?.payload) {
      setLiveKPI(event.payload)
    }
  }, [])

  // ─── Derived Metrics ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const {
      baselineMean,
      baselineStdDev,
      usl,
      lsl,
      laborRate,
      monthlyVolume,
      teamSize,
    } = company

    const ppk = calcPpk(baselineMean, baselineStdDev, usl, lsl)
    const specRange = usl - lsl
    
    let dpmo = 0
    if (specRange > 0 && baselineStdDev > 0) {
      const capability = specRange / (6 * baselineStdDev)
      dpmo = Math.round(Math.max(0, 1 - capability) * 1_000_000)
    }

    const activeSigma = liveKPI.sigma ?? dpmoToSigma(dpmo)
    const activeDpmo = liveKPI.dpmo ?? dpmo
    const yieldPct = calcYield(activeDpmo)

    const defectRate = 1 - yieldPct / 100
    const monthlyCopq = laborRate * monthlyVolume * defectRate
    const annualCopq = monthlyCopq * 12
    const revenue = laborRate * monthlyVolume * 12
    const copqPct = safeDiv(annualCopq, revenue) * 100

    const syntheticSPC = Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      value: baselineMean + Math.sin(i * 0.6) * baselineStdDev * 0.7 + Math.random() * baselineStdDev * 0.2,
    }))
    const spcLimits = calcControlLimits(syntheticSPC.map((d) => d.value))

    const radarData = [
      { subject: 'Capability', value: Math.min(ppk * 50, 100) },
      { subject: 'Yield', value: yieldPct },
      { subject: 'Sigma', value: (activeSigma / 6) * 100 },
      { subject: 'Throughput', value: (liveKPI.throughput ?? 0.8) * 100 },
      { subject: 'Team', value: Math.min(teamSize * 3, 100) },
    ]

    return {
      ppk,
      dpmo: activeDpmo,
      sigma: activeSigma,
      yieldPct,
      monthlyCopq,
      copqPct,
      syntheticSPC,
      spcLimits,
      radarData,
    }
  }, [company, liveKPI])

  // ─── Top Tier: Insight Logic ──────────────────────────────────────────
  const insight = useMemo(() => {
    if (metrics.sigma < 3) return "Critical: Process is producing high defects. Focus on DMAIC 'Analyze' phase."
    if (metrics.ppk < 1.33) return "Warning: Process center is drifting. Check SPC Charts for stability."
    return "Process is Healthy. Maintain control and monitor COPQ for further optimization."
  }, [metrics])

  const sigmaConfig = getSigmaColor(metrics.sigma, config)
  const ppkStatus = getPpkStatus(metrics.ppk, config)
  const copqAlert = getCopqAlert(metrics.copqPct, config)

  // Perbaikan: Animasi Props
  const animProps = animated 
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: false, animate: false }

  return (
    <motion.div {...animProps} transition={{ duration: 0.3 }} className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Section
          subtitle="Module 1 — Executive Summary"
          title={`${company.processName || 'Process Overview'} — ${company.name}`}
          action={
            <div className="flex items-center gap-3">
              {liveKPI.sigma && <Badge label="LIVE SYNC" color="green" glow size="sm" />}
              <HelpTooltip
                title="Dashboard Overview"
                description="Real-time KPIs update automatically. Click cards to navigate."
                placement="bottom"
              />
            </div>
          }
        />
        {/* Top Tier Feature: Live Insight Banner */}
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: sigmaConfig.color }}>
          ⚡ Insight: <span className="text-ink-dim opacity-80">{insight}</span>
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Sigma Level"
          value={<Counter value={metrics.sigma} decimals={2} color={sigmaConfig.color} />}
          color={sigmaConfig.color}
          onClick={() => setActiveTab('sigma')}
        />
        <KPICard
          label="Process Cap (Ppk)"
          value={<Counter value={metrics.ppk} decimals={3} color={ppkStatus.color} />}
          color={ppkStatus.color}
          onClick={() => setActiveTab('sigma')}
        />
        <KPICard
          label="DPMO"
          value={numFormatter.format(metrics.dpmo)}
          color={metrics.dpmo < 3400 ? (tokens as any).green : (tokens as any).red}
          onClick={() => setActiveTab('sigma')}
        />
        <KPICard
          label="Process Yield"
          value={<Counter value={metrics.yieldPct} decimals={2} suffix="%" color={metrics.yieldPct > 99 ? (tokens as any).green : (tokens as any).yellow} />}
          color={metrics.yieldPct > 99 ? (tokens as any).green : (tokens as any).yellow}
        />
        <KPICard
          label="Monthly COPQ"
          value={formatCurrency(metrics.monthlyCopq)}
          color={copqAlert.color}
          onClick={() => setActiveTab('copq')}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <Section subtitle="Statistical Process Control" title="Process Trend Snapshot" color={(tokens as any).cyan} />
          <div className="mt-2">
            <SimpleLineChart
              data={metrics.syntheticSPC}
              xKey="month"
              lines={[{ key: 'value', color: (tokens as any).cyan, label: 'Value' }]}
              referenceLines={[
                { value: metrics.spcLimits.ucl, color: (tokens as any).red, label: 'UCL' },
                { value: metrics.spcLimits.mean, color: (tokens as any).green, label: 'Mean' },
                { value: metrics.spcLimits.lcl, color: (tokens as any).red, label: 'LCL' },
              ]}
              height={280}
              areas
            />
          </div>
        </Panel>

        <Panel className="lg:col-span-4 flex flex-col justify-between">
          <Section subtitle="Intelligence" title="Dimensions" color={sigmaConfig.color} />
          <div className="flex-1 flex items-center justify-center -mt-4">
            <SimpleRadarChart data={metrics.radarData} color={sigmaConfig.color} height={250} />
          </div>
        </Panel>
      </div>

      {/* Gauges Row */}
      <Panel>
        <Section subtitle="Key Indicators" title="Process Health Gauges" />
        <div className="flex flex-wrap items-center justify-around gap-8 pt-4 pb-2">
          <Gauge value={metrics.ppk} max={2} color={ppkStatus.color} label="Ppk Score" size={110} />
          <Gauge value={metrics.sigma} max={6} color={sigmaConfig.color} label="Sigma Level" size={110} />
          <Gauge value={metrics.yieldPct} max={100} color={metrics.yieldPct > 99 ? (tokens as any).green : (tokens as any).orange} label="Yield (%)" size={110} />
        </div>
      </Panel>
    </motion.div>
  )
}
