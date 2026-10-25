import { Component, type ReactNode } from 'react'

interface RouteErrorBoundaryProps { children: ReactNode }
interface RouteErrorBoundaryState { failed: boolean }

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch() {
    document.getElementById('route-recovery-title')?.focus()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="route-recovery" aria-labelledby="route-recovery-title">
      <section>
        <h1 id="route-recovery-title" tabIndex={-1}>Não foi possível abrir esta página</h1>
        <p role="alert">A conexão pode ter sido interrompida ou uma nova versão do Astro foi publicada.</p>
        <p>Recarregue a página para tentar novamente. Dados que ainda não foram salvos podem ser perdidos.</p>
        <button type="button" className="astro-action" onClick={() => window.location.reload()}>Recarregar página</button>
      </section>
    </main>
  }
}

export default RouteErrorBoundary
