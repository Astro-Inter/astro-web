import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'

interface WorkspaceQueryResult<T> {
  data: T | null
  loading: boolean
  error: string
  retry: () => void
}

export function useWorkspaceQuery<T>(load: (signal?: AbortSignal) => Promise<T>): WorkspaceQueryResult<T> {
  const { user } = useAuthentication()
  const [attempt, setAttempt] = useState(0)
  const key = `${user?.uid ?? ''}/${attempt}`
  const [state, setState] = useState({ key: '', data: null as T | null, loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os dados.' })
    })
    return () => controller.abort()
  }, [key, load])
  return { data: state.key === key ? state.data : null, loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : '', retry: () => setAttempt(current => current + 1) }
}
