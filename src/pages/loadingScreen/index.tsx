import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingScreenState from '../../components/loadingScreenState'
import { getLoginDestination } from '../../utils/authentication'

function LoadingScreenPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const afterLogin = Boolean(state && typeof state === 'object' && 'afterLogin' in state && state.afterLogin === true)
  const duration = afterLogin ? 10_000 : 2400
  const requestedDestination = getLoginDestination(state)
  const destination = requestedDestination.split(/[?#]/)[0] === '/loadingScreen' ? '/mainHomeScreen' : requestedDestination

  useEffect(() => {
    const timer = window.setTimeout(() => navigate(destination, { replace: true }), duration)
    return () => window.clearTimeout(timer)
  }, [destination, duration, navigate])

  return <LoadingScreenState label="Carregando" />
}

export default LoadingScreenPage
