import { LoadingPlanet } from '../../components'

function LoadingScreenPage() {
  return (
    <main className="loading-screen-page">
      <section className="loading-screen-content astro-scale-90" aria-label="Carregando">
        <LoadingPlanet label="Carregando" />
      </section>
    </main>
  )
}

export default LoadingScreenPage
