import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Local AI renderer error', error, errorInfo)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-10 text-ink">
          <div className="glass-panel max-w-lg p-8 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-muted">Renderer recovery</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">A workspace panel failed.</h1>
            <p className="mt-3 text-sm text-muted">
              Reload the app to rehydrate the interface. Runtime protections are in place so data
              syncs are not lost.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
