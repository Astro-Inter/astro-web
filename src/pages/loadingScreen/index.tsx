import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingScreenState from '../../components/loadingScreenState'
import { useAuthentication } from '../../hooks/useAuthentication'

function LoadingScreenPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { status, user } = useAuthentication()
  const afterLogin = Boolean(state && typeof state === 'object' && 'afterLogin' in state && state.afterLogin === true)
  const duration = afterLogin ? 10_000 : 2400

  useEffect(() => {
    if (status !== 'ready' || !user) return
    const timer = window.setTimeout(() => navigate('/mainHomeScreen', { replace: true }), duration)
    return () => window.clearTimeout(timer)
  }, [duration, navigate, status, user])

  return <LoadingScreenState label="Carregando" planet />
}

export default LoadingScreenPage
