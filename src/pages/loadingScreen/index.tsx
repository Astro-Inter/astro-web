import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingScreenState from '../../components/loadingScreenState'

function LoadingScreenPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/mainHomeScreen', { replace: true }), 2400)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return <LoadingScreenState label="Carregando" />
}

export default LoadingScreenPage
