import { useEffect, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { getAccountProfile } from '../services/account'
import type { AccountProfile } from '../types/account'

interface AccountProfileState {
  key: string
  data: AccountProfile | null
  loading: boolean
  error: string
}

interface AccountProfileResult extends Omit<AccountProfileState, 'key'> {
  retry: () => void
}

export function useAccountProfile(): AccountProfileResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const [attempt, setAttempt] = useState(0)
  const key = `${uid ?? ''}/${attempt}`
  const [state, setState] = useState<AccountProfileState>({ key: '', data: null, loading: true, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    getAccountProfile(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, data: null, loading: false,
        error: error instanceof Error ? error.message : 'Não foi possível carregar sua conta. Tente novamente.' })
    })
    return () => controller.abort()
  }, [uid, key])

  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : '',
    retry: () => setAttempt(current => current + 1),
  }
}
