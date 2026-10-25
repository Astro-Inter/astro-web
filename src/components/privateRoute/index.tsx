import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import InitialLoadingState from '../initialLoadingState'
import RouteContent from '../routeContent'
import { canAccessPage, getDefaultAuthenticatedPath } from '../../utils/accessControl'

interface PrivateRouteProps {
  required?: boolean
  nrDevelopmentPreview?: boolean
}

function PrivateRoute({ required = true, nrDevelopmentPreview = false }: PrivateRouteProps) {
  const { user, status, error } = useAuthentication()
  const location = useLocation()

  if (!required) return <Outlet />

  if (status === 'inactive') return <Navigate to="/inactiveScreenLayout" replace />

  if (status !== 'ready') {
    // O frame visual não carrega dados privados. Preservá-lo evita remontar o planeta.
    if (location.pathname === '/loadingScreen' && !error) return <RouteContent />
    return <InitialLoadingState error={error} planet={location.pathname === '/loadingScreen'} />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!canAccessPage(user.accountType, location.pathname, location.search, nrDevelopmentPreview)) {
    return <Navigate to={getDefaultAuthenticatedPath(user.accountType)} replace />
  }

  return <RouteContent />
}

export default PrivateRoute
