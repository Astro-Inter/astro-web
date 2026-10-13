import { useEffect, useRef, useState } from 'react'
import { loginWithEmailAndPassword } from '../services/authentication'
import { useWorkspaceRegistration } from './useWorkspaceRegistration'

interface CreatedWorkspaceLoginState {
  pending: boolean
  error: string
}

interface CreatedWorkspaceLoginResult extends CreatedWorkspaceLoginState {
  canSignIn: boolean
  submit: () => Promise<boolean>
}

export function useCreatedWorkspaceLogin(): CreatedWorkspaceLoginResult {
  const { draft, result, reset } = useWorkspaceRegistration()
  const [state, setState] = useState<CreatedWorkspaceLoginState>({ pending: false, error: '' })
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const canSignIn = Boolean(result && draft.email && draft.password)

  async function submit(): Promise<boolean> {
    if (busy.current || !canSignIn) return false
    busy.current = true
    setState({ pending: true, error: '' })
    try {
      await loginWithEmailAndPassword({ email: draft.email, password: draft.password })
      // Limpa também se o observador do Firebase já abriu a Home e desmontou a página.
      reset()
      if (mounted.current) setState({ pending: false, error: '' })
      return true
    } catch (error: unknown) {
      if (mounted.current) setState({ pending: false, error: error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.' })
      return false
    } finally {
      busy.current = false
    }
  }

  return { ...state, canSignIn, submit }
}
