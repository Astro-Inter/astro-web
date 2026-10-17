import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import InitialLoadingState from '../initialLoadingState'
import RouteContent from '../routeContent'
import { canAccessPage } from '../../utils/accessControl'

interface PrivateRouteProps {
  required?: boolean
}

function PrivateRoute({ required = true }: PrivateRouteProps) {
  const { user, status, error } = useAuthentication()
  const location = useLocation()

  if (!required) return <Outlet />

  if (status !== 'ready') {
    return <InitialLoadingState error={error} />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!canAccessPage(user.accountType, location.pathname, location.search)) {
    return <Navigate to="/mainHomeScreen" replace />
  }

  return <RouteContent />
}

export default PrivateRoute
