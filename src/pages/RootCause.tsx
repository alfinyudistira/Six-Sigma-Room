// src/pages/RootCause.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addRootCauseNode, deleteRootCauseNode, toggleNodeVerified, type RootCauseNode } from '@/store/moduleSlice'
import { useModulePersist } from '@/hooks/hooks'
import { useFeedback } from '@/services/feedback'
import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'

const ISHIKAWA_CATEGORIES = ['Man','Machine','Method','Material','Measurement','Environment']
const CAT_COLORS: Record<string, string> = {
  Man:T.cyan, Machine:T.yellow, Method:T.green, Material:T.orange, Measurement:'#9B8EC4', Environment:T.red
}

export default function RootCause() {
  const dispatch = useAppDispatch()
  const nodes    = useAppSelector(s => s.modules.rootCause)
  const toast    = useFeedback()
  const [newText, setNewText]   = useState('')
  const [newCat,  setNewCat]    = useState(ISHIKAWA_CATEGORIES[0])
  const [parent,  setParent]    = useState<string|null>(null)
  const [effect,  setEffect]    = useState('Problem Statement')
  const [editEffect, setEditEffect] = useState(false)

  useModulePersist('rootcause_nodes', nodes)

  const rootNodes  = nodes.filter(n => n.parentId === null)
  const childOf    = (id: string) => nodes.filter(n => n.parentId === id)
  const verified   = nodes.filter(n => n.verified).length

  const add = () => {
    if (!newText.trim()) { toast.error('Required','Root cause text required'); return }
    dispatch(addRootCauseNode({ id:`rc_${Date.now()}`, text:newText.trim(), parentId:parent, category:parent?undefined:newCat, verified:false }))
    setNewText(''); setParent(null)
    toast.success('Cause added')
  }

  const NodeItem = ({ node, depth=0 }: { node:RootCauseNode; depth?:number }) => {
    const children = childOf(node.id)
    const color = node.category ? CAT_COLORS[node.category] ?? T.cyan : T.textMid
    return (
      <div style={{ marginLeft: depth * 20 }}>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', padding:'0.4rem 0.6rem', borderRadius:6, background: node.verified ? `${T.green}08` : 'transparent', border:`1px solid ${node.verified ? T.green+'33' : T.border}`, marginBottom:'0.35rem' }}>
          <span style={{ color, fontFamily:T.mono, fontSize:'0.65rem', fontWeight:700, flexShrink:0 }}>
            {node.category ?? '→'}
          </span>
          <span style={{ flex:1, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.78rem' }}>{node.text}</span>
          <button onClick={() => dispatch(toggleNodeVerified(node.id))}
            title={node.verified ? 'Mark unverified' : 'Mark as root cause'}
            style={{ background:'transparent', border:`1px solid ${node.verified?T.green:T.border}`, borderRadius:4, color:node.verified?T.green:T.textDim, padding:'0.15rem 0.4rem', cursor:'pointer', fontFamily:T.mono, fontSize:'0.55rem' }}>
            {node.verified ? '✓ Verified' : 'Verify'}
          </button>
          <button onClick={() => setParent(node.id)}
            style={{ background:'transparent', border:`1px solid ${T.cyan}33`, borderRadius:4, color:T.cyan, padding:'0.15rem 0.4rem', cursor:'pointer', fontFamily:T.mono, fontSize:'0.55rem' }}>+ Why</button>
          <button onClick={() => dispatch(deleteRootCauseNode(node.id))}
            style={{ background:'transparent', border:`1px solid ${T.red}33`, borderRadius:4, color:T.red, padding:'0.15rem 0.4rem', cursor:'pointer', fontFamily:T.mono, fontSize:'0.52rem' }}>✕</button>
        </div>
        {children.map(c => <NodeItem key={c.id} node={c} depth={depth+1} />)}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 8 — Fishbone / 5-Why" title="Root Cause Analyzer" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.75rem' }}>
        <KPICard label="Total Causes"   value={nodes.length}    color={T.cyan} />
        <KPICard label="Root Nodes"     value={rootNodes.length} color={T.yellow} />
        <KPICard label="Verified Roots" value={verified}         color={T.green} />
        <KPICard label="Unverified"     value={nodes.length - verified} color={T.red} />
      </div>

      {/* Effect / problem statement */}
      <Panel style={{ borderColor:`${T.red}44`, background:`${T.red}04` }}>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <span style={{ color:T.red, fontFamily:T.mono, fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>EFFECT:</span>
          {editEffect
            ? <input value={effect} onChange={e => setEffect(e.target.value)} onBlur={() => setEditEffect(false)} autoFocus
                style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.85rem', fontWeight:600, padding:'0.3rem 0.5rem' }} />
            : <span onClick={() => setEditEffect(true)} style={{ flex:1, color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', borderBottom:`1px dashed ${T.border}` }}>{effect}</span>}
        </div>
      </Panel>

      {/* Ishikawa categories */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem' }}>
        {ISHIKAWA_CATEGORIES.map(cat => {
          const catNodes = rootNodes.filter(n => n.category === cat)
          return (
            <Panel key={cat} style={{ borderColor:`${CAT_COLORS[cat]}44`, padding:'0.75rem' }}>
              <div style={{ color:CAT_COLORS[cat], fontFamily:T.mono, fontSize:'0.65rem', fontWeight:700, marginBottom:'0.5rem' }}>{cat}</div>
              {catNodes.map(n => <NodeItem key={n.id} node={n} />)}
              {catNodes.length === 0 && <div style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.58rem' }}>No causes yet</div>}
            </Panel>
          )
        })}
      </div>

      {/* Add form */}
      <Panel>
        <Section subtitle="Add Cause" title={parent ? `Adding sub-cause (5-Why)` : 'Add Root Cause (Fishbone)'} />
        {parent && (
          <div style={{ background:`${T.cyan}08`, border:`1px solid ${T.cyan}33`, borderRadius:6, padding:'0.4rem 0.75rem', marginBottom:'0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:T.cyan, fontFamily:T.mono, fontSize:'0.6rem' }}>Adding child of: {nodes.find(n=>n.id===parent)?.text}</span>
            <button onClick={() => setParent(null)} style={{ background:'transparent', border:'none', color:T.red, cursor:'pointer', fontFamily:T.mono, fontSize:'0.6rem' }}>✕ Cancel sub-cause</button>
          </div>
        )}
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-end', flexWrap:'wrap' }}>
          {!parent && (
            <div style={{ minWidth:140 }}>
              <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>Category (6M)</label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)}
                style={{ width:'100%', background:T.bg, border:`1px solid ${CAT_COLORS[newCat]}44`, borderRadius:6, color:CAT_COLORS[newCat], fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }}>
                {ISHIKAWA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex:1, minWidth:200 }}>
            <label style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }}>Cause Description</label>
            <input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Why does this problem occur?"
              onKeyDown={e => { if (e.key==='Enter') add() }}
              style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }} />
          </div>
          <Button variant="primary" size="sm" onClick={add} hapticStyle="medium">+ Add</Button>
        </div>
      </Panel>
    </motion.div>
  )
}
