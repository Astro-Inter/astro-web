import LoadingIndicator from '../loadingIndicator'

interface LoadingScreenStateProps {
  label: string
  busy?: boolean
  error?: string
}

function LoadingScreenState({ label, busy = true, error = '' }: LoadingScreenStateProps) {
  return (
    <main className="loading-screen-page" aria-busy={busy}>
      <section className="loading-screen-content astro-scale-90" aria-label={label}>
        {busy ? <LoadingIndicator /> : <p role="alert">{error || 'Não foi possível verificar sua sessão.'}</p>}
      </section>
    </main>
  )
}

export default LoadingScreenState
