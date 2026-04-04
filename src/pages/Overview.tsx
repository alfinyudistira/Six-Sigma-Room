// src/pages/Overview.tsx
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor, getPpkStatus, getCopqAlert } from '@/lib/config'
import { calcPpk, dpmoToSigma, calcYield, calcControlLimits } from '@/lib/sigma'
import { useI18n } from '@/providers/I18nProvider'
import { useRealtimeEvent } from '@/providers/RealtimeProvider'
import { KPICard, Section, Panel, SimpleLineChart, SimpleRadarChart, Gauge } from '@/components/charts'
import { Counter } from '@/components/ui/Counter'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { tokens as T } from '@/lib/tokens'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function Overview() {
  const { company, setActiveTab } = useAppStore()
  const { config } = useConfigStore()
  const { fmtCurrency, fmtNumber } = useI18n()

  // Live realtime overlay
  const [liveKPI, setLiveKPI] = useState<Record<string, number>>({})
  useRealtimeEvent('kpi:snapshot', (e) => {
    setLiveKPI(e.payload as Record<string, number>)
  }, [])

  // ── All derived metrics — never hardcoded ──────────────────────────────────
  const metrics = useMemo(() => {
    const { baselineMean, baselineStdDev, usl, lsl, laborRate, monthlyVolume, customerLTV, teamSize } = company

    const ppk    = calcPpk(baselineMean, baselineStdDev, usl, lsl)
    const specRange = usl - lsl
    const dpmo   = specRange > 0 && baselineStdDev > 0
      ? Math.round(Math.max(0, 1 - (specRange / (6 * baselineStdDev))) * 1_000_000)
      : 0
    const sigma  = liveKPI.sigma ?? dpmoToSigma(dpmo)
    const yld    = calcYield(dpmo)
    const monthlyCopq  = laborRate * monthlyVolume * (1 - yld / 100)
    const annualCopq   = monthlyCopq * 12
    const revenueEst   = laborRate * monthlyVolume * 12
    const copqPct      = revenueEst > 0 ? (annualCopq / revenueEst) * 100 : 0
    const potentialSavings = annualCopq * 0.65
    const ltvRisk      = customerLTV * (dpmo / 1_000_000) * monthlyVolume

    // SPC from baseline
    const syntheticSPC = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
      value: baselineMean + (Math.sin(i * 0.5) * baselineStdDev * 0.6),
    }))
    const spcLimits = calcControlLimits(syntheticSPC.map(d => d.value))

    // Radar dimensions — derived
    const radarData = [
      { subject: 'Process\nCapability', value: Math.min(ppk / 2 * 100, 100) },
      { subject: 'Yield',     value: yld },
      { subject: 'Sigma\nLevel', value: (sigma / 6) * 100 },
      { subject: 'Volume\nThroughput', value: liveKPI.throughput != null ? liveKPI.throughput * 100 : Math.min(monthlyVolume / 500 * 100, 100) },
      { subject: 'Team\nCapacity', value: Math.min(teamSize / 30 * 100, 100) },
    ]

    return { ppk, dpmo, sigma, yld, monthlyCopq, annualCopq, copqPct,
             potentialSavings, ltvRisk, syntheticSPC, spcLimits, radarData }
  }, [company, liveKPI])

  const ppkStatus  = getPpkStatus(metrics.ppk, config)
  const sigmaColor = getSigmaColor(metrics.sigma, config)
  const copqAlert  = getCopqAlert(metrics.copqPct, config)
  const currencySymbol = fmtCurrency(1).replace(/[\d,. ]/g, "").trim()

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <motion.div variants={stagger.item}>
        <Section
          subtitle="DMAIC Intelligence Platform"
          title={`${company.processName || 'Process Overview'} — ${company.name}`}
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {company.isPulseDigital && <Badge label="DEMO MODE" color="yellow" />}
              {liveKPI.sigma && <Badge label="LIVE DATA" color="green" glow />}
            </div>
          }
        />
      </motion.div>

      {/* ── Primary KPI strip ── */}
      <motion.div variants={stagger.item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>

        <KPICard
          label="Sigma Level"
          value={<Counter value={metrics.sigma} decimals={2} color={sigmaColor} />}
          sub={metrics.sigma >= config.sigma.excellent ? 'Excellent' : metrics.sigma >= config.sigma.acceptable ? 'Acceptable' : 'Needs Work'}
          color={sigmaColor}
          icon="σ"
          onClick={() => setActiveTab('sigma')}
        />
        <KPICard
          label="Process Ppk"
          value={<Counter value={metrics.ppk} decimals={3} color={ppkStatus.color} />}
          sub={ppkStatus.label}
          color={ppkStatus.color}
          icon="◈"
          onClick={() => setActiveTab('sigma')}
        />
        <KPICard
          label="DPMO"
          value={<Counter value={metrics.dpmo} color={metrics.dpmo < 3400 ? T.green : metrics.dpmo < 66807 ? T.cyan : T.red} />}
          sub="Defects per million"
          color={metrics.dpmo < 3400 ? T.green : metrics.dpmo < 66807 ? T.cyan : T.red}
          icon="⊘"
        />
        <KPICard
          label="Process Yield"
          value={<Counter value={metrics.yld} decimals={2} suffix="%" color={metrics.yld > 99 ? T.green : metrics.yld > 93 ? T.cyan : T.red} />}
          sub={`${fmtNumber(company.monthlyVolume)} units/mo`}
          color={metrics.yld > 99 ? T.green : metrics.yld > 93 ? T.cyan : T.red}
          icon="✓"
        />
        <KPICard
          label="Monthly COPQ"
          value={<Counter value={metrics.monthlyCopq} color={copqAlert.color}
            prefix={currencySymbol} />}
          sub={`${metrics.copqPct.toFixed(1)}% of revenue`}
          color={copqAlert.color}
          icon="$"
          onClick={() => setActiveTab('copq')}
        />
        <KPICard
          label="Annual COPQ"
          value={fmtCurrency(metrics.annualCopq)}
          sub={`Save up to ${fmtCurrency(metrics.potentialSavings)}`}
          color={T.red}
          icon="⚠"
          onClick={() => setActiveTab('copq')}
        />
      </motion.div>

      {/* ── Charts row ── */}
      <motion.div variants={stagger.item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>

        {/* Process trend */}
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Process Trend</div>
              <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                {company.processUnit} over time
              </div>
            </div>
            <HelpTooltip title="I-MR Baseline Chart" description="Derived from your baseline mean and std dev. Add actual SPC data points in the SPC module." />
          </div>
          <SimpleLineChart
            data={metrics.syntheticSPC}
            xKey="month"
            lines={[{ key: 'value', color: T.cyan, label: company.processUnit }]}
            areas
            referenceLines={[
              { value: metrics.spcLimits.ucl, color: T.red,    label: 'UCL' },
              { value: metrics.spcLimits.mean, color: T.green, label: 'CL' },
              { value: company.target,         color: T.yellow, label: 'Target' },
            ]}
          />
        </Panel>

        {/* Radar */}
        <Panel>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Performance Radar</div>
            <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>Multi-dimension Health</div>
          </div>
          <SimpleRadarChart data={metrics.radarData} color={sigmaColor} />
        </Panel>
      </motion.div>

      {/* ── Secondary metrics ── */}
      <motion.div variants={stagger.item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

        {/* COPQ breakdown */}
        <Panel>
          <Section subtitle="Financial Impact" title="COPQ Breakdown" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Internal Failure (Rework)',  value: metrics.monthlyCopq * 0.45, color: T.red },
              { label: 'External Failure (Lost Rev)', value: metrics.ltvRisk,           color: T.orange },
              { label: 'Appraisal & Inspection',     value: metrics.monthlyCopq * 0.2,  color: T.yellow },
              { label: 'Prevention Costs',           value: metrics.monthlyCopq * 0.1,  color: T.cyan },
            ].map(row => {
              const total = metrics.monthlyCopq + metrics.ltvRisk
              const pct = total > 0 ? (row.value / total) * 100 : 0
              return (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.6rem' }}>{row.label}</span>
                    <span style={{ color: row.color, fontFamily: T.mono, fontSize: '0.6rem', fontWeight: 700 }}>
                      {fmtCurrency(row.value)}/mo
                    </span>
                  </div>
                  <div style={{ height: 4, background: T.surface, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: 2, transition: 'width 1s ease-out', boxShadow: `0 0 6px ${row.color}55` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Gauges */}
        <Panel>
          <Section subtitle="Capability Gauges" title="Process Health" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', justifyItems: 'center' }}>
            <Gauge value={metrics.ppk} max={2} color={ppkStatus.color} size={90} label="Ppk" />
            <Gauge value={metrics.sigma} max={6} color={sigmaColor} size={90} label="Sigma" />
            <Gauge value={metrics.yld} max={100} color={metrics.yld > 99 ? T.green : T.cyan} size={90} label="Yield" />
          </div>
        </Panel>

        {/* Quick navigation */}
        <Panel>
          <Section subtitle="Modules" title="Quick Actions" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { tab: 'dmaic' as const,     icon: '⊕', label: 'DMAIC Tracker',   color: T.cyan },
              { tab: 'fmea' as const,      icon: '⚠', label: 'FMEA Scorer',     color: T.yellow },
              { tab: 'spc' as const,       icon: '~', label: 'SPC Charts',       color: T.green },
              { tab: 'pareto' as const,    icon: '▌', label: 'Pareto Analysis',  color: T.orange },
              { tab: 'rootcause' as const, icon: '⊸', label: 'Root Cause',       color: T.red },
              { tab: 'triage' as const,    icon: '◎', label: 'AI Triage',        color: T.cyan },
            ].map(item => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                style={{
                  background: `${item.color}08`, border: `1px solid ${item.color}25`,
                  borderRadius: 8, padding: '0.65rem 0.75rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${item.color}15` }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${item.color}08` }}
              >
                <span style={{ color: item.color, fontSize: '1rem' }} aria-hidden="true">{item.icon}</span>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.58rem', letterSpacing: '0.05em' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </Panel>
      </motion.div>

      {/* ── Company snapshot ── */}
      <motion.div variants={stagger.item}>
        <Panel>
          <Section subtitle="Configuration" title="Company Snapshot" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
            {[
              { label: 'Company',       value: company.name },
              { label: 'Industry',      value: company.industry },
              { label: 'Process',       value: company.processName },
              { label: 'Unit',          value: company.processUnit },
              { label: 'Team Size',     value: `${company.teamSize} people` },
              { label: 'Baseline Mean', value: `${company.baselineMean} ${company.processUnit}` },
              { label: 'Std Dev',       value: `${company.baselineStdDev} ${company.processUnit}` },
              { label: 'Target',        value: `${company.target} ${company.processUnit}` },
              { label: 'USL',           value: `${company.usl} ${company.processUnit}` },
              { label: 'LSL',           value: `${company.lsl} ${company.processUnit}` },
              { label: 'Monthly Vol.',  value: fmtNumber(company.monthlyVolume) },
              { label: 'Labor Rate',    value: `${fmtCurrency(company.laborRate)}/hr` },
            ].map(item => (
              <div key={item.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: '0.5rem 0.65rem' }}>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ color: T.text, fontFamily: T.mono, fontSize: '0.7rem', fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      </motion.div>
    </motion.div>
  )
}
