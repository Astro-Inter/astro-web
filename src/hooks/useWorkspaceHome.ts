import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { loadWorkspaceHome } from '../services/home'
import type { WorkspaceHome } from '../types/home'

interface WorkspaceHomeState {
  key: string
  data: WorkspaceHome | null
  loading: boolean
  error: string
}

interface WorkspaceHomeResult extends Omit<WorkspaceHomeState, 'key'> {
  retry: () => void
}

export function useWorkspaceHome(): WorkspaceHomeResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = `${uid ?? ''}/${attempt}`
  const [state, setState] = useState<WorkspaceHomeState>({ key: '', data: null, loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    loadWorkspaceHome(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar a Home. Tente novamente.' })
    })
    return () => controller.abort()
  }, [uid, key])

  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : '',
    retry: () => setAttempt((current) => current + 1),
  }
}
