// src/pages/CompanySetup.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppStore, DEMO_COMPANY, INDUSTRY_OPTIONS, CURRENCY_OPTIONS } from '@/store/useAppStore'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { haptic } from '@/lib/utils'

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  name:           z.string().min(1, 'Company name is required'),
  dept:           z.string().min(1, 'Department is required'),
  industry:       z.string(),
  country:        z.string(),
  processName:    z.string().min(1, 'Process name is required'),
  processUnit:    z.string().min(1, 'Process unit is required'),
  teamSize:       z.coerce.number().int().min(1, 'Must be ≥ 1'),
  baselineMean:   z.coerce.number(),
  baselineStdDev: z.coerce.number().min(0.001, 'Must be > 0'),
  target:         z.coerce.number(),
  usl:            z.coerce.number(),
  lsl:            z.coerce.number(),
  currency:       z.string(),
  laborRate:      z.coerce.number().min(0.01, 'Must be > 0'),
  monthlyVolume:  z.coerce.number().min(1, 'Must be ≥ 1'),
  customerLTV:    z.coerce.number().min(0),
  slaTarget:      z.coerce.number().min(0),
}).refine(d => d.usl > d.lsl, { message: 'USL must be greater than LSL', path: ['usl'] })
 .refine(d => d.target >= d.lsl && d.target <= d.usl, {
   message: 'Target must be between LSL and USL', path: ['target'],
 })

type FormData = z.infer<typeof schema>

const SECTION_STYLE: React.CSSProperties = {
  display: 'grid', gap: '0.85rem', marginBottom: '1.25rem',
}
const LABEL_STYLE: React.CSSProperties = {
  color: '#7A99B8', fontFamily: 'Space Mono, monospace',
  fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase',
  display: 'block', marginBottom: '0.25rem',
}
const INPUT_STYLE: React.CSSProperties = {
  background: '#050A0F', border: '1px solid #112233', borderRadius: 6,
  color: '#E2EEF9', fontFamily: 'Space Mono, monospace', fontSize: '0.75rem',
  padding: '0.45rem 0.65rem', width: '100%', outline: 'none',
}
const ERROR_STYLE: React.CSSProperties = {
  color: '#FF3B5C', fontFamily: 'Space Mono, monospace',
  fontSize: '0.58rem', marginTop: '0.2rem',
}
const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }
const GRID3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
      {error && <div style={ERROR_STYLE} role="alert">{error}</div>}
    </div>
  )
}

export default function CompanySetup() {
  const { company, setCompany, setShowCompanySetup, flashSaved, resetToDemo } = useAppStore()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: company,
  })

  const onSubmit = (data: FormData) => {
    haptic.success()
    setCompany({ ...data, isPulseDigital: false })
    flashSaved()
    setShowCompanySetup(false)
  }

  const loadDemo = () => {
    haptic.medium()
    reset(DEMO_COMPANY)
  }

  const inputProps = (field: keyof FormData) => ({
    ...register(field),
    style: { ...INPUT_STYLE, ...(errors[field] ? { borderColor: 'rgba(255,59,92,0.5)' } : {}) },
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.target.style.borderColor = 'rgba(0,212,255,0.4)'
      e.target.style.boxShadow = '0 0 0 2px rgba(0,212,255,0.08)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.target.style.borderColor = errors[field] ? 'rgba(255,59,92,0.5)' : '#112233'
      e.target.style.boxShadow = ''
    },
  })

  const sectionHeader = (label: string) => (
    <div style={{ color: '#00D4FF', fontFamily: 'Space Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', borderBottom: '1px solid #112233', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
      {label}
    </div>
  )

  return (
    <Modal
      isOpen
      onClose={() => setShowCompanySetup(false)}
      title="Configure Your Organization"
      subtitle="⚡ COMPANY PROFILE"
      maxWidth={700}
    >
      {/* Quick load */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Button variant="primary" size="sm" onClick={loadDemo}>◈ Load Pulse Digital (Demo)</Button>
        <ConfirmButton
          onConfirm={() => { reset({ ...DEMO_COMPANY, name: '', dept: '', processName: '', baselineMean: 0, baselineStdDev: 0, target: 0, usl: 0, lsl: 0, laborRate: 0, monthlyVolume: 0, customerLTV: 0 }); haptic.medium() }}
          label="⚡ Start Fresh"
          message="Clear all fields?"
          variant="warning"
          confirmLabel="Clear"
        />
        <ConfirmButton
          onConfirm={() => { resetToDemo(); setShowCompanySetup(false) }}
          label="✕ Reset All"
          message="Reset ALL data? Cannot be undone."
          variant="danger"
          confirmLabel="Reset"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Organization ── */}
        {sectionHeader('Organization')}
        <div style={{ ...SECTION_STYLE }}>
          <div style={GRID2}>
            <Field label="Company Name" error={errors.name?.message}>
              <input {...inputProps('name')} placeholder="Pulse Digital" />
            </Field>
            <Field label="Department" error={errors.dept?.message}>
              <input {...inputProps('dept')} placeholder="Technical Support" />
            </Field>
          </div>
          <div style={GRID2}>
            <Field label="Industry" error={errors.industry?.message}>
              <select {...register('industry')} style={INPUT_STYLE}>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <input {...inputProps('country')} placeholder="Indonesia" />
            </Field>
          </div>
          <Field label="Team Size" error={errors.teamSize?.message}>
            <input {...inputProps('teamSize')} type="number" min={1} style={{ ...INPUT_STYLE, maxWidth: 120 }} />
          </Field>
        </div>

        {/* ── Process ── */}
        {sectionHeader('Process Definition')}
        <div style={SECTION_STYLE}>
          <div style={GRID2}>
            <Field label="Process Name" error={errors.processName?.message}>
              <input {...inputProps('processName')} placeholder="Customer Complaint Resolution" />
            </Field>
            <Field label="Measurement Unit" error={errors.processUnit?.message}>
              <input {...inputProps('processUnit')} placeholder="hrs, units, tickets…" />
            </Field>
          </div>
          <div style={GRID3}>
            <Field label="Baseline Mean" error={errors.baselineMean?.message}>
              <input {...inputProps('baselineMean')} type="number" step="any" />
            </Field>
            <Field label="Baseline Std Dev" error={errors.baselineStdDev?.message}>
              <input {...inputProps('baselineStdDev')} type="number" step="any" min="0.001" />
            </Field>
            <Field label="Target" error={errors.target?.message}>
              <input {...inputProps('target')} type="number" step="any" />
            </Field>
          </div>
          <div style={GRID2}>
            <Field label="USL (Upper Spec Limit)" error={errors.usl?.message}>
              <input {...inputProps('usl')} type="number" step="any" />
            </Field>
            <Field label="LSL (Lower Spec Limit)" error={errors.lsl?.message}>
              <input {...inputProps('lsl')} type="number" step="any" />
            </Field>
          </div>
        </div>

        {/* ── Financial ── */}
        {sectionHeader('Financial Settings')}
        <div style={SECTION_STYLE}>
          <div style={GRID2}>
            <Field label="Currency" error={errors.currency?.message}>
              <select {...register('currency')} style={INPUT_STYLE}>
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Staff Hourly Cost" error={errors.laborRate?.message}>
              <input {...inputProps('laborRate')} type="number" step="any" min="0.01" />
            </Field>
          </div>
          <div style={GRID2}>
            <Field label="Monthly Volume (units)" error={errors.monthlyVolume?.message}>
              <input {...inputProps('monthlyVolume')} type="number" min="1" />
            </Field>
            <Field label="Customer Lifetime Value" error={errors.customerLTV?.message}>
              <input {...inputProps('customerLTV')} type="number" step="any" min="0" />
            </Field>
          </div>
          <Field label="SLA Target (same unit as process)" error={errors.slaTarget?.message}>
            <input {...inputProps('slaTarget')} type="number" step="any" min="0" style={{ ...INPUT_STYLE, maxWidth: 180 }} />
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #112233' }}>
          <Button variant="ghost" size="sm" type="button" onClick={() => setShowCompanySetup(false)}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" hapticStyle="success">
            ✓ Save Company Profile
          </Button>
        </div>
      </form>
    </Modal>
  )
}
