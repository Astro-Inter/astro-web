import { useContext } from 'react'
import { AuthenticationContext } from '../contexts/authentication'
import type { AuthenticationState } from '../types/authentication'

export function useAuthentication(): AuthenticationState {
  const context = useContext(AuthenticationContext)
  if (!context) throw new Error('useAuthentication deve ser usado dentro de AuthenticationProvider.')
  return context
}
