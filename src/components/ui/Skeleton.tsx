// src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-surface', className)}
      style={{ background: 'linear-gradient(90deg, #0D1520 25%, #112233 50%, #0D1520 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}
      aria-hidden="true"
    />
  )
}

export function ModuleSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Loading module..." aria-busy="true">
      {/* Header row */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="card p-4">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
      {/* Table rows */}
      <div className="card">
        <div className="p-3 border-b border-border">
          <Skeleton className="h-3 w-48" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-border last:border-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  )
}
