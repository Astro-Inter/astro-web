import { useEffect, useRef, useState } from 'react'
import { confirmarIdentidadeDoUsuario, isCurrentAuthenticatedUser } from '../services/identityConfirmation'
import type { PasswordConfirmationController, PasswordConfirmationState } from '../types/identityConfirmation'
import { useAuthentication } from './useAuthentication'

export function usePasswordConfirmation(): PasswordConfirmationController {
  const { user } = useAuthentication()
  const originUserId = useRef(user?.uid ?? null)
  const [state, setState] = useState<PasswordConfirmationState>({ password: '', visible: false, status: 'idle', error: '' })
  const mounted = useRef(true)
  const attempt = useRef(0)
  const locked = useRef(false)
  const confirmed = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      attempt.current += 1
      confirmed.current = false
    }
  }, [])

  useEffect(() => {
    if ((user?.uid ?? null) !== originUserId.current) {
      attempt.current += 1
      confirmed.current = false
      locked.current = true
      setState({ password: '', visible: false, status: 'cancelled', error: 'Sua sessão mudou. Cancele e tente novamente.' })
    }
  }, [user?.uid])

  function updatePassword(password: string): void {
    if (locked.current) return
    setState(current => ({ ...current, password, status: 'idle', error: '' }))
  }

  function toggleVisibility(): void {
    if (locked.current) return
    setState(current => ({ ...current, visible: !current.visible }))
  }

  function cancel(): void {
    attempt.current += 1
    locked.current = true
    confirmed.current = false
    setState({ password: '', visible: false, status: 'cancelled', error: '' })
  }

  async function submit(): Promise<boolean> {
    if (locked.current || !mounted.current) return false
    locked.current = true
    const currentAttempt = ++attempt.current
    // A senha fica somente na chamada ao Firebase, sem permanecer no formulário.
    setState({ password: '', visible: false, status: 'loading', error: '' })
    try {
      await confirmarIdentidadeDoUsuario(state.password, originUserId.current)
      if (!mounted.current || currentAttempt !== attempt.current) return false
      confirmed.current = true
      setState({ password: '', visible: false, status: 'success', error: '' })
      return true
    } catch (error: unknown) {
      if (mounted.current && currentAttempt === attempt.current) {
        locked.current = false
        setState({ password: '', visible: false, status: 'error', error: error instanceof Error ? error.message : 'Não foi possível confirmar sua identidade. Tente novamente.' })
      }
      return false
    }
  }

  function consumeConfirmation(): boolean {
    if (!confirmed.current) return false
    confirmed.current = false
    return mounted.current && isCurrentAuthenticatedUser(originUserId.current)
  }

  return {
    ...state,
    blocked: state.status === 'loading' || state.status === 'success' || state.status === 'cancelled',
    updatePassword, toggleVisibility, submit, cancel, consumeConfirmation,
  }
}
