// src/pages/CompanySetup.tsx

import React, { useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'

import {
  useAppStore,
  DEMO_COMPANY,
  INDUSTRY_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/store/useAppStore'

import { useConfigStore } from '@/lib/config'
import { feedback } from '@/lib/feedback'
import { useHaptic } from '@/hooks'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ConfirmButton } from '@/components/ui/Confirm'
import { Input, NumberInput, Select } from '@/components/ui/Input'
import { tokens } from '@/lib/tokens'

const schema = z
  .object({
    name: z.string().min(1, 'Company name is required'),
    dept: z.string().min(1, 'Department is required'),
    industry: z.string(),
    country: z.string().min(1, 'Country is required'),
    processName: z.string().min(1, 'Process name is required'),
    processUnit: z.string().min(1, 'Process unit is required'),
    teamSize: z.coerce.number().int().min(1, 'Team size must be at least 1'),
    baselineMean: z.coerce.number().min(0, 'Mean cannot be negative'),
    baselineStdDev: z.coerce.number().min(0.001, 'StdDev must be > 0'),
    target: z.coerce.number(),
    usl: z.coerce.number(),
    lsl: z.coerce.number(),
    currency: z.string(),
    laborRate: z.coerce.number().min(0.01, 'Labor rate must be > 0'),
    monthlyVolume: z.coerce.number().min(1, 'Monthly volume must be at least 1'),
    customerLTV: z.coerce.number().min(0, 'Customer LTV cannot be negative'),
    slaTarget: z.coerce.number().min(0, 'SLA target cannot be negative'),
  })
  .refine((data) => data.usl > data.lsl, {
    message: 'USL must be greater than LSL',
    path: ['usl'],
  })
  .refine((data) => data.target >= data.lsl && data.target <= data.usl, {
    message: 'Target must be within spec limits (LSL–USL)',
    path: ['target'],
  })

type FormData = z.infer<typeof schema>

/* --------------------------------------------------------------------------
   FIELD SECTIONS
   -------------------------------------------------------------------------- */
const SECTIONS = [
  {
    title: 'Organization',
    grid: 'grid-cols-1 md:grid-cols-2',
    fields: [
      { name: 'name', label: 'Company Name', type: 'text', required: true },
      { name: 'dept', label: 'Department', type: 'text', required: true },
      { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRY_OPTIONS, required: false },
      { name: 'country', label: 'Country', type: 'text', required: true },
      { name: 'teamSize', label: 'Team Size', type: 'number', required: true, min: 1 },
    ],
  },
  {
    title: 'Process Specification',
    grid: 'grid-cols-1 md:grid-cols-3',
    fields: [
      { name: 'processName', label: 'Process Name', type: 'text', required: true },
      { name: 'processUnit', label: 'Unit', type: 'text', required: true },
      { name: 'baselineMean', label: 'Baseline Mean', type: 'number', required: true, step: 0.1 },
      { name: 'baselineStdDev', label: 'StdDev', type: 'number', required: true, min: 0.001, step: 0.1 },
      { name: 'target', label: 'Target', type: 'number', required: true, step: 0.1 },
      { name: 'usl', label: 'USL', type: 'number', required: true, step: 0.1 },
      { name: 'lsl', label: 'LSL', type: 'number', required: true, step: 0.1 },
    ],
  },
  {
    title: 'Financial & SLA',
    grid: 'grid-cols-1 md:grid-cols-2',
    fields: [
      { name: 'currency', label: 'Currency', type: 'select', options: CURRENCY_OPTIONS, required: false },
      { name: 'laborRate', label: 'Labor Rate', type: 'number', required: true, min: 0.01, step: 0.01 },
      { name: 'monthlyVolume', label: 'Monthly Volume', type: 'number', required: true, min: 1 },
      { name: 'customerLTV', label: 'Customer LTV', type: 'number', required: true, min: 0, step: 1 },
      { name: 'slaTarget', label: 'SLA Target (hours)', type: 'number', required: true, min: 0, step: 1 },
    ],
  },
] as const

/* --------------------------------------------------------------------------
   COMPONENT
   -------------------------------------------------------------------------- */
export default function CompanySetup() {
  const { company, setCompany, setShowCompanySetup, flashSaved, resetToDemo } =
    useAppStore(
      useShallow((s) => ({
        company: s.company,
        setCompany: s.setCompany,
        setShowCompanySetup: s.setShowCompanySetup,
        flashSaved: s.flashSaved,
        resetToDemo: s.resetToDemo,
      }))
    )

  const config = useConfigStore((s) => s.config)
  const { light, medium, success } = useHaptic()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: company as FormData,
    mode: 'onChange',
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = form

  const onSubmit = useCallback(
    async (data: FormData) => {
      success()
      setCompany({ ...data, isPulseDigital: false })
      flashSaved()
      feedback.notifySuccess('Company profile saved successfully')
      setShowCompanySetup(false)
    },
    [setCompany, flashSaved, setShowCompanySetup, success]
  )

  const loadDemo = useCallback(() => {
    medium()
    reset(DEMO_COMPANY as FormData)
    feedback.notifyInfo('Demo data loaded')
  }, [reset, medium])

  const startFresh = useCallback(() => {
    medium()
    reset({
      ...DEMO_COMPANY,
      name: '',
      dept: '',
      processName: '',
    } as FormData)
  }, [reset, medium])

  // Perbaikan: Animasi Props untuk strict mode
  const animProps = config.ui.animationsEnabled
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: false, animate: false }

  return (
    <Modal
      isOpen
      onClose={() => setShowCompanySetup(false)}
      title="Configure Organization"
      subtitle="⚡ COMPANY PROFILE"
      maxWidth={840}
    >
      <motion.div {...animProps} className="space-y-6">
        <div className="flex flex-wrap gap-3 border-b pb-4" style={{ borderColor: tokens.border }}>
          <Button variant="ghost" size="sm" onClick={loadDemo}>
            Load Demo Data
          </Button>
          <ConfirmButton
            label="Start Fresh"
            message="Clear all fields?"
            onConfirm={startFresh}
            variant="warning"
          />
          <ConfirmButton
            label="Reset to Demo"
            message="Reset everything to demo values?"
            onConfirm={() => {
              medium()
              resetToDemo()
              setShowCompanySetup(false)
            }}
            variant="danger"
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title} className="space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: tokens.cyan }}>
                {section.title}
              </div>
              <div className={`grid ${section.grid} gap-x-6 gap-y-4`}>
                {section.fields.map((field) => {
                  const fieldName = field.name as keyof FormData
                  const errorMsg = errors[fieldName]?.message ?? undefined
                  const required = field.required ?? false

                  if (field.type === 'select') {
                    return (
                      <Controller
                        key={field.name}
                        control={control}
                        name={fieldName}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <Select
                            label={field.label}
                            value={String(value)}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
                            onBlur={onBlur}
                            // Perbaikan: Casting readonly array ke string[]
                            options={field.options as unknown as string[]}
                            error={errorMsg}
                            required={required}
                          />
                        )}
                      />
                    )
                  }

                  if (field.type === 'number') {
                    // Perbaikan: Casting field ke any agar TS tidak protes tentang properti 'step/min'
                    const numField = field as any
                    return (
                      <Controller
                        key={field.name}
                        control={control}
                        name={fieldName}
                        render={({ field: { value, onChange, onBlur } }) => (
                          <NumberInput
                            label={field.label}
                            value={value as number}
                            onChange={onChange}
                            onBlur={onBlur}
                            step={numField.step}
                            min={numField.min}
                            error={errorMsg}
                            required={required}
                          />
                        )}
                      />
                    )
                  }

                  return (
                    <Controller
                      key={field.name}
                      control={control}
                      name={fieldName}
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          label={field.label}
                          value={String(value)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                          onBlur={onBlur}
                          error={errorMsg}
                          required={required}
                        />
                      )}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 border-t pt-6" style={{ borderColor: tokens.border }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                light()
                setShowCompanySetup(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isDirty || !isValid || isSubmitting}
              loading={isSubmitting}
            >
              Save Company Profile
            </Button>
          </div>
        </form>
      </motion.div>
    </Modal>
  )
}
