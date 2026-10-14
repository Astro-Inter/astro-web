import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import InitialLoadingState from '../initialLoadingState'
import RouteContent from '../routeContent'

interface GuestRouteProps {
  enabled?: boolean
}

function GuestRoute({ enabled = true }: GuestRouteProps) {
  const { user, status, error } = useAuthentication()
  const location = useLocation()

  if (!enabled) return <Outlet />

  if (status !== 'ready') {
    return <InitialLoadingState error={error} />
  }

  if (user && location.pathname === '/') {
    return <Navigate to="/loadingScreen" replace state={{ afterLogin: true }} />
  }

  return user ? <Navigate to="/mainHomeScreen" replace /> : <RouteContent />
}

export default GuestRoute
