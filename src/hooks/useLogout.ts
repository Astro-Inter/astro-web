import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../services/authentication'

interface UseLogoutResult {
  pending: boolean
  error: string
  submit: () => Promise<void>
}

export function useLogout(): UseLogoutResult {
  const navigate = useNavigate()
  const [state, setState] = useState({ pending: false, error: '' })
  const mounted = useRef(true)
  const pending = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function submit(): Promise<void> {
    if (pending.current) return
    pending.current = true
    setState({ pending: true, error: '' })
    try {
      await logout()
      navigate('/', { replace: true, state: null })
    } catch (error: unknown) {
      if (mounted.current) setState({ pending: false, error: error instanceof Error ? error.message : 'Não foi possível sair da conta. Tente novamente.' })
    } finally {
      pending.current = false
      if (mounted.current) setState((current) => ({ ...current, pending: false }))
    }
  }

  return { ...state, submit }
}
