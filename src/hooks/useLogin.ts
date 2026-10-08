import { useEffect, useRef, useState } from 'react'
import { AuthenticationError, loginWithEmailAndPassword } from '../services/authentication'
import type { LoginCredentials, LoginFieldErrors, LoginStatus } from '../types/authentication'
import { validateLoginCredentials } from '../utils/authentication'

interface LoginState {
  credentials: LoginCredentials
  errors: LoginFieldErrors
  status: LoginStatus
  message: string
  invalidCredentials: boolean
}

interface UseLoginResult extends LoginState {
  updateCredential: (field: keyof LoginCredentials, value: string) => void
  submit: () => Promise<boolean>
}

export function useLogin(): UseLoginResult {
  const [state, setState] = useState<LoginState>({
    credentials: { email: '', password: '' },
    errors: {},
    status: 'idle',
    message: '',
    invalidCredentials: false,
  })
  const mounted = useRef(true)
  const pending = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  function updateCredential(field: keyof LoginCredentials, value: string): void {
    if (pending.current) return
    setState((current) => ({
      ...current,
      credentials: { ...current.credentials, [field]: value },
      errors: { ...current.errors, [field]: undefined },
      status: 'idle',
      message: '',
      invalidCredentials: false,
    }))
  }

  async function submit(): Promise<boolean> {
    if (pending.current) return false
    const errors = validateLoginCredentials(state.credentials)
    if (errors.email || errors.password) {
      setState((current) => ({ ...current, errors, status: 'error', message: '', invalidCredentials: false }))
      return false
    }

    pending.current = true
    setState((current) => ({ ...current, errors: {}, status: 'loading', message: '', invalidCredentials: false }))
    try {
      await loginWithEmailAndPassword(state.credentials)
      if (!mounted.current) return false
      setState((current) => ({
        ...current,
        credentials: { ...current.credentials, password: '' },
        status: 'success',
        message: 'Login realizado. Abrindo seu workspace…',
      }))
      return true
    } catch (error: unknown) {
      if (mounted.current) {
        setState((current) => ({
          ...current,
          status: 'error',
          message: error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.',
          invalidCredentials: error instanceof AuthenticationError && error.invalidCredentials,
        }))
      }
      return false
    } finally {
      pending.current = false
    }
  }

  return { ...state, updateCredential, submit }
}
