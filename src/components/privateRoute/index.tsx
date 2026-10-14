import { Navigate, Outlet } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import InitialLoadingState from '../initialLoadingState'
import RouteContent from '../routeContent'

interface PrivateRouteProps {
  required?: boolean
}

function PrivateRoute({ required = true }: PrivateRouteProps) {
  const { user, status, error } = useAuthentication()

  if (!required) return <Outlet />

  if (status !== 'ready') {
    return <InitialLoadingState error={error} />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <RouteContent />
}

export default PrivateRoute
