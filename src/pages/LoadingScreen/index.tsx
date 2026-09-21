import { AstroBrand, HelpLink, LoadingPlanet } from '../../components'

function LoadingScreenPage() {
  return (
    <main className="loading-screen-page">
      <header className="loading-screen-header">
        <AstroBrand />
      </header>

      <section className="loading-screen-content" aria-label="Carregando">
        <LoadingPlanet label="Carregando" />
      </section>

      <HelpLink />
    </main>
  )
}

export default LoadingScreenPage
