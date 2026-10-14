import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingScreenState from '../../components/loadingScreenState'

function LoadingScreenPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const afterLogin = Boolean(state && typeof state === 'object' && 'afterLogin' in state && state.afterLogin === true)
  const duration = afterLogin ? 10_000 : 2400

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/mainHomeScreen', { replace: true }), duration)
    return () => window.clearTimeout(timer)
  }, [duration, navigate])

  return <LoadingScreenState label="Carregando" />
}

export default LoadingScreenPage
