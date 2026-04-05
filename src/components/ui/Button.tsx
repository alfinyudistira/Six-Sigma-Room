// src/components/ui/Button.tsx

import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useHaptic } from '@/hooks'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type HapticType = 'light' | 'medium' | 'heavy'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  haptic?: HapticType
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-cyan/40 bg-cyan/10 text-cyan hover:border-cyan/60 hover:bg-cyan/20 shadow-[0_0_15px_rgba(0,212,255,0.1)]',
  ghost: 'border-transparent bg-transparent text-ink-dim hover:bg-white/5 hover:text-ink',
  danger: 'border-red/40 bg-red/10 text-red hover:border-red/60 hover:bg-red/20',
  success: 'border-green/40 bg-green/10 text-green hover:border-green/60 hover:bg-green/20',
  warning: 'border-yellow/40 bg-yellow/10 text-yellow hover:border-yellow/60 hover:bg-yellow/20',
  outline: 'border-border bg-transparent text-ink hover:bg-surface hover:border-border-hi',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'gap-1 px-2 py-1 text-[10px]',
  sm: 'gap-1.5 px-3 py-1.5 text-xs',
  md: 'gap-2 px-4 py-2 text-xs',
  lg: 'gap-2.5 px-5 py-2.5 text-sm',
}

/* --------------------------------------------------------------------------
   COMPONENT
   -------------------------------------------------------------------------- */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'sm',
      loading = false,
      icon,
      haptic = 'light',
      fullWidth = false,
      className,
      onClick,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const haptics = useHaptic()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      
      // 🔥 PERBAIKAN 3: Safety check untuk pemanggilan haptic
      const hapticFn = haptics[haptic]
      if (typeof hapticFn === 'function') {
        hapticFn()
      }
      
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border font-mono font-bold uppercase tracking-wider transition-all duration-200',
          'active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-cyan/50 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span
            className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : icon ? (
          <span className="inline-flex shrink-0 text-sm" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        
        <span className={cn(loading && 'opacity-80')}>
          {children}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'
