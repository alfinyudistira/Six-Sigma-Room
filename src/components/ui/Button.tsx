// src/components/ui/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-cyan/10 border-cyan/40 text-cyan hover:bg-cyan/20 hover:border-cyan/60',
  ghost:   'bg-transparent border-border text-ink-dim hover:border-border-hi hover:text-ink-mid',
  danger:  'bg-danger/10 border-danger/40 text-danger hover:bg-danger/20',
  success: 'bg-emerald/10 border-emerald/40 text-emerald hover:bg-emerald/20',
  warning: 'bg-warn/10 border-warn/40 text-warn hover:bg-warn/20',
  outline: 'bg-transparent border-border-hi text-ink hover:bg-surface',
}

const sizes: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-[10px] gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-xs gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
  hapticStyle?: 'light' | 'medium' | 'heavy'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'sm', loading, icon, hapticStyle = 'light',
     className, onClick, children, disabled, ...props }, ref) => {

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return
      haptic[hapticStyle]?.()
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-busy={loading}
        className={cn(
          'inline-flex items-center justify-center font-mono tracking-wider',
          'border rounded transition-all duration-150 cursor-pointer',
          'focus-visible:ring-2 focus-visible:ring-cyan/50 focus-visible:outline-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : icon}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
