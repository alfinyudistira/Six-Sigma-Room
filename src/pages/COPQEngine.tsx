import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

import { useAppStore, type CompanyProfile } from '@/store/useAppStore'
import { useConfigStore, getCopqAlert } from '@/lib/config'
import { useCurrency } from '@/hooks'
import { feedback } from '@/lib/feedback'

import { Section, Panel, KPICard, SimpleBarChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { NumberInput } from '@/components/ui/Input'
import { downloadCSV } from '@/lib/utils'
import { tokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

interface CopqInputs {
  prevention: number
  appraisal: number
  rework: number
  reworkHrs: number
  scrap: number
  scrapCost: number
  warranty: number
  warCost: number
  lost: number
}

function calculateCOPQ(company: CompanyProfile, inputs: CopqInputs) {
  // 1. Cost of Good Quality (CoGQ)
  const preventionTotal = inputs.prevention
  const appraisalTotal = inputs.appraisal
  const goodQualityCost = preventionTotal + appraisalTotal

  // 2. Cost of Poor Quality (CoPQ)
  const internal = (inputs.rework * inputs.reworkHrs * company.laborRate) + (inputs.scrap * inputs.scrapCost)
  const external = (inputs.warranty * inputs.warCost) + (inputs.lost * company.customerLTV)
  const totalCopq = internal + external
  
  // 3. Total Quality Cost (TQC)
  const totalQualityCost = goodQualityCost + totalCopq
  const annualCopq = totalCopq * 12

  // 4. Financial Metrics
  const revenueEst = company.laborRate * company.monthlyVolume * 12
  const copqPct = revenueEst > 0 ? (annualCopq / revenueEst) * 100 : 0
  const saved65 = annualCopq * 0.65
  
  // 5. ROI of Prevention (For every $1 spent on prevention/appraisal, how much failure cost exists?)
  const preventionRatio = goodQualityCost > 0 ? totalCopq / goodQualityCost : 0

  return { 
    preventionTotal, appraisalTotal, goodQualityCost, 
    internal, external, totalCopq, totalQualityCost, 
    annualCopq, copqPct, saved65, preventionRatio 
  }
}

/* --------------------------------------------------------------------------
   ANIMATION VARIANTS
   -------------------------------------------------------------------------- */
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function COPQEngine() {
  const company = useAppStore((s) => s.company)
  const config = useConfigStore((s) => s.config)
  const { format } = useCurrency()

  // ─── STATE ───────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<CopqInputs>(() => ({
    prevention: 2500, // Default baseline investment
    appraisal: 1500,  // Default baseline investment
    rework: company.monthlyVolume * 0.08,
    reworkHrs: 2.5,
    scrap: company.monthlyVolume * 0.02,
    scrapCost: company.laborRate * 4,
    warranty: Math.round(company.monthlyVolume * 0.01),
    warCost: company.customerLTV * 0.15,
    lost: Math.round(company.monthlyVolume * 0.005),
  }))

  const updateField = useCallback((key: keyof CopqInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: Math.max(0, value || 0) })) // Safety fallback
  }, [])

  // ─── DERIVED METRICS ─────────────────────────────────────────────────────
  const metrics = useMemo(() => calculateCOPQ(company, inputs), [company, inputs])
  const alert = useMemo(() => getCopqAlert(metrics.copqPct, config), [metrics.copqPct, config])

  const chartData = useMemo(() => [
    { category: 'Prevention', cost: metrics.preventionTotal, fill: tokens.cyan },
    { category: 'Appraisal', cost: metrics.appraisalTotal, fill: tokens.blue },
    { category: 'Internal Fail', cost: metrics.internal, fill: tokens.orange },
    { category: 'External Fail', cost: metrics.external, fill: tokens.red },
  ], [metrics])

  // ─── EXPORT HANDLER ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const success = downloadCSV(
      [{ ...metrics, company: company.name, timestamp: new Date().toISOString() }],
      `TQC-Analysis-${company.name.replace(/\s+/g, '-')}.csv`
    )
    if (success) feedback.notifySuccess('Enterprise TQC Exported', 'Financial dataset ready for leadership review.')
    else feedback.notifyError('Export Failed', 'Unable to generate financial report.')
  }, [metrics, company.name])

  const animated = config.ui.animationsEnabled

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      // 🔥 PERBAIKAN: Spread operator agar tidak mengirimkan undefined ke motion props
      {...(animated ? { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } } : {})}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 overflow-x-hidden"
    >
      {/* Header Premium */}
      <Section
        subtitle="Module 5 — Financial Analytics"
        title="Total Quality Cost (TQC) Engine"
        action={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button size="sm" variant="outline" onClick={handleExport} className="border-cyan/50 hover:bg-cyan/10 text-cyan transition-all shadow-[0_0_15px_rgba(0,212,255,0.1)]">
              <span className="mr-2">⭳</span> Export Financial CSV
            </Button>
          </motion.div>
        }
      />

      {/* KPI Grid (Staggered Animation) */}
      <motion.div 
        {...(animated ? { variants: containerVariants, initial: "hidden", animate: "show" } : {})}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"
      >
        <motion.div variants={itemVariants}>
          <KPICard label="Good Quality Cost" value={format(metrics.goodQualityCost)} color={tokens.cyan} sub="Prevention + Appraisal" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard label="Internal Failure" value={format(metrics.internal)} color={tokens.orange} sub="Rework + Scrap" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard label="External Failure" value={format(metrics.external)} color={tokens.red} sub="Warranty + Lost LTV" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard label="Total COPQ / mo" value={format(metrics.totalCopq)} color={alert.color} sub="Failure Cost Only" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard label="COPQ % of Revenue" value={`${metrics.copqPct.toFixed(2)}%`} color={alert.color} sub={`STATUS: ${alert.level.toUpperCase()}`} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard label="Failure:Invest Ratio" value={`${metrics.preventionRatio.toFixed(1)}x`} color={metrics.preventionRatio > 5 ? tokens.red : tokens.green} sub="Target: < 3.0x" />
        </motion.div>
      </motion.div>

      {/* Inputs & Visualization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Cost of Good Quality Inputs */}
        <Panel className="lg:col-span-3 border-t-2" style={{ borderTopColor: tokens.cyan }}>
          <Section subtitle="Investment" title="Good Quality" color={tokens.cyan} />
          <div className="flex flex-col gap-4 mt-2">
            <div className="p-3 bg-cyan/5 border border-cyan/20 rounded-lg text-xs text-ink-dim mb-2 leading-relaxed">
              Investments made to ensure process conformance before defects occur.
            </div>
            <NumberInput label="Prevention Cost / Mo ($)" value={inputs.prevention} onChange={(e) => updateField('prevention', Number(e.target.value))} step={100} />
            <NumberInput label="Appraisal Cost / Mo ($)" value={inputs.appraisal} onChange={(e) => updateField('appraisal', Number(e.target.value))} step={100} />
          </div>
        </Panel>

        {/* Internal Failure Inputs */}
        <Panel className="lg:col-span-3 border-t-2" style={{ borderTopColor: tokens.orange }}>
          <Section subtitle="Waste" title="Internal Failure" color={tokens.orange} />
          <div className="flex flex-col gap-4 mt-2">
            <NumberInput label="Rework Units / Mo" value={inputs.rework} onChange={(e) => updateField('rework', Number(e.target.value))} />
            <NumberInput label="Rework Hrs / Unit" value={inputs.reworkHrs} onChange={(e) => updateField('reworkHrs', Number(e.target.value))} step={0.5} />
            <NumberInput label="Scrap Units / Mo" value={inputs.scrap} onChange={(e) => updateField('scrap', Number(e.target.value))} />
            <NumberInput label="Scrap Cost / Unit ($)" value={inputs.scrapCost} onChange={(e) => updateField('scrapCost', Number(e.target.value))} step={10} />
          </div>
        </Panel>

        {/* External Failure Inputs */}
        <Panel className="lg:col-span-3 border-t-2" style={{ borderTopColor: tokens.red }}>
          <Section subtitle="Damage" title="External Failure" color={tokens.red} />
          <div className="flex flex-col gap-4 mt-2">
            <NumberInput label="Warranty Claims / Mo" value={inputs.warranty} onChange={(e) => updateField('warranty', Number(e.target.value))} />
            <NumberInput label="Avg Warranty Cost ($)" value={inputs.warCost} onChange={(e) => updateField('warCost', Number(e.target.value))} step={50} />
            <NumberInput label="Lost Customers / Mo" value={inputs.lost} onChange={(e) => updateField('lost', Number(e.target.value))} />
            <div className="rounded-lg border border-border bg-panel p-3 flex justify-between items-center mt-1 opacity-80 cursor-not-allowed">
              <span className="font-mono text-[0.65rem] font-bold uppercase text-ink-dim">Locked LTV</span>
              <span className="font-mono text-sm font-bold" style={{ color: tokens.cyan }}>{format(company.customerLTV)}</span>
            </div>
          </div>
        </Panel>

        {/* Visualization */}
        <Panel className="lg:col-span-3 flex flex-col">
          <Section subtitle="Breakdown" title="Cost Distribution" color={tokens.blue} />
          <div className="flex-1 min-h-[280px] mt-4 relative">
            {/* Menggunakan Custom Fill Colors */}
            <SimpleBarChart
              data={chartData}
              xKey="category"
              bars={[{ key: 'cost', color: tokens.textMid, label: 'Monthly Cost' }]} // Fallback color, will use data.fill if available in a more advanced chart, but kept safe here
              height={260}
            />
            
            <div className="absolute top-2 right-2 text-right">
              <div className="text-[0.6rem] font-mono uppercase text-ink-dim tracking-widest">Est. Annual COPQ</div>
              <div className="text-xl font-bold font-mono" style={{ color: tokens.red, textShadow: `0 0 10px ${tokens.red}40` }}>
                {format(metrics.annualCopq)}
              </div>
            </div>
          </div>
        </Panel>

      </div>
    </motion.div>
  )
}
