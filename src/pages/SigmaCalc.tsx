// src/pages/SigmaCalc.tsx
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useConfigStore, getSigmaColor, getPpkStatus } from '@/lib/config'
import { calcPpk, calcCp, dpmoToSigma, sigmaToDpmo, calcDpmo, calcYield } from '@/lib/sigma'
import { useI18n } from '@/providers/I18nProvider'
import { useFeedback } from '@/services/feedback'
import { KPICard, Section, Panel, SimpleLineChart, Gauge } from '@/components/charts'
import { Counter } from '@/components/ui/Counter'
import { Badge } from '@/components/ui/Badge'
import { HelpTooltip } from '@/components/ui/Tooltip'
import { Slider } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { tokens as T } from '@/lib/tokens'
import { downloadCSV, copyToClipboard } from '@/lib/utils'

// ─── Sigma reference table — config-driven ────────────────────────────────────
const SIGMA_REF = [
  { level: 1, dpmo: 691462, yld: 30.85 },
  { level: 2, dpmo: 308538, yld: 69.15 },
  { level: 3, dpmo:  66807, yld: 93.32 },
  { level: 4, dpmo:   6210, yld: 99.38 },
  { level: 5, dpmo:    233, yld: 99.977 },
  { level: 6, dpmo:    3.4, yld: 99.99966 },
]

type CalcMode = 'from-company' | 'manual-dpmo' | 'from-defects'

export default function SigmaCalc() {
  const { company } = useAppStore()
  const { config }  = useConfigStore()
  const { fmtNumber, fmtCurrency } = useI18n()
  const toast = useFeedback()

  const [mode, setMode]   = useState<CalcMode>('from-company')
  const [manualDpmo, setManualDpmo] = useState(6210)
  const [defects, setDefects]   = useState(50)
  const [units, setUnits]       = useState(1000)
  const [opps, setOpps]         = useState(5)

  // ── Derived metrics ────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const { baselineMean, baselineStdDev, usl, lsl, laborRate, monthlyVolume } = company

    let dpmo: number
    if (mode === 'from-company') {
      const specRange = usl - lsl
      dpmo = specRange > 0 && baselineStdDev > 0
        ? Math.round(Math.max(0, (1 - specRange / (6 * baselineStdDev)) * 1_000_000))
        : 0
    } else if (mode === 'manual-dpmo') {
      dpmo = manualDpmo
    } else {
      dpmo = calcDpmo(defects, opps, units)
    }

    const sigma  = dpmoToSigma(dpmo)
    const yld    = calcYield(dpmo)
    const ppk    = calcPpk(baselineMean, baselineStdDev, usl, lsl)
    const cp     = calcCp(baselineStdDev, usl, lsl)
    const monthlyCopq = laborRate * monthlyVolume * (1 - yld / 100)

    // What-if: target 4σ
    const targetDpmo  = sigmaToDpmo(4)
    const targetYield = calcYield(targetDpmo)
    const savedYield  = targetYield - yld
    const savedCopq   = laborRate * monthlyVolume * (savedYield / 100)

    // Bell curve shape data
    const bellData = Array.from({ length: 40 }, (_, i) => {
      const x = lsl + (usl - lsl) * (i / 39)
      const z = (x - baselineMean) / baselineStdDev
      const y = Math.exp(-0.5 * z * z) / (baselineStdDev * Math.sqrt(2 * Math.PI))
      return { x: +x.toFixed(1), normal: +y.toFixed(6), spec: x >= lsl && x <= usl ? y : 0 }
    })

    return { dpmo, sigma, yld, ppk, cp, monthlyCopq, savedCopq, bellData }
  }, [company, mode, manualDpmo, defects, units, opps])

  const sigmaColor = getSigmaColor(derived.sigma, config)
  const ppkStatus  = getPpkStatus(derived.ppk, config)

  const handleExport = () => {
    downloadCSV([{
      company: company.name, process: company.processName,
      sigma: derived.sigma, ppk: derived.ppk, cp: derived.cp,
      dpmo: derived.dpmo, yield_pct: derived.yld, monthly_copq: derived.monthlyCopq,
    }], `sigma-results-${Date.now()}.csv`)
    toast.success('Exported', 'Sigma results saved to CSV')
  }

  const handleCopy = async () => {
    const text = `Sigma: ${derived.sigma.toFixed(2)} | Ppk: ${derived.ppk.toFixed(3)} | DPMO: ${derived.dpmo} | Yield: ${derived.yld.toFixed(2)}%`
    await copyToClipboard(text)
    toast.success('Copied!', 'Results copied to clipboard')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <Section
        subtitle="Module 2 — Sigma Calculator"
        title="Process Capability Analysis"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button size="xs" variant="ghost" onClick={handleCopy}>⊕ Copy</Button>
            <Button size="xs" variant="primary" onClick={handleExport}>↓ Export CSV</Button>
          </div>
        }
      />

      {/* ── Mode selector ── */}
      <Panel>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {([
            ['from-company', '◈ From Company Profile'],
            ['manual-dpmo',  'σ Enter DPMO Directly'],
            ['from-defects', '⊘ From Defect Count'],
          ] as [CalcMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              style={{
                background: mode === m ? `${T.cyan}18` : 'transparent',
                border: `1px solid ${mode === m ? T.cyan : T.border}`,
                color: mode === m ? T.cyan : T.textDim,
                padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer',
                fontFamily: T.mono, fontSize: '0.62rem', letterSpacing: '0.05em',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Manual DPMO */}
        {mode === 'manual-dpmo' && (
          <div style={{ maxWidth: 400 }}>
            <Slider
              label="DPMO Value"
              valueLabel={fmtNumber(manualDpmo)}
              min={1} max={1000000} step={100}
              value={manualDpmo}
              onChange={e => setManualDpmo(+e.target.value)}
              accentColor={T.cyan}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
              {SIGMA_REF.map(r => (
                <button key={r.level}
                  onClick={() => setManualDpmo(r.dpmo)}
                  style={{
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6,
                    padding: '0.4rem', cursor: 'pointer', textAlign: 'center',
                    fontFamily: T.mono, fontSize: '0.58rem', color: T.textMid,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ color: getSigmaColor(r.level, config), fontWeight: 700 }}>{r.level}σ</div>
                  <div style={{ color: T.textDim, fontSize: '0.52rem' }}>{fmtNumber(r.dpmo)} DPMO</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* From defects */}
        {mode === 'from-defects' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', maxWidth: 480 }}>
            {[
              { label: 'Defects', value: defects, set: setDefects, min: 0, max: 10000 },
              { label: 'Units Inspected', value: units, set: setUnits, min: 1, max: 1000000 },
              { label: 'Opportunities/Unit', value: opps, set: setOpps, min: 1, max: 100 },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>
                  {f.label}
                </label>
                <input
                  type="number" value={f.value} min={f.min} max={f.max}
                  onChange={e => f.set(+e.target.value)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontFamily: T.mono, fontSize: '0.75rem', padding: '0.4rem 0.6rem', width: '100%' }}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── Primary KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
        <KPICard label="Sigma Level" icon="σ"
          value={<Counter value={derived.sigma} decimals={2} color={sigmaColor} />}
          sub={derived.sigma >= config.sigma.excellent ? 'Excellent' : 'Needs Improvement'}
          color={sigmaColor} />
        <KPICard label="Ppk Index" icon="◈"
          value={<Counter value={derived.ppk} decimals={3} color={ppkStatus.color} />}
          sub={ppkStatus.label} color={ppkStatus.color} />
        <KPICard label="Cp (Potential)" icon="⊕"
          value={<Counter value={derived.cp} decimals={3} color={T.cyan} />}
          sub="Centered capability" color={T.cyan} />
        <KPICard label="DPMO" icon="⊘"
          value={<Counter value={derived.dpmo} color={derived.dpmo < 6210 ? T.green : T.red} />}
          sub="Defects per million" color={derived.dpmo < 6210 ? T.green : T.red} />
        <KPICard label="Process Yield" icon="✓"
          value={<Counter value={derived.yld} decimals={3} suffix="%" color={derived.yld > 99 ? T.green : T.yellow} />}
          sub="First pass yield" color={derived.yld > 99 ? T.green : T.yellow} />
        <KPICard label="Monthly COPQ" icon="$"
          value={fmtCurrency(derived.monthlyCopq)}
          sub="Cost of poor quality" color={T.red} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Bell curve */}
        <Panel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Normal Distribution</div>
              <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>vs Spec Limits</div>
            </div>
            <HelpTooltip title="Process Distribution" description="Shows where your process output falls relative to spec limits (USL/LSL). Green area = within spec. Red tails = defects." />
          </div>
          <SimpleLineChart
            data={derived.bellData} xKey="x"
            lines={[
              { key: 'normal', color: T.cyan,  label: 'Distribution' },
              { key: 'spec',   color: T.green, label: 'Within Spec' },
            ]}
            areas
            referenceLines={[
              { value: 0, color: T.border, label: '' },
            ]}
          />
        </Panel>

        {/* Gauges */}
        <Panel>
          <Section subtitle="Visual" title="Capability Gauges" />
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0.5rem 0' }}>
            <Gauge value={derived.sigma} max={6} color={sigmaColor} size={100} label="Sigma" />
            <Gauge value={derived.ppk} max={2} color={ppkStatus.color} size={100} label="Ppk" />
            <Gauge value={derived.yld} max={100} color={derived.yld > 99 ? T.green : T.cyan} size={100} label="Yield %" />
          </div>
        </Panel>
      </div>

      {/* ── Reference table ── */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Section subtitle="Reference" title="Sigma Level Comparison" />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.mono, fontSize: '0.65rem' }}>
            <thead>
              <tr>
                {['Sigma', 'DPMO', 'Yield', 'Ppk', 'Status', 'Monthly COPQ Impact'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: T.textDim, fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIGMA_REF.map((r, i) => {
                const isCurrentRow = Math.abs(derived.sigma - r.level) < 0.5
                const sc = getSigmaColor(r.level, config)
                const ps = getPpkStatus(r.level / 3, config)
                return (
                  <tr key={r.level} style={{ background: isCurrentRow ? `${T.cyan}08` : i % 2 === 0 ? 'transparent' : `${T.surface}50` }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: sc, fontWeight: 700 }}>{r.level}σ {isCurrentRow && '← YOU'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.text }}>{fmtNumber(r.dpmo)}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.text }}>{r.yld.toFixed(r.yld > 99 ? 5 : 2)}%</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.text }}>{(r.level / 3).toFixed(2)}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}><Badge label={ps.label} color={ps.color === T.green ? 'green' : ps.color === T.cyan ? 'cyan' : ps.color === T.yellow ? 'yellow' : 'red'} /></td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.red }}>{fmtCurrency(company.laborRate * company.monthlyVolume * (1 - r.yld / 100))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── What-if improvement box ── */}
      <Panel style={{ borderColor: T.green + '44', background: `${T.green}06` }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ color: T.green, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              💡 What-If: Reach 4σ
            </div>
            <div style={{ color: T.text, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>
              Potential Monthly Savings: <span style={{ color: T.green }}>{fmtCurrency(derived.savedCopq)}</span>
            </div>
            <div style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.62rem', marginTop: '0.25rem' }}>
              Annual: {fmtCurrency(derived.savedCopq * 12)} · Yield improvement: +{((calcYield(sigmaToDpmo(4)) - derived.yld)).toFixed(2)}%
            </div>
          </div>
          <Badge label="4σ TARGET" color="green" glow />
        </div>
      </Panel>
    </motion.div>
  )
}
