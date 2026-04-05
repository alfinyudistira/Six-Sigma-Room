// src/pages/SigmaCalc.tsx
/**
 * ============================================================================
 * SIGMA CALCULATOR — PROCESS CAPABILITY ANALYSIS
 * ============================================================================
 */

import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor, getPpkStatus } from '@/lib/config'
import {
  calcPpk,
  calcCp,
  dpmoToSigma,
  sigmaToDpmo,
  calcDpmo,
  calcYield,
} from '@/lib/sigma'

import { useCurrency, useHaptic } from '@/hooks'
import { feedback } from '@/lib/feedback'

import { KPICard, Section, Panel, SimpleLineChart, Gauge } from '@/components/charts'
import { Counter } from '@/components/ui/Counter'
import { Badge, type BadgeColor } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { Slider, NumberInput } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV, copyToClipboard, cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   CONSTANTS & FORMATTERS
   -------------------------------------------------------------------------- */
const SIGMA_REF = [
  { level: 1, dpmo: 691462, yieldPct: 30.85 },
  { level: 2, dpmo: 308538, yieldPct: 69.15 },
  { level: 3, dpmo: 66807, yieldPct: 93.32 },
  { level: 4, dpmo: 6210, yieldPct: 99.38 },
  { level: 5, dpmo: 233, yieldPct: 99.977 },
  { level: 6, dpmo: 3.4, yieldPct: 99.99966 },
] as const

type CalcMode = 'from-company' | 'manual-dpmo' | 'from-defects'

// 🔥 PERBAIKAN: Pisahkan array ke konstanta agar JSX Parser tidak kebingungan
const MODE_OPTIONS: { id: CalcMode; label: string }[] = [
  { id: 'from-company', label: '◈ From Company Profile' },
  { id: 'manual-dpmo', label: 'σ Enter DPMO Directly' },
  { id: 'from-defects', label: '⊘ From Defect Count' },
]

const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const getBadgeColor = (hex: string): BadgeColor => {
  if (hex === T.green) return 'green'
  if (hex === T.cyan) return 'cyan'
  if (hex === T.yellow) return 'yellow'
  return 'red'
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function SigmaCalc() {
  const company = useAppStore(useShallow((s) => s.company))
  const config = useConfigStore((s) => s.config)
  const { format: formatCurrency } = useCurrency()
  const { light, medium, success } = useHaptic()

  const [mode, setMode] = useState<CalcMode>('from-company')
  const [manualDpmo, setManualDpmo] = useState<number | ''>(6210)
  const [defects, setDefects] = useState<number | ''>(50)
  const [units, setUnits] = useState<number | ''>(1000)
  const [opps, setOpps] = useState<number | ''>(5)

  // ─── DERIVED METRICS ──────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const { baselineMean, baselineStdDev, usl, lsl, laborRate, monthlyVolume } = company

    let dpmo: number = 0
    if (mode === 'from-company') {
      const specRange = usl - lsl
      dpmo =
        specRange > 0 && baselineStdDev > 0
          ? Math.round(Math.max(0, (1 - specRange / (6 * baselineStdDev))) * 1_000_000)
          : 0
    } else if (mode === 'manual-dpmo') {
      dpmo = Number(manualDpmo) || 0
    } else {
      dpmo = calcDpmo(Number(defects) || 0, Number(opps) || 1, Number(units) || 1)
    }

    const sigma = dpmoToSigma(dpmo)
    const yieldPct = calcYield(dpmo)
    const ppk = calcPpk(baselineMean, baselineStdDev, usl, lsl)
    const cp = calcCp(baselineStdDev, usl, lsl)
    const monthlyCopq = laborRate * monthlyVolume * (1 - yieldPct / 100)

    const targetDpmo = sigmaToDpmo(4)
    const targetYield = calcYield(targetDpmo)
    const savedYield = Math.max(0, targetYield - yieldPct)
    const savedCopq = Math.max(0, laborRate * monthlyVolume * (savedYield / 100))

    const bellData = Array.from({ length: 40 }, (_, i) => {
      const x = lsl + (usl - lsl) * (i / 39)
      const z = (x - baselineMean) / baselineStdDev
      const y = Math.exp(-0.5 * z * z) / (baselineStdDev * Math.sqrt(2 * Math.PI))
      return {
        x: Number(x.toFixed(1)),
        normal: Number(y.toFixed(6)),
        spec: x >= lsl && x <= usl ? y : 0,
      }
    })

    return {
      dpmo, sigma, yieldPct, ppk, cp,
      monthlyCopq, savedCopq, bellData, targetYield, savedYield,
    }
  }, [company, mode, manualDpmo, defects, units, opps])

  const sigmaColor = getSigmaColor(derived.sigma, config)
  const ppkStatus = getPpkStatus(derived.ppk, config)

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    light()
    const successExport = downloadCSV(
      [
        {
          Company: company.name,
          Process: company.processName,
          Sigma: derived.sigma,
          Ppk: derived.ppk,
          Cp: derived.cp,
          DPMO: derived.dpmo,
          Yield_Pct: derived.yieldPct,
          Monthly_COPQ: derived.monthlyCopq,
        },
      ],
      `sigma-results-${Date.now()}.csv`
    )
    if (successExport) {
      success()
      feedback.notifySuccess('Sigma results saved to CSV')
    } else {
      feedback.notifyError('Export failed')
    }
  }, [company, derived, success, light])

  const handleCopy = useCallback(async () => {
    light()
    const text = `Sigma: ${derived.sigma.toFixed(2)} | Ppk: ${derived.ppk.toFixed(3)} | DPMO: ${numFormatter.format(derived.dpmo)} | Yield: ${derived.yieldPct.toFixed(2)}%`
    const ok = await copyToClipboard(text)
    if (ok) {
      medium()
      feedback.notifySuccess('Results copied to clipboard')
    } else {
      feedback.notifyError('Copy failed')
    }
  }, [derived, medium, light])

  const animated = config.ui.animationsEnabled

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      <Section
        subtitle="Module 2 — Process Capability"
        title="Sigma Calculator"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} icon="⎘">Copy</Button>
            <Button size="sm" variant="primary" onClick={handleExport} icon="↓">CSV</Button>
          </div>
        }
      />

      <Panel>
        <div className="mb-6 flex flex-wrap gap-2 rounded-lg bg-surface/50 p-1.5 border border-border">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                light()
                setMode(m.id)
              }}
              aria-pressed={mode === m.id}
              className={cn(
                'flex-1 rounded-md px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide transition-all',
                mode === m.id
                  ? 'bg-cyan text-bg shadow-lg shadow-cyan/20'
                  : 'text-ink-dim hover:bg-white/5 hover:text-ink'
              )}
              style={mode === m.id ? { backgroundColor: T.cyan, color: T.bg } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>

        <motion.div layout>
          {mode === 'manual-dpmo' && (
            <div className="max-w-xl space-y-6">
              <Slider
                label="DPMO Value"
                valueLabel={numFormatter.format(Number(manualDpmo))}
                min={1} max={1_000_000} step={10}
                value={Number(manualDpmo)}
                onChange={(e) => setManualDpmo(Number(e.target.value))}
                accentColor={T.cyan}
              />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SIGMA_REF.map((ref) => (
                  <button
                    key={ref.level}
                    onClick={() => {
                      light()
                      setManualDpmo(ref.dpmo)
                    }}
                    className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-2 transition-all hover:bg-white/5 active:scale-95"
                    style={{ borderColor: `${getSigmaColor(ref.level, config).color}4D` }}
                  >
                    <div className="font-mono text-sm font-black" style={{ color: getSigmaColor(ref.level, config).color }}>
                      {ref.level}σ
                    </div>
                    <div className="font-mono text-[8px] font-bold text-ink-dim mt-1">SET DPMO</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'from-defects' && (
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberInput
                label="Defects Found"
                value={defects}
                onChange={(e) => setDefects(Number(e.target.value))}
                min={0}
              />
              <NumberInput
                label="Units Inspected"
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                min={1}
              />
              <NumberInput
                label="Opps / Unit"
                value={opps}
                onChange={(e) => setOpps(Number(e.target.value))}
                min={1}
              />
            </div>
          )}

          {mode === 'from-company' && (
            <div className="flex items-center gap-3 rounded-lg border border-cyan/20 bg-cyan/5 p-4">
              <span className="text-2xl" style={{ color: T.cyan }}>ℹ</span>
              <div>
                <div className="font-mono text-xs font-bold uppercase text-cyan">Using Company Profile</div>
                <div className="text-xs text-ink-dim mt-1">
                  Capability is calculated automatically from <strong>Baseline Mean</strong>, <strong>StdDev</strong>, and <strong>Spec Limits (USL/LSL)</strong> in your organization settings.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="Sigma Level"
          value={<Counter value={derived.sigma} decimals={2} color={sigmaColor.color} />}
          sub={sigmaColor.label}
          color={sigmaColor.color}
        />
        <KPICard
          label="Ppk Index"
          value={<Counter value={derived.ppk} decimals={3} color={ppkStatus.color} />}
          sub={ppkStatus.label}
          color={ppkStatus.color}
        />
        <KPICard
          label="Cp (Potential)"
          value={<Counter value={derived.cp} decimals={3} color={T.cyan} />}
          sub="Centered capability"
          color={T.cyan}
        />
        <KPICard
          label="DPMO"
          value={<Counter value={derived.dpmo} color={derived.dpmo < 6210 ? T.green : T.red} />}
          sub="Defects per million"
          color={derived.dpmo < 6210 ? T.green : T.red}
        />
        <KPICard
          label="Process Yield"
          value={<Counter value={derived.yieldPct} decimals={3} suffix="%" color={derived.yieldPct > 99 ? T.green : T.yellow} />}
          sub="First pass yield"
          color={derived.yieldPct > 99 ? T.green : T.yellow}
        />
        <KPICard
          label="Monthly COPQ"
          value={formatCurrency(derived.monthlyCopq)}
          sub="Est. Cost of Poor Quality"
          color={derived.monthlyCopq > 0 ? T.red : T.green}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-7 flex flex-col justify-between">
          <Section
            subtitle="Normal Distribution"
            title="Process vs Specifications"
            action={
              <HelpTooltip
                title="Process Distribution"
                description="Shows where your process falls relative to Spec Limits. Green area is within spec. Red tails mean defects."
              />
            }
          />
          <div className="mt-4 flex-1">
            <SimpleLineChart
              data={derived.bellData}
              xKey="x"
              lines={[
                { key: 'normal', color: T.cyan, label: 'Distribution' },
                { key: 'spec', color: T.green, label: 'Within Spec' },
              ]}
              areas
              height={260}
            />
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <Section subtitle="Visual" title="Capability Gauges" />
          <div className="flex flex-wrap items-center justify-around gap-6 py-6">
            <Gauge value={derived.sigma} max={6} color={sigmaColor.color} size={110} label="Sigma" />
            <Gauge value={derived.ppk} max={2} color={ppkStatus.color} size={110} label="Ppk" />
            <Gauge value={derived.yieldPct} max={100} color={derived.yieldPct > 99 ? T.green : T.cyan} size={110} label="Yield %" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <Section subtitle="Reference" title="Sigma Level Comparison" />
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface text-ink-dim border-b border-border">
                <tr>
                  {['Sigma', 'DPMO', 'Yield', 'Ppk', 'Status', 'Monthly COPQ Impact'].map((h) => (
                    <th key={h} className="p-3 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {SIGMA_REF.map((ref) => {
                  const isCurrentRow = Math.abs(derived.sigma - ref.level) < 0.5
                  const rowColor = getSigmaColor(ref.level, config).color
                  const ppkVal = ref.level / 3
                  const ppkStatusRow = getPpkStatus(ppkVal, config)
                  
                  return (
                    <tr
                      key={ref.level}
                      className={cn('transition-colors', isCurrentRow ? 'bg-cyan/10' : 'hover:bg-white/5')}
                    >
                      <td className="p-3 font-bold" style={{ color: rowColor }}>
                        {ref.level}σ {isCurrentRow && <span className="ml-2 rounded bg-cyan px-1 text-[8px] text-bg">YOU</span>}
                      </td>
                      <td className="p-3 text-ink">{numFormatter.format(ref.dpmo)}</td>
                      <td className="p-3 text-ink">{ref.yieldPct.toFixed(ref.yieldPct > 99 ? 4 : 2)}%</td>
                      <td className="p-3 text-ink">{ppkVal.toFixed(2)}</td>
                      <td className="p-3">
                        <Badge label={ppkStatusRow.label} color={getBadgeColor(ppkStatusRow.color)} />
                      </td>
                      <td className="p-3 text-red">
                        {formatCurrency(company.laborRate * company.monthlyVolume * (1 - ref.yieldPct / 100))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="border-t-4 flex flex-col justify-center" style={{ borderColor: T.green }}>
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: T.green }}>
                💡 What-If Scenario
              </div>
              <div className="mt-1 font-display text-2xl font-black text-ink">
                Reach <span style={{ color: T.green }}>4σ</span> Target
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-dim mb-1">
                Potential Monthly Savings
              </div>
              <div className="font-mono text-3xl font-bold" style={{ color: T.green }}>
                {formatCurrency(derived.savedCopq)}
              </div>
            </div>
            
            <div className="font-mono text-xs text-ink-dim leading-relaxed">
              Achieving 4 Sigma reduces defects to 6,210 DPMO.<br/>
              <strong>Annual Savings:</strong> <span className="text-ink">{formatCurrency(derived.savedCopq * 12)}</span><br/>
              <strong>Yield Improvement:</strong> <span className="text-ink">+{derived.savedYield.toFixed(2)}%</span>
            </div>
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
