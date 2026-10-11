import { Navigate, Outlet } from 'react-router-dom'
import { useAuthentication } from '../../hooks/useAuthentication'
import LoadingScreenState from '../loadingScreenState'

interface GuestRouteProps {
  enabled?: boolean
}

function GuestRoute({ enabled = true }: GuestRouteProps) {
  const { user, status, error } = useAuthentication()

  if (!enabled) return <Outlet />

  if (status !== 'ready') {
    return <LoadingScreenState label="Verificando sua sessão" busy={status === 'loading'} error={error} />
  }

  return user ? <Navigate to="/mainHomeScreen" replace /> : <Outlet />
}

export default GuestRoute
