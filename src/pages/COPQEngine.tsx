// src/pages/COPQEngine.tsx
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/providers/I18nProvider'
import { useFeedback } from '@/services/feedback'
import { getCopqAlert, useConfigStore } from '@/lib/config'
import { Section, Panel, KPICard, SimpleBarChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'

export default function COPQEngine() {
  const { company } = useAppStore()
  const { config }  = useConfigStore()
  const { fmtCurrency, fmtPercent } = useI18n()
  const toast = useFeedback()

  const [rework,    setRework]    = useState(company.monthlyVolume * 0.08)
  const [reworkHrs, setReworkHrs] = useState(2.5)
  const [scrap,     setScrap]     = useState(company.monthlyVolume * 0.02)
  const [scrapCost, setScrapCost] = useState(company.laborRate * 4)
  const [warranty,  setWarranty]  = useState(Math.round(company.monthlyVolume * 0.01))
  const [warCost,   setWarCost]   = useState(company.customerLTV * 0.15)
  const [lost,      setLost]      = useState(Math.round(company.monthlyVolume * 0.005))

  const metrics = useMemo(() => {
    const internal  = rework * reworkHrs * company.laborRate + scrap * scrapCost
    const external  = warranty * warCost + lost * company.customerLTV
    const total     = internal + external
    const annual    = total * 12
    const revenueEst = company.laborRate * company.monthlyVolume * 12
    const copqPct   = revenueEst > 0 ? (annual / revenueEst) * 100 : 0
    const saved65   = annual * 0.65
    return { internal, external, total, annual, copqPct, saved65 }
  }, [company, rework, reworkHrs, scrap, scrapCost, warranty, warCost, lost])

  const alert = getCopqAlert(metrics.copqPct, config)
  const chartData = [
    { category: 'Internal Failure', cost: metrics.internal },
    { category: 'External Failure', cost: metrics.external },
    { category: 'Annual COPQ',      cost: metrics.annual },
    { category: 'Potential Savings',cost: metrics.saved65 },
  ]

  const handleExport = () => {
    downloadCSV([{ ...metrics, company: company.name }], 'copq-analysis.csv')
    toast.success('Exported', 'COPQ analysis saved')
  }

  const numInput = (label: string, val: number, set: (v: number) => void, step = 1) => (
    <div>
      <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>{label}</label>
      <input type="number" value={val} step={step} onChange={e => set(+e.target.value)}
        style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }} />
    </div>
  )

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 5 — Cost Analysis" title="Cost of Poor Quality Engine"
        action={<Button size="xs" variant="primary" onClick={handleExport}>↓ Export</Button>} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
        <KPICard label="Internal Failure" value={fmtCurrency(metrics.internal)} color={T.orange} icon="⟳" sub="Rework + scrap/mo" />
        <KPICard label="External Failure" value={fmtCurrency(metrics.external)} color={T.red}    icon="✕" sub="Warranty + lost/mo" />
        <KPICard label="Total COPQ/mo"    value={fmtCurrency(metrics.total)}    color={alert.color} icon="$" />
        <KPICard label="Annual COPQ"      value={fmtCurrency(metrics.annual)}   color={T.red}    icon="⚠" />
        <KPICard label="% of Revenue"     value={`${metrics.copqPct.toFixed(1)}%`} color={alert.color} sub={alert.level.toUpperCase()} />
        <KPICard label="Potential Savings (65%)" value={fmtCurrency(metrics.saved65)} color={T.green} icon="💡" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1rem' }}>
        <Panel>
          <Section subtitle="Internal" title="Failure Inputs" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {numInput('Rework Units/Month', rework, setRework)}
            {numInput('Rework Hours per Unit', reworkHrs, setReworkHrs, 0.5)}
            {numInput('Scrap Units/Month', scrap, setScrap)}
            {numInput('Scrap Cost per Unit', scrapCost, setScrapCost, 10)}
          </div>
        </Panel>
        <Panel>
          <Section subtitle="External" title="Failure Inputs" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {numInput('Warranty Claims/Month', warranty, setWarranty)}
            {numInput('Avg Warranty Cost', warCost, setWarCost, 50)}
            {numInput('Lost Customers/Month', lost, setLost)}
            <div style={{ padding:'0.75rem', background:T.surface, borderRadius:8, fontFamily:T.mono, fontSize:'0.6rem', color:T.textMid }}>
              Customer LTV: <strong style={{ color:T.cyan }}>{fmtCurrency(company.customerLTV)}</strong> (from Company Profile)
            </div>
          </div>
        </Panel>
        <Panel>
          <Section subtitle="Visualization" title="COPQ Breakdown" />
          <SimpleBarChart data={chartData} xKey="category"
            bars={[{ key:'cost', color:T.red, label:'Cost' }]} height={200} />
        </Panel>
      </div>
    </motion.div>
  )
}
