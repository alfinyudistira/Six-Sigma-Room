// src/pages/DMAICTracker.tsx
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addDMAICTask, updateDMAICTask, deleteDMAICTask, type DMAICTask, type DMAICPhase } from '@/store/moduleSlice'
import { useAppStore } from '@/store/useAppStore'
import { useModulePersist } from '@/hooks/hooks'
import { useFeedback } from '@/services/feedback'
import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { tokens as T } from '@/lib/tokens'

const PHASES: DMAICPhase[] = ['define', 'measure', 'analyze', 'improve', 'control']

const PHASE_META: Record<DMAICPhase, { color: string; icon: string; desc: string }> = {
  define:  { color: T.cyan,   icon: 'D', desc: 'Define the problem and project scope' },
  measure: { color: '#7C3AED', icon: 'M', desc: 'Measure current process performance' },
  analyze: { color: T.yellow, icon: 'A', desc: 'Analyze root causes of defects' },
  improve: { color: T.green,  icon: 'I', desc: 'Implement and verify improvements' },
  control: { color: T.orange, icon: 'C', desc: 'Sustain improvements long-term' },
}

const STATUS_OPTIONS: DMAICTask['status'][] = ['not-started','in-progress','complete','blocked']
const STATUS_COLOR: Record<DMAICTask['status'], string> = {
  'not-started': T.textDim, 'in-progress': T.cyan, 'complete': T.green, 'blocked': T.red,
}

const BLANK: Omit<DMAICTask,'id'> = { phase:'define', task:'', owner:'', dueDate:'', status:'not-started', notes:'' }

export default function DMAICTracker() {
  const dispatch      = useAppDispatch()
  const tasks         = useAppSelector(s => s.modules.dmaic)
  const { company }   = useAppStore()
  const toast         = useFeedback()
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft]       = useState<Omit<DMAICTask,'id'>>(BLANK)
  const [editId, setEditId]     = useState<string|null>(null)
  const [activePhase, setActivePhase] = useState<DMAICPhase|'all'>('all')

  useModulePersist('dmaic_tasks', tasks)

  const stats = useMemo(() => {
    const total    = tasks.length
    const complete = tasks.filter(t => t.status === 'complete').length
    const blocked  = tasks.filter(t => t.status === 'blocked').length
    const phasePct = Object.fromEntries(PHASES.map(p => {
      const pt = tasks.filter(t => t.phase === p)
      return [p, pt.length ? Math.round(pt.filter(t => t.status === 'complete').length / pt.length * 100) : 0]
    }))
    return { total, complete, blocked, pct: total ? Math.round(complete/total*100) : 0, phasePct }
  }, [tasks])

  const filtered = activePhase === 'all' ? tasks : tasks.filter(t => t.phase === activePhase)

  const save = () => {
    if (!draft.task.trim()) { toast.error('Required','Task description required'); return }
    if (editId) { dispatch(updateDMAICTask({ ...draft, id: editId })); toast.success('Task updated') }
    else         { dispatch(addDMAICTask({ ...draft, id: `dmaic_${Date.now()}` })); toast.success('Task added') }
    setShowForm(false); setEditId(null); setDraft(BLANK)
  }

  const openEdit = (t: DMAICTask) => { const { id, ...rest } = t; setDraft(rest); setEditId(id); setShowForm(true) }

  const field = (k: keyof typeof BLANK) => ({
    value: draft[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
      setDraft(d => ({ ...d, [k]: e.target.value })),
  })

  const inputStyle: React.CSSProperties = { width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, color:T.text, fontFamily:T.mono, fontSize:'0.72rem', padding:'0.4rem 0.65rem' }
  const labelStyle: React.CSSProperties = { color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:'0.3rem' }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      <Section subtitle="Module 3 — DMAIC" title={`DMAIC Tracker — ${company.processName}`}
        action={<Button size="sm" variant="primary" onClick={() => { setDraft(BLANK); setEditId(null); setShowForm(true) }} hapticStyle="medium">+ Add Task</Button>} />

      {/* Phase progress */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'0.5rem' }}>
        {PHASES.map(p => {
          const m = PHASE_META[p]
          return (
            <button key={p} onClick={() => setActivePhase(activePhase===p?'all':p)}
              style={{ background: activePhase===p ? `${m.color}18` : T.panel, border:`1px solid ${activePhase===p ? m.color : T.border}`, borderRadius:8, padding:'0.75rem 0.5rem', cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}>
              <div style={{ color:m.color, fontFamily:T.mono, fontSize:'1.1rem', fontWeight:700 }}>{m.icon}</div>
              <div style={{ color:T.text, fontFamily:T.mono, fontSize:'0.58rem', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0.2rem 0' }}>{p}</div>
              <div style={{ height:3, background:T.border, borderRadius:2, margin:'0.3rem 0 0.25rem' }}>
                <div style={{ height:'100%', width:`${stats.phasePct[p]}%`, background:m.color, borderRadius:2, transition:'width 1s' }} />
              </div>
              <div style={{ color:m.color, fontFamily:T.mono, fontSize:'0.58rem' }}>{stats.phasePct[p]}%</div>
            </button>
          )
        })}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.75rem' }}>
        <KPICard label="Total Tasks"    value={stats.total}    color={T.cyan} />
        <KPICard label="Complete"       value={stats.complete} color={T.green} />
        <KPICard label="Blocked"        value={stats.blocked}  color={T.red} />
        <KPICard label="Overall Progress" value={`${stats.pct}%`} color={stats.pct>=80?T.green:stats.pct>=50?T.cyan:T.yellow} />
      </div>

      {/* Tasks */}
      <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        {filtered.length === 0 ? (
          <Panel><div style={{ textAlign:'center', color:T.textDim, fontFamily:T.mono, fontSize:'0.7rem', padding:'2rem' }}>No tasks yet. Click + Add Task.</div></Panel>
        ) : filtered.map(t => {
          const m = PHASE_META[t.phase]
          return (
            <motion.div key={t.id} layout initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <Panel style={{ padding:'0.75rem 1rem', borderLeft:`3px solid ${m.color}` }}>
                <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-start', flexWrap:'wrap' }}>
                  <span style={{ background:`${m.color}15`, color:m.color, fontFamily:T.mono, fontSize:'0.55rem', padding:'0.15rem 0.4rem', borderRadius:3, flexShrink:0, textTransform:'uppercase' }}>{t.phase}</span>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ color:T.text, fontFamily:'DM Sans, sans-serif', fontSize:'0.82rem', fontWeight:500 }}>{t.task}</div>
                    {t.notes && <div style={{ color:T.textDim, fontFamily:'DM Sans, sans-serif', fontSize:'0.7rem', marginTop:'0.2rem' }}>{t.notes}</div>}
                    <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.35rem', flexWrap:'wrap' }}>
                      {t.owner && <span style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem' }}>👤 {t.owner}</span>}
                      {t.dueDate && <span style={{ color:T.textDim, fontFamily:T.mono, fontSize:'0.55rem' }}>📅 {t.dueDate}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.4rem', alignItems:'center', flexShrink:0 }}>
                    <select value={t.status}
                      onChange={e => dispatch(updateDMAICTask({ ...t, status: e.target.value as DMAICTask['status'] }))}
                      style={{ background:T.bg, border:`1px solid ${STATUS_COLOR[t.status]}44`, borderRadius:4, color:STATUS_COLOR[t.status], fontFamily:T.mono, fontSize:'0.58rem', padding:'0.2rem 0.35rem', cursor:'pointer' }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button size="xs" variant="ghost" onClick={() => openEdit(t)}>Edit</Button>
                    <ConfirmButton variant="danger" label="✕" message="Delete task?" onConfirm={() => { dispatch(deleteDMAICTask(t.id)); toast.success('Task deleted') }} />
                  </div>
                </div>
              </Panel>
            </motion.div>
          )
        })}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Task' : 'Add Task'} subtitle="⊕ DMAIC">
        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div><label style={labelStyle}>Phase</label>
              <select {...field('phase')} style={inputStyle}>
                {PHASES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Status</label>
              <select {...field('status')} style={inputStyle}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Task Description *</label>
            <input {...field('task')} style={inputStyle} placeholder="What needs to be done?" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div><label style={labelStyle}>Owner</label><input {...field('owner')} style={inputStyle} placeholder="Name" /></div>
            <div><label style={labelStyle}>Due Date</label><input {...field('dueDate')} type="date" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>Notes</label>
            <textarea {...field('notes')} style={{ ...inputStyle, minHeight:70, resize:'vertical' }} placeholder="Additional context…" />
          </div>
          <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end', borderTop:`1px solid ${T.border}`, paddingTop:'0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save} hapticStyle="success">{editId ? '✓ Save' : '+ Add'}</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
