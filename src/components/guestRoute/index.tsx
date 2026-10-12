import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import LoadingScreenState from '../loadingScreenState'
import { getLoginDestination } from '../../utils/authentication'

interface GuestRouteProps {
  enabled?: boolean
}

function GuestRoute({ enabled = true }: GuestRouteProps) {
  const { user, status, error } = useAuthentication()
  const location = useLocation()

  if (!enabled) return <Outlet />

  if (status !== 'ready') {
    return <LoadingScreenState label="Verificando sua sessão" busy={status === 'loading'} error={error} />
  }

  if (user && location.pathname === '/') {
    return <Navigate to="/loadingScreen" replace state={{ afterLogin: true, returnTo: getLoginDestination(location.state) }} />
  }

  return user ? <Navigate to="/mainHomeScreen" replace /> : <Outlet />
}

export default GuestRoute
