import { useEffect, useState } from 'react'
import LoadingScreenState from '../loadingScreenState'
import SessionErrorState from '../sessionErrorState'

interface InitialLoadingStateProps {
  error?: string
}

function InitialLoadingState({ error = '' }: InitialLoadingStateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 500)
    return () => window.clearTimeout(timer)
  }, [])

  if (error) return <SessionErrorState error={error} />
  return visible ? <LoadingScreenState label="Carregando" /> : null
}

export default InitialLoadingState
