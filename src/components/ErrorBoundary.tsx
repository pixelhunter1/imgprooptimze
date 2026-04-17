import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#fafafa',
          color: '#111'
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'left' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ocorreu um erro inesperado</h1>
          <p style={{ color: '#555', marginBottom: '1rem' }}>
            A aplicação não conseguiu renderizar este ecrã. Podes tentar continuar — se o erro
            persistir, reinicia a app.
          </p>
          <pre
            style={{
              background: '#f0f0f0',
              padding: '0.75rem',
              borderRadius: 6,
              fontSize: '0.8rem',
              overflow: 'auto',
              marginBottom: '1rem'
            }}
          >
            {error.message}
          </pre>
          <button
            onClick={this.reset}
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }
}
