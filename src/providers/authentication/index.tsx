import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthenticationContext } from '../../contexts/authentication'
import { observeAuthentication } from '../../services/authentication'
import type { AuthenticationState } from '../../types/authentication'

interface AuthenticationProviderProps {
  children: ReactNode
}

function AuthenticationProvider({ children }: AuthenticationProviderProps) {
  const [state, setState] = useState<AuthenticationState>({ user: null, status: 'loading', error: '' })
  const [attempt, setAttempt] = useState(0)

  function retryAuthentication(): void {
    setState({ user: null, status: 'loading', error: '' })
    setAttempt(current => current + 1)
  }

  useEffect(() => {
    let active = true
    const unsubscribe = observeAuthentication(
      (user) => { if (active) setState({ user, status: 'ready', error: '' }) },
      (error) => { if (active) setState({ user: null, status: 'error', error }) },
      () => { if (active) setState({ user: null, status: 'loading', error: '' }) },
    )
    return () => { active = false; unsubscribe() }
  }, [attempt])

  return <AuthenticationContext.Provider value={{ ...state, retryAuthentication }}>{children}</AuthenticationContext.Provider>
}

export default AuthenticationProvider
