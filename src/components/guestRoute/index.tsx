import { Navigate, Outlet } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import LoadingPlanet from '../loadingPlanet'

interface GuestRouteProps {
  enabled?: boolean
}

function GuestRoute({ enabled = true }: GuestRouteProps) {
  const { user, status, error } = useAuthentication()

  if (!enabled) return <Outlet />

  if (status !== 'ready') {
    return (
      <main className="loading-screen-page" aria-busy={status === 'loading'}>
        {status === 'loading'
          ? <LoadingPlanet label="Verificando sua sessão" />
          : <p role="alert">{error}</p>}
      </main>
    )
  }

  return user ? <Navigate to="/mainHomeScreen" replace /> : <Outlet />
}

export default GuestRoute
