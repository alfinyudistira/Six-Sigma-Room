// src/pages/Settings.tsx
/**
 * ============================================================================
 * SETTINGS — GLOBAL APPLICATION CONFIGURATION
 * ============================================================================
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

import { useConfigStore } from '@/lib/config'
import { feedback } from '@/lib/feedback'
import { useHaptic } from '@/hooks'
import { clearAll } from '@/lib/storage'
import { cn } from '@/lib/utils'

import { Section, Panel } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { Badge } from '@/components/ui/Badge'
import { NumberInput } from '@/components/ui/Input'
import { tokens as T } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   REUSABLE COMPONENTS
   -------------------------------------------------------------------------- */
function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  const { light } = useHaptic()

  return (
    <label className="group flex cursor-pointer items-start gap-4 p-1">
      <div
        onClick={() => {
          light()
          onChange(!checked)
        }}
        role="switch"
        aria-checked={checked}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-all duration-200',
          checked ? 'border-cyan bg-cyan' : 'border-border bg-surface'
        )}
        style={checked ? { borderColor: T.cyan, backgroundColor: T.cyan } : {}}
      >
        <div
          className={cn(
            'absolute top-[1px] h-4 w-4 rounded-full transition-all duration-200',
            checked ? 'left-[17px] bg-bg' : 'left-[1px] bg-ink-dim'
          )}
          style={checked ? { backgroundColor: T.bg } : { backgroundColor: T.textDim }}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
          {label}
        </span>
        {description && (
          <span className="text-xs leading-relaxed text-ink-dim opacity-80">
            {description}
          </span>
        )}
      </div>
    </label>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div
      className="mb-4 mt-1 border-b pb-2 font-mono text-[0.6rem] font-bold uppercase tracking-[0.15em]"
      style={{ color: T.cyan, borderColor: T.border }}
    >
      {label}
    </div>
  )
}

/* --------------------------------------------------------------------------
   MAIN COMPONENT
   -------------------------------------------------------------------------- */
export default function Settings() {
  const { config, setConfig, resetConfig } = useConfigStore()
  const { medium, heavy } = useHaptic()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    medium()
    setSaved(true)
    feedback.notifySuccess('Settings saved successfully')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = async () => {
    heavy()
    resetConfig()
    await clearAll()
    feedback.notifyInfo('All settings and data cleared')
    setTimeout(() => window.location.reload(), 800)
  }

  const animated = config.ui.animationsEnabled

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6 lg:p-8"
    >
      <Section
        subtitle="Global Configuration"
        title="Platform Settings"
        action={
          <div className="flex items-center gap-3">
            {saved && <Badge label="SAVED ✓" color="green" glow />}
            <Button variant="primary" size="sm" onClick={handleSave} haptic="medium">
              ✓ Save Changes
            </Button>
          </div>
        }
      />

      {/* ── Sigma Thresholds ── */}
      <Panel>
        <Divider label="σ Sigma Level Thresholds" />
        <p className="mb-4 text-xs leading-relaxed text-ink-dim">
          Defines the sigma levels at which color indicators switch. All modules adapt automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberInput
            label="World Class (≥)"
            value={config.sigma.worldClass}
            min={4} max={6} step={0.1}
            onChange={(e) => setConfig({ sigma: { ...config.sigma, worldClass: Number(e.target.value) } })}
          />
          <NumberInput
            label="Excellent (≥)"
            value={config.sigma.excellent}
            min={3} max={5} step={0.1}
            onChange={(e) => setConfig({ sigma: { ...config.sigma, excellent: Number(e.target.value) } })}
          />
          <NumberInput
            label="Acceptable (≥)"
            value={config.sigma.acceptable}
            min={2} max={4} step={0.1}
            onChange={(e) => setConfig({ sigma: { ...config.sigma, acceptable: Number(e.target.value) } })}
          />
          <NumberInput
            label="Poor (≥)"
            value={config.sigma.poor}
            min={1} max={3} step={0.1}
            onChange={(e) => setConfig({ sigma: { ...config.sigma, poor: Number(e.target.value) } })}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: config.sigma.poor, color: T.red, label: 'Poor' },
            { v: config.sigma.acceptable, color: T.yellow, label: 'Acceptable' },
            { v: config.sigma.excellent, color: T.cyan, label: 'Excellent' },
            { v: config.sigma.worldClass, color: T.green, label: 'World Class' },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-lg border px-3 py-2 text-center"
              style={{ backgroundColor: `${item.color}1A`, borderColor: `${item.color}4D` }}
            >
              <div className="font-mono text-sm font-bold" style={{ color: item.color }}>{item.v}σ</div>
              <div className="mt-1 font-mono text-[0.55rem] font-bold uppercase tracking-widest text-ink-dim">{item.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Ppk Thresholds ── */}
      <Panel>
        <Divider label="◈ Process Capability (Ppk) Thresholds" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberInput
            label="World Class Ppk (≥)"
            value={config.ppk.worldClass}
            min={1.33} max={3} step={0.01}
            onChange={(e) => setConfig({ ppk: { ...config.ppk, worldClass: Number(e.target.value) } })}
          />
          <NumberInput
            label="Capable Ppk (≥)"
            value={config.ppk.capable}
            min={1.0} max={2} step={0.01}
            onChange={(e) => setConfig({ ppk: { ...config.ppk, capable: Number(e.target.value) } })}
          />
          <NumberInput
            label="Marginal Ppk (≥)"
            value={config.ppk.marginal}
            min={0.5} max={1.33} step={0.01}
            onChange={(e) => setConfig({ ppk: { ...config.ppk, marginal: Number(e.target.value) } })}
          />
        </div>
      </Panel>

      {/* ── RPN Thresholds ── */}
      <Panel>
        <Divider label="⚠ FMEA Risk Priority Number (RPN) Thresholds" />
        <p className="mb-4 text-xs leading-relaxed text-ink-dim">
          Controls when FMEA rows are flagged as Critical / High / Medium. Range 1–1000.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberInput
            label="Critical RPN (≥)"
            value={config.rpn.critical}
            min={100} max={1000} step={10}
            onChange={(e) => setConfig({ rpn: { ...config.rpn, critical: Number(e.target.value) } })}
          />
          <NumberInput
            label="High RPN (≥)"
            value={config.rpn.high}
            min={50} max={500} step={10}
            onChange={(e) => setConfig({ rpn: { ...config.rpn, high: Number(e.target.value) } })}
          />
          <NumberInput
            label="Medium RPN (≥)"
            value={config.rpn.medium}
            min={10} max={200} step={5}
            onChange={(e) => setConfig({ rpn: { ...config.rpn, medium: Number(e.target.value) } })}
          />
        </div>
      </Panel>

      {/* ── COPQ Alert ── */}
      <Panel>
        <Divider label="$ COPQ Alert Thresholds (% of Revenue)" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberInput
            label="Critical COPQ %"
            value={config.copq.criticalPct}
            min={1} max={50} step={0.5}
            onChange={(e) => setConfig({ copq: { ...config.copq, criticalPct: Number(e.target.value) } })}
          />
          <NumberInput
            label="Warning COPQ %"
            value={config.copq.warnPct}
            min={0.5} max={20} step={0.5}
            onChange={(e) => setConfig({ copq: { ...config.copq, warnPct: Number(e.target.value) } })}
          />
        </div>
      </Panel>

      {/* ── WECO Rules ── */}
      <Panel>
        <Divider label="~ SPC Western Electric Rules" />
        <div className="flex flex-col gap-5">
          <Toggle
            label="Rule 1 — 1 point beyond 3σ"
            description="Immediate out-of-control signal. Recommended: always ON."
            checked={config.weco.rule1}
            onChange={(v) => setConfig({ weco: { ...config.weco, rule1: v } })}
          />
          <Toggle
            label="Rule 2 — 9 consecutive points same side of CL"
            description="Process shift detection. Recommended: ON."
            checked={config.weco.rule2}
            onChange={(v) => setConfig({ weco: { ...config.weco, rule2: v } })}
          />
          <Toggle
            label="Rule 3 — 6 consecutive trending up or down"
            description="Drift detection. Recommended: ON."
            checked={config.weco.rule3}
            onChange={(v) => setConfig({ weco: { ...config.weco, rule3: v } })}
          />
          <Toggle
            label="Rule 4 — 14 alternating up/down points"
            description="Stratification or mixture detection. Optional."
            checked={config.weco.rule4}
            onChange={(v) => setConfig({ weco: { ...config.weco, rule4: v } })}
          />
        </div>
      </Panel>

      {/* ── Pareto & UI Preferences ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel>
          <Divider label="▌ Pareto Settings" />
          <div className="flex flex-col gap-4">
            <NumberInput
              label="Vital Few Cutoff %"
              value={config.pareto.cutoffPct}
              min={50} max={95} step={5}
              onChange={(e) => setConfig({ pareto: { ...config.pareto, cutoffPct: Number(e.target.value) } })}
            />
            <NumberInput
              label="Max Categories Shown"
              value={config.pareto.maxCategories}
              min={5} max={50} step={1}
              onChange={(e) => setConfig({ pareto: { ...config.pareto, maxCategories: Number(e.target.value) } })}
            />
          </div>
        </Panel>

        <Panel>
          <Divider label="◈ UI Preferences" />
          <div className="flex flex-col gap-5">
            <Toggle
              label="Enable Animations"
              description="Chart entrance animations and page transitions."
              checked={config.ui.animationsEnabled}
              onChange={(v) => setConfig({ ui: { ...config.ui, animationsEnabled: v } })}
            />
            <Toggle
              label="Enable Haptic Feedback"
              description="Vibration on button presses (mobile only)."
              checked={config.ui.hapticsEnabled}
              onChange={(v) => setConfig({ ui: { ...config.ui, hapticsEnabled: v } })}
            />
          </div>
        </Panel>
      </div>

      {/* ── Language ── */}
      <Panel>
        <Divider label="🌐 Language & Locale" />
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-dim">Current Language:</span>
          <LocaleSwitcher />
          <span className="text-xs text-ink-dim opacity-70">
            Numbers, dates, and currency will reformat based on your selection.
          </span>
        </div>
      </Panel>

      {/* ── Actions ── */}
      <Panel>
        <Divider label="⚠ Data Management" />
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={handleSave} haptic="medium">✓ Save All Settings</Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetConfig()
              feedback.notifyInfo('Settings reset to defaults')
            }}
          >
            ↺ Reset Settings Only
          </Button>
          <ConfirmButton
            variant="danger"
            label="✕ Clear ALL Data & Reset"
            message="This will delete ALL data, FMEA rows, SPC data, tasks, and reset settings. Cannot be undone."
            confirmLabel="Yes, Clear Everything"
            onConfirm={handleReset}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-dim opacity-60">
          All data is stored locally in your browser (IndexedDB + localStorage). Nothing is sent to any server.
        </p>
      </Panel>
    </motion.div>
  )
}
