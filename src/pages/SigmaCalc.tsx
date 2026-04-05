// src/pages/SigmaCalc.tsx
/**
 * ============================================================================
 * SIGMA CALCULATOR — PROCESS CAPABILITY ANALYSIS (Top Tier)
 * ============================================================================
 */

import React, { useMemo, useState, useCallback } from 'react'
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
   CONSTANTS & UTILITIES
   -------------------------------------------------------------------------- */
const SIGMA_REF = [
  { level: 1, dpmo: 691462, yield: 30.85 },
  { level: 2, dpmo: 308538, yield: 69.15 },
  { level: 3, dpmo: 66807, yield: 93.32 },
  { level: 4, dpmo: 6210, yield: 99.38 },
  { level: 5, dpmo: 233, yield: 99.977 },
  { level: 6, dpmo: 3.4, yield: 99.99966 },
] as const

type CalcMode = 'from-company' | 'manual-dpmo' | 'from-defects'

const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const getBadgeColorFromHex = (hex: string): BadgeColor => {
  if (hex === (T as any).green) return 'green'
  if (hex === (T as any).cyan) return 'cyan'
  if (hex === (T as any).yellow) return 'yellow'
  if (hex === (T as any).red) return 'red'
  return 'cyan'
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
  const [manualDpmo, setManualDpmo] = useState<number | string>(6210)
  const [defects, setDefects] = useState<number | string>(50)
  const [units, setUnits] = useState<number | string>(1000)
  const [opps, setOpps] = useState<number | string>(5)

  // ─── DERIVED METRICS ────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const { baselineMean, baselineStdDev, usl, lsl, laborRate, monthlyVolume } = company

    let dpmo: number = 0
    if (mode === 'from-company') {
      const specRange = usl - lsl
      dpmo = specRange > 0 && baselineStdDev > 0
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

    // What‑if: target 4σ
    const targetDpmo = sigmaToDpmo(4)
    const targetYield = calcYield(targetDpmo)
    const savedYield = Math.max(0, targetYield - yieldPct)
    const savedCopq = Math.max(0, laborRate * monthlyVolume * (savedYield / 100))

    // Top Tier Logic: Z-Shift (Long-term vs Short-term)
    const longTermSigma = Math.max(0, sigma - 1.5)

    const bellData = Array.from({ length: 40 }, (_, i) => {
      const x = lsl + (usl - lsl) * (i / 39)
      const z = (x - baselineMean) / (baselineStdDev || 1)
      const y = Math.exp(-0.5 * z * z) / ((baselineStdDev || 1) * Math.sqrt(2 * Math.PI))
      return {
        x: Number(x.toFixed(1)),
        normal: Number(y.toFixed(6)),
        spec: x >= lsl && x <= usl ? y : 0,
      }
    })

    return {
      dpmo,
      sigma,
      longTermSigma,
      yield: yieldPct,
      ppk,
      cp,
      monthlyCopq,
      savedCopq,
      bellData,
      targetYield,
      savedYield,
    }
  }, [company, mode, manualDpmo, defects, units, opps])

  const sigmaColor = getSigmaColor(derived.sigma, config)
  const ppkStatus = getPpkStatus(derived.ppk, config)
  const animated = config.ui.animationsEnabled
  const animProps = animated 
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: false, animate: false }

  // ─── HANDLERS ──────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    light()
    const exportData = [{
      Company: company.name,
      Process: company.processName,
      Sigma: derived.sigma,
      Ppk: derived.ppk,
      DPMO: derived.dpmo,
      Monthly_COPQ: derived.monthlyCopq,
    }] as any[]
    const ok = downloadCSV(exportData, `sigma-results-${Date.now()}.csv`)
    if (ok) {
      success()
      feedback.notifySuccess('Data exported')
    }
  }, [company, derived, success, light])

  const handleCopy = useCallback(async () => {
    light()
    const text = `Sigma: ${derived.sigma.toFixed(2)} | Ppk: ${derived.ppk.toFixed(3)} | DPMO: ${numFormatter.format(derived.dpmo)}`
    const ok = await copyToClipboard(text)
    if (ok) feedback.notifySuccess('Results copied')
  }, [derived, light])

  return (
    <motion.div {...animProps} transition={{ duration: 0.3 }} className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Section
        subtitle="Module 2 — Process Capability"
        title="Sigma Calculator"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>Copy</Button>
            <Button size="sm" variant="primary" onClick={handleExport}>CSV</Button>
          </div>
        }
      />

      <Panel>
        <div className="mb-6 flex flex-wrap gap-2 rounded-lg bg-surface/50 p-1.5 border border-border">
          {([
            ['from-company', '◈ Company Profile'],
            ['manual-dpmo', 'σ Manual DPMO'],
            ['from-defects', '⊘ Defect Count'],
          ] as [CalcMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => { light(); setMode(m) }}
              className={cn(
                'flex-1 rounded-md px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide transition-all',
                mode === m ? 'bg-cyan text-bg' : 'text-ink-dim hover:text-ink'
              )}
              style={mode === m ? { backgroundColor: (T as any).cyan, color: (T as any).bg } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        <motion.div layout>
          {mode === 'manual-dpmo' && (
            <div className="max-w-xl space-y-6">
              <Slider
                label="DPMO Value"
                valueLabel={numFormatter.format(Number(manualDpmo))}
                min={1} max={1000000} step={10}
                value={Number(manualDpmo)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualDpmo(Number(e.target.value))}
              />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SIGMA_REF.map((ref) => (
                  <button
                    key={ref.level}
                    onClick={() => setManualDpmo(ref.dpmo)}
                    className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface py-2 hover:bg-white/5"
                    style={{ borderColor: `${(getSigmaColor(ref.level, config) as any).color}4D` }}
                  >
                    <span className="font-mono text-sm font-black" style={{ color: (getSigmaColor(ref.level, config) as any).color }}>{ref.level}σ</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'from-defects' && (
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberInput label="Defects" value={defects} onChange={(e: any) => setDefects(e.target.value)} />
              <NumberInput label="Units" value={units} onChange={(e: any) => setUnits(e.target.value)} />
              <NumberInput label="Opps/Unit" value={opps} onChange={(e: any) => setOpps(e.target.value)} />
            </div>
          )}

          {mode === 'from-company' && (
            <div className="flex items-center gap-3 rounded-lg border border-cyan/20 bg-cyan/5 p-4">
              <span className="text-xl text-cyan">ℹ</span>
              <p className="text-xs text-ink-dim">Using organizational baseline data for calculation.</p>
            </div>
          )}
        </motion.div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Sigma" value={<Counter value={derived.sigma} decimals={2} color={sigmaColor.color} />} color={sigmaColor.color} />
        <KPICard label="Ppk" value={<Counter value={derived.ppk} decimals={3} color={ppkStatus.color} />} color={ppkStatus.color} />
        <KPICard label="Cp" value={<Counter value={derived.cp} decimals={3} color={(T as any).cyan} />} color={(T as any).cyan} />
        <KPICard label="DPMO" value={numFormatter.format(derived.dpmo)} color={derived.dpmo < 6210 ? (T as any).green : (T as any).red} />
        <KPICard label="Yield" value={`${derived.yield.toFixed(2)}%`} color={derived.yield > 99 ? (T as any).green : (T as any).yellow} />
        <KPICard label="Z-Shift (LT)" value={<Counter value={derived.longTermSigma} decimals={2} color={(T as any).orange} />} color={(T as any).orange} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <Section subtitle="Distribution" title="Process Capability" />
          <div className="mt-4 h-[260px]">
            <SimpleLineChart
              data={derived.bellData}
              xKey="x"
              lines={[{ key: 'normal', color: (T as any).cyan, label: 'Short-Term' }, { key: 'spec', color: (T as any).green, label: 'Within Spec' }]}
              areas height={260}
            />
          </div>
        </Panel>

        <Panel className="lg:col-span-5 flex flex-wrap items-center justify-around">
          <Gauge value={derived.sigma} max={6} color={sigmaColor.color} size={110} label="Sigma" />
          <Gauge value={derived.ppk} max={2} color={ppkStatus.color} size={110} label="Ppk" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <Section title="Sigma Reference" />
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="bg-surface text-ink-dim border-b border-border uppercase">
                <tr><th className="p-2">Sigma</th><th className="p-2">DPMO</th><th className="p-2">Yield</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody>
                {SIGMA_REF.map((ref) => {
                  const isCurrent = Math.abs(derived.sigma - ref.level) < 0.5
                  const rowColor = (getSigmaColor(ref.level, config) as any).color
                  return (
                    <tr key={ref.level} className={cn(isCurrent ? 'bg-cyan/10' : 'hover:bg-white/5')}>
                      <td className="p-2 font-bold" style={{ color: rowColor }}>{ref.level}σ {isCurrent && '•'}</td>
                      <td className="p-2">{numFormatter.format(ref.dpmo)}</td>
                      <td className="p-2">{ref.yield}%</td>
                      <td className="p-2"><Badge label={getPpkStatus(ref.level/3, config).label} color={getBadgeColorFromHex((getPpkStatus(ref.level/3, config) as any).color)} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="border-t-4" style={{ borderColor: (T as any).green }}>
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[10px] font-bold text-green uppercase">💡 Scenario Analysis</span>
            <span className="text-lg font-bold">Target 4 Sigma Improvement</span>
            <div className="bg-surface p-3 rounded-lg border border-border">
              <span className="block text-[8px] text-ink-dim uppercase mb-1">Monthly Potential Savings</span>
              <span className="text-xl font-bold text-green">{formatCurrency(derived.savedCopq)}</span>
            </div>
            <p className="text-[10px] text-ink-dim leading-relaxed">
              Moving to 4$\sigma$ (+{derived.savedYield.toFixed(2)}% yield) can save your department approximately <span className="text-ink font-bold">{formatCurrency(derived.savedCopq * 12)}</span> annually.
            </p>
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
