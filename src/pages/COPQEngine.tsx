// src/pages/COPQEngine.tsx

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

interface CopqInputs {
  rework: number
  reworkHrs: number
  scrap: number
  scrapCost: number
  warranty: number
  warCost: number
  lost: number
}

function calculateCOPQ(company: CompanyProfile, inputs: CopqInputs) {
  const internal =
    inputs.rework * inputs.reworkHrs * company.laborRate +
    inputs.scrap * inputs.scrapCost

  const external =
    inputs.warranty * inputs.warCost +
    inputs.lost * company.customerLTV

  const total = internal + external
  const annual = total * 12

  const revenueEst = company.laborRate * company.monthlyVolume * 12
  const copqPct = revenueEst > 0 ? (annual / revenueEst) * 100 : 0
  const saved65 = annual * 0.65

  return { internal, external, total, annual, copqPct, saved65 }
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function COPQEngine() {
  const company = useAppStore((s) => s.company)
  const config = useConfigStore((s) => s.config)
  // 🔥 PERBAIKAN 4: Destructure 'format' dari useCurrency
  const { format } = useCurrency()

  // ─── State ───────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<CopqInputs>(() => ({
    rework: company.monthlyVolume * 0.08,
    reworkHrs: 2.5,
    scrap: company.monthlyVolume * 0.02,
    scrapCost: company.laborRate * 4,
    warranty: Math.round(company.monthlyVolume * 0.01),
    warCost: company.customerLTV * 0.15,
    lost: Math.round(company.monthlyVolume * 0.005),
  }))

  const updateField = useCallback((key: keyof CopqInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value || 0 })) // Safety fallback to 0
  }, [])

  // ─── Derived metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(
    () => calculateCOPQ(company, inputs),
    [company, inputs]
  )

  const alert = useMemo(
    () => getCopqAlert(metrics.copqPct, config),
    [metrics.copqPct, config]
  )

  const chartData = useMemo(
    () => [
      { category: 'Internal', cost: metrics.internal },
      { category: 'External', cost: metrics.external },
      { category: 'Annual', cost: metrics.annual },
      { category: 'Saved (65%)', cost: metrics.saved65 },
    ],
    [metrics]
  )

  // ─── Export handler ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const success = downloadCSV(
      [
        {
          ...metrics,
          company: company.name,
          month: new Date().toISOString().slice(0, 7),
        },
      ],
      `copq-analysis-${company.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    )
    if (success) {
      feedback.notifySuccess('COPQ analysis exported successfully')
    } else {
      feedback.notifyError('Failed to export CSV')
    }
  }, [metrics, company.name])

  const animated = config.ui.animationsEnabled

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      {/* Header */}
      <Section
        subtitle="Module 5 — Cost Analysis"
        title="Cost of Poor Quality"
        action={
          <Button size="sm" variant="outline" onClick={handleExport} icon="↓">
            Export CSV
          </Button>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Internal Failure"
          value={format(metrics.internal)}
          color={tokens.orange}
          sub="Rework + Scrap / mo"
        />
        <KPICard
          label="External Failure"
          value={format(metrics.external)}
          color={tokens.red}
          sub="Warranty + Lost / mo"
        />
        <KPICard
          label="Total COPQ / mo"
          value={format(metrics.total)}
          color={alert.color}
        />
        <KPICard
          label="Annual COPQ"
          value={format(metrics.annual)}
          color={tokens.red}
        />
        <KPICard
          label="% of Revenue"
          value={`${metrics.copqPct.toFixed(1)}%`}
          color={alert.color}
          sub={alert.level.toUpperCase()}
        />
        <KPICard
          label="Savings (65%)"
          value={format(metrics.saved65)}
          color={tokens.green}
        />
      </div>

      {/* Input Panels + Visualization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Internal Failure Inputs */}
        <Panel className="lg:col-span-4">
          <Section subtitle="Internal" title="Failure Inputs" color={tokens.orange} />
          <div className="flex flex-col gap-4">
            <NumberInput
              label="Rework Units / Month"
              value={inputs.rework}
              onChange={(e) => updateField('rework', Number(e.target.value))}
              min={0}
            />
            <NumberInput
              label="Rework Hours per Unit"
              value={inputs.reworkHrs}
              onChange={(e) => updateField('reworkHrs', Number(e.target.value))}
              min={0}
              step={0.1}
            />
            <NumberInput
              label="Scrap Units / Month"
              value={inputs.scrap}
              onChange={(e) => updateField('scrap', Number(e.target.value))}
              min={0}
            />
            <NumberInput
              label="Scrap Cost per Unit"
              value={inputs.scrapCost}
              onChange={(e) => updateField('scrapCost', Number(e.target.value))}
              min={0}
              step={10}
            />
          </div>
        </Panel>

        {/* External Failure Inputs */}
        <Panel className="lg:col-span-4">
          <Section subtitle="External" title="Failure Inputs" color={tokens.red} />
          <div className="flex flex-col gap-4">
            <NumberInput
              label="Warranty Claims / Month"
              value={inputs.warranty}
              onChange={(e) => updateField('warranty', Number(e.target.value))}
              min={0}
            />
            <NumberInput
              label="Avg Warranty Cost"
              value={inputs.warCost}
              onChange={(e) => updateField('warCost', Number(e.target.value))}
              min={0}
              step={50}
            />
            <NumberInput
              label="Lost Customers / Month"
              value={inputs.lost}
              onChange={(e) => updateField('lost', Number(e.target.value))}
              min={0}
            />
            <div className="rounded-lg border border-border bg-bg p-3">
              <div className="font-mono text-[0.6rem] font-bold uppercase text-ink-dim">Customer LTV</div>
              <div className="font-mono text-sm font-bold text-cyan" style={{ color: tokens.cyan }}>
                {format(company.customerLTV)}
              </div>
            </div>
          </div>
        </Panel>

        {/* Visualization */}
        <Panel className="lg:col-span-4">
          <Section subtitle="Visualization" title="COPQ Breakdown" color={tokens.cyan} />
          <div className="mt-4">
            <SimpleBarChart
              data={chartData}
              xKey="category"
              bars={[{ key: 'cost', color: tokens.red, label: 'Cost' }]}
              height={300}
            />
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
