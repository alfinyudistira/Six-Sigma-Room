// src/pages/ParetoBuilder.tsx

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'

import { useAppDispatch, useAppSelector } from '@/store/store'
import {
  addParetoItem,
  deleteParetoItem,
  setPareto,
  paretoSelectors,
  type ParetoItem,
} from '@/store/moduleSlice'

import { useConfigStore } from '@/lib/config'
import { useModulePersist, useHaptic } from '@/hooks'
import { feedback } from '@/lib/feedback'

import { Section, Panel, KPICard, ParetoChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { ConfirmButton } from '@/components/ui/Confirm'
import { tokens } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'
import { cn } from '@/lib/utils'

const COLOR_PALETTE = [
  tokens.red,
  tokens.orange,
  tokens.yellow,
  tokens.cyan,
  tokens.green,
  '#9B8EC4',
  '#7EB5A6',
  '#E07B54',
  '#4CC9F0',
  '#F72585',
] as const

const DEMO_ITEMS: ParetoItem[] = [
  { id: 'd1', category: 'Software Config', count: 153, color: tokens.red },
  { id: 'd2', category: 'Network Conn.', count: 120, color: tokens.orange },
  { id: 'd3', category: 'Hardware Failure', count: 98, color: tokens.yellow },
  { id: 'd4', category: 'Account Access', count: 76, color: tokens.cyan },
  { id: 'd5', category: 'Integration Error', count: 54, color: tokens.green },
]

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

export default function ParetoBuilder() {
  const dispatch = useAppDispatch()

  const userItems = useAppSelector(paretoSelectors.selectAll)
  const rawState = useAppSelector((state) => state.modules.pareto)
  
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  const [showDemo, setShowDemo] = useState(userItems.length === 0)
  const [newCategory, setNewCategory] = useState('')
  const [newCount, setNewCount] = useState<number | ''>('')

  const items = showDemo ? DEMO_ITEMS : userItems
  useModulePersist('pareto_items', rawState, { debounceMs: 800 })

  // ─── DERIVED DATA ───────────────────────────────────────────────────────
  const { chartData, total } = useMemo(() => {
    if (items.length === 0) return { chartData: [], total: 0 }

    const sorted = [...items].sort((a, b) => b.count - a.count)
    const totalVal = sum(sorted.map((i) => i.count))

    let cum = 0
    const chart = sorted.map((item) => {
      cum += item.count
      const pct = totalVal > 0 ? (item.count / totalVal) * 100 : 0
      const cumPct = totalVal > 0 ? (cum / totalVal) * 100 : 0
      return {
        ...item,
        pct: Number(pct.toFixed(1)),
        cumPct: Number(cumPct.toFixed(1)),
      }
    })
    return { chartData: chart, total: totalVal }
  }, [items])

  const vitalFew = useMemo(
    () => chartData.filter((d) => d.cumPct <= config.pareto.cutoffPct),
    [chartData, config.pareto.cutoffPct]
  )
  const dominant = chartData[0]

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    const count = Number(newCount)
    if (!newCategory.trim()) {
      feedback.notifyWarning('Category name is required')
      light()
      return
    }
    if (isNaN(count) || count <= 0) {
      feedback.notifyWarning('Count must be a valid number greater than 0')
      light()
      return
    }

    medium()
    if (showDemo) {
      // Jika masih pakai demo, bersihkan demo dan masukkan data baru
      dispatch(setPareto([]))
      setShowDemo(false)
    }

    const newId = `par_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newColor = COLOR_PALETTE[userItems.length % COLOR_PALETTE.length] || tokens.cyan

    dispatch(
      addParetoItem({
        id: newId,
        category: newCategory.trim(),
        count,
        color: newColor,
      })
    )

    setNewCategory('')
    setNewCount('')
    success()
    feedback.notifySuccess(`Added: ${newCategory.trim()}`)
  }, [newCategory, newCount, showDemo, dispatch, userItems.length, light, medium, success])

  const handleReset = useCallback(() => {
    medium()
    dispatch(setPareto([]))
    setShowDemo(true)
    feedback.notifyInfo('Restored demo dataset')
  }, [dispatch, medium])

  const handleDelete = useCallback(
    (id: string, category: string) => {
      medium()
      dispatch(deleteParetoItem(id))
      feedback.notifySuccess(`Deleted: ${category}`)
    },
    [dispatch, medium]
  )

  const handleExport = useCallback(() => {
    const successExport = downloadCSV(
      chartData.map((d) => ({
        Category: d.category,
        Count: d.count,
        Percentage: `${d.pct}%`,
        Cumulative: `${d.cumPct}%`,
      })),
      'pareto-analysis.csv'
    )
    if (successExport) {
      success()
      feedback.notifySuccess('Pareto exported to CSV')
    } else {
      feedback.notifyError('Export failed')
    }
  }, [chartData, success])

  const animated = config.ui.animationsEnabled

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
        <motion.div
      {...(animated ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } } : {})}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <Section
        subtitle="Module 7 — Root Cause Prioritization"
        title="Pareto Intelligence Builder"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} icon="↓">
              CSV
            </Button>
            {!showDemo && (
              <Button size="sm" variant="danger" onClick={handleReset} icon="↺">
                Reset
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Categories" value={items.length} color={tokens.cyan} />
        <KPICard label="Total Occurrences" value={total} color={tokens.textMid} />
        <KPICard
          label="Vital Few"
          value={vitalFew.length}
          color={tokens.red}
          sub={`${config.pareto.cutoffPct}% cutoff rule`}
        />
        <KPICard
          label="Dominant Cause"
          value={dominant?.category ?? '—'}
          color={tokens.orange}
          sub={dominant ? `${dominant.pct}% of total` : ''}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Pareto Chart Panel */}
        <Panel className="lg:col-span-8 flex flex-col justify-between">
          <Section subtitle="Visualization" title="Pareto Distribution" />
          {chartData.length > 0 ? (
            <div className="mt-4 flex-1">
              <ParetoChart data={chartData} cutoff={config.pareto.cutoffPct} height={320} />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 font-mono text-5xl opacity-20 text-cyan">▌</div>
              <div className="font-mono text-sm font-bold uppercase tracking-widest text-ink">No Data Available</div>
              <div className="mt-2 font-mono text-xs text-ink-dim">Add categories below to generate insight</div>
            </div>
          )}
        </Panel>

        {/* Form & Vital Few List Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Add Category Form */}
          <Panel>
            <Section subtitle="Data Entry" title="Add Cause Category" />
            <div className="flex flex-col gap-4 mt-2">
              <Input
                label="Defect / Category Name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., Software Bug"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <NumberInput
                    label="Frequency (Count)"
                    value={newCount}
                    onChange={(e) => setNewCount(Number(e.target.value))}
                    placeholder="e.g., 42"
                    min={1}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  />
                </div>
                <Button onClick={handleAdd} variant="primary" className="mb-[2px]">
  + Add
</Button>
              </div>
            </div>
          </Panel>

          {/* Vital Few Focus List */}
          {vitalFew.length > 0 && (
            <Panel className="border-t-4" style={{ borderColor: tokens.red }}>
              <Section
                subtitle="80/20 Insight"
                title="Focus Here First"
                color={tokens.red}
              />
              <div className="mt-2 flex flex-col gap-2">
                {vitalFew.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-surface/50 p-2.5 transition-colors hover:bg-surface"
                    style={{ borderColor: `${item.color}33` }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="font-mono text-[10px] font-bold opacity-50">#{idx + 1}</span>
                      <span className="truncate font-mono text-xs font-bold" style={{ color: item.color }}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-xs font-bold text-ink">
                        {item.count} <span className="text-[10px] opacity-60">({item.cumPct}%)</span>
                      </span>
                      <ConfirmButton
                        variant="danger"
                        label="✕"
                        size="xs"
                        message={`Delete "${item.category}"?`}
                        onConfirm={() => handleDelete(item.id, item.category)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

        </div>
      </div>
    </motion.div>
  )
}
