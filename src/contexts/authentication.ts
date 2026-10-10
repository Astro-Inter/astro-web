import { createContext } from 'react'
import type { AuthenticationState } from '../types/authentication'

export const AuthenticationContext = createContext<AuthenticationState | undefined>(undefined)
