// src/components/feedback/ErrorBoundary.tsx

import React from 'react'
import { clearAll, clearExpired } from '@/lib/storage'
import { feedback } from '@/lib/feedback'
import { tokens } from '@/lib/tokens'


export interface ErrorBoundaryFallbackProps {
  /** The error that was caught */
  error: Error
  /** React error info (component stack) */
  errorInfo: React.ErrorInfo | null
  /** Unique identifier for this error instance */
  errorId: string
  /** Module/component name where error occurred */
  moduleName?: string
  /** Whether a reset operation is in progress */
  isResetting: boolean
  /** Simple retry (clear only error state, not storage) */
  onRetry: () => void
  /** Soft reset: clear all storage and retry (no reload) */
  onSoftReset: () => void
  /** Hard reset: clear storage and reload page */
  onHardReset: () => void
}

export interface ErrorBoundaryProps {
  /** React children to be wrapped */
  children: React.ReactNode
  /** Module/component name for error context (shown in UI and logs) */
  moduleName?: string
  /** Custom fallback UI (receives props) – if not provided, uses default */
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>
  /** Callback when error is caught (e.g., send to Sentry, LogRocket) */
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string, moduleName?: string) => void
  /** Whether to clear expired storage entries on soft reset (default false) */
  clearExpiredOnReset?: boolean
  /** Show stack trace in production (default false) – for debugging staging */
  showDetailsInProd?: boolean
  /** Whether hard reset should call location.reload() (default true) */
  reloadOnHardReset?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string | null
  showDetails: boolean
  isResetting: boolean
}


function generateErrorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const DefaultFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  moduleName,
  isResetting,
  onRetry,
  onSoftReset,
  onHardReset,
}) => {
  const isDev = import.meta.env.DEV
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing[4],
        padding: tokens.spacing[8],
        background: 'rgba(255, 59, 92, 0.04)',
        border: `1px solid ${tokens.redDim}`,
        borderRadius: tokens.borderRadius.lg,
        margin: tokens.spacing[4],
        color: tokens.textDim,
        fontFamily: tokens.font.mono,
      }}
    >
      {/* Header */}
      <div
        style={{
          color: tokens.red,
          fontSize: tokens.fontSize.sm,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        ⚠ SYSTEM FAILURE{moduleName ? ` — ${moduleName.toUpperCase()}` : ''}
      </div>

      {/* Error message */}
      <div
        style={{
          maxWidth: 560,
          textAlign: 'center',
          fontSize: tokens.fontSize.sm,
          lineHeight: 1.5,
        }}
      >
        {error.message || 'An unexpected error occurred.'}
      </div>

      {/* Error ID (for debugging) */}
      {errorId && (
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            color: tokens.cyanDim,
          }}
        >
          Error ID: {errorId}
        </div>
      )}

      {/* Toggle details (stack trace) */}
      {(isDev || showDetails) && (
        <button
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.cyan,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: tokens.fontSize.xs,
          }}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      )}

      {showDetails && (error.stack || errorInfo?.componentStack) && (
        <pre
          style={{
            maxWidth: '90%',
            maxHeight: 240,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.2)',
            padding: tokens.spacing[3],
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.fontSize.xs,
            color: tokens.textMid,
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
          }}
        >
          {error.stack}
          {errorInfo?.componentStack && `\n\n${errorInfo.componentStack}`}
        </pre>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: tokens.spacing[3],
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onRetry}
          disabled={isResetting}
          style={{
            background: 'transparent',
            border: `1px solid ${tokens.cyanDim}`,
            color: tokens.cyan,
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.fontSize.sm,
            cursor: isResetting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ↺ Retry
        </button>
        <button
          onClick={onSoftReset}
          disabled={isResetting}
          style={{
            background: 'rgba(255, 59, 92, 0.1)',
            border: `1px solid ${tokens.redDim}`,
            color: tokens.red,
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.fontSize.sm,
            cursor: isResetting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 59, 92, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 59, 92, 0.1)'
          }}
        >
          {isResetting ? 'Clearing…' : '✕ Clear Storage & Retry'}
        </button>
        <button
          onClick={onHardReset}
          disabled={isResetting}
          style={{
            background: 'transparent',
            border: `1px solid ${tokens.yellowDim}`,
            color: tokens.yellow,
            padding: `${tokens.spacing[2]} ${tokens.spacing[4]}`,
            borderRadius: tokens.borderRadius.md,
            fontSize: tokens.fontSize.sm,
            cursor: isResetting ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 214, 10, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ⟳ Reboot System
        </button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   ERROR BOUNDARY CLASS
   -------------------------------------------------------------------------- */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public static defaultProps: Partial<ErrorBoundaryProps> = {
    clearExpiredOnReset: false,
    showDetailsInProd: false,
    reloadOnHardReset: true,
  }

  private mounted = false

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      isResetting: false,
    }
  }

  public componentDidMount(): void {
    this.mounted = true
  }

  public componentWillUnmount(): void {
    this.mounted = false
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorId = generateErrorId()
    const { moduleName, onError } = this.props

    this.setState({ errorInfo, errorId })

    // Log to console
    console.error(
      `%c[ErrorBoundary${moduleName ? `:${moduleName}` : ''}][${errorId}]`,
      'color: #FF3B5C; font-weight: bold',
      error,
      errorInfo
    )

    // Show feedback notification
    feedback.notifyError(`Error in ${moduleName || 'component'}`, {
      description: error.message,
      duration: 5000,
    })

    // Call external error reporter (Sentry, LogRocket, etc.)
    if (onError) {
      onError(error, errorInfo, errorId, moduleName)
    }
  }

  // --- Recovery methods ---
  private retry = (): void => {
    if (!this.mounted) return
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isResetting: false,
    })
  }

  private softReset = async (): Promise<void> => {
    if (!this.mounted) return
    this.setState({ isResetting: true })
    try {
      if (this.props.clearExpiredOnReset) {
        await clearExpired()
      } else {
        await clearAll()
      }
      if (this.mounted) {
        this.retry()
      }
    } catch (err) {
      console.warn('[ErrorBoundary] softReset failed', err)
      if (this.mounted) {
        this.setState({ isResetting: false })
      }
    }
  }

  private hardReset = async (): Promise<void> => {
    if (!this.mounted) return
    this.setState({ isResetting: true })
    try {
      await clearAll()
    } catch (err) {
      console.warn('[ErrorBoundary] hardReset clearAll failed', err)
    }
    if (this.props.reloadOnHardReset) {
      setTimeout(() => {
        location.reload()
      }, 50)
    } else {
      this.retry()
    }
  }

  // --- Render ---
  public render(): React.ReactNode {
    const { hasError, error, errorInfo, errorId, isResetting } = this.state
    const { children, fallback: FallbackComponent, moduleName, showDetailsInProd } = this.props

    if (!hasError || !error) {
      return children
    }

    const fallbackProps: ErrorBoundaryFallbackProps = {
      error,
      errorInfo,
      errorId: errorId ?? 'unknown',
      moduleName: moduleName ?? 'unknown',
      isResetting,
      onRetry: this.retry,
      onSoftReset: this.softReset,
      onHardReset: this.hardReset,
    }

    if (FallbackComponent) {
      return <FallbackComponent {...fallbackProps} />
    }

    return <DefaultFallback {...fallbackProps} />
  }
}
