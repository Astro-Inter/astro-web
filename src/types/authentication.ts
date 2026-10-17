export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginFieldErrors {
  email?: string
  password?: string
}

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error'

export type WebAccountType = 'GESTOR' | 'GESTOR_WORKSPACE'

export interface AuthenticatedUser {
  uid: string
  email: string | null
  displayName: string | null
  accountType: WebAccountType
}

export interface AuthenticationState {
  user: AuthenticatedUser | null
  status: 'loading' | 'ready' | 'error'
  error: string
}

export interface AuthenticationContextValue extends AuthenticationState {
  retryAuthentication: () => void
}
