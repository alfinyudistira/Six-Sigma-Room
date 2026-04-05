// src/components/ui/Skeleton.tsx

import { cn } from '@/lib/utils'
import { memo, type CSSProperties } from 'react'
import { tokens } from '@/lib/tokens'

/* --------------------------------------------------------------------------
   TYPES
   -------------------------------------------------------------------------- */
export interface SkeletonProps {
  className?: string
  variant?: 'default' | 'text' | 'circular' | 'rect'
  width?: string | number
  height?: string | number
  rounded?: string
  animate?: 'shimmer' | 'pulse' | 'none'
  respectReducedMotion?: boolean
}

/* --------------------------------------------------------------------------
   SKELETON BASE COMPONENT
   -------------------------------------------------------------------------- */
export const Skeleton = memo(function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  rounded,
  animate = 'shimmer',
}: SkeletonProps) {
  
  const variantClasses = {
    default: 'rounded',
    text: 'rounded-md',
    circular: 'rounded-full',
    rect: 'rounded-lg',
  }

  const animationClasses = {
    shimmer: cn(
      'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full',
      'before:animate-[shimmer_2s_infinite]',
      'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
      'motion-reduce:before:animate-none'
    ),
    pulse: 'animate-pulse',
    none: '',
  }

  const style: CSSProperties = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height }),
    backgroundColor: tokens.surface || '#0F172A',
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-opacity-70',
        rounded || variantClasses[variant],
        animationClasses[animate],
        className
      )}
      style={style}
    />
  )
})

export function ModuleSkeleton() {
  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-500" aria-label="Loading module" aria-busy="true">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2 ml-auto">
           <Skeleton className="h-8 w-20" />
           <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3 border border-border/50">
             <Skeleton variant="text" className="w-16 h-3" />
             <Skeleton className="h-8 w-24" />
             <Skeleton variant="text" className="w-full h-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="card p-4 h-64 border border-border/50">
              <div className="flex justify-between mb-6">
                 <Skeleton className="h-5 w-32" />
                 <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex items-end gap-2 h-40">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" height={`${30 + Math.random() * 60}%`} />
                ))}
              </div>
           </div>
        </div>
        <div className="space-y-4">
           <div className="card p-4 h-64 border border-border/50">
              <Skeleton variant="text" className="w-full h-4 mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                   <div key={i} className="flex gap-3">
                      <Skeleton variant="circular" className="h-8 w-8" />
                      <div className="flex-1 space-y-2">
                         <Skeleton variant="text" className="w-3/4 h-2" />
                         <Skeleton variant="text" className="w-1/2 h-2" />
                      </div>
                   </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
