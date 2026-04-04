// src/components/ui/Input.tsx
import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const baseInputStyle: React.CSSProperties = {
  background: '#050A0F',
  border: '1px solid #112233',
  borderRadius: 6,
  color: '#E2EEF9',
  fontFamily: 'Space Mono, monospace',
  fontSize: '0.75rem',
  padding: '0.45rem 0.65rem',
  width: '100%',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  outline: 'none',
}

const focusStyle: React.CSSProperties = {
  borderColor: 'rgba(0,212,255,0.4)',
  boxShadow: '0 0 0 2px rgba(0,212,255,0.08)',
}

// ─── Text Input ───────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, style, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{ color: '#7A99B8', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(className)}
          style={{ ...baseInputStyle, ...(error ? { borderColor: 'rgba(255,59,92,0.5)' } : {}), ...style }}
          onFocus={e => Object.assign(e.target.style, focusStyle)}
          onBlur={e => {
            e.target.style.borderColor = error ? 'rgba(255,59,92,0.5)' : '#112233'
            e.target.style.boxShadow = ''
          }}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} role="alert" style={{ color: '#FF3B5C', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${inputId}-hint`} style={{ color: '#4A6785', fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem' }}>
            {hint}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

// ─── Number Input ─────────────────────────────────────────────────────────────
export const NumberInput = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <Input ref={ref} type="number" {...props} />,
)
NumberInput.displayName = 'NumberInput'

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string } | string>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, style, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {label && (
          <label htmlFor={selectId} style={{ color: '#7A99B8', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          style={{ ...baseInputStyle, cursor: 'pointer', ...style }}
          onFocus={e => Object.assign(e.target.style, focusStyle)}
          onBlur={e => { e.target.style.borderColor = '#112233'; e.target.style.boxShadow = '' }}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {options.map(opt => {
            const v = typeof opt === 'string' ? opt : opt.value
            const l = typeof opt === 'string' ? opt : opt.label
            return <option key={v} value={v}>{l}</option>
          })}
        </select>
        {error && <span role="alert" style={{ color: '#FF3B5C', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem' }}>{error}</span>}
      </div>
    )
  },
)
Select.displayName = 'Select'

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, style, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {label && (
          <label htmlFor={inputId} style={{ color: '#7A99B8', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          style={{ ...baseInputStyle, resize: 'vertical', minHeight: 80, ...style }}
          onFocus={e => Object.assign(e.target.style, focusStyle)}
          onBlur={e => { e.target.style.borderColor = '#112233'; e.target.style.boxShadow = '' }}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && <span role="alert" style={{ color: '#FF3B5C', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem' }}>{error}</span>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

// ─── Slider ───────────────────────────────────────────────────────────────────
interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  valueLabel?: string
  accentColor?: string
}

export function Slider({ label, valueLabel, accentColor = '#00D4FF', ...props }: SliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {(label || valueLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {label && <span style={{ color: '#7A99B8', fontFamily: 'Space Mono, monospace', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>}
          {valueLabel && <span style={{ color: accentColor, fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', fontWeight: 700 }}>{valueLabel}</span>}
        </div>
      )}
      <input
        type="range"
        style={{ width: '100%', accentColor, cursor: 'pointer' }}
        {...props}
      />
    </div>
  )
}
