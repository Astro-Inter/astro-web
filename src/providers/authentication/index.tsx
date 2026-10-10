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

  useEffect(() => {
    let active = true
    const unsubscribe = observeAuthentication(
      (user) => { if (active) setState({ user, status: 'ready', error: '' }) },
      (error) => { if (active) setState({ user: null, status: 'error', error }) },
    )
    return () => { active = false; unsubscribe() }
  }, [])

  return <AuthenticationContext.Provider value={state}>{children}</AuthenticationContext.Provider>
}

export default AuthenticationProvider
