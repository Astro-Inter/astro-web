import { useContext } from 'react'
import { AuthenticationContext } from '../contexts/authentication'
import type { AuthenticationContextValue } from '../types/authentication'

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext)
  if (!context) throw new Error('useAuthentication deve ser usado dentro de AuthenticationProvider.')
  return context
}
