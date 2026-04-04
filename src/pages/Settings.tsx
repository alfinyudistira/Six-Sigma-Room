// src/pages/Settings.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useConfigStore, DEFAULT_CONFIG, type AppConfig } from '@/lib/config'
import { useFeedback } from '@/services/feedback'
import { haptic } from '@/lib/utils'
import { Section, Panel, KPICard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { Badge } from '@/components/ui/Badge'
import { clearAll } from '@/lib/storage'
import { tokens as T } from '@/lib/tokens'

// ─── Reusable labeled field wrappers ─────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  color: T.textDim, fontFamily: T.mono, fontSize: '0.55rem',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: '0.3rem',
}
const inputStyle: React.CSSProperties = {
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
  color: T.text, fontFamily: T.mono, fontSize: '0.72rem',
  padding: '0.4rem 0.65rem', width: '100%',
}
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(0,212,255,0.4)'
    e.target.style.boxShadow   = '0 0 0 2px rgba(0,212,255,0.08)'
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = T.border
    e.target.style.boxShadow   = ''
  },
}

function NumField({
  label, value, onChange, min, max, step = 0.01,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(+e.target.value)}
        style={inputStyle} {...focusHandlers}
      />
    </div>
  )
}

function Toggle({
  label, checked, onChange, description,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
      <div
        onClick={() => { haptic.light(); onChange(!checked) }}
        role="switch" aria-checked={checked}
        style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: checked ? T.cyan : T.surface,
          border: `1px solid ${checked ? T.cyan : T.border}`,
          position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: checked ? T.bg : T.textDim,
          transition: 'left 0.2s',
        }} />
      </div>
      <div>
        <div style={{ color: T.text, fontFamily: T.mono, fontSize: '0.65rem' }}>{label}</div>
        {description && <div style={{ color: T.textDim, fontFamily: 'DM Sans, sans-serif', fontSize: '0.68rem', marginTop: '0.15rem', lineHeight: 1.5 }}>{description}</div>}
      </div>
    </label>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ color: T.cyan, fontFamily: T.mono, fontSize: '0.52rem', letterSpacing: '0.15em', textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, paddingBottom: '0.4rem', marginBottom: '0.75rem', marginTop: '0.25rem' }}>
      {label}
    </div>
  )
}

export default function Settings() {
  const { config, setConfig, resetConfig } = useConfigStore()
  const toast   = useFeedback()
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof AppConfig>(key: K, val: AppConfig[K]) => {
    setConfig({ [key]: val } as Parameters<typeof setConfig>[0])
  }

  const handleSave = () => {
    haptic.success()
    setSaved(true)
    toast.success('Settings saved', 'All configuration updated')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = async () => {
    resetConfig()
    await clearAll()
    toast.info('Reset complete', 'All settings and data cleared')
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 860, margin: '0 auto' }}>

      <Section
        subtitle="Global Configuration"
        title="Platform Settings"
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {saved && <Badge label="SAVED ✓" color="green" />}
            <Button variant="primary" size="sm" onClick={handleSave} hapticStyle="success">
              ✓ Save Changes
            </Button>
          </div>
        }
      />

      {/* ── Sigma thresholds ── */}
      <Panel>
        <Divider label="σ Sigma Level Thresholds" />
        <p style={{ color: T.textDim, fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Defines the sigma levels at which color indicators switch. All modules adapt automatically.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <NumField label="World Class (≥)" value={config.sigma.worldClass} min={4} max={6} step={0.1}
            onChange={v => setConfig({ sigma: { ...config.sigma, worldClass: v } })} />
          <NumField label="Excellent (≥)" value={config.sigma.excellent} min={3} max={5} step={0.1}
            onChange={v => setConfig({ sigma: { ...config.sigma, excellent: v } })} />
          <NumField label="Acceptable (≥)" value={config.sigma.acceptable} min={2} max={4} step={0.1}
            onChange={v => setConfig({ sigma: { ...config.sigma, acceptable: v } })} />
          <NumField label="Poor (≥)" value={config.sigma.poor} min={1} max={3} step={0.1}
            onChange={v => setConfig({ sigma: { ...config.sigma, poor: v } })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
          {[config.sigma.poor, config.sigma.acceptable, config.sigma.excellent, config.sigma.worldClass].map((v, i) => {
            const colors = [T.red, T.yellow, T.cyan, T.green]
            const labels = ['Poor', 'Acceptable', 'Excellent', 'World Class']
            return (
              <div key={i} style={{ background: `${colors[i]}10`, border: `1px solid ${colors[i]}33`, borderRadius: 6, padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                <div style={{ color: colors[i], fontFamily: T.mono, fontSize: '0.85rem', fontWeight: 700 }}>{v}σ</div>
                <div style={{ color: T.textDim, fontFamily: T.mono, fontSize: '0.52rem', textTransform: 'uppercase' }}>{labels[i]}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* ── Ppk thresholds ── */}
      <Panel>
        <Divider label="◈ Process Capability (Ppk) Thresholds" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <NumField label="World Class Ppk (≥)" value={config.ppk.worldClass} min={1.33} max={3} step={0.01}
            onChange={v => setConfig({ ppk: { ...config.ppk, worldClass: v } })} />
          <NumField label="Capable Ppk (≥)" value={config.ppk.capable} min={1.0} max={2} step={0.01}
            onChange={v => setConfig({ ppk: { ...config.ppk, capable: v } })} />
          <NumField label="Marginal Ppk (≥)" value={config.ppk.marginal} min={0.5} max={1.33} step={0.01}
            onChange={v => setConfig({ ppk: { ...config.ppk, marginal: v } })} />
        </div>
      </Panel>

      {/* ── RPN thresholds ── */}
      <Panel>
        <Divider label="⚠ FMEA Risk Priority Number (RPN) Thresholds" />
        <p style={{ color: T.textDim, fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Controls when FMEA rows are flagged as Critical / High / Medium. Range 1–1000.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <NumField label="Critical RPN (≥)" value={config.rpn.critical} min={100} max={1000} step={10}
            onChange={v => setConfig({ rpn: { ...config.rpn, critical: v } })} />
          <NumField label="High RPN (≥)" value={config.rpn.high} min={50} max={500} step={10}
            onChange={v => setConfig({ rpn: { ...config.rpn, high: v } })} />
          <NumField label="Medium RPN (≥)" value={config.rpn.medium} min={10} max={200} step={5}
            onChange={v => setConfig({ rpn: { ...config.rpn, medium: v } })} />
        </div>
      </Panel>

      {/* ── COPQ alert ── */}
      <Panel>
        <Divider label="$ COPQ Alert Thresholds (% of Revenue)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <NumField label="Critical COPQ %" value={config.copq.criticalPct} min={1} max={50} step={0.5}
            onChange={v => setConfig({ copq: { ...config.copq, criticalPct: v } })} />
          <NumField label="Warning COPQ %" value={config.copq.warnPct} min={0.5} max={20} step={0.5}
            onChange={v => setConfig({ copq: { ...config.copq, warnPct: v } })} />
        </div>
      </Panel>

      {/* ── WECO rules ── */}
      <Panel>
        <Divider label="~ SPC Western Electric Rules" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Toggle label="Rule 1 — 1 point beyond 3σ"
            description="Immediate out-of-control signal. Recommended: always ON."
            checked={config.weco.rule1}
            onChange={v => setConfig({ weco: { ...config.weco, rule1: v } })} />
          <Toggle label="Rule 2 — 9 consecutive points same side of CL"
            description="Process shift detection. Recommended: ON."
            checked={config.weco.rule2}
            onChange={v => setConfig({ weco: { ...config.weco, rule2: v } })} />
          <Toggle label="Rule 3 — 6 consecutive trending up or down"
            description="Drift detection. Recommended: ON."
            checked={config.weco.rule3}
            onChange={v => setConfig({ weco: { ...config.weco, rule3: v } })} />
          <Toggle label="Rule 4 — 14 alternating up/down points"
            description="Stratification or mixture detection. Optional."
            checked={config.weco.rule4}
            onChange={v => setConfig({ weco: { ...config.weco, rule4: v } })} />
        </div>
      </Panel>

      {/* ── Pareto ── */}
      <Panel>
        <Divider label="▌ Pareto Settings" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <NumField label="Vital Few Cutoff %" value={config.pareto.cutoffPct} min={50} max={95} step={5}
            onChange={v => setConfig({ pareto: { ...config.pareto, cutoffPct: v } })} />
          <NumField label="Max Categories Shown" value={config.pareto.maxCategories} min={5} max={50} step={1}
            onChange={v => setConfig({ pareto: { ...config.pareto, maxCategories: v } })} />
        </div>
      </Panel>

      {/* ── UI preferences ── */}
      <Panel>
        <Divider label="◈ UI Preferences" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <Toggle label="Enable Animations"
            description="Chart entrance animations and page transitions."
            checked={config.ui.animationsEnabled}
            onChange={v => setConfig({ ui: { ...config.ui, animationsEnabled: v } })} />
          <Toggle label="Enable Haptic Feedback"
            description="Vibration on button presses (mobile only)."
            checked={config.ui.hapticsEnabled}
            onChange={v => setConfig({ ui: { ...config.ui, hapticsEnabled: v } })} />
          <Toggle label="Compact Mode"
            description="Reduce padding and font sizes for dense layouts."
            checked={config.ui.compactMode}
            onChange={v => setConfig({ ui: { ...config.ui, compactMode: v } })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <NumField label="Auto-save Interval (ms)" value={config.ui.autoSaveInterval} min={200} max={5000} step={100}
            onChange={v => setConfig({ ui: { ...config.ui, autoSaveInterval: v } })} />
          <NumField label="Chart Animation Duration (ms)" value={config.ui.chartAnimationDuration} min={300} max={3000} step={100}
            onChange={v => setConfig({ ui: { ...config.ui, chartAnimationDuration: v } })} />
        </div>
      </Panel>

      {/* ── Language ── */}
      <Panel>
        <Divider label="🌐 Language & Locale" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: '0.62rem' }}>Current language:</span>
          <LocaleSwitcher />
          <span style={{ color: T.textDim, fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem' }}>
            Numbers, dates, and currency will reformat based on your selection.
          </span>
        </div>
      </Panel>

      {/* ── Feature flags ── */}
      <Panel>
        <Divider label="⚡ Feature Flags" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Toggle label="AI Triage Module"
            description="Enable AI-powered problem analysis via Anthropic API."
            checked={config.features.aiTriage}
            onChange={v => setConfig({ features: { ...config.features, aiTriage: v } })} />
          <Toggle label="Live Ops Module"
            description="Enable real-time SSE/WebSocket process monitoring."
            checked={config.features.liveOps}
            onChange={v => setConfig({ features: { ...config.features, liveOps: v } })} />
          <Toggle label="WebSocket / SSE"
            description="Enable real-time data connection. Disabling uses simulation mode only."
            checked={config.features.webSockets}
            onChange={v => setConfig({ features: { ...config.features, webSockets: v } })} />
          <Toggle label="Export to PDF"
            description="Coming soon — export reports as PDF documents."
            checked={config.features.exportPDF}
            onChange={v => setConfig({ features: { ...config.features, exportPDF: v } })} />
        </div>
      </Panel>

      {/* ── Actions ── */}
      <Panel>
        <Divider label="⚠ Data Management" />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="sm" onClick={handleSave} hapticStyle="success">✓ Save All Settings</Button>
          <Button variant="ghost" size="sm" onClick={() => { resetConfig(); toast.info('Settings reset to defaults') }}>↺ Reset Settings Only</Button>
          <ConfirmButton
            variant="danger"
            label="✕ Clear ALL Data & Reset"
            message="This will delete ALL data, FMEA rows, SPC data, tasks, and reset settings. Cannot be undone."
            confirmLabel="Yes, Clear Everything"
            onConfirm={handleReset}
          />
        </div>
        <p style={{ color: T.textDim, fontFamily: 'DM Sans, sans-serif', fontSize: '0.68rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
          All data is stored locally in your browser (IndexedDB + localStorage). Nothing is sent to any server.
        </p>
      </Panel>
    </motion.div>
  )
}
