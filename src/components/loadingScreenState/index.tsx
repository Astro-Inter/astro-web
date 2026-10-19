import LoadingIndicator from '../loadingIndicator'
import LoadingPlanet from '../loadingPlanet'

interface LoadingScreenStateProps {
  label: string
  busy?: boolean
  error?: string
  planet?: boolean
}

function LoadingScreenState({ label, busy = true, error = '', planet = false }: LoadingScreenStateProps) {
  return (
    <main className="loading-screen-page" aria-busy={busy}>
      <section className="loading-screen-content astro-scale-90" aria-label={label}>
        {busy ? planet ? <LoadingPlanet label={label} /> : <LoadingIndicator /> : <p role="alert">{error || 'Não foi possível verificar sua sessão.'}</p>}
      </section>
    </main>
  )
}

export default LoadingScreenState
