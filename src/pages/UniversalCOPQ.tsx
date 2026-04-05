// src/pages/UniversalCOPQ.tsx
/**
 * ============================================================================
 * UNIVERSAL COPQ — FLEXIBLE COST OF POOR QUALITY CALCULATOR
 * ============================================================================
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { feedback } from '@/lib/feedback'
// 🔥 PERBAIKAN 1: Gunakan barrel hook
import { useHaptic, useCurrency } from '@/hooks'
import { useConfigStore } from '@/lib/config'

import { Section, Panel, KPICard, SimpleBarChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput, Select } from '@/components/ui/Input'
import { ConfirmButton } from '@/components/ui/Confirm'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
   TYPES & CONSTANTS
   -------------------------------------------------------------------------- */
type COPQCategory = 'internal' | 'external' | 'appraisal' | 'prevention'

interface COPQLineItem {
  id: string
  label: string
  monthly: number | ''
  category: COPQCategory
}

const CATEGORY_CONFIG: Record<COPQCategory, { label: string; color: string }> = {
  internal: { label: 'Internal Failure', color: T.red },
  external: { label: 'External Failure', color: T.orange },
  appraisal: { label: 'Appraisal', color: T.yellow },
  prevention: { label: 'Prevention', color: T.cyan },
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}))

const DEMO_LINES: COPQLineItem[] = [
  { id: '1', label: 'Rework labor', monthly: 4500, category: 'internal' },
  { id: '2', label: 'Scrap/waste', monthly: 2100, category: 'internal' },
  { id: '3', label: 'Warranty claims', monthly: 3800, category: 'external' },
  { id: '4', label: 'Lost sales', monthly: 8500, category: 'external' },
  { id: '5', label: 'Inspection labor', monthly: 1200, category: 'appraisal' },
  { id: '6', label: 'Training & process', monthly: 800, category: 'prevention' },
]

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */
const generateId = () => `copq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const STORAGE_KEY = 'six_sigma_universal_copq'

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function UniversalCOPQ() {
  // 🔥 PERBAIKAN 2: Gunakan useCurrency
  const { format } = useCurrency()
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  // 🔥 PERBAIKAN 3: Inisialisasi state dari localStorage agar data tidak hilang saat refresh
  const [items, setItems] = useState<COPQLineItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load COPQ from local storage')
    }
    return DEMO_LINES
  })

  // Auto-save ke localStorage setiap kali items berubah
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // ─── DERIVED TOTALS ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const result = {
      internal: 0,
      external: 0,
      appraisal: 0,
      prevention: 0,
      total: 0,
    }
    for (const item of items) {
      const val = Number(item.monthly) || 0
      result[item.category] += val
      result.total += val
    }
    return result
  }, [items])

  const chartData = useMemo(() => {
    return Object.entries(totals)
      .filter(([key]) => key !== 'total')
      .map(([category, cost]) => ({
        category: CATEGORY_CONFIG[category as COPQCategory].label,
        cost,
      }))
  }, [totals])

  // ─── CRUD OPERATIONS ─────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    medium()
    const newItem: COPQLineItem = {
      id: generateId(),
      label: 'New cost item',
      monthly: 0,
      category: 'internal',
    }
    setItems((prev) => [newItem, ...prev]) // Taruh di atas agar mudah diedit
    feedback.notifyInfo('New line added')
  }, [medium])

  const updateLine = useCallback(
    (id: string, field: keyof COPQLineItem, value: string | number) => {
      light()
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      )
    },
    [light]
  )

  const deleteLine = useCallback(
    (id: string, label: string) => {
      medium()
      setItems((prev) => prev.filter((item) => item.id !== id))
      feedback.notifySuccess(`Deleted: ${label}`)
    },
    [medium]
  )

  const handleReset = useCallback(() => {
    medium()
    setItems(DEMO_LINES)
    feedback.notifyInfo('Reset to Demo Data')
  }, [medium])

  // ─── EXPORT HANDLER ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    light()
    const exportData = items.map((item) => {
      const val = Number(item.monthly) || 0
      return {
        Category: CATEGORY_CONFIG[item.category].label,
        'Cost Item': item.label,
        'Monthly Cost': val,
        'Annual Cost': val * 12,
      }
    })
    const successExport = downloadCSV(exportData, 'universal-copq.csv')
    if (successExport) {
      success()
      feedback.notifySuccess('Exported to CSV')
    } else {
      feedback.notifyError('Export failed')
    }
  }, [items, success, light])

  const animated = config.ui.animationsEnabled

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <Section
        subtitle="Module 10 — Financial Analysis"
        title="Universal COPQ"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleReset} icon="↺">
              Reset Demo
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} icon="↓">
              CSV
            </Button>
            <Button size="sm" variant="primary" onClick={addLine} icon="+">
              Add Line
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(CATEGORY_CONFIG).map(([cat, { label, color }]) => (
          <KPICard
            key={cat}
            label={label}
            value={format(totals[cat as COPQCategory])}
            color={color}
            sub="per month"
          />
        ))}
        <KPICard label="Total COPQ/mo" value={format(totals.total)} color={T.red} />
        <KPICard label="Annual COPQ" value={format(totals.total * 12)} color={T.red} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Bar Chart */}
        <Panel className="lg:col-span-5 flex flex-col justify-between">
          <Section
            subtitle="Visualization"
            title="COPQ by Category"
            color={T.cyan}
            action={
              <HelpTooltip
                title="COPQ Categories"
                description="Internal: rework, scrap. External: warranty, lost sales. Appraisal: inspection. Prevention: training, process improvement."
              />
            }
          />
          <div className="mt-4 flex-1">
            <SimpleBarChart
              data={chartData}
              xKey="category"
              bars={[{ key: 'cost', color: T.red, label: 'Monthly Cost' }]}
              height={280}
            />
          </div>
        </Panel>

        {/* Line Items List */}
        <Panel className="lg:col-span-7">
          <Section subtitle="Line Items" title="Cost Breakdown" />
          
          <div className="mt-2 flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const catConfig = CATEGORY_CONFIG[item.category]
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-surface/50"
                    style={{ borderColor: `${catConfig.color}40`, backgroundColor: `${catConfig.color}0A` }}
                  >
                    <div className="flex w-full sm:w-auto flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={item.label}
                        onChange={(e) => updateLine(item.id, 'label', e.target.value)}
                        placeholder="Cost Item Name"
                        aria-label="Cost item label"
                      />
                      <NumberInput
                        value={item.monthly}
                        onChange={(e) => updateLine(item.id, 'monthly', e.target.value === '' ? '' : Number(e.target.value))}
                        min={0}
                        step={100}
                        placeholder="0"
                        aria-label="Monthly cost"
                      />
                    </div>
                    
                    <div className="flex w-full sm:w-auto items-center justify-between gap-3">
                      <Select
                        value={item.category}
                        onChange={(e) => updateLine(item.id, 'category', e.target.value as COPQCategory)}
                        options={CATEGORY_OPTIONS}
                      />
                      <ConfirmButton
                        variant="danger"
                        label="✕"
                        size="sm"
                        message={`Delete "${item.label}"?`}
                        onConfirm={() => deleteLine(item.id, item.label)}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="font-mono text-4xl opacity-20" style={{ color: T.red }}>$</div>
                <div className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink-dim">
                  No cost items found
                </div>
                <div className="mt-1 text-[10px] text-ink-dim/50">Click "Add Line" to calculate COPQ</div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
