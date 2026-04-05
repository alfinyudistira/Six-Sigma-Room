// src/pages/SPCCharts.tsx
import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

import { useAppStore } from '@/store/useAppStore'
import { useAppDispatch, useAppSelector } from '@/store/store'
import {
  addSPCPoint,
  deleteSPCPoint,
  setSPC,
  spcSelectors,
  type SPCPoint,
} from '@/store/moduleSlice'

import { useConfigStore } from '@/lib/config'
import { calcControlLimits, detectWECO } from '@/lib/sigma'
import { feedback } from '@/lib/feedback'
import { useHaptic, useModulePersist } from '@/hooks'

import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { ConfirmButton } from '@/components/ui/Confirm'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV, cn } from '@/lib/utils'

const DEMO_POINTS: SPCPoint[] = Array.from({ length: 20 }, (_, i) => ({
  id: `demo_${i}`,
  label: `W${i + 1}`,
  value: 48 + Math.sin(i * 0.7) * 8 + (i === 12 ? 22 : 0),
  timestamp: new Date(Date.now() - (19 - i) * 7 * 86400000).toISOString(),
}))

const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

const chartTooltipStyle = {
  contentStyle: {
    background: T.panel,
    border: `1px solid ${T.border}`,
    borderRadius: '8px',
    fontFamily: T.mono,
    fontSize: '11px',
    color: T.text,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: T.cyan, fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' },
  itemStyle: { color: T.text, fontSize: '11px', fontWeight: 'bold' },
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function SPCCharts() {
  const company = useAppStore((s) => s.company)
  const dispatch = useAppDispatch()
  const userPoints = useAppSelector(spcSelectors.selectAll)
  const rawState = useAppSelector((s) => s.modules.spc)
  
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  const [showDemo, setShowDemo] = useState(userPoints.length === 0)
  const [form, setForm] = useState<{ label: string; value: number | ''; note: string }>({
    label: '',
    value: '',
    note: '',
  })

  const points = showDemo ? DEMO_POINTS : userPoints
  useModulePersist('spc_points', rawState, { debounceMs: 800 })

  // ─── CALCULATIONS ───────────────────────────────────────────────────────
  const { limits, violations, chartData, mrData, stabilityScore } = useMemo(() => {
    const vals = points.map((p) => p.value)
    
    // Default fallback object
    const defaultLimits = { mean: 0, ucl: 0, lcl: 0, mrMean: 0, mrUcl: 0, sigma: 0 }
    
    if (vals.length < 2) {
      return { limits: defaultLimits, violations: [], chartData: [], mrData: [], stabilityScore: 100 }
    }

    const lim = calcControlLimits(vals)
    const sigmaS = Math.abs(lim.ucl - lim.mean) / 3

    const weco = (config as any).weco?.rule1 || (config as any).weco?.rule2 
        ? detectWECO(vals, lim.mean, sigmaS) 
        : []

    const violationSet = new Set(weco.map((v) => v.index))

    const chart = points.map((p, idx) => ({
      name: p.label,
      value: p.value,
      ucl: lim.ucl,
      cl: lim.mean,
      lcl: lim.lcl,
      alarm: violationSet.has(idx) ? p.value : null,
      isViolation: violationSet.has(idx),
    }))

    const mr = points.slice(1).map((p, idx) => ({
      name: p.label,
      mr: Math.abs(p.value - points[idx]!.value),
      mrUcl: lim.mrUcl,
      mrMean: lim.mrMean,
    }))

    // Top Tier: Calculate Stability Score
    const stablePoints = points.length - violationSet.size
    const score = Math.round((stablePoints / points.length) * 100)

    return { limits: lim, violations: weco, chartData: chart, mrData: mr, stabilityScore: score }
  }, [points, config, company.target])

  const outOfControl = violations.length > 0
  const animated = config.ui.animationsEnabled
  const animProps = animated 
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: false, animate: false }

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const handleAddPoint = useCallback(() => {
    const val = Number(form.value)
    if (!form.label.trim() || form.value === '' || isNaN(val)) {
      feedback.notifyWarning('Label and value are required')
      return
    }

    medium()
    if (showDemo) setShowDemo(false)

        const newNote = form.note.trim();
    dispatch(
      addSPCPoint({
        id: `spc_${Date.now()}`,
        label: form.label.trim(),
        value: val,
        timestamp: new Date().toISOString(),
        ...(newNote ? { note: newNote } : {}),
      })
    )

    setForm({ label: '', value: '', note: '' })
    success()
  }, [form, dispatch, showDemo, medium, success])

  const handleResetDemo = useCallback(() => {
    medium()
    dispatch(setSPC([]))
    setShowDemo(true)
    feedback.notifyInfo('Reset to Demo Dataset')
  }, [dispatch, medium])

  const handleDelete = useCallback((id: string) => {
    medium()
    dispatch(deleteSPCPoint(id))
  }, [dispatch, medium])

  const handleExport = useCallback(() => {
    light()
    const exportData = points.map((p) => ({
      Label: p.label,
      Value: p.value,
      Timestamp: p.timestamp,
      Note: p.note || '',
    })) as any[]
    downloadCSV(exportData, 'spc-data.csv')
    feedback.notifySuccess('Data exported')
  }, [points, light])

  return (
    <motion.div {...animProps} className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Section
        subtitle="Module 6 — Statistical Control"
        title={`I-MR Chart — ${company.processName || 'Process Control'}`}
        action={
          <div className="flex items-center gap-3">
            {showDemo && <Badge label="DEMO" color="yellow" size="sm" glow />}
            <Button size="sm" variant="outline" onClick={handleExport}>CSV</Button>
            {!showDemo && (
              <Button size="sm" variant="danger" onClick={handleResetDemo}>Reset</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KPICard label="Points" value={points.length} color={T.cyan} />
        <KPICard label="Mean" value={numFormatter.format(limits.mean)} color={T.green} />
        <KPICard label="UCL" value={numFormatter.format(limits.ucl)} color={T.red} />
        <KPICard label="Stability" value={`${stabilityScore}%`} color={stabilityScore > 90 ? T.green : T.red} />
        <KPICard
          label="Status"
          value={outOfControl ? 'Unstable' : 'Stable'}
          color={outOfControl ? T.red : T.green}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Panel>
          <Section subtitle="I-Chart" title="Individual Values" color={T.cyan} />
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                <Tooltip {...chartTooltipStyle} />
                
                <ReferenceLine y={limits.ucl} stroke={T.red} strokeDasharray="4 4" />
                <ReferenceLine y={limits.mean} stroke={T.green} />
                <ReferenceLine y={limits.lcl} stroke={T.red} strokeDasharray="4 4" />
                
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={T.cyan}
                  strokeWidth={2}
                  isAnimationActive={animated}
                  // Perbaikan: Dot typing yang aman untuk Recharts
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (typeof cx !== 'number' || typeof cy !== 'number') return <path />
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isViolation ? 5 : 3}
                        fill={payload.isViolation ? T.red : T.bg}
                        stroke={payload.isViolation ? T.red : T.cyan}
                        strokeWidth={2}
                      />
                    )
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {mrData.length > 0 && (
          <Panel>
            <Section subtitle="MR-Chart" title="Moving Range" color={T.orange} />
            <div className="mt-4 h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mrData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                  <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                  <Tooltip {...chartTooltipStyle} />
                  <ReferenceLine y={limits.mrUcl} stroke={T.red} strokeDasharray="4 4" />
                  <Line type="stepAfter" dataKey="mr" stroke={T.orange} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {violations.length > 0 && (
          <Panel className="lg:col-span-4 border-red/40 bg-red/5">
            <Section title="Violations" color={T.red} />
            <div className="mt-2 flex flex-col gap-2">
              {violations.map((v, idx) => (
                <div key={idx} className="text-[10px] font-mono p-2 border border-red/20 rounded bg-bg">
                  <span className="text-red font-bold">RULE {v.rule}:</span> {v.description} (Point {v.index + 1})
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel className={violations.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}>
          <Section title="Add Measurement" />
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[120px]">
              <Input
                label="Label"
                value={form.label}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="w-32">
              <NumberInput
                label="Value"
                value={form.value}
                onChange={(e: any) => setForm({ ...form, value: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Note"
                value={form.note}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <Button onClick={handleAddPoint} variant="primary">+ Add</Button>
          </div>

          {points.length > 0 && (
            <div className="mt-6 overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left font-mono text-[10px]">
                <thead className="bg-surface border-b border-border text-ink-dim uppercase">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Label</th>
                    <th className="p-2">Value</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {points.map((p, i) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="p-2 text-ink-dim">{i + 1}</td>
                      <td className="p-2 font-bold">{p.label}</td>
                      <td className="p-2" style={{ color: T.cyan }}>{p.value}</td>
                      <td className="p-2 text-right">
                        <ConfirmButton label="✕" variant="danger" size="xs" onConfirm={() => handleDelete(p.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </motion.div>
  )
}
