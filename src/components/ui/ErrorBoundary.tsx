// src/components/ui/ErrorBoundary.tsx
import React from 'react'
import { clearAll } from '@/lib/storage'

interface Props { children: React.ReactNode; moduleName?: string }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.moduleName ?? 'unknown'}]`, error, info)
  }

  private handleReset = async () => {
    await clearAll()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

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
          gap: '1rem',
          padding: '2rem',
          background: 'rgba(255,59,92,0.04)',
          border: '1px solid rgba(255,59,92,0.2)',
          borderRadius: 12,
        }}
      >
        <div style={{ color: '#FF3B5C', fontFamily: 'Space Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.15em' }}>
          ⚠ MODULE ERROR{this.props.moduleName ? ` — ${this.props.moduleName.toUpperCase()}` : ''}
        </div>

        <div style={{ color: '#4A6785', fontFamily: 'Space Mono, monospace', fontSize: '0.7rem', maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'transparent', border: '1px solid #00D4FF44',
              color: '#00D4FF', padding: '0.4rem 1rem', borderRadius: 6,
              fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', cursor: 'pointer',
            }}
          >
            ↺ Retry
          </button>
          <button
            onClick={this.handleReset}
            style={{
              background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)',
              color: '#FF3B5C', padding: '0.4rem 1rem', borderRadius: 6,
              fontFamily: 'Space Mono, monospace', fontSize: '0.65rem', cursor: 'pointer',
            }}
          >
            ✕ Clear State & Retry
          </button>
        </div>
      </div>
    )
  }
}
