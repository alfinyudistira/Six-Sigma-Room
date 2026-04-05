// src/pages/SPCCharts.tsx
/**
 * ============================================================================
 * SPC CHARTS — STATISTICAL PROCESS CONTROL (I‑MR CHART)
 * ============================================================================
 */

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
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
  spcSelectors, // 🔥 PERBAIKAN 1: Import Selector EntityState
  type SPCPoint,
} from '@/store/moduleSlice'

import { useConfigStore } from '@/lib/config'
import { calcControlLimits, detectWECO } from '@/lib/sigma'
import { feedback } from '@/lib/feedback'
// 🔥 PERBAIKAN 2: Barrel import
import { useHaptic, useModulePersist } from '@/hooks'

import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { ConfirmButton } from '@/components/ui/Confirm'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   CONSTANTS & FORMATTERS
   -------------------------------------------------------------------------- */
const DEMO_POINTS: SPCPoint[] = Array.from({ length: 20 }, (_, i) => ({
  id: `demo_${i}`,
  label: `W${i + 1}`,
  value: 48 + Math.sin(i * 0.7) * 8 + (i === 12 ? 22 : 0), // Memasukkan 1 anomali di index 12
  timestamp: new Date(Date.now() - (19 - i) * 7 * 86400000).toISOString(),
}))

// 🔥 PERBAIKAN 3: Native Formatter untuk keamanan Strict Mode
const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('en-US', { 
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
})

// Style Tooltip Recharts agar senada dengan UI
const chartTooltipStyle = {
  contentStyle: {
    background: T.panel,
    border: `1px solid ${T.borderHi}`,
    borderRadius: '8px',
    fontFamily: T.mono,
    fontSize: '11px',
    color: T.text,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: T.cyan, fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' },
  itemStyle: { color: T.textMid, fontSize: '11px', fontWeight: 'bold' },
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function SPCCharts() {
  const company = useAppStore((s) => s.company)
  const dispatch = useAppDispatch()
  
  // 🔥 PERBAIKAN 4: Ekstrak array dengan selector yang benar
  const userPoints = useAppSelector(spcSelectors.selectAll)
  const rawState = useAppSelector((s) => s.modules.spc)
  
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  const [showDemo, setShowDemo] = useState(userPoints.length === 0)
  
  // 🔥 PERBAIKAN 5: State aman untuk NumberInput (number | '')
  const [form, setForm] = useState<{ label: string; value: number | ''; note: string }>({
    label: '',
    value: '',
    note: '',
  })

  const points = showDemo ? DEMO_POINTS : userPoints
  
  // Auto save ke IndexedDB
  useModulePersist('spc_points', rawState, { debounceMs: 800 })

  // ─── CALCULATIONS (Memoized) ────────────────────────────────────────────
  const { limits, violations, chartData, mrData } = useMemo(() => {
    const vals = points.map((p) => p.value)
    if (vals.length < 2) {
      return {
        limits: { mean: 0, ucl: 0, lcl: 0, mrMean: 0, mrUcl: 0, sigma: 0 },
        violations: [],
        chartData: [],
        mrData: [],
      }
    }

    const lim = calcControlLimits(vals)
    const sigmaS = (lim.ucl - lim.mean) / 3 // 1 standard deviation for WECO

    // Evaluasi WECO Rules berdasarkan Config
    const weco =
      config.weco.rule1 || config.weco.rule2 || config.weco.rule3
        ? detectWECO(vals, lim.mean, sigmaS)
        : []

    const violationSet = new Set(weco.map((v) => v.index))

    const chart = points.map((p, idx) => ({
      name: p.label,
      value: p.value,
      ucl: lim.ucl,
      cl: lim.mean,
      lcl: lim.lcl,
      target: company.target,
      alarm: violationSet.has(idx) ? p.value : null,
      isViolation: violationSet.has(idx),
    }))

    // Data Moving Range (Jarak Absolut antara titik N dan N-1)
    const mr = points.slice(1).map((p, idx) => ({
      name: p.label,
      mr: Math.abs(p.value - points[idx].value),
      mrUcl: lim.mrUcl,
      mrMean: lim.mrMean,
    }))

    return { limits: lim, violations: weco, chartData: chart, mrData: mr }
  }, [points, config.weco, company.target])

  const outOfControl = violations.length > 0
  const animated = config.ui.animationsEnabled

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const handleAddPoint = useCallback(() => {
    const val = Number(form.value)
    if (!form.label.trim() || isNaN(val) || form.value === '') {
      light()
      feedback.notifyWarning('Label and valid numeric value are required')
      return
    }

    medium()
    if (showDemo) setShowDemo(false)

    dispatch(
      addSPCPoint({
        id: `spc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: form.label.trim(),
        value: val,
        timestamp: new Date().toISOString(),
        note: form.note.trim() || undefined,
      })
    )

    setForm({ label: '', value: '', note: '' })
    success()
    feedback.notifySuccess(`Point added: ${val}`)
  }, [form, dispatch, showDemo, light, medium, success])

  const handleResetDemo = useCallback(() => {
    medium()
    dispatch(setSPC([]))
    setShowDemo(true)
    feedback.notifyInfo('Reset to Demo Dataset')
  }, [dispatch, medium])

  const handleDelete = useCallback(
    (id: string, label: string) => {
      medium()
      dispatch(deleteSPCPoint(id))
      feedback.notifySuccess(`Deleted point: ${label}`)
    },
    [dispatch, medium]
  )

  const handleExport = useCallback(() => {
    light()
    const exportData = points.map((p) => ({
      Label: p.label,
      Value: p.value,
      Timestamp: p.timestamp,
      Note: p.note || '',
    }))
    const ok = downloadCSV(exportData, 'spc-data.csv')
    if (ok) {
      success()
      feedback.notifySuccess('Data exported to CSV')
    } else {
      feedback.notifyError('Failed to export data')
    }
  }, [points, success, light])

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* HEADER */}
      <Section
        subtitle="Module 6 — Statistical Control"
        title={`I-MR Chart — ${company.processName || 'Process Control'}`}
        action={
          <div className="flex items-center gap-3">
            {showDemo && <Badge label="DEMO" color="yellow" size="sm" glow />}
            {outOfControl && <Badge label={`${violations.length} ALERTS`} color="red" glow size="sm" />}
            <Button size="sm" variant="outline" onClick={handleExport} icon="↓">CSV</Button>
            {!showDemo && (
              <Button size="sm" variant="danger" onClick={handleResetDemo} icon="↺">Reset</Button>
            )}
          </div>
        }
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard label="Data Points" value={points.length} color={T.cyan} />
        <KPICard label="Process Mean" value={numFormatter.format(limits.mean)} color={T.green} />
        <KPICard label="Upper Control Limit" value={numFormatter.format(limits.ucl)} color={T.red} />
        <KPICard label="Lower Control Limit" value={numFormatter.format(limits.lcl)} color={T.yellow} />
        <KPICard
          label="WECO Status"
          value={outOfControl ? `${violations.length} Violations` : 'In Control'}
          color={outOfControl ? T.red : T.green}
          icon={outOfControl ? '⚠' : '✓'}
        />
      </div>

      {/* CHARTS AREA */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* I-Chart (Individual) */}
        <Panel className="xl:col-span-12">
          <Section
            subtitle="I-Chart"
            title="Individual Values"
            color={T.cyan}
            action={
              <HelpTooltip
                title="I-Chart"
                description="Monitors process center over time. Red dashed = Limits (UCL/LCL). Green = Mean. Red dots = Out of Control (WECO)."
              />
            }
          />
          <div className="mt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                <Tooltip {...chartTooltipStyle} />
                
                <ReferenceLine y={limits.ucl} stroke={T.red} strokeDasharray="4 4" label={{ value: 'UCL', fill: T.red, fontSize: 10, position: 'insideTopLeft' }} />
                <ReferenceLine y={limits.mean} stroke={T.green} label={{ value: 'MEAN', fill: T.green, fontSize: 10, position: 'insideTopLeft' }} />
                <ReferenceLine y={limits.lcl} stroke={T.red} strokeDasharray="4 4" label={{ value: 'LCL', fill: T.red, fontSize: 10, position: 'insideBottomLeft' }} />
                
                {company.target > 0 && (
                  <ReferenceLine y={company.target} stroke={T.cyan} strokeDasharray="2 2" label={{ value: 'TARGET', fill: T.cyan, fontSize: 10, position: 'insideTopRight' }} />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  name="Value"
                  stroke={T.cyan}
                  strokeWidth={2}
                  isAnimationActive={animated}
                  // 🔥 PERBAIKAN 6: Typing aman untuk custom dot Recharts
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (isNaN(cx) || isNaN(cy)) return null
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={payload.isViolation ? 5 : 3}
                        fill={payload.isViolation ? T.red : T.bg}
                        stroke={payload.isViolation ? T.red : T.cyan}
                        strokeWidth={2}
                        className={payload.isViolation ? "animate-pulse" : ""}
                      />
                    )
                  }}
                  activeDot={{ r: 6, stroke: T.bg, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* MR-Chart (Moving Range) */}
        {mrData.length > 0 && (
          <Panel className="xl:col-span-12 border-t-4" style={{ borderColor: T.orange }}>
            <Section subtitle="MR-Chart" title="Moving Range" color={T.orange} />
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mrData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                  <YAxis tick={{ fill: T.textDim, fontSize: 10, fontFamily: T.mono }} />
                  <Tooltip {...chartTooltipStyle} />
                  
                  <ReferenceLine y={limits.mrUcl} stroke={T.red} strokeDasharray="4 4" label={{ value: 'MR UCL', fill: T.red, fontSize: 10, position: 'insideTopLeft' }} />
                  <ReferenceLine y={limits.mrMean} stroke={T.green} label={{ value: 'MR MEAN', fill: T.green, fontSize: 10, position: 'insideTopLeft' }} />
                  
                  <Line 
                    type="stepAfter" 
                    dataKey="mr" 
                    name="Moving Range" 
                    stroke={T.orange} 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: T.bg, stroke: T.orange, strokeWidth: 2 }} 
                    isAnimationActive={animated}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      {/* DATA ENTRY & WECO LOGS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* WECO Violations Alert Box */}
        {violations.length > 0 && (
          <Panel className="lg:col-span-4 border-red/40 bg-red/5">
            <Section subtitle="Out of Control" title="WECO Violations" color={T.red} />
            <div className="mt-2 flex flex-col gap-3">
              {violations.map((v, idx) => (
                <div key={idx} className="flex flex-col gap-1 rounded-lg border border-red/20 bg-bg p-3 shadow-sm">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold" style={{ color: T.red }}>
                    <span className="animate-pulse">⚠</span> RULE {v.rule}
                  </div>
                  <div className="font-mono text-[10px] text-ink-dim">
                    <strong className="text-ink">Point {v.index + 1}:</strong> {v.description}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Add Point Form */}
        <Panel className={violations.length > 0 ? "lg:col-span-8" : "lg:col-span-12"}>
          <Section subtitle="Data Entry" title="Add Measurement" />
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[120px]">
              <Input
                label="Sample Label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g., Batch 42"
              />
            </div>
            <div className="w-32">
              <NumberInput
                label="Value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Measurement"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPoint() }}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                label="Note (Optional)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Special cause note..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPoint() }}
              />
            </div>
            <Button onClick={handleAddPoint} variant="primary" haptic="medium" className="mb-[2px]">
              + Add Point
            </Button>
          </div>

          {/* Data Table */}
          {points.length > 0 && (
            <div className="mt-8 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-surface text-ink-dim border-b border-border">
                  <tr>
                    <th className="p-3 font-semibold uppercase tracking-wider">#</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Label</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Value</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Note</th>
                    <th className="p-3 font-semibold uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {points.map((p, index) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-ink-dim">{index + 1}</td>
                      <td className="p-3 font-bold text-ink">{p.label}</td>
                      <td className="p-3 font-bold" style={{ color: T.cyan }}>{p.value}</td>
                      <td className="p-3 text-ink-dim">{p.note || '—'}</td>
                      <td className="p-3 text-right">
                        <ConfirmButton
                          variant="danger"
                          label="✕"
                          size="xs"
                          message="Delete?"
                          onConfirm={() => handleDelete(p.id, p.label)}
                        />
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
