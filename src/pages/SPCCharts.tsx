// src/pages/SPCCharts.tsx
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { useAppDispatch, useAppSelector } from '@/store/store'
import { addSPCPoint, deleteSPCPoint, setSPC, type SPCPoint } from '@/store/moduleSlice'
import { useConfigStore } from '@/lib/config'
import { calcControlLimits, detectWECO } from '@/lib/sigma'
import { useI18n } from '@/providers/I18nProvider'
import { useFeedback } from '@/services/feedback'
import { useModulePersist } from '@/hooks/hooks'
import { Section, Panel, KPICard } from '@/components/charts'
import { CHART_TOOLTIP_STYLE } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV } from '@/lib/utils'

// Demo data - used if no user data
const DEMO_POINTS: SPCPoint[] = Array.from({ length: 20 }, (_, i) => ({
  id: `demo_${i}`,
  label: `W${i + 1}`,
  value: 48 + Math.sin(i * 0.7) * 8 + (i === 12 ? 22 : 0), // W13 = spike
  timestamp: new Date(Date.now() - (19 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
}))

export default function SPCCharts() {
  const { company } = useAppStore()
  const dispatch    = useAppDispatch()
  const userPoints  = useAppSelector(s => s.modules.spc)
  const { config }  = useConfigStore()
  const { fmtNumber, fmtDate } = useI18n()
  const toast       = useFeedback()

  const [showDemo, setShowDemo] = useState(userPoints.length === 0)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newNote, setNewNote]   = useState('')

  const points = showDemo ? DEMO_POINTS : userPoints
  useModulePersist('spc_points', userPoints)

  // ── Control limits + WECO violations ──────────────────────────────────────
  const { limits, violations, chartData, mrData } = useMemo(() => {
    const vals = points.map(p => p.value)
    const lim  = calcControlLimits(vals)
    const wecoViolations = config.weco.rule1 || config.weco.rule2 || config.weco.rule3
      ? detectWECO(vals, lim.mean, (lim.ucl - lim.mean) / 3)
      : []

    const violationSet = new Set(wecoViolations.map(v => v.index))

    const chart = points.map((p, i) => ({
      name:    p.label,
      value:   p.value,
      ucl:     lim.ucl,
      cl:      lim.mean,
      lcl:     lim.lcl,
      target:  company.target,
      usl:     company.usl,
      lsl:     company.lsl,
      alarm:   violationSet.has(i) ? p.value : null,
    }))

    const mr = points.slice(1).map((p, i) => ({
      name:    p.label,
      mr:      +(Math.abs(p.value - points[i].value)).toFixed(3),
      mrUcl:   lim.mrUcl,
      mrMean:  lim.mrMean,
    }))

    return { limits: lim, violations: wecoViolations, chartData: chart, mrData: mr }
  }, [points, config.weco, company])

  // ── Add data point ─────────────────────────────────────────────────────────
  const addPoint = () => {
    const val = parseFloat(newValue)
    if (!newLabel.trim() || isNaN(val)) { toast.error('Invalid', 'Label and numeric value required'); return }
    if (showDemo) { setShowDemo(false) }
    dispatch(addSPCPoint({ id: `spc_${Date.now()}`, label: newLabel.trim(), value: val, timestamp: new Date().toISOString(), note: newNote.trim() || undefined }))
    setNewLabel(''); setNewValue(''); setNewNote('')
    toast.success('Data point added', `${newLabel}: ${val} ${company.processUnit}`)
  }

  const resetData = () => { dispatch(setSPC([])); setShowDemo(true); toast.info('Reset to demo data') }
  const exportCSV = () => { downloadCSV(points.map(p => ({ label: p.label, value: p.value, timestamp: p.timestamp })), 'spc-data.csv'); toast.success('Exported') }

  const outOfControl = violations.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <Section
        subtitle="Module 6 — Statistical Process Control"
        title={`I-MR Control Chart — ${company.processName}`}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {showDemo && <Badge label="DEMO DATA" color="yellow" />}
            {outOfControl && <Badge label={`${violations.length} VIOLATIONS`} color="red" glow />}
            <Button size="xs" variant="ghost" onClick={exportCSV}>↓ CSV</Button>
            <Button size="xs" variant="danger" onClick={resetData}>↺ Reset</Button>
          </div>
        }
      />

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <KPICard label="Data Points"  value={points.length}                     color={T.cyan}   icon="·" />
        <KPICard label="Mean (X̄)"     value={fmtNumber(limits.mean, 2)}          color={T.green}  icon="~" />
        <KPICard label="UCL"          value={fmtNumber(limits.ucl, 2)}            color={T.red}    icon="▲" sub={`+3σ above CL`} />
        <KPICard label="LCL"          value={fmtNumber(limits.lcl, 2)}            color={T.yellow} icon="▼" sub={`−3σ below CL`} />
        <KPICard label="MR̄ (Avg Range)" value={fmtNumber(limits.mrMean, 2)}       color={T.cyan}   icon="↕" />
        <KPICard label="WECO Alarms"  value={violations.length}
          color={outOfControl ? T.red : T.green} icon={outOfControl ? '⚠' : '✓'}
          sub={outOfControl ? 'Process unstable' : 'In control'} />
      </div>

      {/* ── I Chart ── */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Individuals Chart (I)</div>
            <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
              {company.processUnit} per observation
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { color: T.green, label: 'CL' }, { color: T.red,    label: 'UCL/LCL' },
              { color: T.yellow, label: 'Target' }, { color: T.red, label: '⚠ Alarm', dashed: true },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 16, height: 2, background: l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : undefined }} />
                <span style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem' }}>{l.label}</span>
              </div>
            ))}
            <HelpTooltip title="I-MR Chart" description="I chart monitors individual values. Points outside UCL/LCL or matching WECO rules indicate an out-of-control process requiring investigation." />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: T.textDim, fontFamily: T.mono, fontSize: '0.55rem' }} />
            <YAxis tick={{ fill: T.textDim, fontFamily: T.mono, fontSize: '0.55rem' }} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <ReferenceLine y={limits.ucl}  stroke={T.red}    strokeDasharray="5 3" label={{ value: 'UCL', fill: T.red,    fontFamily: T.mono, fontSize: '0.5rem', position: 'insideTopRight' }} />
            <ReferenceLine y={limits.mean} stroke={T.green}  strokeWidth={1.5}     label={{ value: 'CL',  fill: T.green,  fontFamily: T.mono, fontSize: '0.5rem', position: 'insideTopRight' }} />
            <ReferenceLine y={limits.lcl}  stroke={T.red}    strokeDasharray="5 3" label={{ value: 'LCL', fill: T.red,    fontFamily: T.mono, fontSize: '0.5rem', position: 'insideBottomRight' }} />
            <ReferenceLine y={company.usl} stroke={T.orange} strokeDasharray="3 6" />
            <ReferenceLine y={company.lsl} stroke={T.orange} strokeDasharray="3 6" />
            {company.target > 0 && (
              <ReferenceLine y={company.target} stroke={T.yellow} strokeDasharray="4 4" label={{ value: 'Target', fill: T.yellow, fontFamily: T.mono, fontSize: '0.5rem', position: 'insideTopLeft' }} />
            )}
            <Line type="monotone" dataKey="value" stroke={T.cyan} strokeWidth={2}
              dot={({ cx, cy, index }: { cx: number; cy: number; index: number }) => (
                <circle key={index} cx={cx} cy={cy} r={4}
                  fill={violations.some(v => v.index === index) ? T.red : T.cyan}
                  stroke={violations.some(v => v.index === index) ? T.red : 'transparent'}
                  strokeWidth={violations.some(v => v.index === index) ? 2 : 0} />
              )} />
            <Bar dataKey="alarm" fill={T.red} fillOpacity={0.2} radius={[2,2,0,0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* ── MR Chart ── */}
      {mrData.length > 0 && (
        <Panel>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Moving Range Chart (MR)</div>
            <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem' }}>Process Variability Between Consecutive Points</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={mrData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontFamily: T.mono, fontSize: '0.55rem' }} />
              <YAxis tick={{ fill: T.textDim, fontFamily: T.mono, fontSize: '0.55rem' }} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <ReferenceLine y={limits.mrUcl}  stroke={T.red}   strokeDasharray="5 3" label={{ value: 'UCL', fill: T.red, fontFamily: T.mono, fontSize: '0.5rem', position: 'insideTopRight' }} />
              <ReferenceLine y={limits.mrMean} stroke={T.green} strokeWidth={1.5}     label={{ value: 'MR̄',  fill: T.green, fontFamily: T.mono, fontSize: '0.5rem', position: 'insideTopRight' }} />
              <Bar dataKey="mr" fill={T.cyan} fillOpacity={0.6} radius={[2,2,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* ── WECO violations ── */}
      {violations.length > 0 && (
        <Panel style={{ borderColor: `${T.red}44` }}>
          <Section subtitle="WECO Violations" title="Out-of-Control Signals" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {violations.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: `${T.red}08`, border: `1px solid ${T.red}25`, borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                <span style={{ color: T.red, fontFamily: T.mono, fontSize: '0.85rem' }}>⚠</span>
                <div>
                  <div style={{ color: T.red, fontFamily: T.mono, fontSize: '0.62rem', fontWeight: 700 }}>Rule {v.rule}: {points[v.index]?.label}</div>
                  <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.58rem' }}>{v.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Add data point ── */}
      <Panel>
        <Section subtitle="Data Entry" title="Add Observation" />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {[
            { label: 'Label / Period', val: newLabel, set: setNewLabel, placeholder: 'W21, Day 5…', type: 'text', flex: 1 },
            { label: `Value (${company.processUnit})`, val: newValue, set: setNewValue, placeholder: '48.5', type: 'number', flex: 1 },
            { label: 'Note (optional)', val: newNote, set: setNewNote, placeholder: 'Process change…', type: 'text', flex: 2 },
          ].map(f => (
            <div key={f.label} style={{ flex: f.flex, minWidth: 120 }}>
              <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>{f.label}</label>
              <input type={f.type} value={f.val} placeholder={f.placeholder}
                onChange={e => f.set(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPoint() }}
                style={{ width: '100%', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.72rem', padding: '0.4rem 0.65rem' }} />
            </div>
          ))}
          <Button variant="primary" size="sm" onClick={addPoint} hapticStyle="medium">+ Add</Button>
        </div>
      </Panel>

      {/* ── Data table ── */}
      {!showDemo && userPoints.length > 0 && (
        <Panel style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.6rem' }}>{userPoints.length} observations</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.mono, fontSize: '0.62rem' }}>
              <thead>
                <tr>
                  {['Label', 'Value', 'Date', 'Note', ''].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: T.textDim, fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${T.border}`, background: T.bg }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...userPoints].reverse().map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : `${T.surface}40` }}>
                    <td style={{ padding: '0.45rem 0.75rem', color: T.text }}>{p.label}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: T.cyan, fontWeight: 700 }}>{p.value}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: T.textDim }}>{fmtDate(p.timestamp, 'short')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: T.textDim }}>{p.note ?? '—'}</td>
                    <td style={{ padding: '0.45rem 0.75rem' }}>
                      <button onClick={() => dispatch(deleteSPCPoint(p.id))}
                        style={{ background: 'transparent', border: `1px solid ${T.red}33`, borderRadius: 4, color: T.red, padding: '0.15rem 0.4rem', cursor: 'pointer', fontFamily: T.mono, fontSize: '0.52rem' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </motion.div>
  )
}
