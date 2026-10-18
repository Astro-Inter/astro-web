import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { suggestPositionNrs } from '../services/nrRecommendations'
import type { NrRecommendation } from '../types/nrRecommendation'

interface RecommendationsState {
  key: string
  rows: NrRecommendation[]
  loading: boolean
  error: string
}

interface RoleNrRecommendationsResult extends Omit<RecommendationsState, 'key'> {
  retry: () => void
}

export function useRoleNrRecommendations(roleId?: string): RoleNrRecommendationsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<RecommendationsState>({ key: '', rows: [], loading: false, error: '' })
  const key = `${uid ?? ''}/${roleId ?? ''}/${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !roleId) return () => controller.abort()
    suggestPositionNrs(roleId, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ key, rows, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, rows: [], loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar as sugestões de IA.' })
    })
    return () => controller.abort()
  }, [uid, roleId, key])

  const current = uid && roleId
    ? state.key === key ? state : { rows: [], loading: true, error: '' }
    : { rows: [], loading: false, error: '' }
  return { rows: current.rows, loading: current.loading, error: current.error, retry: () => setAttempt(value => value + 1) }
}
