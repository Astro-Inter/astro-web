import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { flushSync } from 'react-dom'
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
    // A tela estará pronta quando o Firebase encerrar a sessão.
    void import('../pages/login').catch(() => undefined)
    return () => { mounted.current = false }
  }, [])

  async function submit(): Promise<void> {
    if (pending.current) return
    pending.current = true
    setState({ pending: true, error: '' })
    try {
      await import('../pages/login')
      const animated = Boolean(document.startViewTransition) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.astroReducedMotion !== 'true'
      const leave = async () => {
        await logout()
        flushSync(() => navigate('/', { replace: true, state: animated ? { logoutTransition: true } : null }))
      }
      if (animated) {
        document.documentElement.classList.add('logout-transition')
        try {
          const transition = document.startViewTransition(leave)
          void transition.ready.catch(() => undefined)
          await transition.updateCallbackDone
          await transition.finished
        } finally {
          document.documentElement.classList.remove('logout-transition')
        }
      } else {
        await leave()
      }
    } catch (error: unknown) {
      if (mounted.current) setState({ pending: false, error: error instanceof Error ? error.message : 'Não foi possível sair da conta. Tente novamente.' })
    } finally {
      pending.current = false
      if (mounted.current) setState((current) => ({ ...current, pending: false }))
    }
  }

  return { ...state, submit }
}
