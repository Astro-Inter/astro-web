import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import InitialLoadingState from '../initialLoadingState'
import RouteContent from '../routeContent'
import { getLoginDestination } from '../../utils/authentication'

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
    return <Navigate to="/loadingScreen" replace state={{ afterLogin: true, returnTo: getLoginDestination(location.state) }} />
  }

  return user ? <Navigate to="/mainHomeScreen" replace /> : <RouteContent />
}

export default GuestRoute
