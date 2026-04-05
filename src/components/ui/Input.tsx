// src/components/ui/Input.tsx

import {
  forwardRef,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react'
import { cn } from '@/lib/utils'
import { tokens } from '@/lib/tokens'

interface BaseFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

const getFieldId = (id?: string, label?: string) => 
  id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : `field-${Math.random().toString(36).slice(2, 7)}`)

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    BaseFieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, id, type = 'text', ...props }, ref) => {
    const fieldId = getFieldId(id, label)
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={fieldId}
            className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-ink-dim"
            style={{ color: tokens.textDim }}
          >
            {label}
            {required && <span className="ml-1 text-red" style={{ color: tokens.red }}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          type={type}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          required={required}
          className={cn(
            'w-full rounded-lg border bg-bg px-3 py-2.5 font-mono text-xs text-ink transition-all',
            'focus:border-cyan/40 focus:outline-none focus:ring-2 focus:ring-cyan/10',
            error ? 'border-red/50 focus:border-red focus:ring-red/10' : 'border-border',
            props.disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          style={{ 
            backgroundColor: tokens.bg,
            color: tokens.text,
            borderColor: error ? tokens.red : tokens.border 
          }}
          {...props}
        />
        {error && (
          <span id={`${fieldId}-error`} role="alert" className="font-mono text-[0.6rem] font-bold text-red" style={{ color: tokens.red }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${fieldId}-hint`} className="font-mono text-[0.6rem] opacity-60" style={{ color: tokens.textDim }}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

/* --------------------------------------------------------------------------
   SELECT
   -------------------------------------------------------------------------- */
export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {
  options: Array<{ value: string; label: string } | string>
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, options, placeholder, className, id, ...props }, ref) => {
    const fieldId = getFieldId(id, label)
    const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={fieldId}
            className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-ink-dim"
            style={{ color: tokens.textDim }}
          >
            {label}
            {required && <span className="ml-1 text-red" style={{ color: tokens.red }}>*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={fieldId}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          required={required}
          className={cn(
            'w-full rounded-lg border bg-bg px-3 py-2.5 font-mono text-xs text-ink transition-all appearance-none',
            'focus:border-cyan/40 focus:outline-none focus:ring-2 focus:ring-cyan/10',
            error ? 'border-red/50 focus:border-red' : 'border-border',
            props.disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          style={{ 
            backgroundColor: tokens.bg,
            color: tokens.text,
            borderColor: error ? tokens.red : tokens.border 
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={value} value={value}>
                {label}
              </option>
            )
          })}
        </select>
        {error && (
          <span id={`${fieldId}-error`} role="alert" className="font-mono text-[0.6rem] font-bold text-red" style={{ color: tokens.red }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

/* --------------------------------------------------------------------------
   SLIDER
   -------------------------------------------------------------------------- */
export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseFieldProps {
  valueLabel?: string | ReactNode
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, valueLabel, error, hint, required, className, ...props }, ref) => {
    const fieldId = getFieldId(props.id, label)

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={fieldId} className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-ink-dim" style={{ color: tokens.textDim }}>
              {label}
              {required && <span className="ml-1 text-red" style={{ color: tokens.red }}>*</span>}
            </label>
          )}
          {valueLabel && (
            <span className="font-mono text-xs font-bold text-cyan" style={{ color: tokens.cyan }}>
              {valueLabel}
            </span>
          )}
        </div>
        <input
          ref={ref}
          id={fieldId}
          type="range"
          className={cn(
            'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-cyan',
            className
          )}
          style={{ accentColor: tokens.cyan }}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = 'Slider'

/* --------------------------------------------------------------------------
   CHECKBOX
   -------------------------------------------------------------------------- */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>,
    BaseFieldProps {
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, required, className, id, ...props }, ref) => {
    const fieldId = getFieldId(id, label)

    return (
      <div className="flex items-start gap-3 p-1">
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border-border bg-bg text-cyan focus:ring-1 focus:ring-cyan',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            aria-invalid={!!error}
            required={required}
            {...props}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          {label && (
            <label htmlFor={fieldId} className="font-display text-sm font-bold text-ink" style={{ color: tokens.text }}>
              {label}
              {required && <span className="ml-1 text-red" style={{ color: tokens.red }}>*</span>}
            </label>
          )}
          {description && <p className="text-[11px] text-ink-dim opacity-70" style={{ color: tokens.textDim }}>{description}</p>}
          {error && <p className="text-[10px] font-bold text-red" style={{ color: tokens.red }}>{error}</p>}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

// Exporting NumberInput & Textarea (Same logic pattern)
export const NumberInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => <Input ref={ref} type="number" {...props} />)
NumberInput.displayName = 'NumberInput'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, id, rows = 3, ...props }, ref) => {
    const fieldId = getFieldId(id, label)
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={fieldId} className="font-mono text-[0.6rem] font-bold uppercase tracking-wider" style={{ color: tokens.textDim }}>{label}</label>}
        <textarea ref={ref} id={fieldId} rows={rows} className={cn('w-full rounded-lg border bg-bg px-3 py-2.5 font-mono text-xs text-ink transition-all resize-none', 'focus:border-cyan/40 focus:outline-none focus:ring-2 focus:ring-cyan/10', error ? 'border-red/50' : 'border-border', className)} style={{ backgroundColor: tokens.bg, color: tokens.text, borderColor: error ? tokens.red : tokens.border }} {...props} />
        {error && <span className="font-mono text-[0.6rem] text-red" style={{ color: tokens.red }}>{error}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
