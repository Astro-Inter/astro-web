import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingPlanet } from '../../components'

function LoadingScreenPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/mainPositionScreen', { replace: true }), 2400)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <main className="loading-screen-page">
      <section className="loading-screen-content astro-scale-90" aria-label="Carregando">
        <LoadingPlanet label="Carregando" />
      </section>
    </main>
  )
}

export default LoadingScreenPage
