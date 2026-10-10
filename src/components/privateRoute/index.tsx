import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import LoadingPlanet from '../loadingPlanet'

interface PrivateRouteProps {
  required?: boolean
}

function PrivateRoute({ required = true }: PrivateRouteProps) {
  const { user, status, error } = useAuthentication()
  const location = useLocation()

  if (!required) return <Outlet />

  if (status !== 'ready') {
    return (
      <main className="loading-screen-page" aria-busy={status === 'loading'}>
        {status === 'loading'
          ? <LoadingPlanet label="Verificando sua sessão" />
          : <p role="alert">{error}</p>}
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/" replace state={{ returnTo: location.pathname + location.search + location.hash }} />
  }

  return <Outlet />
}

export default PrivateRoute
