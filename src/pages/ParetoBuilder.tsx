// src/pages/ParetoBuilder.tsx
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addParetoItem, deleteParetoItem, setPareto, type ParetoItem } from '@/store/moduleSlice'
import { useConfigStore } from '@/lib/config'
import { useModulePersist } from '@/hooks/hooks'
import { useFeedback } from '@/services/feedback'
import { Section, Panel, KPICard, ParetoChart } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'

const COLORS = [T.red, T.orange, T.yellow, T.cyan, T.green, '#9B8EC4', '#7EB5A6', '#E07B54']

const DEMO_ITEMS: ParetoItem[] = [
  { id:'d1', category:'Software Config',   count:153, color:T.red    },
  { id:'d2', category:'Network Conn.',     count:120, color:T.orange },
  { id:'d3', category:'Hardware Failure',  count:98,  color:T.yellow },
  { id:'d4', category:'Account Access',    count:76,  color:T.cyan   },
  { id:'d5', category:'Integration Error', count:54,  color:T.green  },
  { id:'d6', category:'Perf. Degradation', count:28,  color:'#9B8EC4' },
  { id:'d7', category:'Data Sync',         count:18,  color:'#7EB5A6' },
]

export default function ParetoBuilder() {
  const dispatch   = useAppDispatch()
  const userItems  = useAppSelector(s => s.modules.pareto)
  const { config } = useConfigStore()
  const toast      = useFeedback()
  const [showDemo, setShowDemo] = useState(userItems.length === 0)
  const [newCat, setNewCat] = useState('')
  const [newCnt, setNewCnt] = useState('')

  const items = showDemo ? DEMO_ITEMS : userItems
  useModulePersist('pareto_items', userItems)

  const chartData = useMemo(() => {
    const sorted = [...items].sort((a,b) => b.count - a.count)
    const total  = sorted.reduce((s,i) => s + i.count, 0)
    let cum = 0
    return sorted.map(item => {
      cum += item.count
      return { category: item.category, count: item.count, cumPct: +(cum / total * 100).toFixed(1), color: item.color }
    })
  }, [items])

  const vital = useMemo(() => chartData.filter(d => d.cumPct <= config.pareto.cutoffPct), [chartData, config.pareto.cutoffPct])

  const add = () => {
    if (!newCat.trim() || !newCnt || isNaN(+newCnt)) { toast.error('Invalid','Category and count required'); return }
    if (showDemo) { dispatch(setPareto([])); setShowDemo(false) }
    dispatch(addParetoItem({ id:`par_${Date.now()}`, category:newCat.trim(), count:+newCnt, color:COLORS[userItems.length % COLORS.length] }))
    setNewCat(''); setNewCnt('')
    toast.success('Category added')
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 7 — Pareto Analysis" title="Pareto Chart Builder (80/20 Rule)"
        action={
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <Button size="xs" variant="ghost" onClick={() => { downloadCSV(chartData,'pareto.csv'); toast.success('Exported') }}>↓ CSV</Button>
            {!showDemo && <Button size="xs" variant="danger" onClick={() => { dispatch(setPareto([])); setShowDemo(true) }}>↺ Reset</Button>}
          </div>
        } />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
        <KPICard label="Categories"    value={items.length}  color={T.cyan}   />
        <KPICard label="Total Count"   value={items.reduce((s,i)=>s+i.count,0)} color={T.text} />
        <KPICard label="Vital Few"     value={vital.length}  color={T.red}    sub={`${config.pareto.cutoffPct}% rule`} />
        <KPICard label="Useful Many"   value={items.length - vital.length} color={T.textDim} />
      </div>

      {chartData.length > 0 && (
        <Panel>
          <Section subtitle="Visualization" title={`Pareto — Top ${config.pareto.cutoffPct}% Cutoff`} />
          <ParetoChart data={chartData} cutoff={config.pareto.cutoffPct} height={300} />
        </Panel>
      )}

      <Panel>
        <Section subtitle="Data Entry" title="Add Category" />
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:2, minWidth:150 }}>
            <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>Category Name</label>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Error type, defect category…"
              onKeyDown={e => { if (e.key==='Enter') add() }}
              style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }} />
          </div>
          <div style={{ flex:1, minWidth:100 }}>
            <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>Count / Frequency</label>
            <input type="number" value={newCnt} onChange={e => setNewCnt(e.target.value)} min={1}
              onKeyDown={e => { if (e.key==='Enter') add() }}
              style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }} />
          </div>
          <Button variant="primary" size="sm" onClick={add} hapticStyle="medium">+ Add</Button>
        </div>
      </Panel>

      {/* Vital few list */}
      {vital.length > 0 && (
        <Panel style={{ borderColor:`${T.red}44` }}>
          <Section subtitle="80/20 Result" title="Vital Few — Focus Here First" />
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {vital.map((d, i) => (
              <div key={d.category} style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
                <span style={{ color:d.color, fontFamily:T.mono, fontSize:'0.65rem', fontWeight:700, minWidth:20 }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                    <span style={{ color:T.text, fontFamily:T.mono, fontSize:'0.65rem' }}>{d.category}</span>
                    <span style={{ color:d.color, fontFamily:T.mono, fontSize:'0.62rem', fontWeight:700 }}>{d.count} ({d.cumPct}%)</span>
                  </div>
                  <div style={{ height:4, background:T.surface, borderRadius:2 }}>
                    <div style={{ height:'100%', width:`${(d.count/items.reduce((s,i)=>s+i.count,0)*100).toFixed(1)}%`, background:d.color, borderRadius:2 }} />
                  </div>
                </div>
                <button onClick={() => { dispatch(deleteParetoItem(d.id)); toast.success('Removed') }}
                  style={{ background:'transparent', border:`1px solid ${T.red}33`, borderRadius:4, color:T.red, padding:'0.15rem 0.4rem', cursor:'pointer', fontFamily:T.mono, fontSize:'0.52rem' }}>✕</button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </motion.div>
  )
}
