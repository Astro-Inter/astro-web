import { useEffect, useState } from 'react'
import LoadingScreenState from '../loadingScreenState'
import SessionErrorState from '../sessionErrorState'

interface InitialLoadingStateProps {
  error?: string
  planet?: boolean
}

function InitialLoadingState({ error = '', planet = false }: InitialLoadingStateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 500)
    return () => window.clearTimeout(timer)
  }, [])

  if (error) return <SessionErrorState error={error} />
  return visible ? <LoadingScreenState label="Carregando" planet={planet} /> : null
}

export default InitialLoadingState
