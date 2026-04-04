// src/pages/UniversalCOPQ.tsx
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useI18n } from '@/providers/I18nProvider'
import { useFeedback } from '@/services/feedback'
import { Section, Panel, KPICard, SimpleBarChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'

interface COPQLine { id:string; label:string; monthly:number; category:'internal'|'external'|'appraisal'|'prevention' }

const CAT_COLOR: Record<COPQLine['category'],string> = {
  internal:'#FF3B5C', external:'#FF8C00', appraisal:'#FFD60A', prevention:'#00D4FF',
}

export default function UniversalCOPQ() {
  const { fmtCurrency } = useI18n()
  const toast = useFeedback()

  const [lines, setLines] = useState<COPQLine[]>([
    { id:'1', label:'Rework labor',       monthly:4500,  category:'internal'   },
    { id:'2', label:'Scrap/waste',         monthly:2100,  category:'internal'   },
    { id:'3', label:'Warranty claims',     monthly:3800,  category:'external'   },
    { id:'4', label:'Lost sales',          monthly:8500,  category:'external'   },
    { id:'5', label:'Inspection labor',    monthly:1200,  category:'appraisal'  },
    { id:'6', label:'Training & process',  monthly:800,   category:'prevention' },
  ])
  const [currency, setCurrency] = useState('USD')

  const totals = useMemo(() => {
    const t = { internal:0, external:0, appraisal:0, prevention:0, total:0 }
    lines.forEach(l => { t[l.category] += l.monthly; t.total += l.monthly })
    return t
  }, [lines])

  const addLine = () => setLines(l => [...l, { id:`line_${Date.now()}`, label:'New cost item', monthly:0, category:'internal' }])
  const updateLine = (id:string, key:keyof COPQLine, val:string|number) => setLines(l => l.map(x => x.id===id ? {...x,[key]:val} : x))
  const removeLine = (id:string) => setLines(l => l.filter(x => x.id!==id))

  const chartData = Object.entries(totals).filter(([k]) => k!=='total').map(([category,cost]) => ({ category,cost }))

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 10 — Universal" title="Universal COPQ Calculator"
        action={
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <Button size="xs" variant="ghost" onClick={() => { downloadCSV(lines,'universal-copq.csv'); toast.success('Exported') }}>↓ CSV</Button>
            <Button size="sm" variant="primary" onClick={addLine}>+ Add Line</Button>
          </div>
        } />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
        {Object.entries(CAT_COLOR).map(([cat,color]) => (
          <KPICard key={cat} label={`${cat.charAt(0).toUpperCase()+cat.slice(1)}/mo`}
            value={fmtCurrency(totals[cat as COPQLine['category']])} color={color} />
        ))}
        <KPICard label="Total COPQ/mo" value={fmtCurrency(totals.total)} color={T.red} icon="$" />
        <KPICard label="Annual COPQ"   value={fmtCurrency(totals.total*12)} color={T.red} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1rem' }}>
        <Panel>
          <Section subtitle="Visualization" title="COPQ by Category" />
          <SimpleBarChart data={chartData} xKey="category"
            bars={[{ key:'cost', color:T.red, label:'Monthly Cost' }]} height={200} />
        </Panel>

        <Panel>
          <Section subtitle="Line Items" title="Cost Breakdown" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {lines.map(line => (
              <div key={line.id} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLOR[line.category], flexShrink:0 }} />
                <input value={line.label} onChange={e => updateLine(line.id,'label',e.target.value)}
                  style={{ flex:2, background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.72rem', padding:'0.3rem 0.5rem' }} />
                <input type="number" value={line.monthly} onChange={e => updateLine(line.id,'monthly',+e.target.value)}
                  style={{ width:90, background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, color:T.cyan, fontFamily:T.mono, fontSize:'0.7rem', padding:'0.3rem 0.5rem', textAlign:'right' }} />
                <select value={line.category} onChange={e => updateLine(line.id,'category',e.target.value as COPQLine['category'])}
                  style={{ background:T.bg, border:`1px solid ${CAT_COLOR[line.category]}44`, borderRadius:4, color:CAT_COLOR[line.category], fontFamily:T.mono, fontSize:'0.58rem', padding:'0.3rem 0.4rem' }}>
                  {Object.keys(CAT_COLOR).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => removeLine(line.id)}
                  style={{ background:'transparent', border:`1px solid ${T.red}33`, borderRadius:4, color:T.red, padding:'0.2rem 0.35rem', cursor:'pointer', fontFamily:T.mono, fontSize:'0.52rem', flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}
