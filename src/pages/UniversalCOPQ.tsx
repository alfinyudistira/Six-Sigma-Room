import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { feedback } from '@/lib/feedback'
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

type COPQCategory = 'internal' | 'external' | 'appraisal' | 'prevention'

interface COPQLineItem {
  id: string
  label: string
  monthly: number | ''
  category: COPQCategory
}

// Enterprise taxonomy for Quality Costs
const CATEGORY_CONFIG: Record<COPQCategory, { label: string; color: string; type: 'CoPQ' | 'CoGQ' }> = {
  internal: { label: 'Internal Failure', color: T.orange, type: 'CoPQ' },
  external: { label: 'External Failure', color: T.red, type: 'CoPQ' },
  // PERBAIKAN 1: Ganti T.blue menjadi T.cyan
  appraisal: { label: 'Appraisal (Insp.)', color: T.cyan, type: 'CoGQ' },
  prevention: { label: 'Prevention', color: T.cyan, type: 'CoGQ' },
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}))

const DEMO_LINES: COPQLineItem[] = [
  { id: '1', label: 'Rework labor', monthly: 4500, category: 'internal' },
  { id: '2', label: 'Scrap material waste', monthly: 2100, category: 'internal' },
  { id: '3', label: 'Customer warranty claims', monthly: 3800, category: 'external' },
  { id: '4', label: 'Lost sales (LTV)', monthly: 8500, category: 'external' },
  { id: '5', label: 'QA Inspection labor', monthly: 1200, category: 'appraisal' },
  { id: '6', label: 'Six Sigma Training', monthly: 800, category: 'prevention' },
]

const STORAGE_KEY = 'six_sigma_universal_copq'

/* --------------------------------------------------------------------------
   ANIMATION VARIANTS
   -------------------------------------------------------------------------- */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function UniversalCOPQ() {
  const { format } = useCurrency()
  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  const [items, setItems] = useState<COPQLineItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load COPQ from local storage')
    }
    return DEMO_LINES
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // ─── ENTERPRISE DERIVED ANALYTICS ──────────────────────────────────────
  const analytics = useMemo(() => {
    const breakdown = { internal: 0, external: 0, appraisal: 0, prevention: 0 }
    let totalFailure = 0 // Cost of Poor Quality (CoPQ)
    let totalInvest = 0  // Cost of Good Quality (CoGQ)
    let biggestBleeder: COPQLineItem | null = null

    for (const item of items) {
      const val = Number(item.monthly) || 0
      breakdown[item.category] += val
      
      if (CATEGORY_CONFIG[item.category].type === 'CoPQ') {
        totalFailure += val
        // Find the most expensive failure
        if (!biggestBleeder || val > Number(biggestBleeder.monthly)) {
          biggestBleeder = item
        }
      } else {
        totalInvest += val
      }
    }

    return { 
      breakdown, 
      totalFailure, 
      totalInvest, 
      grandTotal: totalFailure + totalInvest,
      biggestBleeder 
    }
  }, [items])

  const chartData = useMemo(() => {
    return Object.entries(analytics.breakdown).map(([cat, cost]) => ({
      category: CATEGORY_CONFIG[cat as COPQCategory].label,
      cost,
      fill: CATEGORY_CONFIG[cat as COPQCategory].color // Provide color for advanced charts
    }))
  }, [analytics.breakdown])

  // ─── CRUD OPERATIONS ─────────────────────────────────────────────────────
  const addLine = useCallback(() => {
    medium()
    const newItem: COPQLineItem = {
      id: `copq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      monthly: '',
      category: 'internal',
    }
    // Add to top for immediate editing
    setItems((prev) => [newItem, ...prev]) 
    setTimeout(() => {
      document.getElementById(`input-label-${newItem.id}`)?.focus()
    }, 50)
  }, [medium])

  const updateLine = useCallback((id: string, field: keyof COPQLineItem, value: string | number) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }, [])

  const deleteLine = useCallback((id: string, label: string) => {
      medium()
      setItems((prev) => prev.filter((item) => item.id !== id))
      feedback.notifySuccess(`Deleted item`)
  }, [medium])

  const handleReset = useCallback(() => {
    medium()
    setItems(DEMO_LINES)
    feedback.notifyInfo('Restored baseline simulation data')
  }, [medium])

  const handleExport = useCallback(() => {
    light()
    const exportData = items.map((item) => {
      const val = Number(item.monthly) || 0
      return {
        Type: CATEGORY_CONFIG[item.category].type,
        Category: CATEGORY_CONFIG[item.category].label,
        'Cost Item': item.label || 'Unnamed',
        'Monthly Cost': val,
        'Annualized': val * 12,
      }
    })
    if (downloadCSV(exportData, 'enterprise-copq-analysis.csv')) {
      success()
      feedback.notifySuccess('Financial dataset exported successfully')
    } else {
      feedback.notifyError('Export failed')
    }
  }, [items, success, light])

  const animated = config.ui.animationsEnabled

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      {...(animated ? { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } } : {})}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-x-hidden"
    >
      {/* Header Premium */}
      <Section
        subtitle="Module 10 — Financial Analysis"
        title="Universal COPQ & Quality ROI"
        action={
          <div className="flex gap-3 items-center">
            <Button size="sm" variant="ghost" onClick={handleReset} className="text-ink-dim hover:text-ink">
              ↺ Reset Data
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="border-cyan/50 text-cyan">
              ⭳ CSV Export
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="md" variant="primary" onClick={addLine} className="shadow-[0_0_15px_rgba(0,212,255,0.3)] font-bold tracking-wider">
                + ADD LINE ITEM
              </Button>
            </motion.div>
          </div>
        }
      />

      {/* Enterprise KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <KPICard label="Total Failure Cost (CoPQ)" value={format(analytics.totalFailure)} color={T.red} sub="Annual: +$100k" />
        <KPICard label="Total Investment (CoGQ)" value={format(analytics.totalInvest)} color={T.cyan} sub="Prevention & Appraisal" />
        <KPICard label="Quality Cost Ratio" value={`${analytics.totalInvest > 0 ? (analytics.totalFailure / analytics.totalInvest).toFixed(1) : 0}x`} color={T.yellow} sub="Target: < 3.0x" />
        
        {/* Biggest Bleeder Insight Card */}
        <div className="col-span-2 rounded-lg border p-4 shadow-sm flex flex-col justify-center relative overflow-hidden" style={{ borderColor: `${T.red}40`, backgroundColor: `${T.red}05` }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red rounded-full filter blur-3xl opacity-10 pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <div>
              <div className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-ink-dim mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                Biggest Financial Bleeder
              </div>
              <div className="font-display font-bold text-ink truncate max-w-[200px]">
                {analytics.biggestBleeder?.label || 'No Active Failures'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-red">
                {analytics.biggestBleeder ? format(Number(analytics.biggestBleeder.monthly)) : '$0'}
              </div>
              <div className="font-mono text-[0.6rem] text-ink-dim uppercase">/ month</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Advanced Charting */}
        <Panel className="lg:col-span-4 flex flex-col border border-border/50">
          <Section
            subtitle="Cost Distribution"
            title="CoPQ vs CoGQ"
            color={T.cyan}
            action={
              <HelpTooltip
                title="TQC Taxonomy"
                description="Failure (CoPQ) destroys value. Appraisal/Prevention (CoGQ) protects value. Goal: Shift spending from Failure to Prevention."
              />
            }
          />
          <div className="mt-6 flex-1 min-h-[300px]">
             {/* Note: Fallback color to T.textMid in case chart doesn't support 'fill' property from data natively */}
            <SimpleBarChart
              data={chartData}
              xKey="category"
              bars={[{ key: 'cost', color: T.textMid, label: 'Cost/Mo' }]}
              height={280}
            />
          </div>
        </Panel>

        {/* Dynamic Line Items Editor */}
        <Panel className="lg:col-span-8 flex flex-col">
          <Section subtitle="Ledger" title="Financial Line Items" />
          
          <div className="mt-4 flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Table Header equivalent */}
            <div className="hidden sm:flex items-center gap-3 px-3 pb-2 font-mono text-[0.65rem] font-bold uppercase tracking-widest text-ink-dim border-b border-border/50">
              <div className="flex-1 pl-1">Cost Description</div>
              <div className="w-[140px]">Monthly Amount</div>
              <div className="w-[180px]">Taxonomy Category</div>
              <div className="w-[40px]"></div>
            </div>

            {/* PERBAIKAN 2: Menggunakan spread operator untuk properti variants agar tidak bernilai undefined */}
            <motion.div 
              {...(animated ? { variants: containerVariants as any } : {})}
              initial="hidden" 
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {items.map((item) => {
                  const catConfig = CATEGORY_CONFIG[item.category]
                  const isBleeder = item.id === analytics.biggestBleeder?.id
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      {...(animated ? { variants: itemVariants as any } : {})}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      className={cn(
                        "flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border p-2.5 transition-all mb-2 group",
                        isBleeder ? "shadow-[0_0_10px_rgba(255,59,92,0.15)] bg-surface" : "hover:bg-surface/50 bg-bg"
                      )}
                      style={{ 
                        borderColor: isBleeder ? T.red : `${catConfig.color}40`,
                        borderLeftWidth: isBleeder ? '4px' : '1px'
                      }}
                    >
                      {/* Drag Handle Indicator (Visual Only) */}
                      <div className="hidden sm:flex opacity-20 group-hover:opacity-100 cursor-ns-resize text-ink-dim px-1 transition-opacity">
                        ⋮⋮
                      </div>

                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          id={`input-label-${item.id}`}
                          value={item.label}
                          onChange={(e) => updateLine(item.id, 'label', e.target.value)}
                          placeholder="E.g., Production Rework Labor"
                          className="w-full bg-transparent border-none text-sm text-ink font-medium focus:ring-0 px-1 py-1 placeholder:text-ink-dim/30"
                        />
                      </div>

                      <div className="w-full sm:w-[140px] relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim font-mono text-sm opacity-50">$</span>
                        <input
                          type="number"
                          value={item.monthly}
                          onChange={(e) => {
                            light()
                            updateLine(item.id, 'monthly', e.target.value === '' ? '' : Number(e.target.value))
                          }}
                          className={cn(
                            "w-full bg-panel border rounded-md text-sm font-mono focus:ring-1 px-3 pl-7 py-1.5 transition-colors",
                            isBleeder ? "border-red/50 text-red focus:border-red" : "border-border text-ink focus:border-cyan"
                          )}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="w-full sm:w-[180px] flex items-center gap-3">
                        <select
                          value={item.category}
                          onChange={(e) => {
                            light()
                            updateLine(item.id, 'category', e.target.value as COPQCategory)
                          }}
                          className="flex-1 bg-panel border border-border rounded-md text-[0.7rem] font-mono font-bold uppercase tracking-wider p-2 focus:ring-1 focus:border-cyan appearance-none"
                          style={{ color: catConfig.color }}
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        
                        <button
                          onClick={() => deleteLine(item.id, item.label)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-transparent text-ink-dim hover:text-red hover:bg-red/10 hover:border-red/20 transition-all"
                          title="Delete line"
                        >
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {items.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-lg">
                <div className="text-5xl opacity-20 grayscale mb-3">🧾</div>
                <div className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-ink-dim">
                  Zero Financial Data
                </div>
                <div className="mt-2 text-xs text-ink-dim/50 max-w-xs">
                  The ledger is empty. Click "+ Add Line Item" to start tracking quality costs.
                </div>
              </motion.div>
            )}
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
